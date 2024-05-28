const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
require('dotenv').config();
const cors = require('cors');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const jwt = require('jsonwebtoken')
const port = process.env.PORT || 5000;


// middlewers
app.use(cors());
app.use(express.json())


let userCollection;

//custom middleweres
const verifyToken = async (req, res, next) => {
    console.log('Inside verify token', req.headers.authorization)
    if (!req.headers.authorization) {
        return res.status(401).send({ message: 'Unauthorized access' })
    }
    const token = req.headers.authorization.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKN_SECRET, (error, decoded) => {
        if (error) {
            return res.status(401).send({ message: 'Unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })
}

// verify admin after verify token
const verifyAdmin = async (req, res, next) => {
    const email = req.decoded.email;
    const query = { email: email }
    const user = await userCollection.findOne(query)
    let isAdmin = user?.role === 'admin';
    if (!isAdmin) {
        return res.status(403).send({ message: 'Forbidden access' })
    }
    next();
}




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.oh0s98i.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        //   await client.connect();

        const menuCollection = client.db("bistroBossDB").collection("menu");
        const reviewsCollection = client.db("bistroBossDB").collection("reviews");
        const cartCollection = client.db("bistroBossDB").collection("carts");
        userCollection = client.db("bistroBossDB").collection("users");

        //jwt related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        })

        // payment intent 
        app.post("/create-payment-intent", async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100)
            console.log('Amount inside the intent:', amount)

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ['card'],
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        // post users
        app.post('/users', async (req, res) => {
            const newUser = req.body;
            const query = { email: newUser.email };
            const existingUser = await userCollection.findOne(query);
            if (!existingUser) {
                res.send(await userCollection.insertOne(newUser))
            }
            else {
                return res.send({ message: 'User Already Exists', insertedId: null })
            }
        })
        // get users
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            res.send(await userCollection.find(req.query).toArray())
        })

        // check user role
        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'Forbidden access' })
            }
            const query = { email: email }
            const user = await userCollection.findOne(query)
            let admin = false;
            if (user) {
                admin = user?.role === 'admin'
            }
            res.send({ admin })
        })

        // User Role by Admin
        app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result)
        })

        // delete a user by id
        app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            res.send(await userCollection.deleteOne(query))
        })

        // post menu
        app.post('/menu', verifyToken, verifyAdmin, async (req, res) => {
            res.send(await menuCollection.insertOne(req.body))
        })
        // get menu
        app.get('/menu', async (req, res) => {
            res.send(await menuCollection.find(req.query).toArray())
        })
        // update menu
        app.patch('/menu/:id', async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    name: item.name,
                    recipe: item.recipe,
                    image: item.image,
                    category: item.category,
                    price: item.price,
                }
            }
            const result = await menuCollection.updateOne(filter, updateDoc);
            res.send(result)
        })
        // delete menu item by id
        app.delete('/menu/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            res.send(await menuCollection.deleteOne(query))
        })

        // get reviews
        app.get('/reviews', async (req, res) => {
            res.send(await reviewsCollection.find(req.query).toArray())
        })
        // post carts
        app.post('/carts', async (req, res) => {
            res.send(await cartCollection.insertOne(req.body))
        })
        // get carts
        app.get('/carts', async (req, res) => {
            res.send(await cartCollection.find(req.query).toArray())
        })
        // get carts by email
        app.get('/carts', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            res.send(await cartCollection.find(query).toArray())
        })
        // delete a carts by id
        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            res.send(await cartCollection.deleteOne(query))
        })


        // Send a ping to confirm a successful connection
        //   await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        //   await client.close();
    }
}
run().catch(console.dir);





app.get('/', (req, res) => {
    res.send('Server is running')
})
app.listen(port, () => {
    console.log(`Server is running on port: ${port}`)
})

// https://bistro-boss-delta.vercel.app
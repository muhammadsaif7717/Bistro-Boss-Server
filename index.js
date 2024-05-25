const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
require('dotenv').config();
const cors = require('cors');
const port = process.env.PORT || 5000;


// middlewers
app.use(cors());
app.use(express.json())




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
        const userCollection = client.db("bistroBossDB").collection("users");

         // post users
        app.post('/users', async (req, res) => {
            const newUser = req.body;
            const query = { email: newUser.email };
            const existingUser = await userCollection.findOne(query);
            if (!existingUser) {
                res.send(await userCollection.insertOne(newUser))
            }  
            else {
                return res.send({message: 'User Already Exists'})
            }
        })
        // get users
        app.get('/users', async(req,res)=> {
            res.send(await userCollection.find(req.query).toArray())
        })

        // get menu
        app.get('/menu', async(req,res)=> {
            res.send(await menuCollection.find(req.query).toArray())
        })
        // get reviews
        app.get('/reviews', async(req,res)=> {
            res.send(await reviewsCollection.find(req.query).toArray())
        })
        // post carts
        app.post('/carts', async(req,res)=> {
            res.send(await cartCollection.insertOne(req.body))
        })
        // get carts
        app.get('/carts', async(req,res)=> {
            res.send(await cartCollection.find(req.query).toArray())
        })
        // get carts by email
        app.get('/carts', async (req, res) => {
            const email = req.query.email;
            const query={email:email}
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
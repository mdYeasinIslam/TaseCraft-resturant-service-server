require('dotenv').config()
const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000


app.use(cors())
app.use(express.json())

const varifyToken = (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send({message:"forbidden access"})
  }
  const token = req.headers.authorization?.split(' ')[1]
  jwt.verify(token,process.env.jwt_secret, (err, decode) => {
    if (err) {
      return res.status(401).send({message:"forbidden access"})
    }
    else {
      req.decoded =decode
    next()
    }
    
  })
}


const uri = `mongodb+srv://${process.env.db_user}:${process.env.db_pass}@cluster0.bfv30pl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
      const database = client.db('TasteCraft_resturant').collection('menuItems')
      const shopItemCollection = client.db('TasteCraft_resturant').collection('shopItems')
      const usersCollection = client.db('TasteCraft_resturant').collection('users')
    
    //---------jwt api------------
    app.post('/jwt', async (req, res) => {
      const userInfo = req.body
      const token = jwt.sign(userInfo,process.env.jwt_secret, { expiresIn: '1h' })
      res.send(token)
    })
   
    
    //menu items collect from db and send to the client side
      app.get('/menuItem', async (req, res) => {
          const result = await database.find().toArray()
          res.send(result)
      })
    
    //--------------cart related api integration--------------------

    // get each shop-item from client and insert to the db
    app.post('/shopCarts', async (req, res) => {
      const body = req.body;
      const result = await shopItemCollection.insertOne(body)
      res.send({success:true,message:'Successfully add to the db'})
    })
    //get shopCarts item from db and send to the client
    app.get('/shopCarts', async (req, res) => {
      const email = req.query.email
      const query = {userEmail:email}
      const result = await shopItemCollection.find(query).toArray()
      res.send(result)
    })
    app.delete('/shopCarts/:id', async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const deleteItem = await shopItemCollection.deleteOne(query)
      res.send(deleteItem)
    })
    //-----------------------------------

    //---------------User collection-------------------
    
    app.post('/users', async (req, res) => {
      const body = req.body
      const query = { email: body.email }
      const findExistingEmail = await usersCollection.findOne(query)
      if (findExistingEmail) {
        return res.send({status:false,message:'The user already created.'})
      }
      const result = await usersCollection.insertOne(body)
      res.send(result)
    })

    //varify jwt token when get users data from db and send to the client
    //can use a midlewire
    app.get('/users', varifyToken, async (req, res) => {
      // console.log(req.headers)
      
      const result = await usersCollection.find().toArray()
      res.send(result)
    })
    //get single user and check is the "Admini" or no via variafytoke midlewire
    app.get('/users/admin',varifyToken, async (req, res) => {
      // const email = req.params.email
      const email = req.query?.email
      let admin = false
      
      const filter = { email: email }
      // console.log(req.decoded,email)
      
      if (!email == req.decoded.email) {
        return res.status(401).send({message:'forbidden access'})
      }
      const findUser =await usersCollection.findOne(filter)
      console.log(findUser)
      if (findUser) {
        admin = findUser?.role ==='Admin'
      }
      res.send({admin})
    })

    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const deleteuser = await usersCollection.deleteOne(filter)
      res.send(deleteuser)
    })
    app.patch('/users/:id', async (req, res) => {
      const id = req.params.id
      const body = req.body
      const filter = {_id:new ObjectId(id)}
      const updateField = {
        $set: {
          role:body.role
        }
      }
      const result = await usersCollection.updateOne(filter, updateField)
      res.send({result,role:body.role})
    })
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  }
  catch (error) {
   console.log(error)
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('resturant server is running') 
})

app.listen(port,()=>console.log(`running on ${port}`))
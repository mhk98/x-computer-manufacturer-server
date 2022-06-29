const express = require('express')
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());
// app.use(cors({origin: 'https://x-computer-manufacture.web.app/'})

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.y3bgh.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next){
  const authHeader = req.headers.authorization;
  if(!authHeader){
  return res.status(401).send({message: 'UnAuthorized access'})
  }

  const token= authHeader.split(' ')[1]
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, decoded) {
    if(err){
      return res.status(403).send({message: 'forbidden access'})
    }
    req.decoded= decoded;
    next();
  });
}

async function run(){

    try{
        await client.connect();
        console.log('database connected')
        const toolsCollection = client.db('xComputer').collection('tool');
        const orderCollection = client.db('xComputer').collection('orders');
        const userCollection = client.db('xComputer').collection('users');
        const reviewCollection = client.db('xComputer').collection('reviews');


      app.post('/create-payment-intent', verifyJWT, async(req, res)=>{
        const tool= req.body;
        const price = tool.price;
        const amount= price*100;
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          "payment_method_types": ["card"],
        });
        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      

      })

        //GET
        app.get('/tool',  async(req, res)=>{
            const query = {};
            const cursor = toolsCollection.find(query);
            const tools= await cursor.toArray();
            res.send(tools)

        })

        app.get('/review', async(req, res)=>{
          const query = {};
          const cursor = reviewCollection.find(query);
          const reviews = await cursor.toArray();
          res.send(reviews)
        })

        //GET
        app.get('/tool/:id', async(req, res)=>{
            const id= req.params.id;
            const query = {_id: ObjectId(id)};
            const tool = await toolsCollection.findOne(query);
            res.send(tool)
        } )


//POST
app.post('/order', async(req, res) =>{
  const order = req.body;
  const result = await orderCollection.insertOne(order);
  res.send(result);
})

app.get('/order', verifyJWT, async(req, res)=>{
  const email = req.query.email;
  const decodedEmail= req.decoded.email;
  if(email === decodedEmail){
    const query = {email: email}
    const orders= await orderCollection.find(query).toArray();
   return res.send(orders)
  }
else{
return res.status(403).send({message: 'forbidden access'})
}

})

app.get('/order/:id', verifyJWT, async(req, res)=>{
  const id = req.params.id;
  const query= {_id: ObjectId(id)}
  const order = await orderCollection.findOne(query);
  res.send(order)
})

app.delete('/order/:id', async(req, res)=>{
  const id= req.params.id;
  const query= {_id: ObjectId(id)};
  const result = await orderCollection.deleteOne(query);
  res.send(result)

})

app.post('/review', async(req, res)=>{
  const review = req.body;
  const result = await reviewCollection.insertOne(review);
  res.send(result)
  
})
app.post('/tool', async(req, res)=>{
  const product = req.body;
  const result = await toolsCollection.insertOne(product);
  res.send(result)
  
})

app.post('/user', async(req, res)=>{
  const user = req.body;
  const result = await userCollection.insertOne(user);
  res.send(result)
  
})

app.get('/user', verifyJWT, async(req, res)=>{
  const users= await userCollection.find().toArray();
  res.send(users)
})

 
// GET method user route
app.put('/user/:email', async (req, res) => {
const email= req.params.email;
const user= req.body;
const filter={email: email};
const options = { upsert: true };
const updateDoc = {
  $set: user,
};
const result = await userCollection.updateOne(filter, updateDoc, options);
const token = jwt.sign({email: email}, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

res.send({result, token})
})

app.get('/admin/:email', async(req,res)=>{
  const email= req.params.email;
  const user = await userCollection.findOne({email: email});
  const isAdmin = user.role === 'admin'
  res.send({admin: isAdmin})
})

app.put('/user/admin/:email', async (req, res) => {
  const email= req.params.email;
  const requester = req.decoded.email;
  const requesterAccount = await userCollection.findOne({email: requester});
  if(requesterAccount.role === 'admin'){
    const filter={email: email};
    const updateDoc = {
      $set: {role:'admin'},
    };

    
  const result = await userCollection.updateOne(filter, updateDoc);
  res.send(result)
  }
  else{
    res.status(403).send({message: 'forbidden'});
  }

  })

// // GET method admin/:email route
// app.get('/admin/:email', async (req, res) => {
//   const email = req.params.email;
//   const user = await userCollection.findOne({ email: email });
//   const isAdmin = user.role === 'admin';
//   res.send({ admin: isAdmin });
// })

// app.put('/user/admin/:email', async (req, res) => {
//   const email = req.params.email;
//   const filter = { email: email };
//   const updateDoc = {
//       $set: { role: 'admin' }
//   };
//   const result = await userCollection.updateOne(filter, updateDoc);
//   res.send(result)
// })

// // PUT method user route
// app.put('/user/:email', async (req, res) => {
//   const email = req.params.email;
//   const user = req.body
//   const filter = { email: email };
//   const options = { upsert: true };
//   const updateDoc = {
//       $set: user,
//   };
//   const result = await userCollection.updateOne(filter, updateDoc, options);
//   const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
//   res.send({ result, token })
// })

    }
    finally{

    }
}


run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
  console.log('dbConnected')
});
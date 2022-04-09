const PORT = 8000

const {MongoClient} = require('mongodb')
const {v4: uuidv4} = require('uuid')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const theEnv = require ('dotenv')
theEnv.config()
const cors = require('cors')
const uri = process.env.URIKEY
const express = require('express')


const app = express()
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.json('welcome to my app')
})

app.get('/genderedUsers', async (req,res) => {
    const client = new MongoClient(uri)
    const gender = req.query.gender

    try{
        await client.connect()
        const database = client.db('tinder-data')
        const users = database.collection('users')

        const query = {gender: gender}
        const foundUsers = await users.find(query).toArray()

        res.send(foundUsers)
    } finally{
       client.close()
    }
})


app.get('/user', async (req,res) => {
    const client = new MongoClient(uri)
    const userId = req.query.userId

    try{
        await client.connect()
        const database = client.db('tinder-data')
        const users = database.collection('users')

        const query = {user_id:userId}
        const user = await users.findOne(query)

        res.send(user)
    } finally{
       await client.close()
    }
})

app.get('/users', async(req, res) => {
    const client = new MongoClient(uri)

    try{
        await client.connect()
        const database = client.db('tinder-data')
        const users = database.collection('users')

        const returnedUsers = await users.find().toArray()
        res.send(returnedUsers)
    } finally{
        await client.close()
    }
})

app.post('/signup', async (req, res) => {

    const client = new MongoClient(uri)
    const {email, password} = req.body;

    const generatedUserId =  uuidv4()
    const hashedPassword = await bcrypt.hash(password, 10)

    try{
        await client.connect()
        const database = client.db('tinder-data')
        const users = database.collection('users')

        const cleanEmail = email.toLowerCase()

        const existing = await users.findOne({email:cleanEmail})

        if (existing){
            return res.status(409).send('email is already taken')
            
        }

        const data = {
            user_id : generatedUserId, 
            email:cleanEmail,
            hashed_password: hashedPassword
        }

        const insertedUser = await users.insertOne(data)

        const token = jwt.sign(insertedUser, cleanEmail, {
            expiresIn: 60*24
        })

        res.status(201).json({token, userId:generatedUserId})
    } catch (error){
        console.log(error)
    }
})

app.post('/login', async (req, res) => {
    const client = new MongoClient(uri)
    const {email, password} = req.body 

    try{
        await client.connect()
        const database =  client.db('tinder-data')
        const users = database.collection('users')

        const theUser =  await users.findOne({email})

        const correctPassword = await bcrypt.compare(password, theUser.hashed_password)

        if (theUser && correctPassword){
            const token = jwt.sign(theUser, email, {
                expiresIn:60*2
            })
            res.status(201).json({token, userId:theUser.user_id})
        }
        res.status(400).send('invalid credentials')
    } catch (err){console.log(err)}
})


app.put('/user', async (req, res) => {
    const client = new MongoClient(uri)
    const formData = req.body.formData

    try{
        await client.connect()
        const database = client.db('tinder-data')
        const users = database.collection('users')

        const query = { user_id: formData.user_id}
        const updateDocumet =  {
            $set:{
                first_name:formData.first_name,
                dob_day:formData.dob_day,
                dob_month:formData.dob_month,
                dob_year:formData.dob_year,
                show_gender:formData.show_gender,
                gender:formData.gender,
                gender_interest:formData.gender_interest,
                url:formData.url,
                about:formData.about,
                matches:['']
            },
        }

        const insertedUser = await users.updateOne(query, updateDocumet)
        res.send(insertedUser)
    } finally{
        await client.close()
    }
})

app.put('/addMatch', async(req,res) => {
    client = new MongoClient(uri)
    const {userId, matchedUserId} = req.body

    try{
        await client.connect()
        const database = client.db('tinder-data')
        const users = database.collection('users')

        const query = {user_id: userId}
        const updateDocumet = {
            $push:{
                matches: {user_id: matchedUserId}
            }
        }

        const user = await users.updateOne(query, updateDocumet)
        res.send(user)
    } finally {
        await client.close()
    }
})

app.get('/matchedUsers', async (req,res) => {
    const client = new MongoClient(uri)
    const userIds = JSON.parse(req.query.userIds)

    try{
        await client.connect()
        const database = client.db('tinder-data')
        const users = database.collection('users')

        const pipeline = [
            {
                '$match':{
                    'user_id': {
                        '$in': userIds
                    }
                }
            }
        ]

        const foundUsers = await users.aggregate(pipeline).toArray()
        res.send(foundUsers)
    
    } finally{
        await client.close()
    }
})


app.get('/messages', async (req,res) => {
    const client = new MongoClient(uri)
    const {userId, correspondingUser} = req.query

    try{
        await client.connect()
        const database = client.db('app-data')
        const messages = database.collection('messages')

        const query = {to_userId: correspondingUser, from_userId:userId}
        const foundMessages = await messages.find(query).toArray()

        res.send(foundMessages)
    } finally { await client.close()}
})


app.post('/message', async(req,res) => {
    const client = new MongoClient(uri)
    const message = req.body.message

    console.log(message)

    try{
        await client.connect()
        const database = client.db('app-data')
        const messages = database.collection('messages')

        const insertedMessage =  await messages.insertOne(message)
        res.send(insertedMessage)

        console.log(insertedMessage)
    } finally {
        client.close()
    }
})


app.listen(PORT, () => 
    console.log('RUNNING ON ', PORT)
)


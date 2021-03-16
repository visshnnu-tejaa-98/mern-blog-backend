const express = require('express');
const mongodb = require('mongodb');
const bcrypt = require('bcryptjs');
const mongoClient = mongodb.MongoClient;
const DB_URL = 'mongodb://127.0.0.1:27017';
const DATA_BASE = 'TechBlogs';
const USERS_COLLECTION = 'users';
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
	res.send('Welcome to Tech Blogs App');
});

app.post('/register', async (req, res) => {
	try {
		const client = await mongoClient.connect(DB_URL);
		const db = client.db(DATA_BASE);
		let user = await db.collection(USERS_COLLECTION).findOne({ email: req.body.email });
		if (user) {
			res.send({ message: 'user Already exists' });
		} else {
			const salt = await bcrypt.genSalt(10);
			const hash = await bcrypt.hash(req.body.password, salt);
			req.body.password = hash;
			await db.collection(USERS_COLLECTION).insertOne(req.body);
			res.status(200).json({ message: 'User Added! ' });
		}
		client.close();
	} catch (error) {
		console.log(error);
		res.status(500).json({ message: 'something went wrong' });
	}
});

app.listen(PORT, () => console.log(`:::server is up and running in port ${PORT}:::`));

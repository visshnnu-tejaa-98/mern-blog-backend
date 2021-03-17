const express = require('express');
const mongodb = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const cors = require('cors');
const mongoClient = mongodb.MongoClient;
// const DB_URL = 'mongodb://127.0.0.1:27017';
const DB_URL =
	'mongodb+srv://admin-vishnu:vishnu123@vishnu.1nuon.mongodb.net/myFirstDatabase?retryWrites=true&w=majority';
const DATA_BASE = 'TechBlogs';
const USERS_COLLECTION = 'users';
const BLOGS_COLLECTION = 'blogs';
const app = express();
const PORT = process.env.PORT || 3000;

dotenv.config();

app.use(express.json());
app.use(cors());

// nodemailer configuration
const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: process.env.EMAIL,
		pass: process.env.PASSWORD,
	},
});

// authenticate
const Authenticate = async (req, res, next) => {
	try {
		const bearer = await req.headers['authorization'];
		if (!bearer) {
			return res.json({ message: 'access failed' });
		} else {
			jwt.verify(bearer, 'secret', (err, decode) => {
				if (decode) {
					console.log(decode);
					req.body.auth = decode;
					next();
				} else {
					res.json({ message: 'authentication failed' });
				}
			});
		}
	} catch (error) {
		console.log(error);
		res.json({ message: 'Something went wrong in authentication' });
	}
};

app.get('/', (req, res) => {
	res.send('Welcome to Tech Blogs App');
});

app.post('/register', async (req, res) => {
	try {
		console.log(req.body);
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
			let mailOptione = {
				from: process.env.EMAIL,
				to: req.body.email,
				subject: 'Registration Successful!!!',
				html: `<div>
						<p>Hi ${req.body.name},</p>
						<p>
							Thank you for Registering our <strong>Tech Blogs</strong>
						</p>
						<p>Login Here to explore more</p>
						<p>${process.env.FRONTEND_URL}/login</p>
					</div>`,
			};
			transporter.sendMail(mailOptione, (err, data) => {
				if (err) {
					console.log(err);
				} else {
					console.log('Email Sent');
				}
			});
			res.redirect('http://localhost:3001/login');
		}
		client.close();
	} catch (error) {
		console.log(error);
		res.status(500).json({ message: 'something went wrong' });
	}
});

app.post('/login', async (req, res) => {
	try {
		console.log(req.body);
		const client = await mongoClient.connect(DB_URL);
		const db = client.db(DATA_BASE);
		let user = await db.collection(USERS_COLLECTION).findOne({ email: req.body.email });
		if (user) {
			let match = await bcrypt.compare(req.body.password, user.password);
			console.log(match);
			if (match) {
				const token = jwt.sign({ email: req.body.email }, 'secret', { expiresIn: '1h' });
				console.log(token);
				res.send({ message: 'Allow', token });
			}
		} else {
			res.send({ message: 'Not Allow' });
		}
		client.close();
	} catch (error) {
		console.log(error);
		res.status(500).json({ message: 'something went wrong' });
	}
});

app.post('/forgot', async (req, res) => {
	try {
		const client = await mongoClient.connect(DB_URL);
		const db = client.db(DATA_BASE);
		let user = await db.collection(USERS_COLLECTION).findOne({ email: req.body.email });
		if (user) {
			let mailOptione = {
				from: process.env.EMAIL,
				to: req.body.email,
				subject: 'Registration Successful!!!',
				html: `<div>
						<p>Hi ${req.body.name},</p>
						<p>
							Here is your link to reset your password!!
						</p>
						<p>${process.env.FRONTEND_URL}/reset</p>
					</div>`,
			};
			transporter.sendMail(mailOptione, (err, data) => {
				if (err) {
					console.log(err);
				} else {
					console.log('Email Sent');
				}
			});
			res.status(200).json({ message: 'Mail sent to reset Password' });
		} else {
			res.json({ message: "User doesn't exist" });
		}
		client.close();
	} catch (error) {
		console.log(error);
		res.status(500).json({ message: 'something went wrong' });
	}
});

app.post('/reset', async (req, res) => {
	try {
		const client = await mongoClient.connect(DB_URL);
		const db = client.db(DATA_BASE);
		let user = await db.collection(USERS_COLLECTION).findOne({ email: req.body.email });
		if (user) {
			const salt = await bcrypt.genSalt(10);
			const hash = await bcrypt.hash(req.body.password, salt);
			req.body.password = hash;
			await db
				.collection(USERS_COLLECTION)
				.updateOne({ email: req.body.email }, { $set: { password: req.body.password } });
		}
		client.close();
		res.status(200).json({ message: 'Password updated Successfully' });
	} catch (error) {
		console.log(error);
		res.status(500).json({ message: 'something went wrong' });
	}
});

app.post('/postblog', [Authenticate], async (req, res) => {
	try {
		const client = await mongoClient.connect(DB_URL);
		const db = client.db(DATA_BASE);
		await db.collection(BLOGS_COLLECTION).insertOne({
			heading: req.body.heading,
			subHeading: req.body.subHeading,
			url: req.body.url,
			body: req.body.body,
			email: req.body.auth.email,
			date: new Date(),
		});
		res.status(200).json({ message: 'Post Added to your profile' });
		client.close();
	} catch (error) {
		console.log(error);
		res.status(500).json({ message: 'something went wrong' });
	}
});

app.get('/blogs', [Authenticate], async (req, res) => {
	try {
		const client = await mongoClient.connect(DB_URL);
		const db = client.db(DATA_BASE);
		let blogs = await db.collection(BLOGS_COLLECTION).find().toArray();
		console.log(blogs);
		client.close();
		res.status(200).json(blogs);
	} catch (error) {
		console.log(error);
		res.status(500).json({ message: 'Something went wrong' });
	}
});

app.get('/blogs/:id', [Authenticate], async (req, res) => {
	try {
		const client = await mongoClient.connect(DB_URL);
		const db = client.db(DATA_BASE);
		let blog = await db
			.collection(BLOGS_COLLECTION)
			.findOne({ _id: mongodb.ObjectID(req.params.id) });
		// console.log(posts);

		client.close();

		res.status(200).json(blog);
	} catch (error) {
		console.log(error);
		res.status(500).json({ message: 'Something went wrong' });
	}
});

app.delete('/blogs/:id', [Authenticate], async (req, res) => {
	try {
		const client = await mongoClient.connect(DB_URL);
		const db = client.db(DATA_BASE);
		await db.collection(BLOGS_COLLECTION).deleteOne({ _id: mongodb.ObjectID(req.params.id) });
		// console.log(posts);
		client.close();
		res.status(200).json({ message: 'Blog deleted' });
	} catch (error) {
		console.log(error);
		res.status(500).json({ message: 'Something went wrong' });
	}
});

app.put('/blogs/:id', [Authenticate], async (req, res) => {
	try {
		const client = await mongoClient.connect(DB_URL);
		const db = client.db(DATA_BASE);
		await db.collection(BLOGS_COLLECTION).updateOne(
			{ _id: mongodb.ObjectID(req.params.id) },
			{
				$set: {
					heading: req.body.heading,
					subHeading: req.body.subheading,
					imgUrl: req.body.url,
					message: req.body.postdiscription,
				},
			}
		);
		// console.log(posts);
		client.close();
		res.status(200).json({ message: 'Blog Updated' });
	} catch (error) {
		console.log(error);
		res.status(500).json({ message: 'Something went wrong' });
	}
});

app.listen(PORT, () => console.log(`:::server is up and running in port ${PORT}:::`));

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt');
const User = require('./users/user');
const cors = require('cors');

const app = express();

const PORT = process.env.PORT || 5000;
const db = process.env.MONGO_URI;
const secret = process.env.SESSION_SECRET;

app.use(cors());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: secret,
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false }
}));

mongoose.connect(db)
    .then(() => console.log('Connected to MongoDB Atlas successfully'))
    .catch((err) => console.error('MongoDB connection error:', err));


app.post('/register', async (req, res) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: 'Email already registered' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const newUser = new User({ email, passwordHash, role });
        await newUser.save();

        res.status(201).json({ message: 'User registered successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Something went wrong' });
    }
});



app.post('/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;

        const user = await User.findOne({ email, role }); 
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        req.session.user = user._id; 
        res.json({ message: 'Login successful!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Something went wrong' });
    }
});



app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

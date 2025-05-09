require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const User = require('./users/user');
const cors = require('cors');
const expressLayouts = require('express-ejs-layouts');

const app = express();

const PORT = process.env.PORT || 3000;
const db = process.env.MONGO_URI;
const secret = process.env.SESSION_SECRET;

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(expressLayouts);
app.set('layout', 'partials/layout');
app.set("layout extractScripts", true);
app.set("layout extractStyles", true);

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: secret,
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false }
}));

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    color: {
        type: String,
        required: true
    },
    parent: {
        type: String,
        required: true
    },
    children: {
        type: Array,
    }
})

const Category = mongoose.model("Category", categorySchema);

// Make user data available to all templates
app.use(async (req, res, next) => {
    if (req.session.user) {
        const user = await User.findById(req.session.user);
        res.locals.user = user;
    }
    next();
});

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
};

// Database connection
mongoose.connect(db)
    .then(() => console.log('Connected to MongoDB Atlas successfully'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.get('/', (req, res) => {
    res.render('pages/index', {
        title: 'Home'
    });
});

app.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/tasks');
    }
    res.render('pages/login', {
        title: 'Login',
        scripts: ['/scripts.js'],
        showSignup: req.query.signup === 'true'
    });
});

app.get('/about', (req, res) => {
    res.render('pages/about', {
        title: 'About'
    });
});

app.get('/tasks', requireAuth, (req, res) => {
    res.render('pages/tasks', {
        title: 'Tasks',
        role: res.locals.user.role
    });
});

app.get('/rewards', requireAuth, (req, res) => {
    res.render('pages/rewards', {
        title: 'Rewards'
    });
});

app.get('/profile', requireAuth, (req, res) => {
    res.render('pages/profile', {
        title: 'Profile',
        scripts: ['/scripts.js']
    });
});

app.get('/categories', requireAuth, async (req, res) => {
    try {
        const categoriesFound = await Category.find({ parent: req.session.user })
        res.json(categoriesFound)
    }
    catch (err) {
        console.log("db error", err)
        res.status(500).json({ message: 'Server error while fetching categories'})
    }
})

// For displaying tasks inside the created category div
app.get('/displayTasks', requireAuth, async (req, res) => {
    try {

    }
    catch (error) {
        console.log("db error", error)
        res.status(500).json({ message: 'Server error while fetching tasks'})
    }
})

// For creating tasks to be added to the db
app.post('/createTask', async (req, res) => {
    try {

    }
    catch (error) {
        console.log('db task error', error)
    }
})

app.post('/createCategory', async (req, res) => {
    try {
        const { name, color } = req.body;
        if (!name || !color ) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const newCategory = await Category.create({ name, color, parent: req.session.user, children: [] });
        res.status(201).json({ message: 'Category created successfully!'})
    }
    catch (error) {
        console.log('db category error', error)
    }
})

app.post('/editCategory', async (req, res) => {
    try {
        const { _id, name, color } = req.body;
        if (!_id) {
            return res.status(400).json({ message: 'Database error' });
        }

        await Category.updateOne({ _id}, { name, color });
        res.status(201).json({ message: 'Category updated successfully!' })
    }
    catch (error) {
        console.log('db category error', error)
    }
})

// API Routes
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

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});



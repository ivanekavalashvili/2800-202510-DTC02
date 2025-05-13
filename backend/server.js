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

const taskSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    taskdetails: {
        type: String,
        required: true
    },
    points: {
        type: String,
        required: true
    },
    catergoryName: {
        type: String,
        required: true
    },
    CreatedBy: {
        type: String,
    },
    children: {
        type: Array,
    }
})

const Category = mongoose.model("Category", categorySchema);
const Task = mongoose.model("Task", taskSchema)

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

app.get('/profile', requireAuth, async (req, res) => {
    const user = res.locals.user;

    let kids = [];
    if (user.role === 'parent') {
        kids = await User.find({ parent_email: user.email, role: 'kid' });
    }

    res.render('pages/profile', {
        title: 'Profile',
        role: user.role,
        kids // pass the array to EJS
    });
});

app.get('/categories', requireAuth, async (req, res) => {
    try {
        const categoriesFound = await Category.find({ parent: req.session.user })
        res.json(categoriesFound)
    }
    catch (err) {
        console.log("db error", err)
        res.status(500).json({ message: 'Server error while fetching categories' })
    }
})

app.get('/kids', requireAuth, async (req, res) => {
    const user = await User.findById(req.session.user);

    try {
        console.log(req.session.user.email)
        const kidsFound = await User.find({ parent_email: user.email })
        res.json(kidsFound)
    }
    catch (err) {
        console.log("db error", err)
        res.status(500).json({ message: 'Server error while fetching categories' })
    }
})

app.get('/kidCategories', requireAuth, async (req, res) => {
    const user = await User.findById(req.session.user);
    const parentId = (await User.findOne({ email: user.parent_email }))._id

    try {
        const categoriesFound = await Category.find({ parent: parentId })
        res.json(categoriesFound)
    }
    catch (err) {
        console.log("db error", err)
        res.status(500).json({ message: 'Server error while fetching categories' })
    }
})

app.get('/kidDisplayTasks', requireAuth, async (req, res) => {
    try {
        const category = req.query.category;
        console.log(category)
        const user = await User.findById(req.session.user);

        const tasksFound = await Task.find({ catergoryName: category, children: user._id.toString() }) 
        console.log(tasksFound)
        res.json(tasksFound)
    }
    catch (err) {
        console.log("db error", err)
        res.status(500).json({ message: 'Server error while fetching categories' })
    }
})

// For displaying tasks inside the created category div
app.get('/displayTasks', requireAuth, async (req, res) => {
    try {
        // Grabbing the name of the catergory
        const category = req.query.category;
        const tasksFound = await Task.find({ CreatedBy: req.session.user, catergoryName: category })
        res.json(tasksFound)
    }
    catch (error) {
        console.log("db error", error)
        res.status(500).json({ message: 'Server error while fetching tasks' })
    }
})

// For creating tasks to be added to the db
app.post('/createTask', requireAuth, async (req, res) => {
    try {
        // Getting informaiton from the form from task.ejs
        const { catergoryName, name, taskdetails, points, kids } = req.body;
        // Making sure that each field is actually filled in
        if (!name || !taskdetails || !points) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        // Creating a new document in the mongo database :D
        const newTask = await Task.create({ catergoryName, name, taskdetails, points, CreatedBy: req.session.user, children: kids })
        res.status(201).json({ message: 'Task created successfully!' })
    }
    catch (error) {
        console.log('db task error', error)
    }
})

app.post('/createCategory', async (req, res) => {
    try {
        const { name, color } = req.body;
        if (!name || !color) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const newCategory = await Category.create({ name, color, parent: req.session.user, children: [] });
        res.status(201).json({ message: 'Category created successfully!' })
    }
    catch (error) {
        console.log('db category error', error)
    }
})

app.post('/editCategory', async (req, res) => {
    try {
        const { _id, name, color, oldName } = req.body;
        console.log(_id + ' ' + name + ' ' + color + ' ' + oldName)
        if (!_id) {
            return res.status(400).json({ message: 'Category Id not found' });
        }

        await Category.updateOne({ _id }, { name, color });
        // Updating the tasks that are asscoiated with the category
        await Task.updateMany({ catergoryName: oldName }, { catergoryName: name })
        res.status(201).json({ message: 'Category updated successfully!' })
    }
    catch (error) {
        console.log('db category error', error)
    }
})

app.post('/deleteCategory', async (req, res) => {
    try {
        const { _id } = req.body;
        if (!_id) {
            return res.status(400).json({ message: 'Category Id not found' });
        }

        await Category.deleteOne({ _id });
        res.status(201).json({ message: 'Category deleted successfully!' })
    }
    catch (error) {
        console.log('db category error', error)
    }
})

app.post('/deleteTask', requireAuth, async (req, res) => {
    try {
        const { taskId, categoryName } = req.body;

        // Delete the task
        await Task.findByIdAndDelete(taskId);

        res.json({ message: 'Task deleted successfully' });
    } catch (err) {
        console.error('Error deleting task:', err);
        res.status(500).json({ message: 'Error deleting task' });
    }
});

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
        const newUser = new User({ email, passwordHash, role: "parent" });
        await newUser.save();

        res.status(201).json({ message: 'User registered successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Something went wrong' });
    }
});


app.post('/login', async (req, res) => {
    try {
        const { identifier, password, role } = req.body;

        if (!identifier || !password || !role) {
            return res.status(400).json({ message: 'Missing username or password' });
        }

        // Use email for parent, username for kid
        const query = role === 'kid'
            ? { username: identifier, role }
            : { email: identifier, role };

        const user = await User.findOne(query);
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



app.post('/add-kid', async (req, res) => {
    try {
        console.log("Received /add-kid request:", req.body);

        const parentId = req.session.user;
        const parent = await User.findById(parentId);

        if (!parent || parent.role !== 'parent') {
            return res.status(403).json({ message: 'Only parents can add kid accounts' });
        }

        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Missing fields' });
        }

        const existing = await User.findOne({ username });
        if (existing) {
            return res.status(409).json({ message: 'Username already taken' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const newKid = new User({
            email: `kid-${username}@placeholder.com`,
            username,
            passwordHash,
            parent_email: parent.email,
            role: 'kid'
        });

        await newKid.save();

        res.status(201).json({ message: 'Kid account created!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error creating kid account' });
    }
});



app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});


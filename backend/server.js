require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const User = require('./users/user');
const cors = require('cors');
const expressLayouts = require('express-ejs-layouts');
const { OpenAI } = require("openai");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

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
    logo: {
        type: String,
        required: true
    },
    points: {
        type: Number,
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
    },
    completedBy: {
        type: Array
    },
    // New fields for repeating tasks
    isRepeating: {
        type: Boolean,
        default: false
    },
    repeatInterval: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        default: null
    },
    lastResetTime: {
        type: Date,
        default: null
    }
})

const Category = mongoose.model("Category", categorySchema);
const Task = mongoose.model("Task", taskSchema)


const rewardSchema = new mongoose.Schema({
    rewardTitle: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    pointsNeeded: {
        type: Number,
        required: true
    },
    parentEmail: {
        type: String,
        required: true
    }
});

const Reward = mongoose.model('Reward', rewardSchema);


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

app.post('/generateImage', async (req, res) => {
    try {
        const prompt = thing

        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: "256x256"
        });

        const imageUrl = response.data[0].url;
        res.json({ imageUrl })

    } catch (err) {
        console.error(err);
        res.status(500).send('Error generating image')
    }
})

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

app.get('/rewards', requireAuth, async (req, res) => {
    const user = res.locals.user;

    let rewards = [];

    if (user.role === 'parent') {
        rewards = await Reward.find({ parentEmail: user.email });
    } else if (user.role === 'kid') {
        rewards = await Reward.find({ parentEmail: user.parent_email });
    }

    res.render('pages/rewards', {
        title: 'Rewards',
        role: user.role,
        rewards
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
        kids
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

// gets the current user
app.get('/user', requireAuth, async (req, res) => {
    const user = await User.findById(req.session.user);
    try {
        res.json(user)
    }
    catch (err) {
        console.log("db error", err)
        res.status(500).json({ message: 'Server error while fetching user' })
    }
})

app.get('/kidDisplayTasks', requireAuth, async (req, res) => {
    try {
        const category = req.query.category;
        const user = await User.findById(req.session.user);

        const tasksFound = await Task.find({ catergoryName: category, children: user._id.toString() })
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

app.post('/kidFinishTask', requireAuth, async (req, res) => {
    try {
        const { task } = req.body
        const user = await User.findById({ _id: req.session.user })
        user.points = (user.points || 0) + task.points
        await user.save()
        const result = await Task.updateOne(
            { _id: task._id },
            { $addToSet: { completedBy: user._id } }
        )
        console.log(result)
        res.status(201).json({ message: 'Points added and task complete!' })
    }
    catch (error) {
        console.log("db error", error)
        res.status(500).json({ message: 'Server error' })
    }
})

// Function to check and reset repeating tasks
async function resetRepeatingTasks() {
    try {
        const tasks = await Task.find({ isRepeating: true });
        const now = new Date();

        for (const task of tasks) {
            if (!task.lastResetTime) {
                task.lastResetTime = now;
                await task.save();
                continue;
            }

            let shouldReset = false;
            const timeDiff = now - task.lastResetTime;

            switch (task.repeatInterval) {
                case 'daily':
                    shouldReset = timeDiff >= 24 * 60 * 60 * 1000; // 24 hours
                    break;
                case 'weekly':
                    shouldReset = timeDiff >= 7 * 24 * 60 * 60 * 1000; // 7 days
                    break;
                case 'monthly':
                    // Approximate month as 30 days
                    shouldReset = timeDiff >= 30 * 24 * 60 * 60 * 1000;
                    break;
            }

            if (shouldReset) {
                // Reset the task by clearing completedBy array
                task.completedBy = [];
                task.lastResetTime = now;
                await task.save();
            }
        }
    } catch (error) {
        console.error('Error resetting tasks:', error);
    }
}

// Run task reset check every hour
setInterval(resetRepeatingTasks, 60 * 60 * 1000);

// Also run it when server starts
resetRepeatingTasks();

// Modify createTask to handle repeating tasks
app.post('/createTask', requireAuth, async (req, res) => {
    try {
        const { catergoryName, name, taskdetails, points, kids, isRepeating, repeatInterval } = req.body;
        if (!name || !taskdetails || !points) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const newTask = await Task.create({
            catergoryName,
            name,
            taskdetails,
            points,
            CreatedBy: req.session.user,
            children: kids,
            isRepeating,
            repeatInterval,
            lastResetTime: new Date()
        });

        res.status(201).json({ message: 'Task created successfully!' });
    } catch (error) {
        console.log('db task error', error);
        res.status(500).json({ message: 'Error creating task' });
    }
});

app.post('/editTask', async (req, res) => {
    try {
        const { _id, name, taskDetails, points } = req.body;
        console.log(_id + ' ' + name + ' ' + taskDetails + ' ' + points)
        if (!_id) {
            return res.status(400).json({ message: 'Task Id not found' });
        }
        // Update the task once submit is pressed
        await Task.updateOne({ _id }, { name: name, taskdetails: taskDetails, points: points })
        res.status(201).json({ message: 'Task updated successfully!' })
    }
    catch (error) {
        console.log('db category error', error)
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

app.post('/deleteTask', async (req, res) => {
    try {
        const { _id } = req.body;
        console.log(_id)
        if (!_id) {
            return res.status(400).json({ message: 'Task id not found' });
        }

        await Task.deleteOne({ _id });
        res.status(201).json({ message: 'Task deleted successfully!' })
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
            role: 'kid',
            points: 0
        });

        await newKid.save();

        res.status(201).json({ message: 'Kid account created!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error creating kid account' });
    }
});

// Create reward
app.post('/rewards', requireAuth, async (req, res) => {
    try {
        const { title, description, cost } = req.body;

        if (!title || !description || !cost) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const user = res.locals.user;

        const newReward = new Reward({
            rewardTitle: title,
            description,
            pointsNeeded: parseInt(cost),
            parentEmail: user.email
        });

        await newReward.save();
        res.status(201).json({ message: 'Reward saved successfully!' });

    } catch (err) {
        console.error('Error saving reward:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

//edit a reward
app.put('/rewards/:id', requireAuth, async (req, res) => {
    try {
        const rewardId = req.params.id;
        const { title, description, cost } = req.body;

        if (!title || !description || !cost) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const updated = await Reward.findByIdAndUpdate(
            rewardId,
            {
                rewardTitle: title,
                description,
                pointsNeeded: parseInt(cost)
            },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ message: "Reward not found" });
        }

        res.status(200).json({ message: "Reward updated successfully" });
    } catch (err) {
        console.error("Edit reward error:", err);
        res.status(500).json({ message: "Server error while updating reward" });
    }
});

//delete a reward
app.delete('/rewards/:id', requireAuth, async (req, res) => {
    try {
        const rewardId = req.params.id;
        const user = res.locals.user;

        const reward = await Reward.findById(rewardId);
        if (!reward) {
            return res.status(404).json({ message: "Reward not found" });
        }

        await Reward.deleteOne({ _id: rewardId });
        res.status(200).json({ message: "Reward deleted successfully" });
    } catch (err) {
        console.error("Delete error:", err);
        res.status(500).json({ message: "Server error while deleting reward" });
    }
});

// Endpoint to get user points
app.get('/user-points', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.user);
        res.json({ points: user.points || 0 });
    } catch (error) {
        console.error('Error fetching user points:', error);
        res.status(500).json({ message: 'Error fetching points' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});


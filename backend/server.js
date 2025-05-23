require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const User = require('./users/user');
const cors = require('cors');
const expressLayouts = require('express-ejs-layouts');
const { OpenAI } = require('openai');
const fs = require('fs');
const axios = require('axios');


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
app.use('/images', express.static(path.join(__dirname, 'images')))
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: secret,
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false }
}));

app.use(async (req, res, next) => {
    res.locals.user = null;
    res.locals.role = null;

    if (req.session.user) {
        try {
            const user = await User.findById(req.session.user);
            if (user) {
                res.locals.user = user;
                res.locals.role = user.role;
            }
        } catch (err) {
            console.error('Error in auth middleware:', err);
        }
    }
    next();
});

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
    filename: {
        type: String
    },
    taskdetails: {
        type: String
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
    },
    isRepeatable: {
        type: Boolean,
        default: false
    },
    repeatInterval: {
        type: String,
        enum: ['daily', 'weekly', 'unlimited'],
        default: null
    },
    claimedBy: {
        type: [String],
        default: []
    },
    lastResetTime: {
        type: Date,
        default: null
    }
});

const Reward = mongoose.model('Reward', rewardSchema);

// notifications for both rewards and tasks
const notificationSchema = new mongoose.Schema({
    fromWho: {
        type: String,
        required: true
    },
    forWho: {
        type: String,
        required: true
    },
    taskRewardId: {
        type: String,
        required: true
    },
    taskOrReward: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    points: {
        type: Number,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    isRead: {
        type: Boolean,
        default: false
    },
    auditNotes: {
        type: String
    },
    modifiedPoints: {
        type: Number
    },
    rewardTitle: {
        type: String
    },
    rewardDescription: {
        type: String
    }
});

const Notification = mongoose.model('Notification', notificationSchema);

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

// renders the login page
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

// renders the about page
app.get('/about', (req, res) => {
    res.render('pages/about', {
        title: 'About'
    });
});

// renders the tasks page
app.get('/tasks', requireAuth, (req, res) => {
    res.render('pages/tasks', {
        title: 'Tasks',
        role: res.locals.user.role
    });
});

// gets the rewards made by the parent
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

// gets the user's profile
app.get('/profile', requireAuth, async (req, res) => {
    const user = res.locals.user;

    let kids = [];
    if (user.role === 'parent') {
        kids = await User.find({ parent_email: user.email, role: 'kid' });
    }

    res.render('pages/profile', {
        title: 'Profile',
        role: user.role,
        username: user.username || user.email,
        kids
    });
});

// gets categories created by parents
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

// gets children assigned to a parent
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

// gets categories assigned to children
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

// Updates a task with the kid's 
app.post('/kidFinishTask', requireAuth, async (req, res) => {
    try {
        const { task } = req.body
        const user = await User.findById({ _id: req.session.user })

        // updates the kid's points with the amount from the task
        user.points = (user.points || 0) + task.points
        await user.save()

        // updates the task completedBy array to show the kid has completed the task
        const completed = await Task.updateOne(
            { _id: task._id },
            { $addToSet: { completedBy: user._id } }
        )
        console.log(completed)

        // creates a notification to notify the parent that the kid has completed a task and audit it.
        const notify = await Notification.create({
            fromWho: user._id,
            forWho: user.parent_email,
            taskRewardId: task._id,
            taskOrReward: "task",
            points: task.points,
            status: 'pending'
        })
        console.log("This is the notification that is generated:")
        console.log(notify)

        res.status(201).json({ message: 'Points added and task complete!', points: user.points })
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

//function to check and reset rewards
async function resetRepeatableRewards() {
    try {
        const rewards = await Reward.find({ isRepeatable: true, repeatInterval: { $ne: 'unlimited' } });
        const now = new Date();

        for (const reward of rewards) {
            if (!reward.lastResetTime) {
                reward.lastResetTime = now;
                reward.claimedBy = [];
                await reward.save();
                continue;
            }

            let shouldReset = false;
            const timeDiff = now - reward.lastResetTime;

            switch (reward.repeatInterval) {
                case 'daily':
                    shouldReset = timeDiff >= 24 * 60 * 60 * 1000;
                    break;
                case 'weekly':
                    shouldReset = timeDiff >= 7 * 24 * 60 * 60 * 1000;
                    break;
            }

            if (shouldReset) {
                reward.claimedBy = [];
                reward.lastResetTime = now;
                await reward.save();
            }
        }
    } catch (error) {
        console.error('Error resetting rewards:', error);
    }
}

setInterval(resetRepeatableRewards, 60 * 60 * 1000);

resetRepeatableRewards();

// Stores an image in the backend images folder
async function downloadImage(imageUrl, filename) {
    const res = await axios.get(imageUrl, { responseType: 'stream' });
    const filePath = path.join(__dirname, 'images', filename);
    const writer = fs.createWriteStream(filePath);
    res.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(`/images/${filename}`));
        writer.on('error', reject);
    })
}

// Modify createTask to handle repeating tasks
app.post('/createTask', requireAuth, async (req, res) => {
    try {
        const { catergoryName, name, logoUrl, taskdetails, points, kids, isRepeating, repeatInterval } = req.body;
        if (!name && !points) {
            return res.status(400).json({ message: 'Missing both Task name and points' });
        }
        if (!name) {
            return res.status(400).json({ message: 'Missing Task name' });
        }
        if (!points) {
            return res.status(400).json({ message: 'Missing Task points' });
        }

        let filename = null;
        if (logoUrl) {
            filename = `img-${new Date().toString().split(" ").join("").slice(0, 23).replace(/[:.]/g, '-')}-${Math.random().toString().slice(2, -1)}.png`
            const savedPath = await downloadImage(logoUrl, filename)
        }
        console.log(filename)

        const newTask = await Task.create({
            catergoryName,
            name,
            filename,
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

// Edits the task in the database
app.post('/editTask', async (req, res) => {
    try {
        const { _id, logoUrl, name, taskDetails, points, kids, isRepeating, repeatInterval } = req.body;
        if (!name && !points) {
            return res.status(400).json({ message: 'Missing both Task name and points' });
        }
        if (!name) {
            return res.status(400).json({ message: 'Missing Task name' });
        }
        if (!points) {
            return res.status(400).json({ message: 'Missing Task points' });
        }

        console.log(_id + ' ' + name + ' ' + taskDetails + ' ' + points)
        if (!_id) {
            return res.status(400).json({ message: 'Task Id not found' });
        }

        let filename = null;
        if (logoUrl) {
            filename = `img-${new Date().toString().split(" ").join("").slice(0, 23).replace(/[:.]/g, '-')}-${Math.random().toString().slice(2, -1)}.png`
            const savedPath = await downloadImage(logoUrl, filename)
            console.log(filename)
            await Task.updateOne(
                { _id },
                {
                    name: name,
                    filename: filename,
                    taskdetails: taskDetails,
                    points: points,
                    children: kids,
                    isRepeating: isRepeating,
                    repeatInterval: repeatInterval,
                    // Only update lastResetTime if repeating status or interval changed
                    ...(isRepeating ? { lastResetTime: new Date() } : {})
                }
            );
        } else {
            await Task.updateOne(
                { _id },
                {
                    name: name,
                    taskdetails: taskDetails,
                    points: points,
                    children: kids,
                    isRepeating: isRepeating,
                    repeatInterval: repeatInterval,
                    // Only update lastResetTime if repeating status or interval changed
                    ...(isRepeating ? { lastResetTime: new Date() } : {})
                }
            );
        }

        // Update the task once submit is pressed
        res.status(201).json({ message: 'Task updated successfully!' })
    }
    catch (error) {
        console.log('db category error', error)
    }
});

// Creates a category and puts it in the database
app.post('/createCategory', async (req, res) => {
    try {
        const { name, color } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Missing Category name' });
        }

        const newCategory = await Category.create({ name, color, parent: req.session.user, children: [] });
        res.status(201).json({ message: 'Category created successfully!' })
    }
    catch (error) {
        console.log('db category error', error)
    }
})

// deletes a task from the database
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

// Edits a category in the database
app.post('/editCategory', async (req, res) => {
    try {
        const { _id, name, color, oldName } = req.body;
        console.log(_id + ' ' + name + ' ' + color + ' ' + oldName)
        if (!_id) {
            return res.status(400).json({ message: 'Category Id not found' });
        }
        if (!name) {
            return res.status(400).json({ message: 'Missing Category name' });
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

// deletes a category form the database
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

// Creates a Kid account
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

// deletes a kid's account from the database
app.delete('/kids/:id', requireAuth, async (req, res) => {
    try {
        const user = res.locals.user;
        const kidId = req.params.id;

        const kid = await User.findOne({ _id: kidId, parent_email: user.email, role: 'kid' });
        if (!kid) {
            return res.status(404).json({ message: "Kid not found or does not belong to this parent" });
        }

        await User.deleteOne({ _id: kidId });

        res.status(200).json({ message: "Kid deleted successfully" });
    } catch (err) {
        console.error("Error deleting kid:", err);
        res.status(500).json({ message: "Server error while deleting kid" });
    }
});


// Create reward
app.post('/rewards', requireAuth, async (req, res) => {
    try {
        const { title, description, cost, isRepeatable, repeatInterval } = req.body;

        if (!title || !description || !cost) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const user = res.locals.user;

        const newReward = new Reward({
            rewardTitle: title,
            description,
            pointsNeeded: parseInt(cost),
            parentEmail: user.email,
            isRepeatable: isRepeatable === 'true' || isRepeatable === true,
            repeatInterval: isRepeatable ? repeatInterval : null

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

// Logs out the user
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Initialize the OpenAI client with your API key
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// This function was generated by ChatGPT and polished by us to work with our code
app.post('/generate-image', async (req, res) => {
    try {
        const prompt = req.body.prompt;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: "1024x1024"
        });

        if (response && response.data && response.data.length > 0) {
            const imageUrl = response.data[0].url;
            return res.json({ imageUrl });
        } else {
            return res.status(500).json({ error: 'No image generated' });
        }
    } catch (err) {
        console.error('Error generating image:', err);
        return res.status(500).json({
            error: err.message || 'Error generating image',
            fallbackImageUrl: 'https://upload.wikimedia.org/wikipedia/en/7/73/Trollface.png'
        });
    }
});

// Claim a reward
app.post('/rewards/:id/claim', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.user);
        if (user.role !== 'kid') {
            return res.status(403).json({ message: 'Only kids can claim rewards' });
        }

        const reward = await Reward.findById(req.params.id);
        if (!reward) {
            return res.status(404).json({ message: 'Reward not found' });
        }
        console.log("Full reward object:", reward);
        const hasClaimed = reward.claimedBy.includes(user._id.toString());

        if (!reward.isRepeatable && hasClaimed) {
            return res.status(400).json({ message: 'This reward can only be claimed once' });
        }

        if (reward.isRepeatable && reward.repeatInterval !== 'unlimited' && hasClaimed) {
            return res.status(400).json({ message: `This reward can only be claimed once per ${reward.repeatInterval}` });
        }

        if (user.points < reward.pointsNeeded) {
            return res.status(400).json({ message: 'Not enough points to claim this reward' });
        }

        reward.claimedBy.push(user._id.toString());
        await reward.save();

        // Deduct points
        user.points -= reward.pointsNeeded;
        await user.save();

        // creates a notification to notify the parent that the kid has completed a task and audit it.
        console.log("\n=== REWARD CLAIM NOTIFICATION CREATION ===");
        console.log("Reward object:", {
            id: reward._id,
            title: reward.rewardTitle,
            description: reward.description,
            points: reward.pointsNeeded
        });
        console.log("User details:", {
            id: user._id,
            email: user.email,
            parentEmail: user.parent_email
        });

        const notify = await Notification.create({
            fromWho: user._id,
            forWho: user.parent_email,
            taskRewardId: reward._id,
            taskOrReward: "reward",
            points: reward.pointsNeeded,
            status: 'pending',
            rewardTitle: reward.rewardTitle,
            rewardDescription: reward.description
        });

        console.log("Created notification:", {
            id: notify._id,
            rewardTitle: notify.rewardTitle,
            rewardDescription: notify.rewardDescription,
            points: notify.points,
            status: notify.status
        });
        console.log("=== END REWARD CLAIM NOTIFICATION ===\n");

        res.status(200).json({
            message: 'Reward claimed successfully!',
            newPoints: user.points
        });
    } catch (err) {
        console.error('Error claiming reward:', err);
        res.status(500).json({ message: 'Server error while claiming reward' });
    }
});

// Get notifications for a user
app.get('/notifications', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.user);
        console.log("\n=== FETCHING NOTIFICATIONS ===");
        console.log("For user:", {
            id: user._id,
            email: user.email
        });

        const notifications = await Notification.find({ forWho: user.email })
            .sort({ createdAt: -1 });

        console.log("Found notifications:", notifications.map(n => ({
            id: n._id,
            type: n.taskOrReward,
            rewardTitle: n.rewardTitle,
            rewardDescription: n.rewardDescription,
            points: n.points,
            status: n.status
        })));
        console.log("=== END FETCHING NOTIFICATIONS ===\n");

        res.json(notifications);
    } catch (err) {
        console.error('Error fetching notifications:', err);
        res.status(500).json({ message: 'Server error while fetching notifications' });
    }
});

// Delete a notification
app.delete('/notifications/:id', requireAuth, async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        const user = await User.findById(req.session.user);
        if (notification.forWho !== user.email) {
            return res.status(403).json({ message: 'Not authorized to delete this notification' });
        }

        await Notification.deleteOne({ _id: req.params.id });
        res.status(200).json({ message: 'Notification deleted successfully' });
    } catch (err) {
        console.error('Error deleting notification:', err);
        res.status(500).json({ message: 'Server error while deleting notification' });
    }
});

// Update notification status (for audit)
app.put('/notifications/:id/audit', requireAuth, async (req, res) => {
    try {
        const { status, modifiedPoints, auditNotes } = req.body;
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        const user = await User.findById(req.session.user);
        if (notification.forWho !== user.email) {
            return res.status(403).json({ message: 'Not authorized to audit this notification' });
        }

        // Update notification
        notification.status = status;
        notification.auditNotes = auditNotes;
        notification.modifiedPoints = modifiedPoints;
        await notification.save();

        // If approved or rejected, update user points and create child notification
        if (status === 'approved' || status === 'rejected') {
            const child = await User.findById(notification.fromWho);
            const pointsChange = modifiedPoints || notification.points;

            if (notification.taskOrReward === 'task') {
                if (status === 'approved') {
                    // For tasks, only add points on approval
                    child.points += pointsChange;
                }
                // For tasks, do nothing on rejection since points were already deducted
            } else {
                // For rewards
                if (status === 'approved') {
                    // Points already deducted when claiming reward
                } else {
                    // Refund points on reward rejection
                    child.points += pointsChange;
                }
            }
            await child.save();

            // Create notification for child
            await Notification.create({
                fromWho: user._id,
                forWho: child.email,
                taskRewardId: notification.taskRewardId,
                taskOrReward: notification.taskOrReward,
                status: status,
                points: pointsChange,
                auditNotes: auditNotes
            });
        }

        res.status(200).json({ message: 'Notification audited successfully' });
    } catch (err) {
        console.error('Error auditing notification:', err);
        res.status(500).json({ message: 'Server error while auditing notification' });
    }
});

// Mark notification as read
app.put('/notifications/:id/read', requireAuth, async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        const user = await User.findById(req.session.user);
        if (notification.forWho !== user.email) {
            return res.status(403).json({ message: 'Not authorized to update this notification' });
        }

        notification.isRead = true;
        await notification.save();
        res.status(200).json({ message: 'Notification marked as read' });
    } catch (err) {
        console.error('Error marking notification as read:', err);
        res.status(500).json({ message: 'Server error while updating notification' });
    }
});

app.get('/notifications-page', requireAuth, (req, res) => {
    res.render('pages/notifications', {
        title: 'Notifications',
        role: res.locals.user.role,
        layout: 'partials/layout'
    });
});

// Get a single notification by ID
app.get('/notifications/:id', requireAuth, async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        const user = await User.findById(req.session.user);
        if (notification.forWho !== user.email) {
            return res.status(403).json({ message: 'Not authorized to view this notification' });
        }

        // Get the kid's information who triggered the notification
        const kid = await User.findById(notification.fromWho);
        const notificationWithKid = {
            ...notification.toObject(),
            kidName: kid.username,
            kidEmail: kid.email
        };

        // If it's a reward claim, get the reward details
        if (notification.taskOrReward === 'reward') {
            const reward = await Reward.findById(notification.taskRewardId);
            if (reward) {
                notificationWithKid.rewardTitle = reward.rewardTitle;
                notificationWithKid.rewardDescription = reward.description;
            }
        }

        console.log("Notification with details:", notificationWithKid);
        res.json(notificationWithKid);
    } catch (err) {
        console.error('Error fetching notification:', err);
        res.status(500).json({ message: 'Server error while fetching notification' });
    }
});

//Get username and points for leaderboard
app.get('/leaderboard', requireAuth, async (req, res) => {
    const currentUser = await User.findById(req.session.user);

    if (currentUser.role !== 'kid') {
        return res.status(403).json({ message: 'Access denied' });
    }

    try {
        const leaderboard = await User.find({ parent_email: currentUser.parent_email, role: 'kid' })
            .select('username points')
            .sort({ points: -1 });

        res.json(leaderboard);
    } catch (err) {
        console.error('Error fetching leaderboard:', err);
        res.status(500).json({ message: 'Error fetching leaderboard' });
    }
});

app.use((req, res, next) => {
    res.status(404).render('pages/error', {
        title: 'Page Not Found',
        statusCode: 404,
        message: 'The page you are looking for does not exist.',
        user: req.session.user ? res.locals.user : undefined,
        role: req.session.user ? res.locals.role : undefined
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('pages/error', {
        title: 'Server Error',
        statusCode: 500,
        message: process.env.NODE_ENV === 'production'
            ? 'Something went wrong on our end. Please try again later.'
            : err.message || 'Internal Server Error',
        user: req.session.user ? res.locals.user : undefined,
        role: req.session.user ? res.locals.role : undefined
    });
});

# Gamify Life


## Project Description

We are building a platform for parents to create a fun chore manager and reward system that motivates kids to complete their chores. Parents can assign tasks, approve completions, and manage rewards, making responsibility more engaging for the whole family.



## Technologies Used

### 🖥️ Frontend
- **HTML5** – Structure for all pages
- **CSS3** – Responsive design with custom color variables
- **JavaScript** – Handles client-side logic and interactions
- **EJS** – Template engine for dynamic server-rendered HTML


### 🌐 Backend
- **express** – Web framework for handling routing and server logic
- **express-session** – Middleware for user session management
- **express-ejs-layouts** – Layout support for EJS views
- **mongoose** – Object Data Modeling (ODM) for MongoDB
- **bcrypt** – Password hashing for secure authentication
- **cors** – Enables Cross-Origin Resource Sharing
- **dotenv** – Loads environment variables from `.env`
- **axios** – Makes HTTP requests to external APIs (OpenAI, OpenWeather)


### 🗃️ Database
- **MongoDB Atlas** – Cloud-based NoSQL database
- **Mongoose** – ODM (Object Data Modeling) for MongoDB schemas


### 🔌 External APIs
- **OpenWeather API** – Fetches real-time weather data
- **OpenAi API** – Generates AI-powered content (e.g. task ideas, names)


### 🧰 Developer Tools
- **Git & GitHub** – Version control and collaboration
- **SourceTree** – Git GUI for commit and branch management
- **nodemon** – Auto-restarts the server during development


## File Structure

Here’s an overview of the project’s folder structure:

```bash
├── README.md
├── backend
│   ├── package-lock.json
│   ├── package.json
│   ├── server.js
│   ├── users
│   │   └── user.js
│   └── views
├── frontend
├── public
│   ├── scripts.js
│   ├── styles.css
│   └── tailwind.config.js
└── views
    ├── pages
    │   ├── about.ejs
    │   ├── index.ejs
    │   ├── login.ejs
    │   ├── notifications.ejs
    │   ├── profile.ejs
    │   ├── rewards.ejs
    │   └── tasks.ejs
    └── partials
        ├── footer.ejs
        ├── header.ejs
        └── layout.ejs
```


## How to Install or Run the Project

This section will guide you through setting up the local development environment for the Gamify Life web application.

### 🔧 1. Required Installations

#### 🧑‍💻 Languages
- **JavaScript** – Used for both frontend and backend logic

#### 📦 Backend Dependencies (Installed via `npm install`)
These are installed automatically when you run `npm install` inside the `/backend` folder:

- **express** – Web framework for handling routing and server logic
- **express-session** – Middleware for user session management
- **express-ejs-layouts** – Layout support for EJS views
- **mongoose** – Object Data Modeling (ODM) for MongoDB
- **bcrypt** – Password hashing for secure authentication
- **cors** – Enables Cross-Origin Resource Sharing
- **dotenv** – Loads environment variables from `.env`
- **axios** – Makes HTTP requests to external APIs (OpenAI, OpenWeather)
- **openai** – OpenAI API client for GPT functionality


#### ⚙️ Other Tools
- **Git** – For cloning the repo and managing version control
- **SourceTree** – Git GUI for commit and branch management



### 🌐 2. APIs and Frameworks Used

You do not need to download these manually — they're automatically pulled by `npm install`, but you'll need **API keys** to use them.

- **OpenWeather API** – for real-time weather data
- **OpenAI API** – for AI-generated content (optional)



### 🔑 3. API Keys Required

You must register and obtain the following API keys:

- [OpenWeather API Key](https://openweathermap.org/)
- [OpenAI API Key](https://openai.com/index/openai-api/)

These keys must be stored in a `.env` file.



### 📥 4. Installation Order & Configuration

1. **Clone the Repository**
   
   git clone https://github.com/JoNoToPo/COMP_2800_GitFlow_Workflow_DTC09.git
   
2. **Install Dependencies**
   
   - cd backend
   - npm install 

3. **Create .env file**

- inside /backend, create a .env file and put in:

```bash
PORT=3000
MONGO_URI=your-mongodb-connection-string
SESSION_SECRET=your-session-secret
OPENAI_API_KEY=your-openai-api-key
WEATHER_API_KEY=your-openweather-api-key
```

> ⚠️ Note: The OpenWeather API key is currently hardcoded in the frontend for demonstration purposes.  
> In a production app, this should be stored securely in environment variables on the backend.

4. **Run the application**

While inside the `backend/` folder, start the server with:

 - nodemon server.js

Then open your browser and go to:

 - http://localhost:3000

5. **Testing Plan**

- [Link](https://docs.google.com/spreadsheets/d/1BGfmW8a5jIlr8jtC6-TCKbxYkn_VFtPzNv3A0_FQdT4/edit?gid=0#gid=0)



## How to Use the Product (Features)

### 👨‍👩‍👧 Parent Features
- Create a parent account and log in
- Add child profiles and link them to the parent account
- Assign chores to each child with a name, description, and points
- View and approve completed tasks submitted by children
- Create, edit, or delete rewards (including one-time and repeatable rewards)
- Redeem rewards for kids once they reach the required points
- View all linked children

### 🧒 Kid Features
- Log in using their linked child account
- View assigned chores
- Submit tasks for approval once completed
- View earned points
- Redeem available rewards
- Check leaderboard to see how they compare with siblings or other linked kids



### Credits, References, and Licenses 

idk what to write



## How We Used AI and APIs

### 🤖 OpenAI API
We used the **OpenAI API** to assist with generating reward names and motivational messages.  
This feature added variety and creativity to the reward creation process, making the app more engaging for parents and kids.

- Called from the backend to generate dynamic images based on prompts

### 🌦️ OpenWeather API
We used the **OpenWeather API** to fetch and display real-time weather data on the parent dashboard.  
This adds helpful information that might influence chore assignment (e.g. outdoor tasks).

- Retrieved current temperature, weather description, and icon using latitude and longitude from the user's browser


## Contact Information

If you have any questions, feedback, or would like to contribute, feel free to reach out to any member of our team:

- **Adnan Abdulle** – adnan.abdulle1@my.bcit.ca
- **Jonathan Engelhard**
- **Aibyn Dalel**
- **Ivane Kavalashvili**
- **Josh Trepanier**

> 📬 For project-related inquiries, contact us via GitHub or through your course communication channels.
// Toggle active role button
const parentBtn = document.getElementById('parentBtn');
const kidBtn = document.getElementById('kidBtn');
let selectedRole = 'parent'

parentBtn.addEventListener('click', () => {

    parentBtn.classList.add('active');
    kidBtn.classList.remove('active');
});

kidBtn.addEventListener('click', () => {
    selectedRole = 'kid'
    kidBtn.classList.add('active');
    parentBtn.classList.remove('active');
});

// Form switching functionality
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const showSignupLink = document.getElementById('showSignup');
const showLoginLink = document.getElementById('showLogin');

showSignupLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.remove('active');
    signupForm.classList.add('active');
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    signupForm.classList.remove('active');
    loginForm.classList.add('active');
}); 

//Handles signing up
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!selectedRole) {
        alert('Please select a role (Parent or Kid).');
        return;
    }

    const email = e.target[1].value;
    const password = e.target[2].value;

    console.log('Registering:', { email, password, role: selectedRole });

    const res = await fetch('http://localhost:3000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: selectedRole })
    });

    const data = await res.json();
    if (data.message === 'User registered successfully!') {
        window.location.href = 'login.html'; 
    } else {
        alert(data.message);
    }

});


//Handles logging in
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!selectedRole) {
        alert('Please select a role (Parent or Kid).');
        return;
    }

    const email = e.target[0].value;
    const password = e.target[1].value;
    console.log('Sending:', { email, password, role: selectedRole });

    const res = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: selectedRole }) 
    });

    const data = await res.json();
    if (data.message === 'Login successful!') {
        window.location.href = 'tasks';
    } else {
        alert(data.message);
    }
});

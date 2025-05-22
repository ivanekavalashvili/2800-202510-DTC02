// Get form elements
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const showSignupLink = document.getElementById('showSignup');
const showLoginLink = document.getElementById('showLogin');
const parentBtn = document.getElementById('parentBtn');
const kidBtn = document.getElementById('kidBtn');
let selectedRole = 'parent';

// Check URL parameters when page loads
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('signup') === 'true') {
        loginForm.classList.remove('active');
        signupForm.classList.add('active');
    }
});

// Toggle active role button
parentBtn.addEventListener('click', () => {
    parentBtn.classList.add('active');
    kidBtn.classList.remove('active');
    selectedRole = 'parent';
});

kidBtn.addEventListener('click', () => {
    selectedRole = 'kid';
    kidBtn.classList.add('active');
    parentBtn.classList.remove('active');
});

// Form switching functionality
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
        Swal.fire({
            title: 'Role Required',
            text: 'Please select a role (Parent or Kid).',
            icon: 'warning',
            confirmButtonColor: '#247A34'
        });
        return;
    }

    const email = e.target[1].value;
    const password = e.target[2].value;

    console.log('Registering:', { email, password, role: selectedRole });

    const res = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: selectedRole })
    });

    const data = await res.json();
    if (data.message === 'User registered successfully!') {
        window.location.href = '/login';
    } else {
        Swal.fire({
            title: 'Notice',
            text: data.message || 'Something happened.',
            icon: 'info',
            confirmButtonColor: '#247A34'
        });
    }
});

//Handles logging in
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!selectedRole) {
        Swal.fire({
            title: 'Role Required',
            text: 'Please select a role (Parent or Kid).',
            icon: 'warning',
            confirmButtonColor: '#247A34'
        });
        return;
    }

    const identifier = e.target[0].value;
    const password = e.target[1].value;
    console.log('Sending:', { identifier, password, role: selectedRole });

    const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, role: selectedRole })
    });


    const data = await res.json();
    if (data.message === 'Login successful!') {
        window.location.href = '/tasks';
    } else {
        Swal.fire({
            title: 'Notice',
            text: data.message || 'Something happened.',
            icon: 'info',
            confirmButtonColor: '#247A34'
        });
    }
});

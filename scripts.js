// Toggle active role button
const parentBtn = document.getElementById('parentBtn');
const kidBtn = document.getElementById('kidBtn');

parentBtn.addEventListener('click', () => {
    parentBtn.classList.add('active');
    kidBtn.classList.remove('active');
});

kidBtn.addEventListener('click', () => {
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
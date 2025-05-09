const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        unique: true,
        sparse: true
    },
    username: {
        type: String,
        unique: true
    },
    parent_email: {
        type: String,
    },
    passwordHash: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('User', userSchema);

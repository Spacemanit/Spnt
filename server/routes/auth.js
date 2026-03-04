import express from 'express';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

dotenv.config();

router.post("/login", async (req, res) => {
    let email = req.body.email;
    const password = req.body.password;
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(400).json({ message: "Invalid credentials" });
    }
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
        return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );

    res.status(200).json({ message: "Success", token, userId: user._id, currency: user.currency });
});

router.post("/signup", async (req, res) => {
    let email = req.body.email
    let password = req.body.password
    let name = req.body.name;
    if (!email || !password || !name) {
        return res.status(400).json({ message: "Please enter all fields" });
    }
    const user = await User.findOne({ email: email });
    if (user) {
        return res.status(400).json({ message: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10)
    const newUser = await User.create({ email, password: hashed, name, currency: 'USD' });
    res.status(201).json({ message: "Success" });
});

router.put('/update', async (req, res) => {
    const { userId, name, email, password } = req.body;
    if (!userId || !name || !email) {
        return res.status(400).json({ message: "Please enter all fields" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.findOneAndUpdate({ _id: userId }, { name, email, password: hashedPassword }, { returnDocument: 'after' });

    if (user) {
        return res.status(200).json({ message: "Success" });
    }
    return res.status(400).json({ message: "User not found" });
})

router.put('/update/currency', async (req, res) => {
    const { userId, currency } = req.body;
    if (!userId || !currency) {
        return res.status(400).json({ message: "Please enter all fields" });
    }
    const user = await User.findOneAndUpdate({ _id: userId }, { currency }, { returnDocument: 'after' });

    if (user) {
        return res.status(200).json({ message: "Success" });
    }
    return res.status(400).json({ message: "User not found" });
})

router.get('/profile/:userId', async (req, res) => {
    const userId = req.params.userId;
    const user = await User.findOne({ _id: userId });
    if (user) {
        return res.status(200).json({ message: "Success", data: { name: user.name, email: user.email, currency: user.currency } });
    }
    return res.status(400).json({ message: "User not found" });
})

export default router;
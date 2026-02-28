import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import url from 'url';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const router = express.Router();

dotenv.config();

router.get("/login", async (req, res) => {
    let email = req.body.email;
    const password = req.body.password;
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(400).json({ message: "User not found" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(400).json({ message: "Invalid credentials" });
    }
    res.status(200).json({ message: "Success" });
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
    const newUser = new User({ email, password: hashed, name });
    await newUser.save();
    res.status(201).json({ message: "Success"});
});

export default router;
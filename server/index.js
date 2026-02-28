import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import url from 'url';

import authRoute from './routes/auth.js';

let __filename = url.fileURLToPath(import.meta.url);
let __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const uri = process.env.MONGO_URI; // enter your mongoDB connection string
const port = process.env.PORT; // enter your port here

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(uri)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

app.use('/auth', authRoute);

app.listen(port, () => {
    console.log(`Server is tunning at port: ${port}`);
})
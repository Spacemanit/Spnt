import express from 'express';
import dotenv from 'dotenv';
import Data from '../models/Data.js';

const router = express.Router();

dotenv.config();

router.post('/:id/new/', async (req, res) => {
    const userId = req.params.id;
    const { title, money, category, description, date } = req.body;
    if (!title) {
        return res.status(400).json({ message: "Please enter all fields" });
    }
    const dataId = Date.now().toString();
    const newData = new Data({ userId, dataId, title, money, category, description, date });
    await newData.save();
    if (!newData) {
        return res.status(400).json({ message: "Failed while creating new data"});
    }
    return res.status(200).json({ message: "Success" });
})

router.get('/:id', async (req, res) => {
    const userId = req.params.id;
    const data = await Data.find({ userId });
    if (!data) {
        return res.status(400).json({ message: "Failed while fetching data" });
    }
    if (data.length === 0) {
        return res.status(200).json({ message: "NULL", data: [] });
    }
    return res.status(200).json({ message: "Success", data });
})

router.delete('/:id/delete/:dataId', async (req, res) => {
    const userId = req.params.id;
    const _id = req.params.dataId;
    const data = await Data.deleteOne({ _id, userId });
    if (!data) {
        return res.status(400).json({ message: "Failed while deleting data" });
    }
    return res.status(200).json({ message: "Success" });
})

router.put('/:id/edit', async (req, res) => {
    const userId = req.params.id;
    const { dataId, title, money, category, description } = req.body;
    console.log(dataId, userId)

    if (!dataId || !title) {
        return res.status(400).json({ message: "Please enter all fields" });
    }
    const data = await Data.findOneAndUpdate({ _id: dataId, userId: userId }, { title, money, category, description }, { returnDocument: 'after' });
    if (!data) {
        return res.status(400).json({ message: "Failed while editing data" });
    }
    return res.status(200).json({ message: "Success", data });
})

export default router;
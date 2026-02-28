import mongoose from "mongoose";

const DataSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    dataId: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    money: {
        type: Number,
        required: true
    },
    category: {
        type: String,
        required: true
    }
}, { timestamps: true });

const Data = mongoose.model("Data", DataSchema);

export default Data;
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
        required: false
    },
    category: {
        type: String,
        required: false
    },
    description: {
        type: String, 
        required: false
    },
    tags: {
        type: [String],
        required: false,
        default: []
    },
    date: {
        type: Date,
        required: false
    },
}, { timestamps: true });

DataSchema.pre(/^find/, function() {
    this.sort({ date: -1 });
});

const Data = mongoose.model("Data", DataSchema);

export default Data;
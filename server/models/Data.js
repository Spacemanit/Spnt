import mongoose from 'mongoose';

export const EXPENSE_CATEGORIES = [
  'Food',
  'Rent',
  'Travel',
  'Shopping',
  'Health',
  'Bills',
  'Entertainment',
  'Education',
  'Other',
  'Uncategorized',
];

const DataSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    dataId: {
      type: String,
      required: false,
      default: undefined,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: 120,
    },
    money: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
    },
    category: {
      type: String,
      required: false,
      default: 'Uncategorized',
      trim: true,
      maxlength: 40,
    },
    description: {
      type: String,
      required: false,
      default: '',
      maxlength: 2000,
    },
    tags: {
      type: [String],
      required: false,
      default: [],
    },
    date: {
      type: Date,
      required: false,
      default: Date.now,
    },
  },
  { timestamps: true }
);

DataSchema.index({ userId: 1, date: -1 });
DataSchema.index({ userId: 1, category: 1 });
DataSchema.index({ userId: 1, title: 'text', description: 'text' });

DataSchema.pre(/^find/, function () {
  if (!this.getOptions().sort) {
    this.sort({ date: -1 });
  }
});

const Data = mongoose.model('Data', DataSchema);

export default Data;

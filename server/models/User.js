import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
    },
    currency: {
      type: String,
      required: true,
      default: 'USD',
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 3,
    },
    budget: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
    },
    rolloverEnabled: {
      type: Boolean,
      required: false,
      default: false,
    },
    savingsLabel: {
      type: String,
      required: false,
      default: '',
      trim: true,
      maxlength: 60,
    },
    savingsTarget: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
    },
    savingsDeadline: {
      type: Date,
      required: false,
      default: undefined,
    },
  },
  { timestamps: true }
);

// unique:true on email already creates the index — no extra schema.index() needed.

export default mongoose.model('User', userSchema);

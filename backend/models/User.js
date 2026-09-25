const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Base User schema shared across Student, Faculty, and Admin roles.
 * Password is hashed before saving using bcrypt (12 salt rounds).
 * Includes boundDeviceId for hardware authentication.
 */
const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Never return password in queries
    },
    role: {
      type: String,
      enum: ['student', 'faculty', 'admin'],
      required: true,
    },
    studentId: {
      type: String,
      trim: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    subjects: [
      {
        type: String,
        trim: true,
      },
    ],
    boundDeviceId: {
      type: String,
      default: null,
      trim: true,
    },
    profilePic: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
    },
    // Academic profile — used for student attendance eligibility
    year: {
      type: Number,
      min: 1,
      max: 4,
      default: null,
    },
    semester: {
      type: Number,
      min: 1,
      max: 8,
      default: null,
    },
    division: {
      type: String,
      trim: true,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isApproved: {
      type: Boolean,
      default: true,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    fcmToken: String, // Firebase Cloud Messaging token for push notifications
    lastLogin: Date,
  },
  { timestamps: true }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare entered password with hashed password
UserSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);

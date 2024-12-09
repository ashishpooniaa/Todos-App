const mongoose = require('mongoose');

const todoSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Todo text is required'],
    trim: true,
    minlength: [1, 'Todo text must not be empty']
  },
  completed: {
    type: Boolean,
    default: false
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project ID is required']
  },
  reminderTime: {
    type: String,
    default: null,
    validate: {
      validator: function(v) {
        return v === null || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v);
      },
      message: props => `${props.value} is not a valid reminder time format!`
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add index for better query performance
todoSchema.index({ projectId: 1, completed: 1 });

// Pre-save middleware
todoSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Todo', todoSchema); 
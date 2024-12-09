const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    minlength: [1, 'Project name must not be empty'],
    maxlength: [100, 'Project name is too long']
  },
  color: {
    type: String,
    required: [true, 'Project color is required'],
    validate: {
      validator: function(v) {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
      },
      message: props => `${props.value} is not a valid color hex code!`
    }
  },
  defaultTasks: [{
    text: {
      type: String,
      required: [true, 'Task text is required'],
      trim: true
    },
    reminderTime: {
      type: String,
      validate: {
        validator: function(v) {
          return v === null || /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: props => `${props.value} is not a valid time format (HH:mm)!`
      }
    }
  }],
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

// Virtual for todos
projectSchema.virtual('todos', {
  ref: 'Todo',
  localField: '_id',
  foreignField: 'projectId'
});

// Pre-save middleware
projectSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Add index for better query performance
projectSchema.index({ name: 1 });

module.exports = mongoose.model('Project', projectSchema); 
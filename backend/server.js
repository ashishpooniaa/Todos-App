const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

const Project = require('./models/Project');
const Todo = require('./models/Todo');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
}));
app.use(express.json());

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// MongoDB Connection with retry logic
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    // Retry connection after 5 seconds
    setTimeout(connectDB, 5000);
  }
};

connectDB();

// Project Routes with better error handling
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await Project.find();
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const project = new Project(req.body);
    const savedProject = await project.save();
    res.status(201).json(savedProject);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(400).json({ message: 'Failed to create project' });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    await Project.findByIdAndDelete(id);
    await Todo.deleteMany({ projectId: id });
    res.json({ message: 'Project and associated todos deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: 'Failed to delete project' });
  }
});

// Todo Routes with better error handling
app.get('/api/todos', async (req, res) => {
  try {
    const todos = await Todo.find().populate('projectId');
    
    // Match the frontend validation logic exactly
    const validTodos = todos
      .filter(todo => 
        todo && 
        todo._id && 
        typeof todo.text === 'string' &&
        typeof todo.completed === 'boolean'
      )
      .map(todo => ({
        _id: todo._id,
        text: todo.text,
        completed: todo.completed,
        projectId: todo.projectId,
        reminderTime: todo.reminderTime,
        createdAt: todo.createdAt,
        updatedAt: todo.updatedAt
      }));

    res.json(validTodos);
  } catch (error) {
    console.error('Error fetching todos:', error);
    res.status(500).json({ 
      message: 'Failed to fetch todos',
      error: error.message 
    });
  }
});

app.post('/api/todos', async (req, res) => {
  try {
    const todo = new Todo(req.body);
    const savedTodo = await todo.save();
    const populatedTodo = await Todo.findById(savedTodo._id).populate('projectId');
    res.status(201).json(populatedTodo);
  } catch (error) {
    console.error('Error creating todo:', error);
    res.status(400).json({ message: 'Failed to create todo' });
  }
});

app.patch('/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const todo = await Todo.findById(id);
    if (!todo) {
      return res.status(404).json({ message: 'Todo not found' });
    }
    const updatedTodo = await Todo.findByIdAndUpdate(id, req.body, { 
      new: true 
    }).populate('projectId');
    res.json(updatedTodo);
  } catch (error) {
    console.error('Error updating todo:', error);
    res.status(400).json({ message: 'Failed to update todo' });
  }
});

app.delete('/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the todo first to check if it exists
    const todo = await Todo.findById(id);
    if (!todo) {
      return res.status(404).json({ 
        message: 'Task not found',
        error: 'NOT_FOUND'
      });
    }

    // Delete the todo
    await Todo.findByIdAndDelete(id);

    // Return success
    res.json({ 
      message: 'Task deleted successfully',
      deletedId: id
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ 
      message: 'Failed to delete task',
      error: error.message
    });
  }
});

// Add endpoint to delete all todos
app.delete('/api/todos', async (req, res) => {
  try {
    // Delete all todos
    await Todo.deleteMany({});
    
    res.json({ 
      message: 'All tasks deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting all tasks:', error);
    res.status(500).json({ 
      message: 'Failed to delete all tasks',
      error: error.message
    });
  }
});

// Add cleanup endpoint
app.post('/api/cleanup', async (req, res) => {
  try {
    // Delete all todos
    await Todo.deleteMany({});
    
    res.json({ 
      message: 'Database cleanup successful'
    });
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ 
      message: 'Failed to cleanup database',
      error: error.message
    });
  }
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { 
  Container, 
  Box, 
  IconButton, 
  AppBar, 
  Toolbar, 
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Badge,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SchoolIcon from '@mui/icons-material/School';
import WorkIcon from '@mui/icons-material/Work';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import AddIcon from '@mui/icons-material/Add';
import TodoList from './components/TodoList';
import AddTodo from './components/AddTodo';
import axios from 'axios';
import EventIcon from '@mui/icons-material/Event';

const drawerWidth = 280;

// Update API URL to match backend port
const API_URL = 'http://localhost:5001/api';

// Move helper functions outside component to prevent recreation
const getIconForProject = (projectName) => {
  const name = projectName.toLowerCase();
  if (name.includes('work')) return WorkIcon;
  if (name.includes('health')) return LocalHospitalIcon;
  if (name.includes('fitness')) return FitnessCenterIcon;
  if (name.includes('study')) return SchoolIcon;
  if (name.includes('meal')) return RestaurantIcon;
  if (name.includes('shopping')) return ShoppingCartIcon;
  return EventIcon;
};

// Create API functions outside component
const api = {
  fetchProjects: async () => {
    const response = await axios.get(`${API_URL}/projects`);
    return response.data;
  },
  fetchTodos: async () => {
    const response = await axios.get(`${API_URL}/todos`);
    return response.data;
  },
  deleteTodo: async (id) => {
    await axios.delete(`${API_URL}/todos/${id}`);
  },
  addTodo: async (todo) => {
    const response = await axios.post(`${API_URL}/todos`, todo);
    return response.data;
  },
  updateTodo: async (id, updates) => {
    const response = await axios.patch(`${API_URL}/todos/${id}`, updates);
    return response.data;
  },
  addProject: async (project) => {
    const response = await axios.post(`${API_URL}/projects`, project);
    return response.data;
  }
};

function App() {
  // Refs for tracking mounted state and previous values
  const isMounted = useRef(true);
  const previousProject = useRef(null);

  // State management
  const [darkMode, setDarkMode] = useState(false);
  const [todos, setTodos] = useState([]);
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [openNewProject, setOpenNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [projectTodosFetched, setProjectTodosFetched] = useState(new Set());

  // Memoized theme to prevent recreation
  const theme = useMemo(() => createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: { main: '#128C7E' },
      secondary: { main: '#25D366' },
      background: {
        default: darkMode ? '#111b21' : '#f0f2f5',
        paper: darkMode ? '#1f2c33' : '#ffffff',
      },
    },
  }), [darkMode]);

  // Memoized notification handler
  const showNotification = useCallback((message, severity = 'info', duration = 3000) => {
    if (isMounted.current) {
      setNotification({
        message,
        severity,
        autoHideDuration: duration
      });
    }
  }, []);

  // Fetch projects only once on mount
  useEffect(() => {
    let isSubscribed = true;

    const fetchProjects = async () => {
      try {
        const data = await api.fetchProjects();
        if (isSubscribed) {
          const projectsWithIcons = data.map(project => ({
            ...project,
            icon: getIconForProject(project.name)
          }));
          setProjects(projectsWithIcons);
          
          if (projectsWithIcons.length > 0 && !currentProject) {
            setCurrentProject(projectsWithIcons[0]._id);
          }
        }
      } catch (err) {
        if (isSubscribed) {
          showNotification('Failed to load projects', 'error');
          console.error('Error fetching projects:', err);
        }
      }
    };

    fetchProjects();

    return () => {
      isSubscribed = false;
    };
  }, [currentProject, showNotification]);

  // Fetch todos only when project changes and not already fetched
  useEffect(() => {
    let isSubscribed = true;

    const fetchTodosForProject = async () => {
      if (!currentProject || projectTodosFetched.has(currentProject)) return;

      try {
        setLoading(true);
        const data = await api.fetchTodos();
        
        if (isSubscribed) {
          // Filter todos for current project only
          const validTodos = data.filter(todo => 
            todo && 
            todo._id && 
            todo.projectId && 
            todo.projectId._id === currentProject && // Only include todos for current project
            typeof todo.text === 'string' &&
            typeof todo.completed === 'boolean'
          );

          // Update todos state by keeping only the current project's todos
          setTodos(prevTodos => {
            // Remove any duplicates by text within the same project
            const uniqueTodos = validTodos.reduce((acc, todo) => {
              const isDuplicate = acc.some(t => 
                t.projectId._id === todo.projectId._id && 
                t.text.toLowerCase().trim() === todo.text.toLowerCase().trim()
              );
              if (!isDuplicate) {
                acc.push(todo);
              }
              return acc;
            }, []);

            // Keep todos from other projects
            const otherTodos = prevTodos.filter(todo => 
              todo.projectId._id !== currentProject
            );

            return [...otherTodos, ...uniqueTodos];
          });

          setProjectTodosFetched(prev => new Set([...prev, currentProject]));
        }
      } catch (err) {
        if (isSubscribed) {
          showNotification('Failed to load todos', 'error');
          console.error('Error fetching todos:', err);
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    if (currentProject !== previousProject.current) {
      fetchTodosForProject();
      previousProject.current = currentProject;
    }

    return () => {
      isSubscribed = false;
    };
  }, [currentProject, projectTodosFetched, showNotification]);

  // Memoized handlers
  const handleToggleTodo = useCallback(async (id) => {
    try {
      const todoToUpdate = todos.find(t => t._id === id);
      if (!todoToUpdate) return;

      const updatedTodo = await api.updateTodo(id, {
        completed: !todoToUpdate.completed
      });

      setTodos(prevTodos => 
        prevTodos.map(t => t._id === id ? updatedTodo : t)
      );
    } catch (err) {
      showNotification('Failed to update todo', 'error');
      console.error('Error updating todo:', err);
    }
  }, [todos, showNotification]);

  const handleDeleteTodo = useCallback(async (id) => {
    if (!id) return;

    try {
      setLoading(true);
      await api.deleteTodo(id);
      
      setTodos(prevTodos => {
        const newTodos = prevTodos.filter(todo => todo._id !== id);
        const todoProject = prevTodos.find(t => t._id === id)?.projectId._id;
        
        if (todoProject && !newTodos.some(t => t.projectId._id === todoProject)) {
          setProjectTodosFetched(prev => {
            const newSet = new Set(prev);
            newSet.delete(todoProject);
            return newSet;
          });
        }
        
        return newTodos;
      });

      showNotification('Task deleted successfully', 'success', 2000);
    } catch (err) {
      showNotification('Failed to delete task', 'error');
      console.error('Error deleting task:', err);
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  const handleAddTodo = useCallback(async (newTodoText) => {
    if (!currentProject || !newTodoText.trim()) {
      showNotification('Please select a project and enter a todo text', 'warning');
      return;
    }

    // Check for duplicate in current project
    const normalizedText = newTodoText.trim().toLowerCase();
    const isDuplicate = todos.some(todo => 
      todo.projectId._id === currentProject && 
      todo.text.toLowerCase().trim() === normalizedText
    );

    if (isDuplicate) {
      showNotification('This task already exists in the current project', 'warning');
      return;
    }

    try {
      const newTodo = await api.addTodo({
        text: newTodoText.trim(),
        completed: false,
        projectId: currentProject
      });

      setTodos(prevTodos => [...prevTodos, newTodo]);
      showNotification('Task added successfully', 'success', 2000);
    } catch (err) {
      showNotification('Failed to add task', 'error');
      console.error('Error adding task:', err);
    }
  }, [currentProject, showNotification, todos]);

  const handleSetReminder = useCallback(async (todoId, reminderTime) => {
    try {
      const updatedTodo = await api.updateTodo(todoId, { reminderTime });
      setTodos(prevTodos => 
        prevTodos.map(todo => 
          todo._id === todoId ? updatedTodo : todo
        )
      );
      showNotification('Reminder set successfully', 'success', 2000);
    } catch (err) {
      showNotification('Failed to set reminder', 'error');
      console.error('Error setting reminder:', err);
    }
  }, [showNotification]);

  const handleAddProject = useCallback(async () => {
    if (!newProjectName.trim()) {
      showNotification('Please enter a project name', 'warning');
      return;
    }

    try {
      const newProject = {
        name: newProjectName.trim(),
        color: '#' + Math.floor(Math.random()*16777215).toString(16)
      };
      
      const response = await api.addProject(newProject);
      const projectWithIcon = {
        ...response,
        icon: getIconForProject(response.name)
      };
      
      setProjects(prevProjects => [...prevProjects, projectWithIcon]);
      if (!currentProject) {
        setCurrentProject(projectWithIcon._id);
      }
      setNewProjectName('');
      setOpenNewProject(false);
      showNotification('Project created successfully', 'success', 2000);
    } catch (err) {
      showNotification('Failed to create project', 'error');
      console.error('Error creating project:', err);
    }
  }, [newProjectName, currentProject, showNotification]);

  // Memoized derived data with duplicate prevention
  const filteredTodos = useMemo(() => {
    if (!todos || !currentProject) return [];
    
    // Get todos for current project and ensure no duplicates
    const projectTodos = todos.filter(todo => 
      todo.projectId && 
      todo.projectId._id === currentProject
    );

    // Remove any duplicates by text
    return projectTodos.reduce((acc, todo) => {
      const isDuplicate = acc.some(t => 
        t.text.toLowerCase().trim() === todo.text.toLowerCase().trim()
      );
      if (!isDuplicate) {
        acc.push(todo);
      }
      return acc;
    }, []);
  }, [todos, currentProject]);

  const incompleteTodosCount = useCallback((projectId) => {
    return todos.filter(todo => 
      todo.projectId && 
      todo.projectId._id === projectId && 
      !todo.completed
    ).length;
  }, [todos]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        <AppBar 
          position="fixed" 
          sx={{ 
            zIndex: (t) => t.zIndex.drawer + 1,
            backgroundColor: (t) => t.palette.background.paper,
            color: (t) => t.palette.text.primary,
            boxShadow: 1
          }}
        >
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              {projects.find(p => p.id === currentProject)?.name || 'Tasks'}
            </Typography>
            <IconButton onClick={() => setDarkMode(!darkMode)} color="inherit">
              {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Toolbar>
        </AppBar>

        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              backgroundColor: theme.palette.background.paper,
              borderRight: '1px solid rgba(0, 0, 0, 0.12)',
            },
          }}
        >
          <Toolbar />
          <Box sx={{ overflow: 'auto', mt: 2 }}>
            <List>
              {projects.map((project) => {
                const IconComponent = project.icon || null;
                return (
                  <ListItem 
                    button 
                    key={project._id}
                    selected={currentProject === project._id}
                    onClick={() => setCurrentProject(project._id)}
                    sx={{
                      borderRadius: '0 24px 24px 0',
                      mr: 2,
                      '&.Mui-selected': {
                        backgroundColor: `${project.color}20`,
                      }
                    }}
                  >
                    <ListItemIcon>
                      {IconComponent ? (
                        <Badge badgeContent={incompleteTodosCount(project._id)} color="primary">
                          <IconComponent sx={{ color: project.color }} />
                        </Badge>
                      ) : (
                        <Badge badgeContent={incompleteTodosCount(project._id)} color="primary">
                          <AddIcon sx={{ color: project.color }} />
                        </Badge>
                      )}
                    </ListItemIcon>
                    <ListItemText primary={project.name} />
                  </ListItem>
                );
              })}
            </List>
            <Divider sx={{ my: 2 }} />
            <Button
              startIcon={<AddIcon />}
              onClick={() => setOpenNewProject(true)}
              sx={{ ml: 2 }}
            >
              New Project
            </Button>
          </Box>
        </Drawer>

        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          <Toolbar />
          <Container maxWidth="md" sx={{ mt: 2 }}>
            <AddTodo onAdd={handleAddTodo} />
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TodoList
                todos={filteredTodos}
                onToggle={handleToggleTodo}
                onDelete={handleDeleteTodo}
                onSetReminder={handleSetReminder}
              />
            )}
          </Container>
        </Box>

        <Snackbar
          open={!!notification}
          autoHideDuration={notification?.autoHideDuration || 6000}
          onClose={() => setNotification(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setNotification(null)}
            severity={notification?.severity || 'info'}
            sx={{ 
              width: '100%',
              '& .MuiAlert-message': {
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                fontSize: '1rem'
              }
            }}
          >
            {notification?.message}
          </Alert>
        </Snackbar>

        <Dialog open={openNewProject} onClose={() => setOpenNewProject(false)}>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Project Name"
              fullWidth
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenNewProject(false)}>Cancel</Button>
            <Button onClick={handleAddProject} variant="contained">Create</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}

export default React.memo(App);

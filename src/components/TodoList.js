import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Checkbox,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Divider,
  Snackbar,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AlarmIcon from '@mui/icons-material/Alarm';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

// Create different types of alarm sounds using Web Audio API
const createAlarmSound = (type, existingContext = null) => {
  const audioContext = existingContext || new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  switch (type) {
    case 'gentle':
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 1);
      break;
    case 'classic':
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);
      break;
    case 'digital':
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(587.33, audioContext.currentTime); // D5 note
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
      break;
    case 'nature':
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(329.63, audioContext.currentTime); // E4 note
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 2);
      break;
    default:
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 1);
  }

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  return { oscillator, audioContext, gainNode };
};

function TodoList({ todos, onToggle, onDelete, onSetReminder }) {
  const [openReminder, setOpenReminder] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState(null);
  const [reminderTime, setReminderTime] = useState('');
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processingTodos, setProcessingTodos] = useState(new Set());
  const [alarmSound, setAlarmSound] = useState('gentle');
  const [isMuted, setIsMuted] = useState(false);
  const audioContextRef = useRef(null);
  const activeOscillatorRef = useRef(null);
  const activeGainNodeRef = useRef(null);
  const timeoutRef = useRef(null);

  // Cleanup function for audio resources
  const cleanupAudio = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (activeOscillatorRef.current) {
      try {
        activeOscillatorRef.current.stop();
      } catch (e) {
        console.log('Oscillator already stopped');
      }
      activeOscillatorRef.current = null;
    }

    if (activeGainNodeRef.current) {
      activeGainNodeRef.current.disconnect();
      activeGainNodeRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {
        console.log('AudioContext already closed');
      }
      audioContextRef.current = null;
    }
  }, []);

  const playAlarmSound = useCallback((soundType = alarmSound) => {
    if (isMuted) return;

    // Clean up any existing audio
    cleanupAudio();

    try {
      // Create new audio context and sound
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const { oscillator, gainNode } = createAlarmSound(soundType, audioContextRef.current);
      
      activeOscillatorRef.current = oscillator;
      activeGainNodeRef.current = gainNode;

      // Start the oscillator
      oscillator.start();

      // Schedule cleanup
      timeoutRef.current = setTimeout(() => {
        cleanupAudio();
      }, 3000);
    } catch (error) {
      console.error('Error playing alarm sound:', error);
    }
  }, [alarmSound, isMuted, cleanupAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);

  useEffect(() => {
    // Check for due reminders every minute
    const interval = setInterval(() => {
      const now = new Date();
      todos.forEach(todo => {
        if (todo.reminderTime && !todo.completed) {
          const reminderDate = new Date(todo.reminderTime);
          if (Math.abs(now - reminderDate) < 60000) { // Within 1 minute
            setNotification({
              message: `Time for: ${todo.text}`,
              severity: 'info'
            });
            playAlarmSound();
          }
        }
      });
    }, 60000);

    return () => {
      clearInterval(interval);
      cleanupAudio();
    };
  }, [todos, playAlarmSound, cleanupAudio]);

  const handleOpenReminder = (todo) => {
    setSelectedTodo(todo);
    if (todo.reminderTime) {
      const date = new Date(todo.reminderTime);
      const formattedDate = date.toISOString().slice(0, 16);
      setReminderTime(formattedDate);
    } else {
      setReminderTime('');
    }
    setOpenReminder(true);
  };

  const handleToggle = async (id) => {
    if (!id) return;
    try {
      await onToggle(id);
    } catch (error) {
      setNotification({
        message: 'Failed to update task. Please try again.',
        severity: 'error'
      });
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;
    try {
      await onDelete(id);
    } catch (error) {
      setNotification({
        message: 'Failed to delete task. Please try again.',
        severity: 'error'
      });
    }
  };

  const handleSetReminder = async () => {
    if (!selectedTodo || !reminderTime || processingTodos.has(selectedTodo._id)) return;

    setLoading(true);
    setProcessingTodos(prev => new Set([...prev, selectedTodo._id]));
    try {
      await onSetReminder(selectedTodo._id, reminderTime);
      setOpenReminder(false);
      setNotification({
        message: 'Reminder set successfully!',
        severity: 'success'
      });
    } catch (error) {
      setNotification({
        message: 'Failed to set reminder. Please try again.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
      setProcessingTodos(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedTodo._id);
        return newSet;
      });
    }
  };

  const handleRemoveReminder = async (todoId) => {
    if (processingTodos.has(todoId)) return;

    setProcessingTodos(prev => new Set([...prev, todoId]));
    try {
      await onSetReminder(todoId, null);
      setOpenReminder(false);
      setNotification({
        message: 'Reminder removed successfully!',
        severity: 'success'
      });
    } catch (error) {
      setNotification({
        message: 'Failed to remove reminder. Please try again.',
        severity: 'error'
      });
    } finally {
      setProcessingTodos(prev => {
        const newSet = new Set(prev);
        newSet.delete(todoId);
        return newSet;
      });
    }
  };

  // Filter and validate todos
  const validTodos = useMemo(() => {
    return (todos || []).filter(todo => 
      todo && 
      todo._id && 
      typeof todo.text === 'string' &&
      typeof todo.completed === 'boolean'
    );
  }, [todos]);
  // console.log("validTodos", validTodos);
  // console.log("todos", todos);

  // Sort todos by completion status
  const incompleteTodos = useMemo(() => 
    validTodos.filter(todo => !todo.completed)
  , [validTodos]);

  const completedTodos = useMemo(() => 
    validTodos.filter(todo => todo.completed)
  , [validTodos]);

  const formatReminderTime = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!Array.isArray(todos)) {
    return (
      <Paper sx={{ p: 2, mt: 2, textAlign: 'center' }}>
        Error loading tasks. Please try again.
      </Paper>
    );
  }

  if (validTodos.length === 0) {
    return (
      <Paper sx={{ p: 2, mt: 2, textAlign: 'center' }}>
        No tasks yet! Add one above.
      </Paper>
    );
  }

  return (
    <>
      <List sx={{ mt: 2 }}>
        {incompleteTodos.map((todo) => (
          <ListItem
            key={`incomplete-${todo._id || Date.now()}-${Math.random()}`}
            sx={{
              mb: 1,
              bgcolor: 'background.paper',
              borderRadius: 1,
              boxShadow: 1,
              '&:hover': {
                bgcolor: 'action.hover',
              },
              transition: 'all 0.3s ease',
            }}
          >
            <Checkbox
              checked={todo.completed}
              onChange={() => todo._id && handleToggle(todo._id)}
              icon={<RadioButtonUncheckedIcon />}
              checkedIcon={<CheckCircleIcon color="success" />}
              sx={{
                '&:hover': { color: 'success.main' },
              }}
            />
            <ListItemText
              primary={todo.text}
              secondary={todo.reminderTime && (
                <Typography
                  component="span"
                  variant="body2"
                  color="textSecondary"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                  <NotificationsActiveIcon fontSize="small" />
                  {formatReminderTime(todo.reminderTime)}
                </Typography>
              )}
            />
            <ListItemSecondaryAction>
              <IconButton
                edge="end"
                aria-label="set reminder"
                onClick={() => todo._id && handleOpenReminder(todo)}
                sx={{ mr: 1 }}
                disabled={!todo._id}
              >
                <AlarmIcon color={todo.reminderTime ? "primary" : "inherit"} />
              </IconButton>
              <IconButton
                edge="end"
                aria-label="delete"
                onClick={() => todo._id && handleDelete(todo._id)}
                disabled={!todo._id}
              >
                <DeleteIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
        
        {completedTodos.length > 0 && (
          <>
            <Divider key="completed-divider" sx={{ my: 2 }} />
            <Typography 
              key="completed-header"
              variant="subtitle2" 
              color="textSecondary" 
              sx={{ pl: 2, pb: 1 }}
            >
              Completed Tasks ({completedTodos.length})
            </Typography>
            {completedTodos.map((todo) => (
              <ListItem
                key={`completed-${todo._id || Date.now()}-${Math.random()}`}
                sx={{
                  mb: 1,
                  bgcolor: 'success.light',
                  borderRadius: 1,
                  boxShadow: 1,
                  opacity: 0.8,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    opacity: 1,
                  },
                }}
              >
                <Checkbox
                  checked={todo.completed}
                  onChange={() => todo._id && handleToggle(todo._id)}
                  icon={<RadioButtonUncheckedIcon />}
                  checkedIcon={<CheckCircleIcon />}
                  sx={{ color: 'common.white' }}
                  disabled={!todo._id}
                />
                <ListItemText
                  primary={todo.text}
                  sx={{
                    textDecoration: 'line-through',
                    color: 'common.white',
                  }}
                  secondary={todo.reminderTime && (
                    <Typography
                      component="span"
                      variant="body2"
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 0.5,
                        color: 'rgba(255, 255, 255, 0.7)' 
                      }}
                    >
                      <NotificationsActiveIcon fontSize="small" />
                      {formatReminderTime(todo.reminderTime)}
                    </Typography>
                  )}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => todo._id && handleDelete(todo._id)}
                    sx={{ color: 'common.white' }}
                    disabled={!todo._id}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </>
        )}
      </List>

      <Dialog 
        key="reminder-dialog"
        open={openReminder} 
        onClose={() => setOpenReminder(false)}
      >
        <DialogTitle>Set Task Reminder</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Reminder Time"
            type="datetime-local"
            fullWidth
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            disabled={loading}
            InputLabelProps={{
              shrink: true,
            }}
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Alarm Sound</InputLabel>
            <Select
              value={alarmSound}
              onChange={(e) => setAlarmSound(e.target.value)}
              label="Alarm Sound"
            >
              <MenuItem value="gentle">Gentle Chime</MenuItem>
              <MenuItem value="classic">Classic Alarm</MenuItem>
              <MenuItem value="digital">Digital Beep</MenuItem>
              <MenuItem value="nature">Nature Sounds</MenuItem>
            </Select>
          </FormControl>
          <Button
            startIcon={isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
            onClick={() => setIsMuted(!isMuted)}
            sx={{ mt: 2 }}
          >
            {isMuted ? 'Unmute Alarms' : 'Mute Alarms'}
          </Button>
          <Button
            startIcon={<VolumeUpIcon />}
            onClick={() => playAlarmSound(alarmSound)}
            sx={{ mt: 2, ml: 2 }}
          >
            Test Sound
          </Button>
        </DialogContent>
        <DialogActions>
          {selectedTodo?.reminderTime && (
            <Button 
              onClick={() => handleRemoveReminder(selectedTodo._id)}
              disabled={loading || processingTodos.has(selectedTodo._id)}
              color="error"
            >
              Remove Reminder
            </Button>
          )}
          <Button 
            onClick={() => setOpenReminder(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSetReminder}
            disabled={loading || !reminderTime || (selectedTodo && processingTodos.has(selectedTodo._id))}
            variant="contained"
          >
            {loading ? <CircularProgress size={24} /> : 'Set Reminder'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        key="notification-snackbar"
        open={!!notification}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {notification && (
          <Alert
            key="notification-alert"
            onClose={() => setNotification(null)}
            severity={notification.severity}
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        )}
      </Snackbar>
    </>
  );
}

export default TodoList; 
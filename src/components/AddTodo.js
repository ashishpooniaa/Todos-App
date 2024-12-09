import React, { useState } from 'react';
import { Paper, InputBase, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

function AddTodo({ onAdd }) {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      onAdd(input.trim());
      setInput('');
    }
  };

  return (
    <Paper
      component="form"
      onSubmit={handleSubmit}
      sx={{
        p: '2px 4px',
        display: 'flex',
        alignItems: 'center',
        boxShadow: 2,
      }}
    >
      <InputBase
        sx={{ ml: 1, flex: 1 }}
        placeholder="Add a new todo..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <IconButton type="submit" sx={{ p: '10px' }} aria-label="add">
        <AddIcon />
      </IconButton>
    </Paper>
  );
}

export default AddTodo; 
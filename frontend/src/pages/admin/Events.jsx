import { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Grid,
  Chip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { format } from 'date-fns';

const EventForm = ({ event, onSubmit, onClose, isSubmitting }) => {
  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    startDate: event?.startDate ? format(new Date(event.startDate), 'yyyy-MM-dd\'T\'HH:mm') : '',
    endDate: event?.endDate ? format(new Date(event.endDate), 'yyyy-MM-dd\'T\'HH:mm') : '',
    location: event?.location || '',
    capacity: event?.capacity || '',
    price: event?.price || '',
    category: event?.category || '',
    status: event?.status || 'draft',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogContent>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              label="Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              multiline
              rows={4}
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              required
              fullWidth
              type="datetime-local"
              label="Start Date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              required
              fullWidth
              type="datetime-local"
              label="End Date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              label="Location"
              name="location"
              value={formData.location}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              required
              fullWidth
              type="number"
              label="Capacity"
              name="capacity"
              value={formData.capacity}
              onChange={handleChange}
              inputProps={{ min: 1 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              required
              fullWidth
              type="number"
              label="Price"
              name="price"
              value={formData.price}
              onChange={handleChange}
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              required
              fullWidth
              select
              label="Category"
              name="category"
              value={formData.category}
              onChange={handleChange}
            >
              <MenuItem value="conference">Conference</MenuItem>
              <MenuItem value="workshop">Workshop</MenuItem>
              <MenuItem value="seminar">Seminar</MenuItem>
              <MenuItem value="concert">Concert</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              required
              fullWidth
              select
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="published">Published</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </form>
  );
};

const Events = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const { data: events, isLoading } = useQuery({
    queryKey: ['adminEvents'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:3000/api/events');
      return response.data.events;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (eventData) => {
      const response = await axios.post('http://localhost:3000/api/events', eventData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminEvents']);
      setDialogOpen(false);
      setError('');
    },
    onError: (error) => {
      setError(error.response?.data?.error || 'Error creating event');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, eventData }) => {
      const response = await axios.patch(`http://localhost:3000/api/events/${id}`, eventData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminEvents']);
      setDialogOpen(false);
      setError('');
    },
    onError: (error) => {
      setError(error.response?.data?.error || 'Error updating event');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await axios.delete(`http://localhost:3000/api/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminEvents']);
    },
    onError: (error) => {
      setError(error.response?.data?.error || 'Error deleting event');
    },
  });

  const handleCreate = () => {
    setSelectedEvent(null);
    setDialogOpen(true);
  };

  const handleEdit = (event) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (formData) => {
    if (selectedEvent) {
      updateMutation.mutate({ id: selectedEvent.id, eventData: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Manage Events
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
        >
          Create Event
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Capacity</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events?.map((event) => (
              <TableRow key={event.id}>
                <TableCell>{event.title}</TableCell>
                <TableCell>
                  {format(new Date(event.startDate), 'PPP')}
                </TableCell>
                <TableCell>{event.location}</TableCell>
                <TableCell>{event.capacity}</TableCell>
                <TableCell>${event.price}</TableCell>
                <TableCell>
                  <Chip
                    label={event.status}
                    color={
                      event.status === 'published'
                        ? 'success'
                        : event.status === 'cancelled'
                        ? 'error'
                        : 'default'
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => handleEdit(event)}
                    sx={{ mr: 1 }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(event.id)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedEvent ? 'Edit Event' : 'Create Event'}
        </DialogTitle>
        <EventForm
          event={selectedEvent}
          onSubmit={handleSubmit}
          onClose={() => setDialogOpen(false)}
          isSubmitting={createMutation.isLoading || updateMutation.isLoading}
        />
      </Dialog>
    </Container>
  );
};

export default Events; 
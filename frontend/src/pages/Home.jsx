import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Box,
  TextField,
  MenuItem,
  Chip,
  CircularProgress,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { format } from 'date-fns';

const Home = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    startDate: '',
    endDate: '',
  });

  const { data: events, isLoading, error } = useQuery({
    queryKey: ['events', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.category) params.append('category', filters.category);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      
      const response = await axios.get(`http://localhost:3000/api/events?${params.toString()}`);
      return response.data;
    },
  });

  const { data: userBookings } = useQuery({
    queryKey: ['userBookings'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:3000/api/bookings/my-bookings');
      return response.data.bookings;
    },
    enabled: !!localStorage.getItem('token'),
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const isEventBooked = (eventId) => {
    return userBookings?.some(
      (booking) =>
        booking.eventId === eventId &&
        ['pending', 'confirmed'].includes(booking.status)
    );
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography color="error">
          Error loading events. Please try again later.
        </Typography>
      </Box>
    );
  }

  return (
    <Container>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Upcoming Events
        </Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Search"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              select
              label="Category"
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
            >
              <MenuItem value="">All Categories</MenuItem>
              <MenuItem value="conference">Conference</MenuItem>
              <MenuItem value="workshop">Workshop</MenuItem>
              <MenuItem value="seminar">Seminar</MenuItem>
              <MenuItem value="concert">Concert</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              type="date"
              label="Start Date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              type="date"
              label="End Date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      </Box>

      <Grid container spacing={3}>
        {events?.events.map((event) => (
          <Grid item key={event.id} xs={12} sm={6} md={4}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
              }}
            >
              {isEventBooked(event.id) && (
                <Chip
                  label="Booked"
                  color="success"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 1,
                  }}
                />
              )}
              <CardMedia
                component="img"
                height="200"
                image={event.imageUrl || 'https://via.placeholder.com/300x200'}
                alt={event.title}
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography gutterBottom variant="h5" component="h2">
                  {event.title}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {event.description}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {format(new Date(event.startDate), 'PPP')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {event.location}
                  </Typography>
                  <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                    ${event.price}
                  </Typography>
                </Box>
              </CardContent>
              <Box sx={{ p: 2, pt: 0 }}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => navigate(`/events/${event.id}`)}
                  disabled={isEventBooked(event.id)}
                >
                  {isEventBooked(event.id) ? 'Already Booked' : 'View Details'}
                </Button>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {events?.pagination && (
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Showing {events.events.length} of {events.pagination.total} events
          </Typography>
        </Box>
      )}
    </Container>
  );
};

export default Home; 
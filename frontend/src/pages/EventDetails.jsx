import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Typography,
  Box,
  Paper,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { format } from 'date-fns';

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [bookingDialog, setBookingDialog] = useState(false);
  const [bookingError, setBookingError] = useState('');

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      const response = await axios.get(`http://localhost:3000/api/events/${id}`);
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

  const bookingMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post('http://localhost:3000/api/bookings', {
        eventId: id,
        numberOfTickets: 1,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userBookings']);
      setBookingDialog(false);
      navigate('/booking-success');
    },
    onError: (error) => {
      setBookingError(error.response?.data?.error || 'Error creating booking');
    },
  });

  const isEventBooked = () => {
    return userBookings?.some(
      (booking) =>
        booking.eventId === id &&
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
          Error loading event details. Please try again later.
        </Typography>
      </Box>
    );
  }

  if (!event) {
    return (
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography>Event not found</Typography>
      </Box>
    );
  }

  const handleBookNow = () => {
    setBookingError('');
    setBookingDialog(true);
  };

  const handleConfirmBooking = () => {
    bookingMutation.mutate();
  };

  return (
    <Container>
      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              {event.title}
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Chip
                label={event.category}
                color="primary"
                sx={{ mr: 1 }}
              />
              <Chip
                label={event.status}
                color={
                  event.status === 'published'
                    ? 'success'
                    : event.status === 'cancelled'
                    ? 'error'
                    : 'default'
                }
              />
            </Box>
            <Typography variant="body1" paragraph>
              {event.description}
            </Typography>
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" color="text.secondary">
                  Date & Time
                </Typography>
                <Typography variant="body1">
                  {format(new Date(event.startDate), 'PPP p')} -{' '}
                  {format(new Date(event.endDate), 'p')}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" color="text.secondary">
                  Location
                </Typography>
                <Typography variant="body1">{event.location}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" color="text.secondary">
                  Capacity
                </Typography>
                <Typography variant="body1">
                  {event.capacity} seats available
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" color="text.secondary">
                  Price
                </Typography>
                <Typography variant="h6" color="primary">
                  ${event.price} per ticket
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, position: 'sticky', top: 24 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5" gutterBottom>
                Book Your Ticket
              </Typography>
              <Typography variant="h4" color="primary" gutterBottom>
                ${event.price}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                per ticket
              </Typography>
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleBookNow}
                disabled={isEventBooked() || event.status !== 'published'}
              >
                {isEventBooked()
                  ? 'Already Booked'
                  : event.status !== 'published'
                  ? 'Event Not Available'
                  : 'Book Now'}
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={bookingDialog} onClose={() => setBookingDialog(false)}>
        <DialogTitle>Confirm Booking</DialogTitle>
        <DialogContent>
          {bookingError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {bookingError}
            </Alert>
          )}
          <Typography>
            Are you sure you want to book 1 ticket for {event.title}?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Total amount: ${event.price}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBookingDialog(false)}>Cancel</Button>
          <Button
            onClick={handleConfirmBooking}
            variant="contained"
            disabled={bookingMutation.isLoading}
          >
            {bookingMutation.isLoading ? 'Booking...' : 'Confirm Booking'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EventDetails; 
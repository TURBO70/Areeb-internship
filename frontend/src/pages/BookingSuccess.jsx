import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  CheckCircleOutline as CheckCircleIcon,
} from '@mui/material';

const BookingSuccess = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm">
      <Paper
        sx={{
          p: 4,
          mt: 4,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <CheckCircleIcon
          color="success"
          sx={{ fontSize: 80, mb: 2 }}
        />
        <Typography variant="h4" component="h1" gutterBottom>
          Booking Successful!
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Thank you for your booking. Your ticket has been reserved.
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          You can view your booking details in your profile.
        </Typography>
        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            onClick={() => navigate('/')}
            sx={{ mr: 2 }}
          >
            Browse More Events
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/bookings/my-bookings')}
          >
            View My Bookings
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default BookingSuccess; 
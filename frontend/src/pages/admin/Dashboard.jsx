import { useQuery } from '@tanstack/react-query';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Card,
  CardContent,
} from '@mui/material';
import {
  People as PeopleIcon,
  Event as EventIcon,
  ConfirmationNumber as TicketIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';

const StatCard = ({ title, value, icon: Icon, color }) => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Icon sx={{ fontSize: 40, color, mr: 2 }} />
        <Typography variant="h6" component="div">
          {title}
        </Typography>
      </Box>
      <Typography variant="h4" component="div">
        {value}
      </Typography>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:3000/api/admin/dashboard');
      return response.data;
    },
  });

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
          Error loading dashboard data. Please try again later.
        </Typography>
      </Box>
    );
  }

  const { statistics, recentBookings, upcomingEvents } = dashboardData;

  return (
    <Container>
      <Typography variant="h4" component="h1" gutterBottom>
        Admin Dashboard
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Users"
            value={statistics.totalUsers}
            icon={PeopleIcon}
            color="primary.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Events"
            value={statistics.totalEvents}
            icon={EventIcon}
            color="success.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Bookings"
            value={statistics.totalBookings}
            icon={TicketIcon}
            color="warning.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Revenue"
            value={`$${statistics.totalRevenue.toFixed(2)}`}
            icon={MoneyIcon}
            color="error.main"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Bookings
            </Typography>
            {recentBookings.map((booking) => (
              <Box
                key={booking.id}
                sx={{
                  py: 2,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:last-child': { borderBottom: 0 },
                }}
              >
                <Typography variant="subtitle1">
                  {booking.event.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Booked by: {booking.user.username}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Date: {format(new Date(booking.createdAt), 'PPP')}
                </Typography>
                <Typography
                  variant="body2"
                  color={
                    booking.status === 'confirmed'
                      ? 'success.main'
                      : booking.status === 'cancelled'
                      ? 'error.main'
                      : 'warning.main'
                  }
                >
                  Status: {booking.status}
                </Typography>
              </Box>
            ))}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Upcoming Events
            </Typography>
            {upcomingEvents.map((event) => (
              <Box
                key={event.id}
                sx={{
                  py: 2,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:last-child': { borderBottom: 0 },
                }}
              >
                <Typography variant="subtitle1">{event.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Date: {format(new Date(event.startDate), 'PPP')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Location: {event.location}
                </Typography>
                <Typography
                  variant="body2"
                  color={
                    event.status === 'published'
                      ? 'success.main'
                      : event.status === 'cancelled'
                      ? 'error.main'
                      : 'warning.main'
                  }
                >
                  Status: {event.status}
                </Typography>
              </Box>
            ))}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard; 
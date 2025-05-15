const User = require('./user.model');
const Event = require('./event.model');
const Booking = require('./booking.model');
const sequelize = require('../config/database');

// Define associations
User.hasMany(Event, {
  foreignKey: 'createdBy',
  as: 'createdEvents'
});
Event.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator'
});

User.hasMany(Booking, {
  foreignKey: 'userId',
  as: 'bookings'
});
Booking.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

Event.hasMany(Booking, {
  foreignKey: 'eventId',
  as: 'bookings'
});
Booking.belongsTo(Event, {
  foreignKey: 'eventId',
  as: 'event'
});

module.exports = {
  sequelize,
  User,
  Event,
  Booking
}; 
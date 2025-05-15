const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Booking, Event, User } = require('../models');
const { auth, adminAuth } = require('../middleware/auth.middleware');

const router = express.Router();

// Create new booking
router.post('/',
  auth,
  [
    body('eventId').isUUID(),
    body('numberOfTickets').isInt({ min: 1 }),
    body('specialRequests').optional().trim().escape()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { eventId, numberOfTickets, specialRequests } = req.body;

      // Get event and check availability
      const event = await Event.findByPk(eventId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (event.status !== 'published') {
        return res.status(400).json({ error: 'Event is not available for booking' });
      }

      // Check if event is in the future
      if (new Date(event.startDate) <= new Date()) {
        return res.status(400).json({ error: 'Event has already started' });
      }

      // Count existing bookings
      const bookedTickets = await Booking.sum('numberOfTickets', {
        where: {
          eventId,
          status: ['pending', 'confirmed']
        }
      });

      const availableTickets = event.capacity - (bookedTickets || 0);
      if (numberOfTickets > availableTickets) {
        return res.status(400).json({
          error: `Only ${availableTickets} tickets available`
        });
      }

      // Create booking
      const booking = await Booking.create({
        userId: req.user.id,
        eventId,
        numberOfTickets,
        totalAmount: event.price * numberOfTickets,
        specialRequests,
        status: 'pending',
        paymentStatus: 'pending'
      });

      // Include event details in response
      const bookingWithDetails = await Booking.findByPk(booking.id, {
        include: [
          {
            model: Event,
            as: 'event',
            attributes: ['title', 'startDate', 'endDate', 'location']
          }
        ]
      });

      res.status(201).json(bookingWithDetails);
    } catch (error) {
      console.error('Create booking error:', error);
      res.status(500).json({ error: 'Error creating booking' });
    }
  }
);

// Get user's bookings
router.get('/my-bookings',
  auth,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn(['pending', 'confirmed', 'cancelled', 'refunded'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        page = 1,
        limit = 10,
        status
      } = req.query;

      const offset = (page - 1) * limit;
      const where = { userId: req.user.id };

      if (status) {
        where.status = status;
      }

      const { count, rows: bookings } = await Booking.findAndCountAll({
        where,
        include: [
          {
            model: Event,
            as: 'event',
            attributes: ['title', 'startDate', 'endDate', 'location', 'imageUrl']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      res.json({
        bookings,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('Get bookings error:', error);
      res.status(500).json({ error: 'Error fetching bookings' });
    }
  }
);

// Get single booking
router.get('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        {
          model: Event,
          as: 'event',
          attributes: ['title', 'startDate', 'endDate', 'location', 'imageUrl']
        }
      ]
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if user owns the booking or is admin
    if (booking.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ error: 'Error fetching booking' });
  }
});

// Cancel booking
router.patch('/:id/cancel',
  auth,
  [
    body('cancellationReason').optional().trim().escape()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const booking = await Booking.findByPk(req.params.id, {
        include: [
          {
            model: Event,
            as: 'event'
          }
        ]
      });

      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      // Check if user owns the booking or is admin
      if (booking.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Check if booking can be cancelled
      if (booking.status === 'cancelled') {
        return res.status(400).json({ error: 'Booking is already cancelled' });
      }

      if (booking.status === 'refunded') {
        return res.status(400).json({ error: 'Booking has been refunded' });
      }

      // Check if event has started
      if (new Date(booking.event.startDate) <= new Date()) {
        return res.status(400).json({ error: 'Cannot cancel booking for an event that has started' });
      }

      booking.status = 'cancelled';
      booking.cancellationReason = req.body.cancellationReason;
      await booking.save();

      res.json(booking);
    } catch (error) {
      console.error('Cancel booking error:', error);
      res.status(500).json({ error: 'Error cancelling booking' });
    }
  }
);

// Admin: Get all bookings
router.get('/',
  auth,
  adminAuth,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn(['pending', 'confirmed', 'cancelled', 'refunded']),
    query('eventId').optional().isUUID(),
    query('userId').optional().isUUID()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        page = 1,
        limit = 10,
        status,
        eventId,
        userId
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      if (status) {
        where.status = status;
      }

      if (eventId) {
        where.eventId = eventId;
      }

      if (userId) {
        where.userId = userId;
      }

      const { count, rows: bookings } = await Booking.findAndCountAll({
        where,
        include: [
          {
            model: Event,
            as: 'event',
            attributes: ['title', 'startDate', 'endDate', 'location']
          },
          {
            model: User,
            as: 'user',
            attributes: ['username', 'email', 'firstName', 'lastName']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      res.json({
        bookings,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('Get all bookings error:', error);
      res.status(500).json({ error: 'Error fetching bookings' });
    }
  }
);

// Admin: Update booking status
router.patch('/:id/status',
  auth,
  adminAuth,
  [
    body('status').isIn(['pending', 'confirmed', 'cancelled', 'refunded']),
    body('paymentStatus').optional().isIn(['pending', 'paid', 'failed', 'refunded']),
    body('paymentMethod').optional().trim().escape(),
    body('paymentId').optional().trim().escape()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const booking = await Booking.findByPk(req.params.id);
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      const updates = Object.keys(req.body);
      const allowedUpdates = ['status', 'paymentStatus', 'paymentMethod', 'paymentId'];
      const isValidOperation = updates.every(update => allowedUpdates.includes(update));

      if (!isValidOperation) {
        return res.status(400).json({ error: 'Invalid updates' });
      }

      updates.forEach(update => booking[update] = req.body[update]);
      await booking.save();

      res.json(booking);
    } catch (error) {
      console.error('Update booking status error:', error);
      res.status(500).json({ error: 'Error updating booking status' });
    }
  }
);

module.exports = router; 
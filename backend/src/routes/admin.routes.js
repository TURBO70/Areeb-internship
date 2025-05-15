const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { User, Event, Booking } = require('../models');
const { auth, adminAuth } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes in this file require admin authentication
router.use(auth, adminAuth);

// Get dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalUsers,
      totalEvents,
      totalBookings,
      totalRevenue,
      recentBookings,
      upcomingEvents
    ] = await Promise.all([
      User.count(),
      Event.count(),
      Booking.count(),
      Booking.sum('totalAmount', {
        where: {
          status: 'confirmed',
          paymentStatus: 'paid'
        }
      }),
      Booking.findAll({
        include: [
          {
            model: Event,
            as: 'event',
            attributes: ['title', 'startDate']
          },
          {
            model: User,
            as: 'user',
            attributes: ['username', 'email']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: 5
      }),
      Event.findAll({
        where: {
          startDate: {
            [Op.gt]: new Date()
          },
          status: 'published'
        },
        order: [['startDate', 'ASC']],
        limit: 5
      })
    ]);

    res.json({
      statistics: {
        totalUsers,
        totalEvents,
        totalBookings,
        totalRevenue: totalRevenue || 0
      },
      recentBookings,
      upcomingEvents
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Error fetching dashboard data' });
  }
});

// Get all users
router.get('/users',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().trim().escape(),
    query('role').optional().isIn(['user', 'admin'])
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
        search,
        role
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      if (role) {
        where.role = role;
      }

      if (search) {
        where[Op.or] = [
          { username: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const { count, rows: users } = await User.findAndCountAll({
        where,
        attributes: { exclude: ['password'] },
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      res.json({
        users,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Error fetching users' });
    }
  }
);

// Update user role or status
router.patch('/users/:id',
  [
    body('role').optional().isIn(['user', 'admin']),
    body('isActive').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = await User.findByPk(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const updates = Object.keys(req.body);
      const allowedUpdates = ['role', 'isActive'];
      const isValidOperation = updates.every(update => allowedUpdates.includes(update));

      if (!isValidOperation) {
        return res.status(400).json({ error: 'Invalid updates' });
      }

      // Prevent deactivating the last admin
      if (req.body.isActive === false && user.role === 'admin') {
        const adminCount = await User.count({
          where: {
            role: 'admin',
            isActive: true
          }
        });

        if (adminCount <= 1) {
          return res.status(400).json({
            error: 'Cannot deactivate the last admin user'
          });
        }
      }

      updates.forEach(update => user[update] = req.body[update]);
      await user.save();

      const updatedUser = await User.findByPk(user.id, {
        attributes: { exclude: ['password'] }
      });

      res.json(updatedUser);
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Error updating user' });
    }
  }
);

// Get event statistics
router.get('/events/statistics', async (req, res) => {
  try {
    const [
      totalEvents,
      publishedEvents,
      upcomingEvents,
      pastEvents,
      eventsByCategory,
      eventsByStatus
    ] = await Promise.all([
      Event.count(),
      Event.count({ where: { status: 'published' } }),
      Event.count({
        where: {
          startDate: { [Op.gt]: new Date() },
          status: 'published'
        }
      }),
      Event.count({
        where: {
          endDate: { [Op.lt]: new Date() }
        }
      }),
      Event.findAll({
        attributes: [
          'category',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: {
          category: { [Op.not]: null }
        },
        group: ['category']
      }),
      Event.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status']
      })
    ]);

    res.json({
      totalEvents,
      publishedEvents,
      upcomingEvents,
      pastEvents,
      eventsByCategory,
      eventsByStatus
    });
  } catch (error) {
    console.error('Event statistics error:', error);
    res.status(500).json({ error: 'Error fetching event statistics' });
  }
});

// Get booking statistics
router.get('/bookings/statistics', async (req, res) => {
  try {
    const [
      totalBookings,
      confirmedBookings,
      cancelledBookings,
      totalRevenue,
      bookingsByStatus,
      bookingsByMonth
    ] = await Promise.all([
      Booking.count(),
      Booking.count({ where: { status: 'confirmed' } }),
      Booking.count({ where: { status: 'cancelled' } }),
      Booking.sum('totalAmount', {
        where: {
          status: 'confirmed',
          paymentStatus: 'paid'
        }
      }),
      Booking.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status']
      }),
      Booking.findAll({
        attributes: [
          [sequelize.fn('date_trunc', 'month', sequelize.col('createdAt')), 'month'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('SUM', sequelize.col('totalAmount')), 'revenue']
        ],
        where: {
          status: 'confirmed',
          paymentStatus: 'paid'
        },
        group: [sequelize.fn('date_trunc', 'month', sequelize.col('createdAt'))],
        order: [[sequelize.fn('date_trunc', 'month', sequelize.col('createdAt')), 'ASC']],
        limit: 12
      })
    ]);

    res.json({
      totalBookings,
      confirmedBookings,
      cancelledBookings,
      totalRevenue: totalRevenue || 0,
      bookingsByStatus,
      bookingsByMonth
    });
  } catch (error) {
    console.error('Booking statistics error:', error);
    res.status(500).json({ error: 'Error fetching booking statistics' });
  }
});

module.exports = router; 
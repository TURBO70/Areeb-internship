const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Event, User, Booking } = require('../models');
const { auth, adminAuth } = require('../middleware/auth.middleware');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_PATH || 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'event-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// Create new event (admin only)
router.post('/',
  auth,
  adminAuth,
  upload.single('image'),
  [
    body('title').trim().isLength({ min: 3, max: 100 }).escape(),
    body('description').trim().notEmpty(),
    body('startDate').isISO8601(),
    body('endDate').isISO8601(),
    body('location').trim().notEmpty(),
    body('capacity').isInt({ min: 1 }),
    body('price').isFloat({ min: 0 }),
    body('category').optional().trim().escape(),
    body('tags').optional().isArray()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const eventData = {
        ...req.body,
        createdBy: req.user.id,
        imageUrl: req.file ? req.file.path : null
      };

      const event = await Event.create(eventData);
      res.status(201).json(event);
    } catch (error) {
      console.error('Create event error:', error);
      res.status(500).json({ error: 'Error creating event' });
    }
  }
);

// Get all events (with filtering and pagination)
router.get('/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('category').optional().trim().escape(),
    query('search').optional().trim().escape(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('status').optional().isIn(['draft', 'published', 'cancelled', 'completed'])
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
        category,
        search,
        startDate,
        endDate,
        status = 'published'
      } = req.query;

      const offset = (page - 1) * limit;
      const where = { status };

      if (category) {
        where.category = category;
      }

      if (search) {
        where[Op.or] = [
          { title: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
          { location: { [Op.iLike]: `%${search}%` } }
        ];
      }

      if (startDate && endDate) {
        where[Op.and] = [
          { startDate: { [Op.gte]: startDate } },
          { endDate: { [Op.lte]: endDate } }
        ];
      }

      const { count, rows: events } = await Event.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'username', 'firstName', 'lastName']
          }
        ],
        order: [['startDate', 'ASC']],
        limit,
        offset
      });

      res.json({
        events,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('Get events error:', error);
      res.status(500).json({ error: 'Error fetching events' });
    }
  }
);

// Get single event
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'firstName', 'lastName']
        },
        {
          model: Booking,
          as: 'bookings',
          attributes: ['id', 'numberOfTickets', 'status']
        }
      ]
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Error fetching event' });
  }
});

// Update event (admin only)
router.patch('/:id',
  auth,
  adminAuth,
  upload.single('image'),
  [
    body('title').optional().trim().isLength({ min: 3, max: 100 }).escape(),
    body('description').optional().trim().notEmpty(),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('location').optional().trim().notEmpty(),
    body('capacity').optional().isInt({ min: 1 }),
    body('price').optional().isFloat({ min: 0 }),
    body('category').optional().trim().escape(),
    body('tags').optional().isArray(),
    body('status').optional().isIn(['draft', 'published', 'cancelled', 'completed'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const event = await Event.findByPk(req.params.id);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      const updates = Object.keys(req.body);
      const allowedUpdates = [
        'title', 'description', 'startDate', 'endDate',
        'location', 'capacity', 'price', 'category',
        'tags', 'status'
      ];
      const isValidOperation = updates.every(update => allowedUpdates.includes(update));

      if (!isValidOperation) {
        return res.status(400).json({ error: 'Invalid updates' });
      }

      if (req.file) {
        event.imageUrl = req.file.path;
      }

      updates.forEach(update => event[update] = req.body[update]);
      await event.save();

      res.json(event);
    } catch (error) {
      console.error('Update event error:', error);
      res.status(500).json({ error: 'Error updating event' });
    }
  }
);

// Delete event (admin only)
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if there are any active bookings
    const activeBookings = await Booking.count({
      where: {
        eventId: event.id,
        status: ['pending', 'confirmed']
      }
    });

    if (activeBookings > 0) {
      return res.status(400).json({
        error: 'Cannot delete event with active bookings'
      });
    }

    await event.destroy();
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Error deleting event' });
  }
});

module.exports = router; 
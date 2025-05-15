
## Description
<p>This project is an Event Booking System built with a Node.js/Express backend (using PostgreSQL for data storage) and a modern React (Vite) frontend. It mimics core functionalities such as user authentication, event management, booking workflows, and an admin dashboard via a RESTful API.</p>

## Table of Contents
- [Key Technologies](#key-technologies)
- [Features](#features)
  - [User Authentication](#user-authentication)
  - [Event Management](#event-management)
  - [Booking Workflow](#booking-workflow)
  - [Admin Dashboard](#admin-dashboard)
- [Project Structure](#project-structure)
- [Installation Steps](#installation-steps)
- [Contributing](#contributing)

## Key Technologies
- **Backend Framework:** Node.js (Express)
- **Database:** PostgreSQL
- **Frontend:** React (Vite), Material UI, React Query, Axios, React Router
- **Containerization:** Docker, Docker Compose

## Features

### User Authentication
- Secure JWT-based authentication (register, login, profile update)
- Password hashing (bcrypt) and input validation

### Event Management
- Create, update, delete, and list events (admin only)
- Event details (title, description, start/end dates, location, capacity, price, category, tags, image upload)

### Booking Workflow
- Create bookings (with ticket count and special requests)
- View and cancel bookings (user) or update booking status (admin)

### Admin Dashboard
- Dashboard statistics (users, events, bookings)
- Manage users (update role/status) and event/booking statistics

## Project Structure
```powershell
Event-Booking-System/
├── backend/
│   ├── config/
│   ├── Dockerfile
│   ├── package.json (and package-lock.json)
│   ├── README.md (detailed backend API docs)
│   └── src/ (controllers, routes, models, etc.)
├── frontend/
│   ├── Dockerfile
│   ├── package.json (and package-lock.json)
│   ├── README.md (frontend docs)
│   ├── public/
│   └── src/ (React components, hooks, pages, etc.)
├── docker-compose.yml
├── .dockerignore
└── .gitignore
```

## Installation Steps

<p>1. Clone the repository:</p>

```bash
git clone <your-repo-url>
```

<p>2. Navigate to the project directory:</p>

```bash
cd Event-Booking-System
```

<p>3. (Optional) Set up environment variables for the backend (see backend/README.md) and frontend (VITE_API_URL).</p>

<p>4. Start the application using Docker Compose:</p>

```bash
docker-compose up --build
```

This command will:
- Start a PostgreSQL container (database)
- Build and run the backend (Express) container (API at http://localhost:3000)
- Build and run the frontend (React/Vite) container (UI at http://localhost:5173)
- (Optional) Hot-reload for development

## Contributing
<p>Contributions are welcome! Please submit issues or pull requests to improve the project. For major changes or feature requests, open an issue first to discuss the changes you'd like to make.</p>


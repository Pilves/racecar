const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Import routes and services
const db = require('./config/database');
const apiRoutes = require('./routes/api');
const socketService = require('./services/socketService');

// Initialize socket service
socketService.initialize(io);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));


// Connect to the database and start the server
db.connect().then(() => {
  console.log('Database connected and ready');
    // Mount API routes
    app.use('/api', apiRoutes);

    // Serve HTML files
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });

    app.get('/front-desk', (req, res) => {
      console.log('Path:', path.join(__dirname, '../public/views/FrontDesk.html'));
      res.sendFile(path.join(__dirname, '../public/views/FrontDesk.html'));
    });

    app.get('/lap-line-tracker', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/views/LapLineTracker.html'));
    });

    app.get('/race-control', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/views/RaceControl.html'));
    });

    app.get('/leader-board', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/views/LeaderBoard.html'));
    });

    app.get('/next-race', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/views/NextRace.html'));
    });

    app.get('/race-countdown', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/views/RaceCountdown.html'));
    });

    app.get('/race-flags', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/views/RaceFlags.html'));
    });

  // Error handling for 404s
  app.use((req, res, next) => {
    if (!req.route) {
      console.log('Route not found:', req.url);
      return res.status(404).json({
        message: `Cannot ${req.method} ${req.url}`
      });
    }
    next();
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('Error:', err);

    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
      return res.status(400).json({ message: 'Invalid JSON payload' });
    }

    res.status(err.status || 500).json({
      message: err.message || 'Internal Server Error'
    });
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Server directory:', __dirname);
    console.log('Public directory:', path.join(__dirname, '../public'));
  });
}).catch((error) => {
  console.error('Failed to connect to the database:', error);
});
const express = require('express');
const path = require('path');
const app = express();
const apiRoutes = require('./routes/api'); // Import api.js

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Use the API routes
app.use('/api', apiRoutes);


// Route for /
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});


//admin passwords

// Route for /front-desk
app.get('/front-desk', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/views/FrontDesk.html'));
});

// Route for /lap-line
app.get('/lap-line-tracker', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/views/LapLineTracker.html'));
});

// Route for /race-control
app.get('/race-control', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/views/RaceControl.html'));
});



// Route for /leader-board
app.get('leader-board', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/views/LeaderBoard.html'));
});

// Route for /next-race
app.get('/next-race', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/views/NextRace.html'));
});

// Route for /race-countdown
app.get('/race-countdown', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/views/RaceCountdown.html'));
});

// Route for /front-desk
app.get('/race-flags', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/views/RaceFlags.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

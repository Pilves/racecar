# 🏁 Race Management System

A real-time race management system designed for Beachside Racetrack, enabling race control, lap timing, and spectator information displays.

## 📋 Features

- **Real-time Race Management**
  - Live lap timing
  - Race mode controls (Safe, Hazard, Danger, Finish)
  - Up to 8 drivers per race
  - 10-minute race sessions (1 minute in development mode)

- **Multiple Interfaces**
  - 🎫 Front Desk: Race session and driver management
  - 🎮 Race Control: Safety controls and race mode management
  - ⏱️ Lap-line Tracker: Real-time lap recording
  - 📊 Leader Board: Live race standings
  - 🏎️ Next Race: Upcoming race information
  - ⏰ Race Countdown: Race timer display
  - 🚦 Race Flags: Current race mode indicator

- **Security**
  - Role-based authentication
  - Protected employee interfaces
  - JWT-based API security

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/pilves/racecar.git
cd racecar
```

2. Install dependencies:
```bash
npm install
```

3. Create a .env file in the root directory:
```env
NODE_ENV=development
PORT=3000
RECEPTIONIST_KEY=your_front_desk_key
OBSERVER_KEY=your_lap_line_key
SAFETY_KEY=your_race_control_key
JWT_SECRET=your_jwt_secret
```

4. Initialize the database:
```bash
npm run init-db
```

5. Start the server:
```bash
# Development mode (1-minute races)
npm run dev

# Production mode (10-minute races)
npm start
```

## 🖥️ Interface Access

After starting the server, the following interfaces are available:

- Front Desk: `http://localhost:3000/front-desk`
- Race Control: `http://localhost:3000/race-control`
- Lap-line Tracker: `http://localhost:3000/lap-line-tracker`
- Leader Board: `http://localhost:3000/leader-board`
- Next Race: `http://localhost:3000/next-race`
- Race Countdown: `http://localhost:3000/race-countdown`
- Race Flags: `http://localhost:3000/race-flags`

## 👥 User Guide

### Front Desk Interface
![Front Desk Interface](./docs/images/front-desk.png)

1. Access the Front Desk interface
2. Enter the receptionist access key
3. Create a new race session
4. Add drivers (up to 8)
5. Drivers are automatically assigned car numbers

### Race Control Interface
![Race Control Interface](./docs/images/race-control.png)

1. Access the Race Control interface
2. Enter the safety official access key
3. Start race when ready
4. Control race modes:
   - 🟢 Safe: Normal racing conditions
   - 🟡 Hazard: Caution required
   - 🔴 Danger: Stop racing
   - 🏁 Finish: Race ending

### Lap-line Tracker Interface
![Lap Line Tracker Interface](./docs/images/lap-tracker.png)

1. Access the Lap-line Tracker interface
2. Enter the observer access key
3. Click car buttons when they cross the lap line
4. View real-time lap times
5. See session summary after race ends

### Public Displays

All public displays feature a fullscreen button for optimal visibility:

#### Leader Board
- Real-time race standings
- Fastest lap times
- Current lap counts
- Race mode indicator

#### Next Race
- Upcoming drivers list
- Assigned car numbers
- Race start countdown

#### Race Flags
- Large, clear display of current race mode
- Automatic updates from Race Control

## 🛠️ Development

### Environment Variables

- `NODE_ENV`: Set to 'development' for 1-minute races, 'production' for 10-minute races
- `PORT`: Server port number
- `RECEPTIONIST_KEY`: Front Desk access key
- `OBSERVER_KEY`: Lap-line Tracker access key
- `SAFETY_KEY`: Race Control access key
- `JWT_SECRET`: Secret for JWT token generation

### Database Schema

The system uses SQLite with the following main tables:
- `races`: Race session information
- `drivers`: Driver and car assignments
- `lap_times`: Recorded lap times

### Socket Events

Real-time updates are handled through Socket.IO events:
- `raceStarted`: Race session begins
- `raceModeChanged`: Race mode updates
- `lapRecorded`: New lap time recorded
- `raceEnded`: Race session completed

## 📱 Responsive Design

All interfaces are responsive and work on various devices:
- Desktop: Full featured interfaces
- Tablet: Optimized for lap timing and race control
- Mobile: Essential functions and viewing capabilities

## 🔒 Security Notes

- Employee interfaces require access keys
- Invalid key attempts have a 500ms delay
- Access keys should be complex and unique
- JWT tokens expire after 8 hours

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License - see the [LICENSE.md](LICENSE.md) file for details.

## 📧 Support

For support and questions, please contact [support@beachsideracetrack.com](mailto:support@beachsideracetrack.com)
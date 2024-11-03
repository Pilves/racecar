# 🏁 Project Overview: Race Management System
The Race Management System is a web-based platform designed to manage race events, including race sessions, drivers, and lap times. It consists of a server-side API built with Node.js and a front-end UI for user interaction. Below is a detailed summary of the project components and functionality.


## 📂 Folder Structure
```bash
.
├── .env               # Stores environment variables such as API keys and configuration settings
├── folder_structure.txt  # Documentation of the project's folder structure
├── package-lock.json  # Defines project dependencies and scripts (lockfile)
├── package.json       # Defines project dependencies and scripts
├── public/
│   ├── index.html     # Main entry page that provides navigation to different interfaces
│   ├── css/
│   │   ├── styles.css               # Main stylesheet
│   │   ├── base/
│   │   │   └── _variables.css       # Contains CSS variables for consistent styling
│   │   ├── components/
│   │   │   ├── _auth.css            # Styles for authentication components
│   │   │   ├── _lap-tracker.css     # Styles for lap tracker elements
│   │   │   ├── _leader-board.css    # Styles for leaderboard
│   │   │   ├── _race-controls.css   # Styles for race controls
│   │   │   ├── _race-timer.css      # Styles for race timer display
│   │   │   └── _responsive.css      # Styles to make the UI responsive
│   │   └── utils/
│   │       └── _animations.css      # Reusable animations
│   ├── js/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   └── AuthManager.js   # Handles user authentication
│   │   │   ├── display              # Manage race display components/
│   │   │   │   ├── LapTimesDisplay.js
│   │   │   │   ├── LeaderBoard.js
│   │   │   │   ├── NextRaceDisplay.js
│   │   │   │   ├── RaceSessionManager.js
│   │   │   │   └── RaceTimer.js
│   │   │   └── race/
│   │   │       ├── FlagDisplay.js   # Handle flag display in race events
│   │   │       ├── LapTracker.js
│   │   │       └── RaceControls.js
│   │   ├── services/
│   │   │   ├── apiService.js        # Manages API calls to the server
│   │   │   └── socketService.js     # Connects the client via Socket.io
│   │   └── utils
│   └── views/
│       ├── FrontDesk.html           # Interface for managing race sessions at the front desk
│       ├── LapLineTracker.html      # Interface for tracking laps
│       ├── LeaderBoard.html         # Displays the current leaderboard
│       ├── NextRace.html            # Shows details of upcoming race
│       ├── RaceControl.html         # Interface to control race events
│       ├── RaceCountdown.html       # Countdown timer for races
│       └── RaceFlags.html           # Displays current flag status
└── server/
    ├── app.js               # Main entry point for the server
    ├── config/
    │   ├── database.js      # Manages connection to the SQLite database
    │   └── socket.js        # Configures Socket.io
    ├── constants/
    │   └── raceConstants.js # Defines constants like race statuses and modes
    ├── controllers/
    │   ├── authController.js  # Handles user authentication
    │   └── raceController.js  # Manages race-related operations
    ├── database/
    │   ├── db.js              # Initializes SQLite database tables
    │   └── racetrack.db       # SQLite database
    ├── middleware/
    │   ├── authMiddleware.js  # Handles JWT-based authentication
    │   ├── errorHandler.js    # Handles errors in requests
    │   └── validateRequest.js # Validates request data
    ├── models/
    │   └── Race.js            # Methods for interacting with race data
    ├── routes/
    │   └── api.js             # API endpoints for race management
    ├── services/
    │   ├── raceService.js     # Business logic related to races
    │   └── socketService.js   # Handles Socket.io events
    ├── socket/
    │   └── eventHandlers.js   # Manages Socket.io events
    └── utils/
        ├── timeUtils.js       # Utility functions related to time
        └── validationUtils.js # Handles validation for sessions and drivers
```
## 📁 Project Structure
### Root Files
- **.env**: Stores environment variables such as API keys and configuration settings.
- **package.json & package-lock.json**: Define project dependencies and scripts.
- **project_context.md**: Documentation of the project's folder structure.
- **tree.txt**: Output of the `tree` command to visualize the project structure.

### Public Directory
Contains all client-side assets, including HTML, CSS, and JavaScript files.

- **index.html**: Main entry page that provides navigation to different interfaces such as Front Desk, Race Control, and Leader Board.
- **css**: Contains the stylesheets for the project.
  - **styles.css**: Main stylesheet.
  - **base/_variables.css**: Contains CSS variables for consistent styling.
  - **components**: Component-specific styles, including:
    - **_auth.css**: Styles for authentication components.
    - **_lap-tracker.css**: Styles for lap tracker elements.
    - **_leader-board.css**: Styles for the leaderboard.
    - **_race-controls.css**: Styles for race controls.
    - **_race-timer.css**: Styles for race timer display.
    - **_responsive.css**: Styles to make the UI responsive across devices.
  - **utils/_animations.css**: Reusable animations used throughout the project.
- **js**: Contains JavaScript modules for client-side functionality.
  - **components**
    - **auth/AuthManager.js**: Handles user authentication.
    - **display**
      - **LapTimesDisplay.js, LeaderBoard.js, NextRaceDisplay.js, RaceSessionManager.js, RaceTimer.js**: Manage race display components like lap times, leader board, and race timer.
    - **race**
      - **FlagDisplay.js, LapTracker.js, RaceControls.js**: Handle in-race events like flag displays, lap tracking, and control inputs.
  - **services**
    - **apiService.js**: Manages API calls to the server-side RESTful API.
    - **socketService.js**: Connects the client to the server via Socket.io for real-time updates.

### Views
- **HTML Files**: Pages for different sections of the race management system.
  - **FrontDesk.html**: Interface for managing race sessions at the front desk.
  - **LapLineTracker.html**: Interface for tracking laps.
  - **LeaderBoard.html**: Displays the current leaderboard and race status.
  - **NextRace.html**: Shows details of the upcoming race, including drivers.
  - **RaceControl.html**: Interface to control race events like setting race modes.
  - **RaceCountdown.html**: Countdown timer for races.
  - **RaceFlags.html**: Displays the current flag status for race conditions.

### Server Directory
The backend part of the project, implemented using Express.js.

- **app.js**: Main entry point for the server. Initializes middleware, static routes, and API routes.
- **config**
  - **database.js**: Manages connection to the SQLite database.
  - **socket.js**: Configures Socket.io for real-time communication.
- **constants/raceConstants.js**: Defines constants like race statuses, modes, and configurations.
- **controllers**
  - **authController.js**: Handles user authentication, generating JWT tokens.
  - **raceController.js**: Manages race-related operations, including creating races, adding drivers, and controlling the race.
- **database**
  - **db.js**: Initializes SQLite database tables and provides query functions.
  - **racetrack.db**: SQLite database storing race information.
- **middleware**
  - **authMiddleware.js**: Handles authentication using JWT tokens.
  - **errorHandler.js**: Middleware for handling errors in requests.
  - **validateRequest.js**: Validates incoming request data against predefined schemas.
- **models/Race.js**: Defines methods for interacting with race data in the database, such as creating races and managing drivers.
- **routes/api.js**: Defines the API endpoints, including authentication, race management, and driver operations.
- **services**
  - **raceService.js**: Contains business logic related to races, including starting a race, getting the current race, and managing the state of a race.
  - **socketService.js**: Handles Socket.io events for broadcasting race-related updates.
- **socket/eventHandlers.js**: Manages Socket.io events such as connections and disconnections.
- **utils**
  - **timeUtils.js**: Provides utility functions related to time, like formatting race timers and calculating elapsed time.
  - **validationUtils.js**: Handles validation for race sessions, access keys, and driver information.

## ✨ Key Features
- **🔄 Real-Time Updates**: Uses Socket.io to provide real-time updates for race events like lap tracking, leaderboard changes, and race controls.
- **🔒 Authentication**: JWT-based authentication to secure API endpoints and manage access.
- **🏎️ Race Management**: Supports creating, starting, and ending races, as well as managing drivers and recording lap times.
- **💻 Frontend Views**: Different HTML interfaces for roles such as front desk management, race control, lap tracking, and leaderboard monitoring.

## 🛠️ Technologies Used
- **Backend**: Node.js, Express.js, SQLite
- **Frontend**: HTML, CSS, JavaScript
- **Real-Time Communication**: Socket.io
- **Authentication**: JSON Web Token (JWT)

## 🏟️ Racetrack Info-Screens and Functional Requirements
Beachside Racetrack is a local racetrack that requires a system to control races and inform spectators in real time. The system aims to reduce reliance on staff by automating race management and spectator information.

### 🌊 Situation Overview
Beachside Racetrack is located in a touristic area and has various facilities such as a reception area, paddock, and spectator seating. Due to high competition for hiring staff, the racetrack seeks to automate its operations as much as possible.

### 📋 Functional Requirements
- **User Personas**
  - **Employee**: General term for anyone employed by the racetrack.
  - **Safety Official**: Responsible for starting races, ensuring safety, and monitoring hazards.
  - **Lap-line Observer**: Records when cars cross the lap line; role will be automated in the future.
  - **Flag Bearer**: Communicates safety instructions to drivers using flags; will be replaced by screens.
  - **Receptionist**: Welcomes guests and registers race drivers at the front desk.
  - **Guest**: Any person present at the racetrack.
  - **Race Driver**: Guest participating in a race.
  - **Spectator**: Guest watching a race.

- **Race Sessions**
  - Up to 8 drivers compete to achieve the fastest lap in a 10-minute race session.
  - The Safety Official starts the race and monitors safety.

- **Race Cars**
  - All cars are equal in performance and identified by a number.
  - The cars are tracked entities during the race, and driver performance is linked to the car.

- **Current Race Modes**
  - **🟢 Safe**: No flag.
  - **🟡 Hazard**: Yellow flag, drivers must drive slowly.
  - **🔴 Danger**: Red flag, drivers must stop.
  - **🏁 Finish**: Chequered flag, drivers proceed to the pit lane.

### 📖 User Stories and Desired Processes
- **Configure Upcoming Races**: Receptionist configures race sessions, including adding/removing drivers and race sessions.
- **Announce Next Race**: Drivers are automatically assigned cars and informed when it's their turn.
- **Start Race**: Safety Official starts the race using an interface, updating the race mode and leaderboard.
- **Control Race Modes**: Safety Official can change race modes using an interface, with screens replacing flag bearers.
- **Finish Race and End Session**: Race ends automatically or manually, and cars return to the pit lane.
- **Record Lap Times**: Lap-line Observer uses a tablet to record lap times by pressing buttons representing each car.
- **Spectator View**: Spectators can view leaderboards with real-time lap times, current laps, and race status.

### 🔐 Security Requirements
- Employee interfaces must be protected with access keys defined as environment variables.
- Each interface (Front Desk, Race Control, Lap-line Tracker) requires its own access key.
- Incorrect access key attempts result in a delay before prompting again.

### 💻 Technology Requirements
- **Backend**: Node.js server using Socket.io for real-time functionality.
- **Frontend**: Interfaces accessible via first-level routes for each user type (e.g., `/leader-board`, `/next-race`).
- **Real-Time Communication**: All displays and interfaces must update in real time without polling.

### 📚 Additional Requirements
- **Documentation**: A README.md file explaining how to start the server and use the system, including setting environment variables.
- **Persistence**: The MVP does not require data persistence, but future versions could implement persistent storage.


import FrontDeskView from '../../views/FrontDeskView.js';
import RaceControlView from '../../views/RaceControlView.js';
import LapTrackerView from '../../views/LapTrackerView.js';
import LeaderBoardView from '../../views/LeaderBoardView.js';
import NextRaceView from '../../views/NextRaceView.js';
import RaceCountdownView from '../../views/RaceCountdownView.js';
import FlagDisplayView from '../../views/FlagDisplayView.js';
import LoginView from '../../views/LoginView.js';
import BaseView from '../../views/BaseView';

export const routes = {
  '/': {
    view: LeaderBoardView,
    title: 'Race Leaderboard',
    isPublic: true,
  },
  '/login': {
    view: LoginView,
    title: 'Login',
    isPublic: true,
  },
  '/leader-board': {
    view: LeaderBoardView,
    title: 'Race Leaderboard',
    isPublic: true,
  },
  '/next-race': {
    view: NextRaceView,
    title: 'Next Race',
    isPublic: true,
  },
  '/race-countdown': {
    view: RaceCountdownView,
    title: 'Race Timer',
    isPublic: true,
  },
  '/race-flags': {
    view: FlagDisplayView,
    title: 'Race Flags',
    isPublic: true,
  },
  '/front-desk': {
    view: FrontDeskView,
    title: 'Front Desk',
    role: 'front-desk',
    isPublic: true,
    requiredKey: 'RECEPTIONIST_KEY',
  },
  '/race-control': {
    view: RaceControlView,
    title: 'Race Control',
    role: 'race-control',
    isPublic: true,
    requiredKey: 'SAFETY_KEY',
  },
  '/lap-line-tracker': {
    view: LapTrackerView,
    title: 'Lap Line Tracker',
    role: 'lap-line-tracker',
    isPublic: true,
    requiredKey: 'OBSERVER_KEY',
  },
};

export const notFoundRoute = {
  view: class NotFoundView extends BaseView {
    get defaultTemplate() {
      return `
                <div class="not-found">
                    <h1>404 - Page Not Found</h1>
                    <p>The requested page does not exist.</p>
                    <a href="/" class="btn btn-primary">Go Home</a>
                </div>
            `;
    }
  },
  title: 'Not Found',
  isPublic: true,
};

export const forbiddenRoute = {
  view: class ForbiddenView extends BaseView {
    get defaultTemplate() {
      return `
                <div class="forbidden">
                    <h1>403 - Access Denied</h1>
                    <p>You don't have permission to access this page.</p>
                    <a href="/login" class="btn btn-primary">Login</a>
                </div>
            `;
    }
  },
  title: 'Access Denied',
  isPublic: true,
};

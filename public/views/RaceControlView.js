import BaseView from './BaseView.js';
import stateManager from '../js/services/StateManager.js';
import socketService from '../js/services/socketClient.js';
import { RACE_MODES, RACE_STATUS } from '../js/constants/raceConstant.js';

class RaceControlView extends BaseView {
  constructor() {
    super('race-control', {
      isProtected: true,
      requiredRole: 'race-control'
    });

    this.raceTimer = null;
    this.countdownInterval = null;
  }

  get defaultTemplate() {
    return `
            <div class="race-control-container">
                <header class="control-header">
                    <h1 class="app-title">Race Control</h1>
                    <div class="header-controls">
                        <div id="raceTimer" class="race-timer">
                            ${this.formatTime(this.getRemainingTime())}
                        </div>
                        <button id="logoutBtn" class="btn btn-secondary">Logout</button>
                    </div>
                </header>

                <main class="control-main">
                    <section class="race-modes">
                        <h2 class="section-title">Race Mode Controls</h2>
                        <div class="mode-buttons">
                            ${this.renderModeButtons()}
                        </div>
                    </section>

                    <section class="race-actions">
                        <h2 class="section-title">Race Actions</h2>
                        <div class="action-buttons">
                            ${this.renderActionButtons()}
                        </div>
                    </section>

                    <section class="race-info">
                        <h2 class="section-title">Current Race Information</h2>
                        <div class="info-container">
                            ${this.renderRaceInfo()}
                        </div>
                    </section>
                </main>

                <footer class="control-footer">
                    <div id="connectionStatus" class="connection-status">
                        <span class="status-icon ${this.getConnectionStatusClass()}"></span>
                        <span class="status-text">${this.getConnectionStatus()}</span>
                    </div>
                </footer>
            </div>
        `;
  }

  async setupView() {
    // Subscribe to state changes
    const stateHandlers = [
      { path: 'race.current', handler: this.handleRaceUpdate },
      { path: 'race.mode', handler: this.handleModeUpdate },
      { path: 'race.status', handler: this.handleStatusUpdate },
      { path: 'timer.remaining', handler: this.handleTimerUpdate },
      { path: 'socket.connected', handler: this.handleConnectionUpdate }
    ];

    this.stateSubscriptions = stateHandlers
      .filter(({ handler }) => typeof handler === 'function')
      .map(({ path, handler }) => ({
        path,
        handler: handler.bind(this),
      }));

    // Setup socket listeners
    const socketHandlers = [
      { event: 'raceStarted', handler: this.handleRaceStarted },
      { event: 'raceEnded', handler: this.handleRaceEnded },
      { event: 'raceModeChanged', handler: this.handleModeChanged },
      { event: 'timerUpdate', handler: this.handleTimerUpdate }
    ];

    socketHandlers.forEach(({ event, handler }) => {
      if (typeof handler === 'function') {
        socketService.on(event, handler.bind(this));
      } else {
        console.error(`Handler for event ${event} is undefined`);
      }
    });

    // Initialize race data
    await this.loadCurrentRace();
  }

  async afterRender() {
    // Setup mode button handlers
    this.$$('.mode-button').forEach(button => {
      button.addEventListener('click', this.handleModeChange.bind(this));
    });

    // Setup action button handlers
    this.$('#startRaceBtn')?.addEventListener('click', this.handleStartRace.bind(this));
    this.$('#endRaceBtn')?.addEventListener('click', this.handleEndRace.bind(this));
    this.$('#endSessionBtn')?.addEventListener('click', this.handleEndSession.bind(this));
    this.$('#logoutBtn')?.addEventListener('click', this.handleLogout.bind(this));

    // Start timer if race is in progress
    this.updateTimer();
  }

  // Event Handlers
  async handleModeChange(event) {
    const mode = event.target.dataset.mode;
    if (!mode || !this.canChangeMode()) return;

    try {
      this.setLoading(true);
      const currentRace = stateManager.getState('race.current');

      const response = await fetch(`/api/races/${currentRace.id}/mode`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${stateManager.getState('auth.token')}`
        },
        body: JSON.stringify({ mode })
      });

      if (!response.ok) {
        throw new Error('Failed to change race mode');
      }

      this.showNotification(`Race mode changed to ${mode}`, 'success');
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.setLoading(false);
    }
  }

  async handleStartRace() {
    try {
      this.setLoading(true);
      const currentRace = stateManager.getState('race.current');

      const response = await fetch(`/api/races/${currentRace.id}/start`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${stateManager.getState('auth.token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to start race');
      }

      this.showNotification('Race started successfully', 'success');
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.setLoading(false);
    }
  }

  async handleEndRace() {
    try {
      this.setLoading(true);
      const currentRace = stateManager.getState('race.current');

      const response = await fetch(`/api/races/${currentRace.id}/end`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${stateManager.getState('auth.token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to end race');
      }

      this.showNotification('Race ended successfully', 'success');
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.setLoading(false);
    }
  }

  async handleEndSession() {
    try {
      this.setLoading(true);
      const currentRace = stateManager.getState('race.current');

      const response = await fetch(`/api/races/${currentRace.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${stateManager.getState('auth.token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to end session');
      }

      this.showNotification('Session ended successfully', 'success');
      await this.loadCurrentRace();
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.setLoading(false);
    }
  }

  handleLogout() {
    stateManager.resetState('auth');
    this.navigate('login');
  }

  // State Update Handlers
  handleRaceUpdate(race) {
    if (race) {
      stateManager.updateState('race.status', race.status);
      stateManager.updateState('race.mode', race.mode);
      this.updateTimer();
    }
  }

  handleModeUpdate(mode) {
    this.$$('.mode-button').forEach(button => {
      button.classList.toggle('active', button.dataset.mode === mode);
    });
  }

  handleStatusUpdate(status) {
    this.updateActionButtons();
    this.updateModeButtons();
  }

  handleTimerUpdate(remaining) {
    const timerElement = this.$('#raceTimer');
    if (timerElement) {
      timerElement.textContent = this.formatTime(remaining);
    }
  }

  // Socket Event Handlers
  handleRaceStarted(data) {
    this.loadCurrentRace();
    this.startTimer(data.duration);
  }

  handleRaceEnded() {
    this.stopTimer();
    this.loadCurrentRace();
  }

  handleModeChanged(data) {
    stateManager.updateState('race.mode', data.mode);
  }

  // Helper Methods
  async loadCurrentRace() {
    try {
      const response = await fetch('/api/races/current', {
        headers: {
          'Authorization': `Bearer ${stateManager.getState('auth.token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load current race');
      }

      const race = await response.json();
      stateManager.updateState('race.current', race);
    } catch (error) {
      this.showError(error.message);
    }
  }

  canChangeMode() {
    const status = stateManager.getState('race.status');
    return status === RACE_STATUS.IN_PROGRESS;
  }

  canStartRace() {
    const race = stateManager.getState('race.current');
    return race && race.status === RACE_STATUS.UPCOMING && race.drivers.length > 0;
  }

  canEndRace() {
    const status = stateManager.getState('race.status');
    return status === RACE_STATUS.IN_PROGRESS;
  }

  canEndSession() {
    const status = stateManager.getState('race.status');
    return status === RACE_STATUS.FINISHED;
  }

  renderModeButtons() {
    const currentMode = stateManager.getState('race.mode');
    return Object.entries(RACE_MODES).map(([key, mode]) => `
            <button 
                class="mode-button ${mode} ${currentMode === mode ? 'active' : ''}"
                data-mode="${mode}"
                ${!this.canChangeMode() ? 'disabled' : ''}
            >
                <i class="mode-icon"></i>
                ${this.formatMode(mode)}
            </button>
        `).join('');
  }

  renderActionButtons() {
    return `
            <button 
                id="startRaceBtn" 
                class="action-button start"
                ${!this.canStartRace() ? 'disabled' : ''}
            >
                Start Race
            </button>
            <button 
                id="endRaceBtn" 
                class="action-button end"
                ${!this.canEndRace() ? 'disabled' : ''}
            >
                End Race
            </button>
            <button 
                id="endSessionBtn" 
                class="action-button end-session"
                ${!this.canEndSession() ? 'disabled' : ''}
            >
                End Session
            </button>
        `;
  }

  renderRaceInfo() {
    const race = stateManager.getState('race.current');
    if (!race) return '<p>No active race session</p>';

    return `
            <div class="race-info-grid">
                <div class="info-item">
                    <span class="label">Status:</span>
                    <span class="value">${this.formatStatus(race.status)}</span>
                </div>
                <div class="info-item">
                    <span class="label">Drivers:</span>
                    <span class="value">${race.drivers.length}</span>
                </div>
                <div class="info-item">
                    <span class="label">Mode:</span>
                    <span class="value">${this.formatMode(race.mode)}</span>
                </div>
                <div class="info-item">
                    <span class="label">Started:</span>
                    <span class="value">${race.startTime ? this.formatDateTime(race.startTime) : 'Not started'}</span>
                </div>
            </div>
        `;
  }

  // Timer Methods
  startTimer(duration) {
    this.stopTimer();
    const endTime = Date.now() + duration;

    this.timerInterval = setInterval(() => {
      const remaining = endTime - Date.now();
      if (remaining <= 0) {
        this.stopTimer();
        this.handleEndRace();
      } else {
        stateManager.updateState('timer.remaining', remaining);
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  updateTimer() {
    const race = stateManager.getState('race.current');
    if (race && race.status === RACE_STATUS.IN_PROGRESS) {
      const elapsed = Date.now() - race.startTime;
      const remaining = race.duration - elapsed;
      if (remaining > 0) {
        this.startTimer(remaining);
      }
    } else {
      this.stopTimer();
    }
  }

  getRemainingTime() {
    return stateManager.getState('timer.remaining') || 0;
  }

  // Formatting Methods
  formatTime(ms) {
    if (!ms) return '00:00';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  formatMode(mode) {
    return mode.replace('_', ' ').toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  formatStatus(status) {
    return status.replace('_', ' ').toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  formatDateTime(timestamp) {
    return new Date(timestamp).toLocaleString();
  }

  getConnectionStatus() {
    return socketService.isConnected() ? 'Connected' : 'Connecting...';
  }

  getConnectionStatusClass() {
    return socketService.isConnected() ? 'connected' : '';
  }

  async cleanup() {
    this.stopTimer();

    // Remove socket listeners
    socketService.off('raceStarted', this.handleRaceStarted);
    socketService.off('raceEnded', this.handleRaceEnded);
    socketService.off('raceModeChanged', this.handleModeChanged);
    socketService.off('timerUpdate', this.handleTimerUpdate);
  }
}

export default RaceControlView;

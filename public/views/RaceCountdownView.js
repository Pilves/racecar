import BaseView from './BaseView.js';
import stateManager from '../js/services/StateManager.js';
import socketService from '../js/services/socketClient.js';

class RaceCountdownView extends BaseView {
  constructor() {
    super('race-countdown', {
      isProtected: false
    });
  }

  get defaultTemplate() {
    return `
            <div class="countdown-container">
                <header class="countdown-header">
                    <button id="fullscreenBtn" class="fullscreen-button">
                        <i class="icon-fullscreen"></i>
                    </button>
                </header>

                <main class="countdown-main ${this.getDisplayClass()}">
                    <div class="timer-display">
                        <div class="time-value">${this.formatTime(this.getRemainingTime())}</div>
                        <div class="race-status ${this.getRaceStatusClass()}">
                            ${this.getRaceStatus()}
                        </div>
                    </div>

                    <div class="race-info">
                        <div class="driver-count">
                            Drivers: ${this.getDriverCount()}
                        </div>
                        <div class="lap-count">
                            Total Laps: ${this.getTotalLaps()}
                        </div>
                    </div>

                    ${this.renderAlert()}
                </main>
            </div>
        `;
  }

  async setupView() {
    this.stateSubscriptions = [
      { path: 'timer.remaining', handler: this.updateTimer.bind(this) },
      { path: 'race.status', handler: this.updateStatus.bind(this) },
      { path: 'race.current', handler: this.handleRaceUpdate.bind(this) }
    ];

    socketService.on('raceStarted', this.handleRaceStarted.bind(this));
    socketService.on('raceEnded', this.handleRaceEnded.bind(this));
    socketService.on('raceModeChanged', this.handleModeChange.bind(this));
    socketService.on('lapRecorded', this.updateLapCount.bind(this));

    await this.loadCurrentRace();
    this.startPulseAnimation();
  }

  async afterRender() {
    this.$('#fullscreenBtn')?.addEventListener('click', this.toggleFullscreen.bind(this));
  }

  // Event Handlers
  handleRaceStarted(data) {
    this.startPulseAnimation();
    this.render();
  }

  handleRaceEnded() {
    this.stopPulseAnimation();
    this.render();
  }

  handleModeChange(data) {
    stateManager.updateState('race.mode', data.mode);
    this.render();
  }

  handleRaceUpdate(race) {
    if (!race) return;

    const isActive = race.status === 'in_progress';
    isActive ? this.startPulseAnimation() : this.stopPulseAnimation();
    this.render();
  }

  // Update Methods
  updateTimer(remaining) {
    const timeElement = this.$('.time-value');
    if (timeElement) {
      timeElement.textContent = this.formatTime(remaining);
      this.updatePulse(remaining);
    }
  }

  updateStatus(status) {
    const statusElement = this.$('.race-status');
    if (statusElement) {
      statusElement.textContent = this.getRaceStatus();
      statusElement.className = `race-status ${this.getRaceStatusClass()}`;
    }
  }

  updateLapCount() {
    const lapCountElement = this.$('.lap-count');
    if (lapCountElement) {
      lapCountElement.textContent = `Total Laps: ${this.getTotalLaps()}`;
    }
  }

  // Helper Methods
  async loadCurrentRace() {
    try {
      const response = await fetch('/api/races/current');
      const race = await response.json();
      stateManager.updateState('race.current', race);
    } catch (error) {
      console.error('Failed to load race:', error);
    }
  }

  getRemainingTime() {
    return stateManager.getState('timer.remaining') || 0;
  }

  getDriverCount() {
    const race = stateManager.getState('race.current');
    return race?.drivers?.length || 0;
  }

  getTotalLaps() {
    const race = stateManager.getState('race.current');
    if (!race?.lapTimes) return 0;

    return Array.from(race.lapTimes.values())
      .reduce((total, laps) => total + laps.length, 0);
  }

  getRaceStatus() {
    const status = stateManager.getState('race.status');
    return status ? status.replace('_', ' ').toUpperCase() : 'NOT STARTED';
  }

  getRaceStatusClass() {
    const status = stateManager.getState('race.status');
    return status ? `status-${status.toLowerCase()}` : '';
  }

  getDisplayClass() {
    const mode = stateManager.getState('race.mode');
    return mode ? `mode-${mode.toLowerCase()}` : '';
  }

  formatTime(ms) {
    if (!ms) return '00:00';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  renderAlert() {
    const mode = stateManager.getState('race.mode');
    if (mode === 'danger') {
      return `
                <div class="alert danger-alert">
                    <h2>STOP!</h2>
                    <p>Race suspended</p>
                </div>
            `;
    }
    if (mode === 'hazard') {
      return `
                <div class="alert warning-alert">
                    <h2>CAUTION!</h2>
                    <p>Reduce speed</p>
                </div>
            `;
    }
    return '';
  }

  startPulseAnimation() {
    document.documentElement.style.setProperty('--pulse-animation', 'pulse 2s infinite');
  }

  stopPulseAnimation() {
    document.documentElement.style.setProperty('--pulse-animation', 'none');
  }

  updatePulse(remaining) {
    if (remaining < 60000) { // Last minute
      document.documentElement.style.setProperty('--pulse-duration', '1s');
    } else {
      document.documentElement.style.setProperty('--pulse-duration', '2s');
    }
  }

  async toggleFullscreen() {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }

  cleanup() {
    this.stopPulseAnimation();
    socketService.off('raceStarted');
    socketService.off('raceEnded');
    socketService.off('raceModeChanged');
    socketService.off('lapRecorded');
  }
}

export default RaceCountdownView;

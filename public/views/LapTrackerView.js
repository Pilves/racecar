import BaseView from './BaseView.js';
import stateManager from '../js/services/StateManager.js';
import socketService from '../js/services/socketClient.js';

class LapTrackerView extends BaseView {
  constructor() {
    super('lap-line-tracker', {
      isProtected: true,
      requiredRole: 'lap-line-tracker'
    });
  }

  get defaultTemplate() {
    return `
            <div class="lap-tracker-container">
                <header class="tracker-header">
                    <h1 class="app-title">Lap Line Tracker</h1>
                    <div id="raceTimer" class="race-timer">${this.formatTime(this.getRemainingTime())}</div>
                </header>

                <div class="race-status">
                    <h2>Race Status: <span id="raceStatus">${this.getRaceStatus()}</span></h2>
                </div>

                <div id="carGrid" class="car-buttons-grid">
                    ${this.renderCarButtons()}
                </div>

                <div class="latest-laps">
                    <h2>Latest Lap Times</h2>
                    <div id="latestLaps" class="lap-times-list">
                        ${this.renderLatestLaps()}
                    </div>
                </div>

                <div id="sessionSummary" class="session-summary ${this.shouldShowSummary() ? '' : 'hidden'}">
                    <h2>Session Summary</h2>
                    ${this.renderSessionSummary()}
                </div>
            </div>
        `;
  }

  async setupView() {
    // Subscribe to state changes
    this.stateSubscriptions = [
      { path: 'race.current', handler: () => this.render() },
      { path: 'race.status', handler: this.updateRaceStatus.bind(this) },
      { path: 'timer.remaining', handler: this.updateTimer.bind(this) }
    ];

    // Setup socket listeners
    socketService.on('raceStarted', () => this.loadCurrentRace());
    socketService.on('raceEnded', () => this.showSessionSummary());
    socketService.on('lapRecorded', this.updateLapTimes.bind(this));

    await this.loadCurrentRace();
  }

  async afterRender() {
    // Setup car button handlers
    this.$$('.car-button').forEach(button => {
      button.addEventListener('click', this.handleLapRecord.bind(this));
    });
  }

  // Event Handlers
  async handleLapRecord(event) {
    const carNumber = parseInt(event.target.dataset.carNumber);
    if (!this.canRecordLap()) return;

    try {
      const currentRace = stateManager.getState('race.current');
      await fetch(`/api/races/${currentRace.id}/laps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${stateManager.getState('auth.token')}`
        },
        body: JSON.stringify({
          carNumber,
          timestamp: Date.now()
        })
      });
    } catch (error) {
      this.showError(`Failed to record lap for car #${carNumber}`);
    }
  }

  // Helper Methods
  async loadCurrentRace() {
    try {
      const response = await fetch('/api/races/current', {
        headers: { 'Authorization': `Bearer ${stateManager.getState('auth.token')}` }
      });
      const race = await response.json();
      stateManager.updateState('race.current', race);
    } catch (error) {
      this.showError('Failed to load race data');
    }
  }

  renderCarButtons() {
    const race = stateManager.getState('race.current');
    if (!race?.drivers) return '';

    return race.drivers.map(driver => `
            <button 
                class="car-button"
                data-car-number="${driver.carNumber}"
                ${!this.canRecordLap() ? 'disabled' : ''}
            >
                Car #${driver.carNumber}
            </button>
        `).join('');
  }

  renderLatestLaps() {
    const race = stateManager.getState('race.current');
    if (!race?.lapTimes) return '';

    const latestLaps = Array.from(race.lapTimes.entries())
      .flatMap(([carNumber, laps]) =>
        laps.map(lap => ({ carNumber, ...lap })))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    return latestLaps.map(lap => `
            <div class="lap-time-entry">
                Car #${lap.carNumber}: ${this.formatTime(lap.duration)}
            </div>
        `).join('');
  }

  renderSessionSummary() {
    const race = stateManager.getState('race.current');
    if (!race || race.status !== 'finished') return '';

    return `
            <div class="summary-content">
                <p>Total Laps: ${this.calculateTotalLaps()}</p>
                <p>Best Lap: ${this.getBestLap()}</p>
            </div>
        `;
  }

  // Utility Methods
  canRecordLap() {
    const status = stateManager.getState('race.status');
    return status === 'in_progress';
  }

  shouldShowSummary() {
    const status = stateManager.getState('race.status');
    return status === 'finished';
  }

  getRaceStatus() {
    const status = stateManager.getState('race.status');
    return status ? status.replace('_', ' ').toUpperCase() : 'NO ACTIVE RACE';
  }

  formatTime(ms) {
    if (!ms) return '00:00.00';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  }

  getRemainingTime() {
    return stateManager.getState('timer.remaining') || 0;
  }

  calculateTotalLaps() {
    const race = stateManager.getState('race.current');
    return Array.from(race.lapTimes.values())
      .reduce((total, laps) => total + laps.length, 0);
  }

  getBestLap() {
    const race = stateManager.getState('race.current');
    let bestLap = null;

    for (const laps of race.lapTimes.values()) {
      for (const lap of laps) {
        if (!bestLap || (lap.duration && lap.duration < bestLap.duration)) {
          bestLap = lap;
        }
      }
    }

    return bestLap ? `${this.formatTime(bestLap.duration)} (Car #${bestLap.carNumber})` : 'N/A';
  }

  // Update Methods
  updateRaceStatus(status) {
    const statusElement = this.$('#raceStatus');
    if (statusElement) {
      statusElement.textContent = this.getRaceStatus();
    }
  }

  updateTimer(remaining) {
    const timerElement = this.$('#raceTimer');
    if (timerElement) {
      timerElement.textContent = this.formatTime(remaining);
    }
  }

  updateLapTimes() {
    const latestLapsElement = this.$('#latestLaps');
    if (latestLapsElement) {
      latestLapsElement.innerHTML = this.renderLatestLaps();
    }
  }

  cleanup() {
    socketService.off('raceStarted');
    socketService.off('raceEnded');
    socketService.off('lapRecorded');
  }
}

export default LapTrackerView;

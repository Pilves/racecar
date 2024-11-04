import BaseView from './BaseView.js';
import stateManager from '../js/services/StateManager.js';
import socketService from '../js/services/socketClient.js';

class LeaderBoardView extends BaseView {
  constructor() {
    super('leader-board', {
      isProtected: false  // Public display
    });
  }

  get defaultTemplate() {
    return `
            <div class="leader-board-container">
                <header class="board-header">
                    <div class="race-info">
                        <h1>Race Leaders</h1>
                        <div id="raceTimer" class="race-timer">
                            ${this.formatTime(this.getRemainingTime())}
                        </div>
                        <div id="raceStatus" class="race-status ${this.getRaceStatusClass()}">
                            ${this.getRaceStatus()}
                        </div>
                    </div>
                    <button id="fullscreenBtn" class="fullscreen-button">
                        <i class="icon-fullscreen"></i>
                    </button>
                </header>

                <div class="standings-container">
                    <div id="standings" class="standings">
                        ${this.renderStandings()}
                    </div>

                    <div class="best-lap-container">
                        <h2>Fastest Lap</h2>
                        <div id="bestLap" class="best-lap">
                            ${this.renderBestLap()}
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  async setupView() {
    this.stateSubscriptions = [
      { path: 'race.current', handler: this.handleRaceUpdate.bind(this) },
      { path: 'race.status', handler: this.updateStatus.bind(this) },
      { path: 'timer.remaining', handler: this.updateTimer.bind(this) }
    ];

    socketService.on('lapRecorded', this.handleLapRecorded.bind(this));
    socketService.on('raceStarted', this.handleRaceStarted.bind(this));
    socketService.on('raceEnded', this.handleRaceEnded.bind(this));

    await this.loadCurrentRace();
    this.startAutoRefresh();
  }

  async afterRender() {
    this.$('#fullscreenBtn')?.addEventListener('click', this.toggleFullscreen.bind(this));
  }

  // Event Handlers
  async handleLapRecorded() {
    await this.updateLeaderboard();
  }

  async handleRaceStarted() {
    await this.loadCurrentRace();
  }

  async handleRaceEnded() {
    this.updateStatus('finished');
    await this.updateLeaderboard();
  }

  handleRaceUpdate(race) {
    if (race) {
      this.updateStatus(race.status);
      this.updateStandings();
      this.updateBestLap();
    }
  }

  // Update Methods
  async updateLeaderboard() {
    try {
      const currentRace = stateManager.getState('race.current');
      if (!currentRace) return;

      const response = await fetch(`/api/races/${currentRace.id}/leaderboard`);
      const data = await response.json();

      stateManager.updateState('race.leaderboard', data);
      this.updateStandings();
      this.updateBestLap();
    } catch (error) {
      console.error('Failed to update leaderboard:', error);
    }
  }

  updateStandings() {
    const standingsElement = this.$('#standings');
    if (standingsElement) {
      standingsElement.innerHTML = this.renderStandings();
    }
  }

  updateBestLap() {
    const bestLapElement = this.$('#bestLap');
    if (bestLapElement) {
      bestLapElement.innerHTML = this.renderBestLap();
    }
  }

  updateStatus(status) {
    const statusElement = this.$('#raceStatus');
    if (statusElement) {
      statusElement.textContent = this.getRaceStatus(status);
      statusElement.className = `race-status ${this.getRaceStatusClass(status)}`;
    }
  }

  updateTimer(remaining) {
    const timerElement = this.$('#raceTimer');
    if (timerElement) {
      timerElement.textContent = this.formatTime(remaining);
    }
  }

  // Render Methods
  renderStandings() {
    const race = stateManager.getState('race.current');
    if (!race?.drivers) return '<div class="no-data">No race in progress</div>';

    const leaderboard = stateManager.getState('race.leaderboard') || [];

    return leaderboard.map((entry, index) => `
            <div class="standing-entry ${index === 0 ? 'leader' : ''}">
                <div class="position">${index + 1}</div>
                <div class="driver-info">
                    <span class="car-number">#${entry.carNumber}</span>
                    <span class="driver-name">${entry.driverName}</span>
                </div>
                <div class="lap-info">
                    <span class="total-laps">Laps: ${entry.totalLaps}</span>
                    <span class="best-lap">Best: ${this.formatTime(entry.bestLap)}</span>
                </div>
            </div>
        `).join('');
  }

  renderBestLap() {
    const leaderboard = stateManager.getState('race.leaderboard') || [];
    const bestLap = leaderboard.reduce((best, current) => {
      if (!best || (current.bestLap && current.bestLap < best.bestLap)) {
        return current;
      }
      return best;
    }, null);

    if (!bestLap || !bestLap.bestLap) {
      return '<div class="no-data">No laps recorded</div>';
    }

    return `
            <div class="best-lap-info">
                <div class="time">${this.formatTime(bestLap.bestLap)}</div>
                <div class="driver">
                    Car #${bestLap.carNumber} - ${bestLap.driverName}
                </div>
            </div>
        `;
  }

  // Helper Methods
  async loadCurrentRace() {
    try {
      const response = await fetch('/api/races/current');
      const race = await response.json();
      stateManager.updateState('race.current', race);
      await this.updateLeaderboard();
    } catch (error) {
      console.error('Failed to load race data:', error);
    }
  }

  startAutoRefresh() {
    this.stopAutoRefresh();
    this.refreshInterval = setInterval(() => {
      this.updateLeaderboard();
    }, 5000); // Refresh every 5 seconds
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  getRaceStatus(status = null) {
    status = status || stateManager.getState('race.status');
    if (!status) return 'NO ACTIVE RACE';
    return status.toUpperCase().replace('_', ' ');
  }

  getRaceStatusClass(status = null) {
    status = status || stateManager.getState('race.status');
    return status ? `status-${status.toLowerCase()}` : '';
  }

  getRemainingTime() {
    return stateManager.getState('timer.remaining') || 0;
  }

  formatTime(ms) {
    if (!ms) return '00:00.000';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }

  async toggleFullscreen() {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }

  cleanup() {
    this.stopAutoRefresh();
    socketService.off('lapRecorded');
    socketService.off('raceStarted');
    socketService.off('raceEnded');
  }
}

export default LeaderBoardView;

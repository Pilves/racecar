import BaseView from './BaseView.js';
import stateManager from '../js/services/StateManager.js';
import socketService from '../js/services/socketClient.js';

class NextRaceView extends BaseView {
  constructor() {
    super('next-race', {
      isProtected: false  // Public display
    });
  }

  get defaultTemplate() {
    return `
            <div class="next-race-container">
                <header class="display-header">
                    <h1>Next Race Session</h1>
                    <button id="fullscreenBtn" class="fullscreen-button">
                        <i class="icon-fullscreen"></i>
                    </button>
                </header>

                <div class="race-info">
                    ${this.renderRaceInfo()}
                </div>

                <div class="driver-grid">
                    ${this.renderDriverGrid()}
                </div>

                <div class="instructions">
                    ${this.renderInstructions()}
                </div>

                <div id="messageOverlay" class="message-overlay ${this.shouldShowMessage() ? '' : 'hidden'}">
                    <div class="message-content">
                        ${this.getOverlayMessage()}
                    </div>
                </div>
            </div>
        `;
  }

  async setupView() {
    this.stateSubscriptions = [
      { path: 'race.next', handler: this.handleNextRaceUpdate.bind(this) },
      { path: 'race.current', handler: this.handleCurrentRaceUpdate.bind(this) }
    ];

    socketService.on('raceCreated', this.handleRaceCreated.bind(this));
    socketService.on('raceStarted', this.handleRaceStarted.bind(this));
    socketService.on('driverAdded', this.handleDriverUpdate.bind(this));
    socketService.on('driverRemoved', this.handleDriverUpdate.bind(this));

    await this.loadNextRace();
    this.startAutoRefresh();
  }

  async afterRender() {
    this.$('#fullscreenBtn')?.addEventListener('click', this.toggleFullscreen.bind(this));
  }

  // Event Handlers
  handleNextRaceUpdate(race) {
    this.render();
  }

  handleCurrentRaceUpdate(race) {
    if (race?.status === 'in_progress') {
      this.showMessage('Race in progress', 'Please wait for the next session');
    } else if (race?.status === 'upcoming' && race?.drivers?.length > 0) {
      this.showMessage('Drivers to paddock', 'Please proceed to the paddock area');
    }
  }

  async handleRaceCreated() {
    await this.loadNextRace();
  }

  async handleRaceStarted() {
    await this.loadNextRace();
  }

  async handleDriverUpdate() {
    await this.loadNextRace();
  }

  // Render Methods
  renderRaceInfo() {
    const race = stateManager.getState('race.next');
    if (!race) return '<div class="no-race">No upcoming races scheduled</div>';

    return `
            <div class="race-details">
                <div class="race-time">
                    ${race.scheduledTime ? this.formatTime(race.scheduledTime) : 'Starting Soon'}
                </div>
                <div class="race-status ${this.getRaceStatusClass()}">
                    ${this.formatStatus(race.status)}
                </div>
                <div class="driver-count">
                    Drivers: ${race.drivers?.length || 0} / ${race.maxDrivers || 8}
                </div>
            </div>
        `;
  }

  renderDriverGrid() {
    const race = stateManager.getState('race.next');
    if (!race?.drivers?.length) return '<div class="no-drivers">Waiting for drivers</div>';

    return `
            <div class="grid-container">
                ${race.drivers.map(driver => `
                    <div class="driver-card">
                        <div class="car-number">#${driver.carNumber}</div>
                        <div class="driver-name">${driver.name}</div>
                    </div>
                `).join('')}
            </div>
        `;
  }

  renderInstructions() {
    const race = stateManager.getState('race.next');
    if (!race) return '';

    const currentRace = stateManager.getState('race.current');
    if (currentRace?.status === 'in_progress') {
      return '<p>Race in progress. Please wait for the next session.</p>';
    }

    if (race.status === 'upcoming' && race.drivers?.length > 0) {
      return `
                <div class="instruction-box">
                    <h2>Attention Drivers</h2>
                    <p>Please proceed to the paddock area</p>
                    <p>Ensure you know your assigned car number</p>
                </div>
            `;
    }

    return '<p>Registration open at the front desk</p>';
  }

  // Helper Methods
  async loadNextRace() {
    try {
      const response = await fetch('/api/races/next');
      const race = await response.json();
      stateManager.updateState('race.next', race);
    } catch (error) {
      console.error('Failed to load next race:', error);
    }
  }

  startAutoRefresh() {
    this.stopAutoRefresh();
    this.refreshInterval = setInterval(() => {
      this.loadNextRace();
    }, 10000); // Refresh every 10 seconds
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatStatus(status) {
    return status?.replace('_', ' ').toUpperCase() || 'SCHEDULED';
  }

  getRaceStatusClass() {
    const status = stateManager.getState('race.next')?.status;
    return status ? `status-${status.toLowerCase()}` : '';
  }

  shouldShowMessage() {
    const currentRace = stateManager.getState('race.current');
    return currentRace?.status === 'in_progress' ||
      (currentRace?.status === 'upcoming' && currentRace?.drivers?.length > 0);
  }

  getOverlayMessage() {
    const currentRace = stateManager.getState('race.current');
    if (currentRace?.status === 'in_progress') {
      return `
                <h2>Race in Progress</h2>
                <p>Please wait for the next session</p>
            `;
    }
    if (currentRace?.status === 'upcoming' && currentRace?.drivers?.length > 0) {
      return `
                <h2>Drivers to Paddock</h2>
                <p>Please proceed to the paddock area</p>
            `;
    }
    return '';
  }

  showMessage(title, message) {
    const overlay = this.$('#messageOverlay');
    if (overlay) {
      overlay.innerHTML = `
                <div class="message-content">
                    <h2>${title}</h2>
                    <p>${message}</p>
                </div>
            `;
      overlay.classList.remove('hidden');
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
    this.stopAutoRefresh();
    socketService.off('raceCreated');
    socketService.off('raceStarted');
    socketService.off('driverAdded');
    socketService.off('driverRemoved');
  }
}

export default NextRaceView;

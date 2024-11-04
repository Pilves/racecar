import BaseView from './BaseView.js';
import stateManager from '../js/services/StateManager.js';
import socketService from '../js/services/socketClient.js';

class FlagDisplayView extends BaseView {
  constructor() {
    super('flag-display', {
      isProtected: false
    });
  }

  get defaultTemplate() {
    return `
            <div class="flag-display-container ${this.getCurrentModeClass()}">
                <header class="display-header">
                    <button id="fullscreenBtn" class="fullscreen-button">
                        <i class="icon-fullscreen"></i>
                    </button>
                </header>

                <main class="flag-content">
                    ${this.renderFlag()}
                </main>

                <footer class="display-footer">
                    <div class="status-text">
                        ${this.getStatusText()}
                    </div>
                </footer>

                ${this.renderOverlay()}
            </div>
        `;
  }

  async setupView() {
    this.stateSubscriptions = [
      { path: 'race.mode', handler: this.handleModeChange.bind(this) },
      { path: 'race.status', handler: this.handleStatusChange.bind(this) }
    ];

    socketService.on('raceModeChanged', this.handleModeChange.bind(this));
    socketService.on('raceStarted', this.handleRaceStarted.bind(this));
    socketService.on('raceEnded', this.handleRaceEnded.bind(this));

    await this.loadCurrentRace();
  }

  async afterRender() {
    this.$('#fullscreenBtn')?.addEventListener('click', this.toggleFullscreen.bind(this));
    this.startFlagAnimation();
  }

  // Event Handlers
  handleModeChange(data) {
    const mode = data?.mode || data;
    stateManager.updateState('race.mode', mode);
    this.playModeChangeSound(mode);
    this.render();
  }

  handleStatusChange(status) {
    this.render();
  }

  handleRaceStarted() {
    this.render();
    this.showMessage('Race Started', 'Drive Safe!', 3000);
  }

  handleRaceEnded() {
    this.render();
    this.showMessage('Race Finished', 'Return to Pit Lane', 5000);
  }

  // Render Methods
  renderFlag() {
    const mode = stateManager.getState('race.mode');
    return `
            <div class="flag ${this.getFlagClass(mode)}">
                ${this.getFlagContent(mode)}
            </div>
        `;
  }

  renderOverlay() {
    return `
            <div id="messageOverlay" class="message-overlay hidden">
                <div class="message-content">
                    <h2 id="messageTitle"></h2>
                    <p id="messageText"></p>
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
      stateManager.updateState('race.mode', race.mode);
      stateManager.updateState('race.status', race.status);
    } catch (error) {
      console.error('Failed to load race:', error);
    }
  }

  getCurrentModeClass() {
    const mode = stateManager.getState('race.mode');
    return mode ? `mode-${mode.toLowerCase()}` : '';
  }

  getFlagClass(mode) {
    switch (mode) {
      case 'safe': return 'green-flag';
      case 'hazard': return 'yellow-flag';
      case 'danger': return 'red-flag';
      case 'finish': return 'checkered-flag';
      default: return '';
    }
  }

  getFlagContent(mode) {
    switch (mode) {
      case 'safe':
        return `
                    <div class="flag-solid green"></div>
                    <span class="flag-text">Track Clear</span>
                `;
      case 'hazard':
        return `
                    <div class="flag-solid yellow"></div>
                    <span class="flag-text">Caution</span>
                `;
      case 'danger':
        return `
                    <div class="flag-solid red"></div>
                    <span class="flag-text">Stop</span>
                `;
      case 'finish':
        return `
                    <div class="checkered-pattern"></div>
                    <span class="flag-text">Race Complete</span>
                `;
      default:
        return `
                    <div class="flag-solid gray"></div>
                    <span class="flag-text">Standby</span>
                `;
    }
  }

  getStatusText() {
    const mode = stateManager.getState('race.mode');
    switch (mode) {
      case 'safe': return 'TRACK CLEAR - NORMAL SPEED';
      case 'hazard': return 'CAUTION - REDUCE SPEED';
      case 'danger': return 'DANGER - STOP IMMEDIATELY';
      case 'finish': return 'RACE COMPLETE - RETURN TO PIT';
      default: return 'WAITING FOR RACE START';
    }
  }

  showMessage(title, text, duration = 3000) {
    const overlay = this.$('#messageOverlay');
    const titleEl = this.$('#messageTitle');
    const textEl = this.$('#messageText');

    if (overlay && titleEl && textEl) {
      titleEl.textContent = title;
      textEl.textContent = text;
      overlay.classList.remove('hidden');

      setTimeout(() => {
        overlay.classList.add('hidden');
      }, duration);
    }
  }

  startFlagAnimation() {
    const flag = this.$('.flag');
    if (flag) {
      flag.style.animation = 'flagWave 2s infinite ease-in-out';
    }
  }

  playModeChangeSound(mode) {
    const sounds = {
      safe: new Audio('/sounds/green-flag.mp3'),
      hazard: new Audio('/sounds/yellow-flag.mp3'),
      danger: new Audio('/sounds/red-flag.mp3'),
      finish: new Audio('/sounds/checkered-flag.mp3')
    };

    const sound = sounds[mode];
    if (sound) {
      sound.play().catch(error => {
        console.warn('Failed to play sound:', error);
      });
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
    socketService.off('raceModeChanged');
    socketService.off('raceStarted');
    socketService.off('raceEnded');
  }
}

export default FlagDisplayView;

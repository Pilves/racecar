import BaseView from './BaseView.js';
import stateManager from '../js/services/StateManager.js';
import socketService from '../js/services/socketClient.js';

class FrontDeskView extends BaseView {
  constructor() {
    super('front-desk', {
      isProtected: true,
      requiredRole: 'front-desk'
    });

    this.driverForm = null;
    this.driversTable = null;
  }

  get defaultTemplate() {
    return `
            <div class="front-desk-container">
                <header class="app-header">
                    <h1 class="app-title">Race Management - Front Desk</h1>
                    <div class="header-controls">
                        <button id="createRaceBtn" class="btn btn-primary" \${!this.canCreateRace() ? 'disabled' : ''}>
                            Create New Race
                        </button>
                        <button id="logoutBtn" class="btn btn-secondary">Logout</button>
                    </div>
                </header>

                <section id="currentRaceSection" class="section race-session">
                    <h2 class="section-title">Current Race Session</h2>
                    
                    <div class="race-status">
                        <span class="status-label">Status:</span>
                        <span id="raceStatusText" class="status-text \${this.getRaceStatusClass()}">
                            \${this.getCurrentRaceStatus()}
                        </span>
                    </div>

                    <form id="addDriverForm" class="form-group" \${!this.canAddDrivers() ? 'disabled' : ''}>
                        <input 
                            type="text" 
                            id="driverName" 
                            class="form-control"
                            placeholder="Enter driver name"
                            required
                        >
                        <button type="submit" class="btn btn-primary">Add Driver</button>
                    </form>

                    <div class="table-container">
                        <table id="driversTable" class="table">
                            <thead>
                                <tr>
                                    <th>Car #</th>
                                    <th>Driver Name</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                \${this.renderDriverRows()}
                            </tbody>
                        </table>
                    </div>
                </section>

                <div id="connectionStatus" class="connection-status">
                    <span class="status-icon \${this.getConnectionStatusClass()}"></span>
                    <span class="status-text">\${this.getConnectionStatus()}</span>
                </div>
            </div>
        `;
  }

  async setupView() {
    // Subscribe to state changes
    this.stateSubscriptions = [
      { path: 'race.current', handler: this.handleRaceUpdate.bind(this) },
      { path: 'race.status', handler: this.handleStatusUpdate.bind(this) },
      { path: 'socket.connected', handler: this.handleConnectionUpdate.bind(this) }
    ];

    // Setup socket listeners
    socketService.on('driverAdded', this.handleDriverAdded.bind(this));
    socketService.on('driverRemoved', this.handleDriverRemoved.bind(this));
    socketService.on('raceUpdated', this.handleRaceUpdate.bind(this));

    // Initialize race data
    await this.loadCurrentRace();
  }

  async afterRender() {
    // Setup form handlers
    this.driverForm = this.$('#addDriverForm');
    this.driversTable = this.$('#driversTable tbody');

    this.driverForm?.addEventListener('submit', this.handleAddDriver.bind(this));
    this.$('#createRaceBtn')?.addEventListener('click', this.handleCreateRace.bind(this));
    this.$('#logoutBtn')?.addEventListener('click', this.handleLogout.bind(this));

    // Setup driver removal handlers
    this.$$('.remove-driver-btn').forEach(btn => {
      btn.addEventListener('click', this.handleRemoveDriver.bind(this));
    });
  }

  // Event Handlers
  async handleAddDriver(event) {
    event.preventDefault();
    const nameInput = this.$('#driverName');
    const driverName = nameInput.value.trim();

    if (!driverName) return;

    try {
      this.setLoading(true);
      const currentRace = stateManager.getState('race.current');

      const response = await fetch(`/api/races/${currentRace.id}/drivers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${stateManager.getState('auth.token')}`
        },
        body: JSON.stringify({ name: driverName })
      });

      if (!response.ok) {
        throw new Error('Failed to add driver');
      }

      nameInput.value = '';
      this.showNotification('Driver added successfully', 'success');
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.setLoading(false);
    }
  }

  async handleCreateRace() {
    try {
      this.setLoading(true);
      const response = await fetch('/api/races', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${stateManager.getState('auth.token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to create race');
      }

      this.showNotification('New race created successfully', 'success');
      await this.loadCurrentRace();
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.setLoading(false);
    }
  }

  async handleRemoveDriver(event) {
    const driverId = event.target.dataset.driverId;
    const currentRace = stateManager.getState('race.current');

    try {
      this.setLoading(true);
      const response = await fetch(`/api/races/${currentRace.id}/drivers/${driverId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${stateManager.getState('auth.token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove driver');
      }

      this.showNotification('Driver removed successfully', 'success');
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
  async handleRaceUpdate(race) {
    if (race) {
      stateManager.updateState('race.status', race.status);
      stateManager.updateState('race.drivers', race.drivers);
      await this.render();
    }
  }

  handleStatusUpdate(status) {
    const statusText = this.$('#raceStatusText');
    if (statusText) {
      statusText.textContent = this.formatRaceStatus(status);
      statusText.className = `status-text ${this.getRaceStatusClass(status)}`;
    }
  }

  handleConnectionUpdate(connected) {
    const statusElement = this.$('#connectionStatus');
    if (statusElement) {
      statusElement.querySelector('.status-icon').className =
        `status-icon ${this.getConnectionStatusClass(connected)}`;
      statusElement.querySelector('.status-text').textContent =
        this.getConnectionStatus(connected);
    }
  }

  // Socket Event Handlers
  handleDriverAdded(data) {
    if (data.raceId === stateManager.getState('race.current.id')) {
      this.loadCurrentRace();
    }
  }

  handleDriverRemoved(data) {
    if (data.raceId === stateManager.getState('race.current.id')) {
      this.loadCurrentRace();
    }
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

  canCreateRace() {
    const currentRace = stateManager.getState('race.current');
    return !currentRace || currentRace.status === 'finished';
  }

  canAddDrivers() {
    const currentRace = stateManager.getState('race.current');
    return currentRace && currentRace.status === 'upcoming';
  }

  getCurrentRaceStatus() {
    const status = stateManager.getState('race.status');
    return this.formatRaceStatus(status);
  }

  formatRaceStatus(status) {
    if (!status) return 'No active race';
    return status.replace('_', ' ').toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  getRaceStatusClass(status = null) {
    status = status || stateManager.getState('race.status');
    return status ? `status-${status.toLowerCase()}` : '';
  }

  getConnectionStatus(connected = null) {
    connected = connected ?? socketService.isConnected();
    return connected ? 'Connected' : 'Connecting...';
  }

  getConnectionStatusClass(connected = null) {
    connected = connected ?? socketService.isConnected();
    return connected ? 'connected' : '';
  }

  renderDriverRows() {
    const currentRace = stateManager.getState('race.current');
    if (!currentRace || !currentRace.drivers) return '';

    return currentRace.drivers.map(driver => `
            <tr>
                <td>#${driver.carNumber}</td>
                <td>${driver.name}</td>
                <td>
                    <button 
                        class="btn btn-danger remove-driver-btn" 
                        data-driver-id="${driver.id}"
                        ${!this.canAddDrivers() ? 'disabled' : ''}
                    >
                        Remove
                    </button>
                </td>
            </tr>
        `).join('');
  }

  async cleanup() {
    // Remove socket listeners
    socketService.off('driverAdded', this.handleDriverAdded);
    socketService.off('driverRemoved', this.handleDriverRemoved);
    socketService.off('raceUpdated', this.handleRaceUpdate);
  }
}

export default FrontDeskView;

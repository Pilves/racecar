class RaceSessionManager {
    constructor() {
        this.socket = null;
        this.currentRace = null;
        this.initialize();
    }

    initialize() {
        // Wait for authentication to complete
        window.addEventListener('auth:complete', () => {
            this.setupSocket();
            this.setupEventListeners();
            this.loadCurrentRace();
        });
    }

    setupSocket() {
        this.socket = socketService.getSocket();

        if (this.socket) {
            this.socket.on('driverAdded', (data) => {
                this.handleDriverAdded(data);
            });

            this.socket.on('driverRemoved', (data) => {
                this.handleDriverRemoved(data);
            });

            this.socket.on('raceUpdated', (data) => {
                this.handleRaceUpdate(data);
            });
        }
    }

    setupEventListeners() {
        const addDriverForm = document.getElementById('addDriverForm');
        if (addDriverForm) {
            addDriverForm.addEventListener('submit', (e) => this.handleAddDriver(e));
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('authToken');
                window.location.reload();
            });
        }
    }

    async loadCurrentRace() {
        try {
            const response = await fetch('/api/race/current', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (response.ok) {
                const race = await response.json();
                this.currentRace = race;
                this.updateDisplay();
            }
        } catch (error) {
            console.error('Error loading current race:', error);
        }
    }

    async handleAddDriver(e) {
        e.preventDefault();
        const driverNameInput = document.getElementById('driverName');
        const driverName = driverNameInput.value.trim();

        if (!driverName) return;

        try {
            const response = await fetch('/api/race/current/driver', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({ name: driverName })
            });

            if (response.ok) {
                const driver = await response.json();
                console.log('Driver added:', driver);
                driverNameInput.value = '';
                await this.loadCurrentRace(); // Reload the current race data
            } else {
                const error = await response.json();
                console.error('Failed to add driver:', error.message);
            }
        } catch (error) {
            console.error('Error adding driver:', error);
        }
    }

    async handleRemoveDriver(driverId) {
        try {
            const response = await fetch(`/api/race/current/driver/${driverId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (response.ok) {
                await this.loadCurrentRace(); // Reload the current race data
            } else {
                console.error('Failed to remove driver');
            }
        } catch (error) {
            console.error('Error removing driver:', error);
        }
    }

    handleDriverAdded(data) {
        this.loadCurrentRace(); // Reload the current race data
    }

    handleDriverRemoved(data) {
        this.loadCurrentRace(); // Reload the current race data
    }

    handleRaceUpdate(race) {
        this.currentRace = race;
        this.updateDisplay();
    }

    updateDisplay() {
        const tableBody = document.getElementById('raceSessionsTable');
        if (!tableBody || !this.currentRace) return;

        const drivers = this.currentRace.drivers || [];

        tableBody.innerHTML = drivers.map(driver => `
            <tr>
                <td>${driver.name}</td>
                <td>#${driver.carNumber}</td>
                <td>
                    <button onclick="raceSessionManager.handleRemoveDriver(${driver.id})"
                            class="btn btn-danger">
                        Remove
                    </button>
                </td>
            </tr>
        `).join('');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.raceSessionManager = new RaceSessionManager();
});
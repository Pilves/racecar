class LapTracker {
    constructor(options = {}) {
        this.container = document.getElementById(options.containerId || 'lapTracker');
        this.onLapRecorded = options.onLapRecorded || (() => {});
        this.socket = io();

        this.currentRace = null;
        this.lapTimes = new Map();
        this.isActive = false;

        this.initialize();
    }

    initialize() {
        this.render();
        this.setupSocketListeners();
    }

    render() {
        const html = `
            <div class="lap-tracker-container">
                <div class="car-buttons-grid" id="carButtonsGrid"></div>
                <div class="lap-times-display">
                    <h3>Latest Lap Times</h3>
                    <div class="lap-times-list" id="lapTimesList"></div>
                </div>
                <div class="session-summary hidden" id="sessionSummary">
                    <h3>Session Summary</h3>
                    <div class="summary-content" id="summaryContent"></div>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
        this.carButtonsGrid = document.getElementById('carButtonsGrid');
        this.lapTimesList = document.getElementById('lapTimesList');
        this.sessionSummary = document.getElementById('sessionSummary');
    }

    setupSocketListeners() {
        this.socket.on('raceStarted', (data) => {
            this.handleRaceStart(data);
        });

        this.socket.on('raceFinished', (data) => {
            this.handleRaceFinish(data);
        });

        this.socket.on('lapRecorded', (data) => {
            this.handleLapRecorded(data);
        });
    }

    updateRaceData(raceData) {
        this.currentRace = raceData;
        this.renderCarButtons();
        this.updateLapTimes();
    }

    renderCarButtons() {
        if (!this.currentRace || !this.currentRace.drivers) {
            this.carButtonsGrid.innerHTML = '<p>No active race session</p>';
            return;
        }

        const buttonHtml = this.currentRace.drivers.map(driver => `
            <button class="car-button ${this.isActive ? '' : 'disabled'}"
                    id="car-${driver.carNumber}"
                    data-car="${driver.carNumber}"
                    ${this.isActive ? '' : 'disabled'}>
                <div class="car-number">#${driver.carNumber}</div>
                <div class="driver-name">${driver.name}</div>
                <div class="lap-count">
                    Laps: <span class="count">0</span>
                </div>
            </button>
        `).join('');

        this.carButtonsGrid.innerHTML = buttonHtml;
        this.bindCarButtons();
    }

    bindCarButtons() {
        const buttons = this.carButtonsGrid.querySelectorAll('.car-button');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                if (!this.isActive) return;

                const carNumber = parseInt(button.dataset.car);
                this.recordLap(carNumber);
                this.animateButton(button);
            });
        });
    }

    async recordLap(carNumber) {
        try {
            const timestamp = Date.now();
            const response = await fetch(`/api/races/${this.currentRace.id}/laps`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    carNumber,
                    timestamp
                })
            });

            if (response.ok) {
                const lapData = await response.json();
                this.handleLapRecorded(lapData);
                this.onLapRecorded(lapData);
            } else {
                console.error('Failed to record lap');
            }
        } catch (error) {
            console.error('Error recording lap:', error);
        }
    }

    handleLapRecorded(lapData) {
        const { carNumber, lapNumber, duration } = lapData;

        // Update lap count display
        const button = document.getElementById(`car-${carNumber}`);
        if (button) {
            const countElement = button.querySelector('.count');
            if (countElement) {
                countElement.textContent = lapNumber;
            }
        }

        // Update lap times list
        this.updateLapTimes(lapData);
    }

    updateLapTimes(newLap = null) {
        if (newLap) {
            const carLaps = this.lapTimes.get(newLap.carNumber) || [];
            carLaps.push(newLap);
            this.lapTimes.set(newLap.carNumber, carLaps);
        }

        // Get all lap times sorted by timestamp (most recent first)
        const allLaps = Array.from(this.lapTimes.values())
            .flat()
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 10); // Show only last 10 laps

        const lapTimesHtml = allLaps.map(lap => {
            const driver = this.currentRace.drivers.find(d => d.carNumber === lap.carNumber);
            const isBestLap = this.isBestLap(lap);

            return `
                <div class="lap-time-entry ${isBestLap ? 'best-lap' : ''}">
                    <div class="car-info">
                        <span class="car-number">#${lap.carNumber}</span>
                        <span class="driver-name">${driver ? driver.name : 'Unknown'}</span>
                    </div>
                    <div class="lap-info">
                        <span class="lap-number">Lap ${lap.lapNumber}</span>
                        <span class="lap-time">${this.formatTime(lap.duration)}</span>
                    </div>
                </div>
            `;
        }).join('');

        this.lapTimesList.innerHTML = lapTimesHtml;
    }

    isBestLap(lap) {
        const carLaps = this.lapTimes.get(lap.carNumber) || [];
        const bestLap = Math.min(...carLaps.map(l => l.duration));
        return lap.duration === bestLap;
    }

    handleRaceStart(data) {
        this.isActive = true;
        this.lapTimes.clear();
        this.renderCarButtons();
        this.sessionSummary.classList.add('hidden');
    }

    handleRaceFinish(data) {
        this.isActive = false;
        this.renderCarButtons();
        this.showSessionSummary();
    }

    showSessionSummary() {
        if (!this.currentRace) return;

        const summaryData = this.calculateSessionSummary();
        const summaryHtml = `
            <div class="summary-grid">
                ${this.currentRace.drivers.map(driver => {
            const stats = summaryData[driver.carNumber] || {
                totalLaps: 0,
                bestLap: 0,
                averageLap: 0
            };

            return `
                        <div class="summary-card">
                            <h4>Car #${driver.carNumber} - ${driver.name}</h4>
                            <div class="stats">
                                <div class="stat">
                                    <label>Total Laps:</label>
                                    <span>${stats.totalLaps}</span>
                                </div>
                                <div class="stat">
                                    <label>Best Lap:</label>
                                    <span>${this.formatTime(stats.bestLap)}</span>
                                </div>
                                <div class="stat">
                                    <label>Average Lap:</label>
                                    <span>${this.formatTime(stats.averageLap)}</span>
                                </div>
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;

        this.summaryContent.innerHTML = summaryHtml;
        this.sessionSummary.classList.remove('hidden');
    }

    calculateSessionSummary() {
        const summary = {};

        this.lapTimes.forEach((laps, carNumber) => {
            const lapTimes = laps.map(lap => lap.duration).filter(Boolean);

            summary[carNumber] = {
                totalLaps: laps.length,
                bestLap: Math.min(...lapTimes),
                averageLap: lapTimes.length ?
                    lapTimes.reduce((a, b) => a + b, 0) / lapTimes.length : 0
            };
        });

        return summary;
    }

    animateButton(button) {
        button.classList.add('flash');
        setTimeout(() => {
            button.classList.remove('flash');
        }, 200);
    }

    formatTime(ms) {
        if (!ms) return '--:--.---';
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const milliseconds = Math.floor((ms % 1000));
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
    }
}
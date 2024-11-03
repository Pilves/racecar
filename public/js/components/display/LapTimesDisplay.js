class LapTimesDisplay {
    constructor(options = {}) {
        this.container = document.getElementById(options.containerId || 'lapTimesDisplay');
        this.maxDisplayed = options.maxDisplayed || 10;
        this.lapTimes = new Map();
        
        this.initialize();
    }

    initialize() {
        this.render();
    }

    render() {
        const html = `
            <div class="lap-times-display">
                <div class="latest-laps">
                    <h3>Latest Laps</h3>
                    <div class="lap-list" id="latestLaps"></div>
                </div>
                <div class="best-laps">
                    <h3>Best Laps</h3>
                    <div class="lap-list" id="bestLaps"></div>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
        this.latestLapsList = document.getElementById('latestLaps');
        this.bestLapsList = document.getElementById('bestLaps');
    }

    addLap(lapData) {
        const { carNumber, lapNumber, duration } = lapData;
        
        // Store lap time
        if (!this.lapTimes.has(carNumber)) {
            this.lapTimes.set(carNumber, []);
        }
        this.lapTimes.get(carNumber).push(lapData);

        this.updateDisplay();
    }

    updateDisplay() {
        this.updateLatestLaps();
        this.updateBestLaps();
    }

    updateLatestLaps() {
        // Get all laps sorted by timestamp (most recent first)
        const latestLaps = Array.from(this.lapTimes.values())
            .flat()
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, this.maxDisplayed);

        this.latestLapsList.innerHTML = latestLaps.map(lap => `
            <div class="lap-entry">
                <span class="car-number">#${lap.carNumber}</span>
                <span class="lap-number">Lap ${lap.lapNumber}</span>
                <span class="lap-time">${this.formatTime(lap.duration)}</span>
            </div>
        `).join('');
    }

    updateBestLaps() {
        // Calculate best lap for each car
        const bestLaps = Array.from(this.lapTimes.entries())
            .map(([carNumber, laps]) => {
                const bestLap = laps.reduce((best, current) => 
                    !best || current.duration < best.duration ? current : best
                );
                return bestLap;
            })
            .sort((a, b) => a.duration - b.duration);

        this.bestLapsList.innerHTML = bestLaps.map(lap => `
            <div class="lap-entry best">
                <span class="car-number">#${lap.carNumber}</span>
                <span class="lap-number">Lap ${lap.lapNumber}</span>
                <span class="lap-time">${this.formatTime(lap.duration)}</span>
            </div>
        `).join('');
    }

    formatTime(ms) {
        if (!ms) return '--:--.---';
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const milliseconds = Math.floor((ms % 1000));
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
    }

    reset() {
        this.lapTimes.clear();
        this.updateDisplay();
    }
}
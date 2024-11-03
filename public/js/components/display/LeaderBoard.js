class LeaderBoard {
    constructor(elementId) {
        this.container = document.getElementById(elementId);
        this.raceData = null;
        this.sortField = 'fastestLap';
        this.sortDirection = 'asc';
        
        this.initialize();
    }

    initialize() {
        this.render();
        this.setupSortingListeners();
    }

    update(raceData) {
        this.raceData = raceData;
        this.processData();
        this.render();
    }

    processData() {
        if (!this.raceData || !this.raceData.drivers) return;

        this.raceData.drivers = this.raceData.drivers.map(driver => {
            const laps = this.raceData.lapTimes.get(driver.carNumber) || [];
            const lapTimes = laps.map(lap => lap.duration);

            return {
                ...driver,
                laps: laps.length,
                lastLap: lapTimes[lapTimes.length - 1] || 0,
                fastestLap: Math.min(...lapTimes) || 0,
                averageLap: lapTimes.length ? 
                    lapTimes.reduce((a, b) => a + b, 0) / lapTimes.length : 0
            };
        });

        // Sort data
        this.sortDrivers();
    }

    sortDrivers() {
        this.raceData.drivers.sort((a, b) => {
            let comparison = 0;
            switch (this.sortField) {
                case 'carNumber':
                    comparison = a.carNumber - b.carNumber;
                    break;
                case 'laps':
                    comparison = b.laps - a.laps;
                    break;
                case 'fastestLap':
                    if (a.fastestLap === 0) return 1;
                    if (b.fastestLap === 0) return -1;
                    comparison = a.fastestLap - b.fastestLap;
                    break;
                case 'averageLap':
                    if (a.averageLap === 0) return 1;
                    if (b.averageLap === 0) return -1;
                    comparison = a.averageLap - b.averageLap;
                    break;
            }
            return this.sortDirection === 'asc' ? comparison : -comparison;
        });
    }

    formatTime(ms) {
        if (!ms) return '--:--.---';
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const milliseconds = Math.floor((ms % 1000));
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
    }

    render() {
        if (!this.raceData) {
            this.container.innerHTML = '<div class="text-center p-4">Waiting for race data...</div>';
            return;
        }

        const html = `
            <div class="leader-board-container">
                <table class="leader-board-table">
                    <thead>
                        <tr>
                            <th>Pos</th>
                            <th class="sortable" data-sort="carNumber">Car #</th>
                            <th>Driver</th>
                            <th class="sortable" data-sort="laps">Laps</th>
                            <th class="sortable" data-sort="fastestLap">Best Lap</th>
                            <th class="sortable" data-sort="averageLap">Avg Lap</th>
                            <th>Last Lap</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.raceData.drivers.map((driver, index) => `
                            <tr class="driver-row ${index === 0 ? 'leader' : ''}">
                                <td class="position">${index + 1}</td>
                                <td class="car-number">#${driver.carNumber}</td>
                                <td class="driver-name">${driver.name}</td>
                                <td class="laps">${driver.laps}</td>
                                <td class="best-lap">${this.formatTime(driver.fastestLap)}</td>
                                <td class="avg-lap">${this.formatTime(driver.averageLap)}</td>
                                <td class="last-lap">${this.formatTime(driver.lastLap)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        this.container.innerHTML = html;
    }

    setupSortingListeners() {
        this.container.addEventListener('click', (e) => {
            const sortButton = e.target.closest('.sortable');
            if (!sortButton) return;

            const newSortField = sortButton.dataset.sort;
            if (newSortField === this.sortField) {
                this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                this.sortField = newSortField;
                this.sortDirection = 'asc';
            }

            this.processData();
            this.render();
        });
    }
}
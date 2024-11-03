class RaceControls {
    constructor(options = {}) {
        this.container = document.getElementById(options.containerId || 'raceControls');
        this.onModeChange = options.onModeChange || (() => {});
        this.onStart = options.onStart || (() => {});
        this.onEnd = options.onEnd || (() => {});
        this.socket = io();
        this.currentMode = 'safe';
        
        this.initialize();
    }

    initialize() {
        this.render();
        this.bindEvents();
        this.setupSocketListeners();
    }

    render() {
        const html = `
            <div class="race-controls-container">
                <div class="race-modes">
                    <h3 class="section-title">Race Mode Controls</h3>
                    <div class="mode-buttons">
                        <button id="safeModeBtn" class="mode-button safe ${this.currentMode === 'safe' ? 'active' : ''}">
                            <i class="mode-icon">🟢</i>
                            Safe Mode
                        </button>
                        <button id="hazardModeBtn" class="mode-button hazard ${this.currentMode === 'hazard' ? 'active' : ''}">
                            <i class="mode-icon">🟡</i>
                            Hazard Mode
                        </button>
                        <button id="dangerModeBtn" class="mode-button danger ${this.currentMode === 'danger' ? 'active' : ''}">
                            <i class="mode-icon">🔴</i>
                            Danger Mode
                        </button>
                        <button id="finishModeBtn" class="mode-button finish ${this.currentMode === 'finish' ? 'active' : ''}">
                            <i class="mode-icon">🏁</i>
                            Finish Mode
                        </button>
                    </div>
                </div>
                <div class="race-actions">
                    <button id="startRaceBtn" class="action-button start">
                        Start Race
                    </button>
                    <button id="endSessionBtn" class="action-button end" disabled>
                        End Session
                    </button>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
    }

    bindEvents() {
        const modeButtons = {
            'safe': document.getElementById('safeModeBtn'),
            'hazard': document.getElementById('hazardModeBtn'),
            'danger': document.getElementById('dangerModeBtn'),
            'finish': document.getElementById('finishModeBtn')
        };

        Object.entries(modeButtons).forEach(([mode, button]) => {
            button.addEventListener('click', () => this.handleModeChange(mode));
        });

        const startButton = document.getElementById('startRaceBtn');
        const endButton = document.getElementById('endSessionBtn');

        if (startButton) {
            startButton.addEventListener('click', () => this.handleStart());
        }
        if (endButton) {
            endButton.addEventListener('click', () => this.handleEnd());
        }
    }

    setupSocketListeners() {
        this.socket.on('raceModeChanged', ({ mode }) => {
            this.updateMode(mode);
        });

        this.socket.on('raceStarted', () => {
            this.setStartButtonState(false);
            this.setEndButtonState(false);
        });

        this.socket.on('raceFinished', () => {
            this.setEndButtonState(true);
        });
    }

    async handleModeChange(mode) {
        if (this.currentMode === mode) return;

        try {
            await this.onModeChange(mode);
            this.updateMode(mode);
            this.socket.emit('modeChange', { mode });
        } catch (error) {
            console.error('Error changing mode:', error);
            // Revert to previous mode in UI
            this.updateMode(this.currentMode);
        }
    }

    async handleStart() {
        try {
            await this.onStart();
            this.setStartButtonState(false);
        } catch (error) {
            console.error('Error starting race:', error);
        }
    }

    async handleEnd() {
        try {
            await this.onEnd();
            this.setEndButtonState(false);
            this.updateMode('safe');
        } catch (error) {
            console.error('Error ending race:', error);
        }
    }

    updateMode(mode) {
        this.currentMode = mode;
        
        // Remove active class from all buttons
        document.querySelectorAll('.mode-button').forEach(button => {
            button.classList.remove('active');
        });

        // Add active class to current mode button
        const activeButton = document.getElementById(`${mode}ModeBtn`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }

    setStartButtonState(enabled) {
        const startButton = document.getElementById('startRaceBtn');
        if (startButton) {
            startButton.disabled = !enabled;
        }
    }

    setEndButtonState(enabled) {
        const endButton = document.getElementById('endSessionBtn');
        if (endButton) {
            endButton.disabled = !enabled;
        }
    }
}
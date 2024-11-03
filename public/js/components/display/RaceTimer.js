class RaceTimer {
    constructor(options = {}) {
        this.container = document.getElementById(options.containerId || 'raceTimer');
        this.onFinish = options.onFinish || (() => {});
        this.onTick = options.onTick || (() => {});
        this.duration = options.duration || 600000; // 10 minutes default
        this.warningThreshold = options.warningThreshold || 60000; // 1 minute warning
        
        this.timeLeft = 0;
        this.interval = null;
        this.isRunning = false;
        
        this.initialize();
    }

    initialize() {
        this.render();
    }

    render() {
        const html = `
            <div class="race-timer-container">
                <div class="timer-display">
                    <span class="minutes">00</span>:<span class="seconds">00</span>
                </div>
                <div class="timer-status"></div>
            </div>
        `;

        if (this.container) {
            this.container.innerHTML = html;
        }
    }

    start(duration = this.duration) {
        this.stop();
        this.duration = duration;
        this.timeLeft = duration;
        this.isRunning = true;

        this.update();
        this.interval = setInterval(() => {
            this.timeLeft -= 1000;
            
            if (this.timeLeft <= 0) {
                this.stop();
                this.onFinish();
                return;
            }

            this.update();
            this.onTick(this.timeLeft);
        }, 1000);

        this.container.classList.add('running');
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isRunning = false;
        this.container.classList.remove('running');
    }

    update() {
        const minutes = Math.floor(this.timeLeft / 60000);
        const seconds = Math.floor((this.timeLeft % 60000) / 1000);

        if (this.container) {
            const minutesDisplay = this.container.querySelector('.minutes');
            const secondsDisplay = this.container.querySelector('.seconds');
            const statusDisplay = this.container.querySelector('.timer-status');

            if (minutesDisplay) {
                minutesDisplay.textContent = String(minutes).padStart(2, '0');
            }
            if (secondsDisplay) {
                secondsDisplay.textContent = String(seconds).padStart(2, '0');
            }

            // Update timer status and styling
            this.container.classList.remove('warning', 'critical');
            if (this.timeLeft <= this.warningThreshold) {
                this.container.classList.add('warning');
                if (statusDisplay) {
                    statusDisplay.textContent = 'Race ending soon!';
                }
            }
            if (this.timeLeft <= 10000) { // Last 10 seconds
                this.container.classList.add('critical');
                if (statusDisplay) {
                    statusDisplay.textContent = 'Race ending!';
                }
            }
        }
    }

    reset() {
        this.stop();
        this.timeLeft = this.duration;
        this.update();
        this.container.classList.remove('warning', 'critical');
    }

    getTimeLeft() {
        return this.timeLeft;
    }

    isActive() {
        return this.isRunning;
    }
}
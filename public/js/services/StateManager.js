class StateManager {
  constructor() {
    this.state = {
      auth: {
        isAuthenticated: false,
        token: null,
        interfaceType: null,
        error: null
      },
      race: {
        current: null,
        status: null,
        mode: null,
        drivers: [],
        startTime: null,
        endTime: null,
        error: null
      },
      stats: {
        leaderboard: [],
        fastestLap: null,
        lastUpdate: null,
        error: null
      },
      timer: {
        remaining: null,
        isRunning: false,
        error: null
      },
      ui: {
        activeView: null,
        isLoading: false,
        errors: new Map(),
        notifications: []
      }
    };

    this.listeners = new Map();
    this.initialize();
  }

  initialize() {
    // Load persisted state from localStorage
    const savedAuth = localStorage.getItem('auth');
    if (savedAuth) {
      try {
        const authData = JSON.parse(savedAuth);
        this.updateState('auth', authData);
      } catch (error) {
        console.error('Error loading saved auth state:', error);
        localStorage.removeItem('auth');
      }
    }

    // Setup error cleanup interval
    setInterval(() => {
      this.cleanupErrors();
    }, 5000);
  }

  // Subscribe to state changes
  subscribe(path, callback) {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }
    this.listeners.get(path).add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(path);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  // Update state and notify listeners
  updateState(path, newData, shouldPersist = false) {
    const pathArray = path.split('.');
    let current = this.state;

    // Navigate to the nested property
    for (let i = 0; i < pathArray.length - 1; i++) {
      current = current[pathArray[i]];
    }

    // Update the value
    const lastKey = pathArray[pathArray.length - 1];
    const oldValue = current[lastKey];
    current[lastKey] = typeof newData === 'function'
      ? newData(oldValue)
      : newData;

    // Notify listeners
    this.notifyListeners(path, current[lastKey], oldValue);

    // Persist if needed
    if (shouldPersist) {
      this.persistState(path, current[lastKey]);
    }
  }

  // Get current state for a path
  getState(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this.state);
  }

  // Add error to state
  addError(path, error) {
    const errorObj = {
      message: error.message || error,
      timestamp: Date.now(),
      id: Math.random().toString(36).substr(2, 9)
    };

    this.updateState('ui.errors', errors => {
      const newErrors = new Map(errors);
      if (!newErrors.has(path)) {
        newErrors.set(path, []);
      }
      newErrors.get(path).push(errorObj);
      return newErrors;
    });

    return errorObj.id;
  }

  // Remove error from state
  removeError(path, errorId) {
    this.updateState('ui.errors', errors => {
      const newErrors = new Map(errors);
      if (newErrors.has(path)) {
        const pathErrors = newErrors.get(path);
        newErrors.set(
          path,
          pathErrors.filter(error => error.id !== errorId)
        );
      }
      return newErrors;
    });
  }

  // Add notification
  addNotification(message, type = 'info', duration = 3000) {
    const notification = {
      message,
      type,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
    };

    this.updateState('ui.notifications', notifications => [
      ...notifications,
      notification
    ]);

    if (duration > 0) {
      setTimeout(() => {
        this.removeNotification(notification.id);
      }, duration);
    }

    return notification.id;
  }

  // Remove notification
  removeNotification(id) {
    this.updateState('ui.notifications', notifications =>
      notifications.filter(n => n.id !== id)
    );
  }

  // Reset state
  resetState(path) {
    const initialState = {
      auth: {
        isAuthenticated: false,
        token: null,
        interfaceType: null,
        error: null
      },
      race: {
        current: null,
        status: null,
        mode: null,
        drivers: [],
        startTime: null,
        endTime: null,
        error: null
      },
      stats: {
        leaderboard: [],
        fastestLap: null,
        lastUpdate: null,
        error: null
      },
      timer: {
        remaining: null,
        isRunning: false,
        error: null
      },
      ui: {
        activeView: null,
        isLoading: false,
        errors: new Map(),
        notifications: []
      }
    };

    if (path) {
      this.updateState(path,
        path.split('.').reduce((obj, key) => obj[key], initialState)
      );
    } else {
      this.state = initialState;
      this.notifyListeners('', this.state, null);
    }
  }

  // Private methods
  notifyListeners(path, newValue, oldValue) {
    // Notify direct path listeners
    const listeners = this.listeners.get(path);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(newValue, oldValue);
        } catch (error) {
          console.error('Error in state listener:', error);
        }
      });
    }

    // Notify parent path listeners
    const pathParts = path.split('.');
    while (pathParts.length > 0) {
      pathParts.pop();
      const parentPath = pathParts.join('.');
      const parentListeners = this.listeners.get(parentPath);

      if (parentListeners) {
        const parentValue = this.getState(parentPath);
        parentListeners.forEach(callback => {
          try {
            callback(parentValue, null);
          } catch (error) {
            console.error('Error in parent state listener:', error);
          }
        });
      }
    }
  }

  persistState(path, value) {
    try {
      if (path === 'auth') {
        localStorage.setItem('auth', JSON.stringify(value));
      }
    } catch (error) {
      console.error('Error persisting state:', error);
    }
  }

  cleanupErrors() {
    const now = Date.now();
    const maxAge = 5000; // 5 seconds

    this.updateState('ui.errors', errors => {
      const newErrors = new Map();
      for (const [path, pathErrors] of errors) {
        const validErrors = pathErrors.filter(
          error => now - error.timestamp < maxAge
        );
        if (validErrors.length > 0) {
          newErrors.set(path, validErrors);
        }
      }
      return newErrors;
    });
  }
}

// Create singleton instance
const stateManager = new StateManager();
Object.freeze(stateManager);

export default stateManager;

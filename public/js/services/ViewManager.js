import stateManager from './StateManager.js';

import FrontDeskView from '../../views/FrontDeskView.js';
import FlagDisplayView from '../../views/FlagDisplayView.js';
import LapTrackerView from '../../views/LapTrackerView.js';
import LeaderBoardView from '../../views/LeaderBoardView.js';
import NextRaceView from '../../views/NextRaceView.js';
import RaceControlView from '../../views/RaceControlView.js';
import RaceCountdownView from '../../views/RaceCountdownView.js';

class ViewManager {
  constructor() {
    this.views = new Map();
    this.activeView = null;
    this.unsubscribers = new Map();
    this.eventHandlers = new Map();

    // Bind instance methods
    this.handleStateChange = this.handleStateChange.bind(this);
    this.handleViewEvent = this.handleViewEvent.bind(this);

    this.initialize();
  }

  initialize() {
    // Register core event listeners
    window.addEventListener('popstate', this.handleRouteChange.bind(this));
    document.addEventListener('DOMContentLoaded', this.handleDOMReady.bind(this));

    // Register all views here
    this.registerAllViews();
  }

  registerAllViews() {
    // Register each view
    this.registerView('front-desk', {
      template: FrontDeskView.template,
      stateSubscriptions: FrontDeskView.stateSubscriptions,
      events: FrontDeskView.events,
      initialize: FrontDeskView.initialize,
      render: FrontDeskView.render,
      update: FrontDeskView.update,
      cleanup: FrontDeskView.cleanup,
      isProtected: FrontDeskView.isProtected,
      requiredRole: FrontDeskView.requiredRole,
    });

    this.registerView('flag-display', {
      template: FlagDisplayView.template,
      stateSubscriptions: FlagDisplayView.stateSubscriptions,
      events: FlagDisplayView.events,
      initialize: FlagDisplayView.initialize,
      render: FlagDisplayView.render,
      update: FlagDisplayView.update,
      cleanup: FlagDisplayView.cleanup,
      isProtected: FlagDisplayView.isProtected,
      requiredRole: FlagDisplayView.requiredRole,
    });
    this.registerView('lap-line-tracker', {
      template: LapTrackerView.template,
      stateSubscriptions: LapTrackerView.stateSubscriptions,
      events: LapTrackerView.events,
      initialize: LapTrackerView.initialize,
      render: LapTrackerView.render,
      update: LapTrackerView.update,
      cleanup: LapTrackerView.cleanup,
      isProtected: LapTrackerView.isProtected,
      requiredRole: LapTrackerView.requiredRole,
    });
    this.registerView('leader-board', {
      template: LeaderBoardView.template,
      stateSubscriptions: LeaderBoardView.stateSubscriptions,
      events: LeaderBoardView.events,
      initialize: LeaderBoardView.initialize,
      render: LeaderBoardView.render,
      update: LeaderBoardView.update,
      cleanup: LeaderBoardView.cleanup,
      isProtected: LeaderBoardView.isProtected,
      requiredRole: LeaderBoardView.requiredRole,
    });
    this.registerView('next-race', {
      template: NextRaceView.template,
      stateSubscriptions: NextRaceView.stateSubscriptions,
      events: NextRaceView.events,
      initialize: NextRaceView.initialize,
      render: NextRaceView.render,
      update: NextRaceView.update,
      cleanup: NextRaceView.cleanup,
      isProtected: NextRaceView.isProtected,
      requiredRole: NextRaceView.requiredRole,
    });
    this.registerView('race-control', {
      template: RaceControlView.template,
      stateSubscriptions: RaceControlView.stateSubscriptions,
      events: RaceControlView.events,
      initialize: RaceControlView.initialize,
      render: RaceControlView.render,
      update: RaceControlView.update,
      cleanup: RaceControlView.cleanup,
      isProtected: RaceControlView.isProtected,
      requiredRole: RaceControlView.requiredRole,
    });
    this.registerView('race-countdown', {
      template: RaceCountdownView.template,
      stateSubscriptions: RaceCountdownView.stateSubscriptions,
      events: RaceCountdownView.events,
      initialize: RaceCountdownView.initialize,
      render: RaceCountdownView.render,
      update: RaceCountdownView.update,
      cleanup: RaceCountdownView.cleanup,
      isProtected: RaceCountdownView.isProtected,
      requiredRole: RaceCountdownView.requiredRole,
    });
  }

  // Register a new view
  registerView(name, config) {
    const view = {
      name,
      element: null,
      template: config.template,
      stateSubscriptions: config.stateSubscriptions || [],
      events: config.events || {},
      initialize: config.initialize || (() => {}),
      render: config.render || (() => {}),
      update: config.update || (() => {}),
      cleanup: config.cleanup || (() => {}),
      isProtected: config.isProtected || false,
      requiredRole: config.requiredRole || null,
    };

    this.views.set(name, view);
  }

  // Activate a view
  async activateView(name, params = {}) {
    try {
      // Check if view exists
      const view = this.views.get(name);
      if (!view) {
        throw new Error(`View "${name}" not found`);
      }

      // Check authentication if view is protected
      if (view.isProtected) {
        const authState = stateManager.getState('auth');
        if (!authState.isAuthenticated) {
          stateManager.addNotification('Please log in to continue', 'warning');
          return this.activateView('login', { returnTo: name });
        }

        // Check role if required
        if (view.requiredRole && authState.interfaceType !== view.requiredRole) {
          stateManager.addNotification('Unauthorized access', 'error');
          return this.activateView('unauthorized');
        }
      }

      // Cleanup current view
      await this.deactivateCurrentView();

      // Update state
      stateManager.updateState('ui.activeView', name);
      stateManager.updateState('ui.isLoading', true);

      // Initialize view
      view.element = document.querySelector(`[data-view="${name}"]`);
      if (!view.element) {
        throw new Error(`Element for view "${name}" not found`);
      }

      // Setup state subscriptions
      this.setupStateSubscriptions(view);

      // Setup event handlers
      this.setupEventHandlers(view);

      // Initialize the view
      await view.initialize(params);

      // Perform initial render
      await view.render(params);

      // Show view
      this.showView(view);

      // Set as active view
      this.activeView = view;

      // Update loading state
      stateManager.updateState('ui.isLoading', false);
    } catch (error) {
      console.error('Error activating view:', error);
      stateManager.addError('viewManager', error);
      stateManager.updateState('ui.isLoading', false);
    }
  }

  // Deactivate current view
  async deactivateCurrentView() {
    if (!this.activeView) return;

    try {
      // Run cleanup
      await this.activeView.cleanup();

      // Remove state subscriptions
      this.removeStateSubscriptions(this.activeView);

      // Remove event handlers
      this.removeEventHandlers(this.activeView);

      // Hide view
      this.hideView(this.activeView);

      // Clear active view
      this.activeView = null;
    } catch (error) {
      console.error('Error deactivating view:', error);
      stateManager.addError('viewManager', error);
    }
  }

  // Setup state subscriptions for a view
  setupStateSubscriptions(view) {
    const unsubscribers = [];

    view.stateSubscriptions.forEach((subscription) => {
      const unsubscribe = stateManager.subscribe(
        subscription.path,
        (newValue, oldValue) => {
          if (subscription.handler) {
            subscription.handler(newValue, oldValue, view);
          } else {
            view.update(subscription.path, newValue, oldValue);
          }
        },
      );
      unsubscribers.push(unsubscribe);
    });

    this.unsubscribers.set(view.name, unsubscribers);
  }

  // Remove state subscriptions for a view
  removeStateSubscriptions(view) {
    const unsubscribers = this.unsubscribers.get(view.name) || [];
    unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers.delete(view.name);
  }

  // Setup event handlers for a view
  setupEventHandlers(view) {
    const handlers = new Map();

    Object.entries(view.events).forEach(([eventKey, handler]) => {
      const [eventName, selector] = eventKey.split('@');
      const elements = selector
        ? Array.from(view.element.querySelectorAll(selector))
        : [view.element];

      const boundHandler = this.handleViewEvent.bind(this, handler, view);

      elements.forEach((element) => {
        element.addEventListener(eventName, boundHandler);
        if (!handlers.has(element)) {
          handlers.set(element, new Map());
        }
        handlers.get(element).set(eventName, boundHandler);
      });
    });

    this.eventHandlers.set(view.name, handlers);
  }

  // Remove event handlers for a view
  removeEventHandlers(view) {
    const handlers = this.eventHandlers.get(view.name);
    if (!handlers) return;

    handlers.forEach((elementHandlers, element) => {
      elementHandlers.forEach((handler, eventName) => {
        element.removeEventListener(eventName, handler);
      });
    });

    this.eventHandlers.delete(view.name);
  }

  // Handle state changes
  handleStateChange(path, newValue, oldValue) {
    if (this.activeView && this.activeView.update) {
      this.activeView.update(path, newValue, oldValue);
    }
  }

  // Handle view events
  handleViewEvent(handler, view, event) {
    try {
      handler.call(view, event, this);
    } catch (error) {
      console.error('Error in view event handler:', error);
      stateManager.addError('viewManager', error);
    }
  }

  // Handle route changes
  handleRouteChange(event) {
    const path = window.location.pathname;
    const viewName = this.getViewNameFromPath(path);
    if (viewName) {
      this.activateView(viewName);
    }
  }

  // Handle initial DOM load
  handleDOMReady() {
    const path = window.location.pathname;
    const viewName = this.getViewNameFromPath(path);
    if (viewName) {
      this.activateView(viewName);
    }
  }

  // Show view
  showView(view) {
    if (view.element) {
      view.element.classList.remove('hidden');
      view.element.setAttribute('aria-hidden', 'false');
    }
  }

  // Hide view
  hideView(view) {
    if (view.element) {
      view.element.classList.add('hidden');
      view.element.setAttribute('aria-hidden', 'true');
    }
  }

  // Get view name from path
  getViewNameFromPath(path) {
    // Remove leading slash and convert to view name
    return path.substring(1) || 'home';
  }

  // Navigate to a new view
  navigate(viewName, params = {}) {
    const url = `/${viewName}`;
    window.history.pushState(params, '', url);
    this.activateView(viewName, params);
  }
}

// Create singleton instance
const viewManager = new ViewManager();
Object.freeze(viewManager);

export default viewManager;

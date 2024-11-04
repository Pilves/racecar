// /public/js/services/ViewRegistration.js

import { routes, notFoundRoute, forbiddenRoute } from '../config/routes.js';
import stateManager from './StateManager.js';

class ViewRegistration {
  #activeView = null;
  #viewInstances = new Map();
  #transitionInProgress = false;
  #mainContainer = null;

  constructor() {
    // Using private fields instead of public properties
  }

  async initialize() {
    // Find or create main container
    this.#mainContainer = document.getElementById('mainContent');
    if (!this.#mainContainer) {
      this.#mainContainer = document.createElement('div');
      this.#mainContainer.id = 'mainContent';
      document.body.appendChild(this.#mainContainer);
    }

    // Handle browser navigation
    window.addEventListener('popstate', (event) => {
      this.navigateToPath(window.location.pathname, event.state);
    });

    // Handle initial route
    await this.navigateToPath(window.location.pathname);
  }

  async navigateToPath(path, state = {}) {
    if (this.#transitionInProgress) return;
    this.#transitionInProgress = true;

    try {
      const route = routes[path] || notFoundRoute;

      // Check authentication for protected routes
      if (!route.isPublic) {
        const isAuthenticated = stateManager.getState('auth.isAuthenticated');
        const userRole = stateManager.getState('auth.interfaceType');
        console.log('Auth check:', { isAuthenticated, userRole, requiredRole: route.role });

        if (!isAuthenticated) {
          await this.redirectToLogin(path);
          return;
        }

        if (route.role && route.role !== userRole) {
          await this.activateView(forbiddenRoute, state);
          return;
        }
      }

      await this.activateView(route, state);
      document.title = `Race Track - ${route.title || 'Default Title'}`;

    } catch (error) {
      console.error('Navigation error:', error);
      stateManager.addError('navigation', error);
    } finally {
      this.#transitionInProgress = false;
    }
  }

  async redirectToLogin(returnTo = '/') {
    const loginPath = `/login${returnTo !== '/login' ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`;
    console.log('Redirecting to login:', loginPath);
    window.location.replace(loginPath);
  }

  async activateView(route, state = {}) {
    try {
      // Cleanup current view if exists
      await this.cleanupCurrentView();

      // Create new view instance
      const view = await this.createViewInstance(route);
      if (!view) return;

      // Create view container
      const viewContainer = this.createViewContainer(view);

      // Initialize view
      await this.initializeView(view, state);

      // Update DOM
      this.updateDOM(viewContainer);

    } catch (error) {
      console.error('View activation error:', error);
      stateManager.addError('viewActivation', error);
    }
  }

  async cleanupCurrentView() {
    if (this.#activeView) {
      try {
        await this.#activeView.cleanup();
        this.#activeView.element?.remove();
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }
  }

  async createViewInstance(route) {
    if (!route.view) {
      throw new Error(`View for route "${route.title}" is not defined`);
    }

    let view = this.#viewInstances.get(route.view);
    if (!view) {
      view = new route.view();
      this.#viewInstances.set(route.view, view);
    }
    return view;
  }

  createViewContainer(view) {
    const viewContainer = document.createElement('div');
    viewContainer.setAttribute('data-view', view.name);
    viewContainer.className = 'view-container';
    view.element = viewContainer;
    return viewContainer;
  }

  async initializeView(view, state) {
    try {
      // Initialize view with state
      await view.initialize({
        ...state,
        previousView: this.#activeView?.constructor.name
      });

      // Set as active view
      this.#activeView = view;

      // Trigger afterRender
      await view.afterRender();
    } catch (error) {
      console.error('View initialization error:', error);
      throw error;
    }
  }

  updateDOM(viewContainer) {
    // Clear main container
    while (this.#mainContainer.firstChild) {
      this.#mainContainer.firstChild.remove();
    }

    // Add new view
    this.#mainContainer.appendChild(viewContainer);

    // Add enter animation
    requestAnimationFrame(() => {
      viewContainer.classList.add('view-enter');
    });
  }

  async navigate(path, state = {}) {
    window.history.pushState(state, '', path);
    return this.navigateToPath(path, state);
  }
}

// Create singleton instance
const viewRegistration = new ViewRegistration();

// Export instance
export default viewRegistration;

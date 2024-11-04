class BaseView {
  constructor(name, config = {}) {
    this.name = name;
    this.element = null;
    this.template = config.template || this.defaultTemplate;
    this.isProtected = config.isProtected || false;
    this.requiredRole = config.requiredRole || null;
    this.params = {};
    this.eventListeners = [];
    this.stateSubscriptions = [];

    this._state = {
      isLoading: false,
      error: null,
      ...config.initialState
    };
  }

  get defaultTemplate() {
    return '<div>Default View Template</div>';
  }

  getState() {
    return this._state || {};
  }

  setState(newState) {
    this._state = {
      ...this._state,
      ...newState
    };
    this.render();
  }

  setLoading(isLoading) {
    this.setState({ isLoading });
  }

  setError(error) {
    this.setState({ error });
  }

  async initialize(params = {}) {
    this.params = params;

    if (!this.element) {
      console.error(`Element for view "${this.name}" not found`);
      return;
    }

    try {
      if (this.setupStateSubscriptions) {
        this.stateSubscriptions = await this.setupStateSubscriptions();
      }

      if (this.setupView) {
        await this.setupView();
      }

      await this.render();
    } catch (error) {
      console.error(`Error initializing view ${this.name}:`, error);
      throw error;
    }
  }

  async render() {
    if (!this.element) return;

    try {
      const html = typeof this.template === 'function'
        ? await this.template(this.getTemplateData())
        : this.template;

      this.element.innerHTML = html;
      await this.afterRender();
    } catch (error) {
      console.error(`Error rendering view ${this.name}:`, error);
      throw error;
    }
  }

  getTemplateData() {
    return {
      ...this.params,
      state: this.getState(),
      view: this.name
    };
  }

  async afterRender() {
    // Override in child class
  }

  $(selector) {
    return this.element?.querySelector(selector);
  }

  $$(selector) {
    return Array.from(this.element?.querySelectorAll(selector) || []);
  }

  navigate(path, params = {}) {
    console.log('Navigating to:', path, params);
    window.location.replace(path);
  }


  cleanup() {
    this.eventListeners.forEach(({ element, type, handler }) => {
      element.removeEventListener(type, handler);
    });
    this.eventListeners = [];

    this.stateSubscriptions.forEach(subscription => {
      if (typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    });
    this.stateSubscriptions = [];
  }

  addEventHandler(element, type, handler) {
    if (!element) return;
    element.addEventListener(type, handler);
    this.eventListeners.push({ element, type, handler });
  }

  cleanup() {
    this.eventListeners.forEach(({ element, type, handler }) => {
      element.removeEventListener(type, handler);
    });
    this.eventListeners = [];

    this.stateSubscriptions.forEach(subscription => {
      if (typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    });
    this.stateSubscriptions = [];
  }
}
export default BaseView;

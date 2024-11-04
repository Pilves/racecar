// /views/LoginView.js

import BaseView from './BaseView.js';
import apiService from '../js/services/apiService.js';
import stateManager from '../js/services/StateManager.js';

class LoginView extends BaseView {
  constructor() {
    super('login', {
      isProtected: false,
      initialState: {
        isLoading: false,
        error: null,
        interfaceType: '',
        returnTo: null
      }
    });
  }

  get defaultTemplate() {
    const state = this.getState();

    return `
      <div class="login-container">
        <div class="login-card">
          <header class="login-header">
            <h1>Race Management System</h1>
            <p>Please log in to access your interface</p>
          </header>
          
          <form id="loginForm" class="login-form">
            <div class="form-group">
              <label for="interfaceType">Select Interface</label>
              <select 
                id="interfaceType" 
                name="interfaceType"
                class="form-control" 
                required
                value="${state.interfaceType}"
              >
                <option value="" ${!state.interfaceType ? 'selected' : ''}>-- Select Interface --</option>
                <option value="front-desk" ${state.interfaceType === 'front-desk' ? 'selected' : ''}>Front Desk</option>
                <option value="race-control" ${state.interfaceType === 'race-control' ? 'selected' : ''}>Race Control</option>
                <option value="lap-line-tracker" ${state.interfaceType === 'lap-line-tracker' ? 'selected' : ''}>Lap Line Tracker</option>
              </select>
            </div>

            <div class="form-group">
              <label for="accessKey">Access Key</label>
              <input 
                type="password" 
                id="accessKey" 
                name="accessKey"
                class="form-control" 
                placeholder="${this.getPlaceholder()}"
                required
                minlength="8"
                autocomplete="current-password"
                ${state.isLoading ? 'disabled' : ''}
              >
            </div>

            ${state.error ? `
              <div class="error-message" role="alert">
                ${state.error}
              </div>
            ` : ''}

            <button 
              type="submit" 
              class="submit-button"
              ${state.isLoading ? 'disabled' : ''}
            >
              ${state.isLoading ? `
                <span class="loading-spinner"></span>
                Logging in...
              ` : 'Login'}
            </button>
          </form>

          <footer class="login-footer">
            <p>Access restricted to authorized personnel only</p>
          </footer>
        </div>
      </div>
    `;
  }

  async setupView() {
    // Clear any existing auth state
    stateManager.resetState('auth');

    // Get returnTo from URL if exists
    const urlParams = new URLSearchParams(window.location.search);
    const returnTo = urlParams.get('returnTo');
    if (returnTo) {
      this.setState({ returnTo });
    }

    // Bind event handlers
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleInterfaceChange = this.handleInterfaceChange.bind(this);
  }

  async afterRender() {
    // Get form elements
    const form = this.$('#loginForm');
    const interfaceSelect = this.$('#interfaceType');

    // Add event listeners
    if (form) {
      form.addEventListener('submit', this.handleSubmit);
    }

    if (interfaceSelect) {
      interfaceSelect.addEventListener('change', this.handleInterfaceChange);

      // Set initial value if exists in state
      const state = this.getState();
      if (state.interfaceType) {
        interfaceSelect.value = state.interfaceType;
      }
    }

    // Focus management
    if (!this.getState().interfaceType) {
      interfaceSelect?.focus();
    } else {
      this.$('#accessKey')?.focus();
    }

    // Debug log
    console.log('LoginView rendered, state:', this.getState());
  }

  handleInterfaceChange(event) {
    const interfaceType = event.target.value;
    console.log('Interface changed to:', interfaceType); // Debug log

    this.setState({
      interfaceType,
      error: null
    });

    // Focus access key input after selecting interface
    if (interfaceType) {
      const accessKeyInput = this.$('#accessKey');
      if (accessKeyInput) {
        accessKeyInput.focus();
        accessKeyInput.placeholder = this.getPlaceholder();
      }
    }
  }

  async handleSubmit(event) {
    event.preventDefault();
    console.log('Form submitted');

    const form = event.target;
    const interfaceType = form.interfaceType.value;
    const accessKey = form.accessKey.value.trim();

    if (!this.validateForm(interfaceType, accessKey)) {
      return;
    }

    try {
      this.setState({ isLoading: true, error: null });

      const response = await apiService.login(interfaceType, accessKey);
      console.log('Login successful, response:', response);

      if (response?.token) {
        console.log('Redirecting to:', this.getState().returnTo || `/${interfaceType}`);

        // Use window.location.replace instead of href
        const returnTo = this.getState().returnTo || `/${interfaceType}`;
        window.location.replace(returnTo);
        return;
      }

      throw new Error('Invalid response from server');

    } catch (error) {
      console.error('Login error:', error);
      this.setState({
        error: error.message || 'Login failed. Please check your credentials and try again.',
        isLoading: false
      });
    }
  }

  validateForm(interfaceType, accessKey) {
    if (!interfaceType) {
      this.setState({ error: 'Please select an interface type' });
      this.$('#interfaceType')?.focus();
      return false;
    }

    if (!accessKey) {
      this.setState({ error: 'Please enter your access key' });
      this.$('#accessKey')?.focus();
      return false;
    }

    if (accessKey.length < 8) {
      this.setState({ error: 'Access key must be at least 8 characters' });
      this.$('#accessKey')?.focus();
      return false;
    }

    return true;
  }

  getPlaceholder() {
    const state = this.getState();
    return state.interfaceType ?
      `Enter ${state.interfaceType.split('-').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ')} access key` :
      'Enter your access key';
  }

  cleanup() {
    // Remove event listeners
    const form = this.$('#loginForm');
    const interfaceSelect = this.$('#interfaceType');

    if (form) {
      form.removeEventListener('submit', this.handleSubmit);
    }

    if (interfaceSelect) {
      interfaceSelect.removeEventListener('change', this.handleInterfaceChange);
    }
  }
}

export default LoginView;

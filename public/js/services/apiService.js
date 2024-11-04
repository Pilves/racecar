import stateManager from './StateManager.js';

class ApiService {
  constructor() {
    this.baseUrl = '/api';
  }

  async request(method, endpoint, data = null, authenticate = true) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      console.log('Making request to:', url); // Add debug log
      console.log('Request data:', data); // Add debug log

      const headers = {
        'Content-Type': 'application/json',
      };

      if (authenticate) {
        const token = localStorage.getItem('authToken');
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
      }

      const options = {
        method,
        headers
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      console.log('Request options:', options); // Add debug log

      const response = await fetch(url, options);
      console.log('Response status:', response.status); // Add debug log

      const responseData = await response.json();
      console.log('Response data:', responseData); // Add debug log

      if (!response.ok) {
        const error = new Error(responseData.message || 'Request failed');
        error.status = response.status;
        error.details = responseData.errors;
        throw error;
      }

      return responseData;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async login(interfaceType, accessKey) {
    if (!interfaceType || !accessKey) {
      throw new Error('Interface type and access key are required');
    }

    try {
      const response = await this.request('POST', '/auth', {
        interfaceType,
        accessKey
      }, false);

      console.log('Login response:', response); // Debug log

      if (response.token) {
        // Store auth data
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('interfaceType', response.interfaceType);

        // Update state manager
        stateManager.updateState('auth', {
          isAuthenticated: true,
          token: response.token,
          interfaceType: response.interfaceType
        });
      }

      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Login failed');
    }
  }

  async validateToken() {
    return await this.request('GET', '/auth/validate');
  }

  async refreshToken() {
    return await this.request('POST', '/auth/refresh');
  }

  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('interfaceType');
  }

  // Helper methods
  isAuthenticated() {
    return !!localStorage.getItem('authToken');
  }

  getInterfaceType() {
    return localStorage.getItem('interfaceType');
  }
}

export default new ApiService();

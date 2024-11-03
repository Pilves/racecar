// public/js/services/apiService.js

class ApiService {
    constructor() {
        this.baseUrl = '/api';
    }

    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        const token = localStorage.getItem('authToken');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    async get(endpoint) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            return response;
        } catch (error) {
            console.error('API GET Error:', error);
            throw error;
        }
    }

    async post(endpoint, data) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });
            return response;
        } catch (error) {
            console.error('API POST Error:', error);
            throw error;
        }
    }

    async put(endpoint, data) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });
            return response;
        } catch (error) {
            console.error('API PUT Error:', error);
            throw error;
        }
    }

    async delete(endpoint) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            return response;
        } catch (error) {
            console.error('API DELETE Error:', error);
            throw error;
        }
    }

    // Authentication methods
    async login(accessKey, interfaceType) {
        try {
            const response = await this.post('/auth', {
                accessKey,
                interfaceType
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('authToken', data.token);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Login Error:', error);
            return false;
        }
    }

    logout() {
        localStorage.removeItem('authToken');
    }
}

// Create singleton instance
const apiService = new ApiService();
window.apiService = apiService; // Make it globally available
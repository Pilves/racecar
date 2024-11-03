class ApiService {
    static baseUrl = '/api';
    static token = localStorage.getItem('authToken');

    static async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
            ...(options.headers || {})
        };

        try {
            const response = await fetch(`${this.baseUrl}/${endpoint}`, {
                ...options,
                headers
            });

            if (!response.ok) {
                throw new Error('API request failed');
            }

            return response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    static setToken(token) {
        this.token = token;
        localStorage.setItem('authToken', token);
    }

    static clearToken() {
        this.token = null;
        localStorage.removeItem('authToken');
    }
}
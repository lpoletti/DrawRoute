// api-client.js - Cliente para comunicação com Django Backend

class RouteAPIClient {
    constructor(baseURL = 'http://localhost:8000/api') {
        this.baseURL = baseURL;
        this.token = localStorage.getItem('auth_token');
    }

    // Configura o token de autenticação
    setToken(token) {
        this.token = token;
        localStorage.setItem('auth_token', token);
    }

    // Remove o token (logout)
    clearToken() {
        this.token = null;
        localStorage.removeItem('auth_token');
    }

    // Headers padrão para requisições
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };
        
        if (this.token) {
            headers['Authorization'] = `Token ${this.token}`;
        }
        
        return headers;
    }

    // LOGIN - Obtém token de autenticação
    async login(username, password) {
        try {
            const response = await fetch(`${this.baseURL}/auth/login/`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username, password})
            });
            
            if (!response.ok) throw new Error('Falha no login');
            
            const data = await response.json();
            this.setToken(data.token);
            return {success: true, token: data.token};
        } catch (error) {
            console.error('Erro no login:', error);
            return {success: false, error: error.message};
        }
    }

    // SALVAR ROTA - Substitui localStorage.setItem('routes', ...)
    async saveRoute(routeData) {
        try {
            const response = await fetch(`${this.baseURL}/routes/`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(routeData)
            });
            
            if (!response.ok) throw new Error('Erro ao salvar rota');
            
            const data = await response.json();
            console.log('Rota salva com sucesso:', data);
            return {success: true, route: data};
        } catch (error) {
            console.error('Erro ao salvar rota:', error);
            return {success: false, error: error.message};
        }
    }

    // LISTAR ROTAS - Substitui JSON.parse(localStorage.getItem('routes'))
    async getRoutes(params = {}) {
        try {
            const queryString = new URLSearchParams(params).toString();
            const url = `${this.baseURL}/routes/${queryString ? '?' + queryString : ''}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders()
            });
            
            if (!response.ok) throw new Error('Erro ao buscar rotas');
            
            const data = await response.json();
        } catch (error) {
            console.error('Erro ao buscar rotas:', error);
            return {success: false, error: error.message};
        }
    }

    // OBTER ROTA ESPECÍFICA
    async getRoute(routeId) {
        try {
            const response = await fetch(`${this.baseURL}/routes/${routeId}/`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            
            if (!response.ok) throw new Error('Rota não encontrada');
            
            const data = await response.json();
            return {success: true, route: data};
        } catch (error) {
            console.error('Erro ao buscar rota:', error);
            return {success: false, error: error.message};
        }
    }

    // ATUALIZAR ROTA
    async updateRoute(routeId, routeData) {
        try {
            const response = await fetch(`${this.baseURL}/routes/${routeId}/`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(routeData)
            });
            
            if (!response.ok) throw new Error('Erro ao atualizar rota');
            
            const data = await response.json();
            return {success: true, route: data};
        } catch (error) {
            console.error('Erro ao atualizar rota:', error);
            return {success: false, error: error.message};
        }
    }

    // DELETAR ROTA
    async deleteRoute(routeId) {
        try {
            const response = await fetch(`${this.baseURL}/routes/${routeId}/`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            
            if (!response.ok) throw new Error('Erro ao deletar rota');
            
            return {success: true};
        } catch (error) {
            console.error('Erro ao deletar rota:', error);
            return {success: false, error: error.message};
        }
    }

    // FAVORITAR/DESFAVORITAR ROTA
    async toggleFavorite(routeId) {
        try {
            const response = await fetch(`${this.baseURL}/routes/${routeId}/toggle_favorite/`, {
                method: 'POST',
                headers: this.getHeaders()
            });
            
            if (!response.ok) throw new Error('Erro ao alterar favorito');
            
            const data = await response.json();
            return {success: true, is_favorite: data.is_favorite};
        } catch (error) {
            console.error('Erro ao alterar favorito:', error);
            return {success: false, error: error.message};
        }
    }

    // REGISTRAR COMPARTILHAMENTO
    async shareRoute(routeId, platform) {
        try {
            const response = await fetch(`${this.baseURL}/routes/${routeId}/share/`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({platform})
            });
            
            if (!response.ok) throw new Error('Erro ao registrar compartilhamento');
            
            const data = await response.json();
            return {success: true, share: data.share};
        } catch (error) {
            console.error('Erro ao registrar compartilhamento:', error);
            return {success: false, error: error.message};
        }
    }

    // BUSCAR ROTAS
    async searchRoutes(query, sortBy = 'date') {
        try {
            const params = new URLSearchParams({q: query, sort_by: sortBy});
            const response = await fetch(`${this.baseURL}/routes/search/?${params}`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            
            if (!response.ok) throw new Error('Erro na busca');
            
            const data = await response.json();
            return {success: true, routes: data.results};
        } catch (error) {
            console.error('Erro na busca:', error);
            return {success: false, error: error.message};
        }
    }

    // OBTER ESTATÍSTICAS
    async getStatistics() {
        try {
            const response = await fetch(`${this.baseURL}/routes/statistics/`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            
            if (!response.ok) throw new Error('Erro ao buscar estatísticas');
            
            const data = await response.json();
            return {success: true, statistics: data};
        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            return {success: false, error: error.message};
        }
    }
}

// Exporta instância global
const apiClient = new RouteAPIClient();
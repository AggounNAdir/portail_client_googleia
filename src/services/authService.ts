// Service d'authentification

import { apiClient } from './apiClient';

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
}

export type AuthResponse = LoginResponse;

export interface LoginCredentials {
  codeClient: string;
  password: string;
}

export class AuthService {
  async login(codeClient: string, password: string): Promise<LoginResponse> {
    const trimmedCode = codeClient.trim();

    try {
      const data = await apiClient.request<any>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({
            code_client: trimmedCode,
            password: password,
          }),
        },
        undefined, // ⚠️ Pas de fallback silencieux en cas de rejet par le serveur : une erreur 401 doit être affichée à l'utilisateur
        'client'
      );

      const token = data.access_token || data.accessToken || data.token;
      apiClient.saveToken(token, trimmedCode);

      return {
        accessToken: token,
        tokenType: data.token_type || 'bearer',
      };
    } catch (err: any) {
      if (err?.isAuthError) {
        throw new Error(
          err.message ||
            'Code client ou mot de passe incorrect. (Si vous êtes un commercial/vendeur, utilisez l\'onglet Vendeur)'
        );
      }
      throw new Error(err.message || 'Erreur de connexion au serveur API');
    }
  }

  // Connexion démo / hors-ligne pour tests et présentation
  loginAsDemo(codeClient = 'CLT-0001'): LoginResponse {
    const trimmedCode = codeClient.trim() || 'CLT-0001';
    const token = `client-demo-${Date.now()}`;
    apiClient.saveToken(token, trimmedCode);
    return {
      accessToken: token,
      tokenType: 'bearer',
    };
  }

  async logout(): Promise<void> {
    apiClient.clearAuth();
  }

  isAuthenticated(): boolean {
    return apiClient.hasToken();
  }

  getCachedCodeClient(): string | null {
    return apiClient.getCachedCodeClient();
  }
}

export const authService = new AuthService();

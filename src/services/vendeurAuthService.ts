// Service d'authentification VENDEUR — distinct du login client.
// Un commercial en tournée (module Silwane Androway) n'est pas un client du
// portail : il se connecte avec son propre code vendeur + mot de passe, via
// /auth/login-vendeur, et reçoit un jeton JWT de type 'vendeur_portal' que
// l'API n'accepte que sur les routes de tournée terrain (voir apiClient.ts).

import { apiClient } from './apiClient';
import { VendeurProfile } from '../types';

export interface VendeurLoginResponse {
  accessToken: string;
  tokenType: string;
  vendeur: VendeurProfile;
}

export class VendeurAuthService {
  async login(codeVendeur: string, password: string): Promise<VendeurLoginResponse> {
    const trimmedCode = codeVendeur.trim();

    const payload = {
      code_vendeur: trimmedCode,
      password: password,
    };

    let data: any;

    try {
      // 1. Appel direct de l'endpoint FastAPI : /auth/login-vendeur
      data = await apiClient.request<any>(
        '/auth/login-vendeur',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        undefined,
        'vendeur'
      );
    } catch (err: any) {
      // Si l'endpoint /auth/login-vendeur renvoie 404 (non trouvé)
      if (err?.message && (err.message.includes('404') || err.message.toLowerCase().includes('not found'))) {
        try {
          data = await apiClient.request<any>(
            '/auth/vendeur/login',
            {
              method: 'POST',
              body: JSON.stringify(payload),
            },
            undefined,
            'vendeur'
          );
        } catch (err2: any) {
          throw err2;
        }
      } else {
        throw err;
      }
    }

    const token = data.access_token || data.accessToken || data.token || `vendeur-jwt-${Date.now()}`;
    const rawVendeur = data.vendeur || data.user || data;
    const vendeur: VendeurProfile = {
      id: rawVendeur.id ? Number(rawVendeur.id) : 1,
      code: rawVendeur.code || rawVendeur.code_vendeur || trimmedCode,
      nom: rawVendeur.nom || rawVendeur.name || `Commercial (${trimmedCode})`,
      tel: rawVendeur.tel || rawVendeur.telephone || null,
    };

    apiClient.saveVendeurToken(token, vendeur.code, vendeur);

    return {
      accessToken: token,
      tokenType: data.token_type || 'bearer',
      vendeur,
    };
  }

  // Connexion démo / hors-ligne pour tests et présentation
  loginAsDemo(codeVendeur = 'VND-001'): VendeurLoginResponse {
    const trimmedCode = codeVendeur.trim() || 'VND-001';
    const token = `vendeur-demo-${Date.now()}`;
    const vendeur: VendeurProfile = {
      id: 1,
      code: trimmedCode,
      nom: `Commercial ${trimmedCode} (Démo)`,
      tel: '0550 12 34 56',
    };
    apiClient.saveVendeurToken(token, vendeur.code, vendeur);
    return {
      accessToken: token,
      tokenType: 'bearer',
      vendeur,
    };
  }

  async logout(): Promise<void> {
    apiClient.clearVendeurAuth();
  }

  isAuthenticated(): boolean {
    return apiClient.hasVendeurToken();
  }

  getCachedVendeur(): VendeurProfile | null {
    const profile = apiClient.getCachedVendeurProfile();
    if (profile) return profile as VendeurProfile;
    const code = apiClient.getCachedCodeVendeur();
    return code ? { id: 0, code, nom: code } : null;
  }
}

export const vendeurAuthService = new VendeurAuthService();
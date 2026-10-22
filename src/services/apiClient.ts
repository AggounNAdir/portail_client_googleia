// Service Client HTTP avec gestion du token JWT

const STORAGE_KEY_TOKEN = 'jwt_access_token';
const STORAGE_KEY_CODE_CLIENT = 'cached_code_client';
const STORAGE_KEY_SERVER_URL = 'custom_api_base_url';

// ✅ Token vendeur séparé (Silwane Androway) : un commercial en tournée
// n'est PAS un client du portail, et son jeton JWT (type 'vendeur_portal')
// ne doit jamais être confondu avec celui d'un client ('client_portal') —
// l'API rejette explicitement l'un à la place de l'autre.
const STORAGE_KEY_VENDEUR_TOKEN = 'jwt_vendeur_access_token';
const STORAGE_KEY_CODE_VENDEUR = 'cached_code_vendeur';
const STORAGE_KEY_VENDEUR_PROFILE = 'cached_vendeur_profile';

export type TokenType = 'client' | 'vendeur' | 'any';

export const DEFAULT_API_BASE_URL = 'http://192.168.1.70:8000';

// Données initiales locales de continuité / mode démo (IntelliX Silwane ERP)
class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl =
      localStorage.getItem(STORAGE_KEY_SERVER_URL) ||
      (import.meta.env.VITE_API_BASE_URL as string) ||
      DEFAULT_API_BASE_URL;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = url.trim();
    localStorage.setItem(STORAGE_KEY_SERVER_URL, this.baseUrl);
  }

  public getAccessToken(): string | null {
    return localStorage.getItem(STORAGE_KEY_TOKEN);
  }

  public saveToken(token: string, codeClient?: string): void {
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
    if (codeClient) {
      localStorage.setItem(STORAGE_KEY_CODE_CLIENT, codeClient);
    }
  }

  public clearAuth(): void {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_CODE_CLIENT);
  }

  public hasToken(): boolean {
    const token = this.getAccessToken();
    return !!token && token.length > 0;
  }

  public getCachedCodeClient(): string | null {
    return localStorage.getItem(STORAGE_KEY_CODE_CLIENT);
  }

  // ---------- Authentification VENDEUR (Silwane Androway) ----------

  public getVendeurAccessToken(): string | null {
    return localStorage.getItem(STORAGE_KEY_VENDEUR_TOKEN);
  }

  public saveVendeurToken(token: string, codeVendeur?: string, profile?: Record<string, any>): void {
    localStorage.setItem(STORAGE_KEY_VENDEUR_TOKEN, token);
    if (codeVendeur) {
      localStorage.setItem(STORAGE_KEY_CODE_VENDEUR, codeVendeur);
    }
    if (profile) {
      localStorage.setItem(STORAGE_KEY_VENDEUR_PROFILE, JSON.stringify(profile));
    }
  }

  public clearVendeurAuth(): void {
    localStorage.removeItem(STORAGE_KEY_VENDEUR_TOKEN);
    localStorage.removeItem(STORAGE_KEY_CODE_VENDEUR);
    localStorage.removeItem(STORAGE_KEY_VENDEUR_PROFILE);
  }

  public hasVendeurToken(): boolean {
    const token = this.getVendeurAccessToken();
    return !!token && token.length > 0;
  }

  public getCachedCodeVendeur(): string | null {
    return localStorage.getItem(STORAGE_KEY_CODE_VENDEUR);
  }

  public getCachedVendeurProfile(): Record<string, any> | null {
    const saved = localStorage.getItem(STORAGE_KEY_VENDEUR_PROFILE);
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch (_) {
      return null;
    }
  }

  public hasAnyToken(): boolean {
    return this.hasToken() || this.hasVendeurToken();
  }

  public getCurrentRole(): 'client' | 'vendeur' | null {
    if (this.hasToken()) return 'client';
    if (this.hasVendeurToken()) return 'vendeur';
    return null;
  }

  // Effectue un appel HTTP réel avec timeout. Les erreurs sont toujours remontées (aucune donnée factice).
  public async request<T>(
    path: string,
    options: RequestInit = {},
    _unused?: unknown,
    tokenType: TokenType = 'client'
  ): Promise<T> {
    // Page en HTTPS + API en HTTP : le navigateur bloque la requête (Mixed Content).
    // On lève une erreur explicite plutôt que d'afficher de fausses données.
    const isBrowserHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const isTargetHttpInsecure = this.baseUrl.startsWith('http://') && !this.baseUrl.includes('localhost') && !this.baseUrl.includes('127.0.0.1');

    if (isBrowserHttps && isTargetHttpInsecure) {
      throw new Error("Le serveur API doit être en HTTPS (la page est servie en HTTPS).");
    }

    // Le jeton attaché dépend du type de requête :
    // - Si tokenType === 'vendeur' : on injecte en priorité le jeton commercial Androway, sinon le jeton actif
    // - Si tokenType === 'client' : on injecte en priorité le jeton client du portail, sinon le jeton actif
    // - Si tokenType === 'any' : on injecte le premier jeton disponible
    let token: string | null = null;
    if (tokenType === 'vendeur') {
      token = this.getVendeurAccessToken() || this.getAccessToken();
    } else if (tokenType === 'client') {
      token = this.getAccessToken() || this.getVendeurAccessToken();
    } else {
      token = this.getVendeurAccessToken() || this.getAccessToken();
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      // Nettoyer tout préfixe 'Bearer ' déjà présent pour éviter 'Bearer Bearer <token>'
      const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
      headers['Authorization'] = `Bearer ${cleanToken}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 401) {
        const errJson = await response.json().catch(() => null);
        const serverDetail = errJson?.detail || 'Identifiants incorrects ou session non autorisée (401)';

        // Si le serveur FastAPI renvoie 401 sur une opération vendeur (commande, tournée, etc.)
        if (tokenType === 'vendeur' || path.startsWith('/tournee') || path === '/commandes' || path.startsWith('/ventes')) {
          window.dispatchEvent(new CustomEvent('vendeur:session_expired', {
            detail: { path, serverDetail }
          }));
        }

        // Ne déconnecter la session que lors de la vérification explicite du profil.
        const isProfileCheck = path === '/clients/me' || path === '/vendeurs/me';

        if (isProfileCheck) {
          if (tokenType === 'vendeur' && this.hasVendeurToken()) {
            this.clearVendeurAuth();
            window.dispatchEvent(new Event('vendeur:unauthorized'));
          } else if (tokenType === 'client' && this.hasToken()) {
            this.clearAuth();
            window.dispatchEvent(new Event('auth:unauthorized'));
          }
        }

        const err: any = new Error(serverDetail);
        err.isAuthError = true;
        err.statusCode = 401;
        throw err;
      }

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.detail || `Erreur serveur HTTP ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err?.name === 'AbortError') {
        throw new Error('Le serveur ne répond pas (délai dépassé). Vérifiez votre connexion.');
      }
      throw err;
    }
  }

  // ---------- PROSPECTS CLIENTS (Table prospects_client) ----------
  public async getClients(): Promise<any[]> {
    return this.request<any[]>(
      '/clients',
      { method: 'GET' },
      undefined,
      'vendeur'
    );
  }

  public async getProspects(): Promise<any[]> {
    return this.request<any[]>(
      '/clients/prospects',
      { method: 'GET' },
      undefined,
      'vendeur'
    );
  }
}

export const apiClient = new ApiClient();
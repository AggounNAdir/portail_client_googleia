// Service Client HTTP avec gestion du token JWT et fallback local hors-ligne

import {
  ProduitCatalogue,
  CommandeOut,
  CommandeIn,
  ClientProfile,
  Facture,
  Versement,
  BonVente,
} from '../types';

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

// Données initiales locales vides (toutes les données proviennent du serveur FastAPI / Silwane)
const INITIAL_PRODUITS: ProduitCatalogue[] = [];

const INITIAL_PROFILE: ClientProfile = {
  id: 0,
  code: '',
  nom: '',
  adresse: '',
  tel: '',
  email: '',
  solde: 0.0,
  niveauPrix: 'detail',
};

const INITIAL_COMMANDES: CommandeOut[] = [];

const INITIAL_FACTURES: Facture[] = [];

const INITIAL_VERSEMENTS: Versement[] = [];

const INITIAL_VENTES: BonVente[] = [];

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

  // Effectue un appel HTTP réel avec timeout, puis bascule gracieusement sur les données locales
  public async request<T>(
    path: string,
    options: RequestInit = {},
    fallbackData?: () => T,
    tokenType: TokenType = 'client'
  ): Promise<T> {
    // Si la page est en HTTPS (ex: Google Cloud Run) et que l'URL cible est en HTTP local (ex: http://192.168.1.70),
    // le navigateur bloque la requête directement pour 'Mixed Content' avant même de tenter la connexion.
    // On bascule immédiatement sur le fallback local pour éviter de faire planter l'application.
    const isBrowserHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const isTargetHttpInsecure = this.baseUrl.startsWith('http://') && !this.baseUrl.includes('localhost') && !this.baseUrl.includes('127.0.0.1');

    if (isBrowserHttps && isTargetHttpInsecure && fallbackData) {
      return fallbackData();
    }

    // Le jeton attaché dépend du type de requête :
    // - Si tokenType === 'vendeur' : on injecte le jeton commercial Androway
    // - Si tokenType === 'client' : on injecte uniquement le jeton client du portail
    // - Si tokenType === 'any' : on injecte le jeton actif (client ou vendeur)
    let token: string | null = null;
    if (tokenType === 'vendeur') {
      token = this.getVendeurAccessToken();
    } else if (tokenType === 'client') {
      token = this.getAccessToken();
    } else {
      // 'any' : prend en priorité le jeton client, sinon le jeton commercial
      token = this.getAccessToken() || this.getVendeurAccessToken();
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
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

        // RÈGLE CRITIQUE : Ne JAMAIS déconnecter la session sur un simple appel de données (ex: /produits, /commandes, /factures).
        // Une déconnexion automatique (401) n'a de sens QUE si c'est la vérification explicite d'un profil de session (/clients/me, /vendeurs/me).
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

        // Si des données locales ou de repli existent (catalogue, tournées, historique local),
        // on les renvoie immédiatement pour maintenir la continuité sans bloquer l'utilisateur.
        if (fallbackData) {
          return fallbackData();
        }

        const err: any = new Error(serverDetail);
        err.isAuthError = true;
        throw err;
      }

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.detail || `Erreur serveur HTTP ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (err: any) {
      clearTimeout(timeoutId);
      // Si une fonction de données locales est fournie, on l'utilise pour garantir la continuité
      // SAUF si c'est une tentative de login échouée (loginRequest n'a pas de fallbackData)
      if (fallbackData) {
        return fallbackData();
      }
      throw err;
    }
  }

  // Opérations locales persistées
  public getLocalProduits(): ProduitCatalogue[] {
    const saved = localStorage.getItem('local_produits');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Purge anciens articles démo si présents
        if (Array.isArray(parsed) && parsed.some((p: any) => p.code === 'ART-001')) {
          localStorage.removeItem('local_produits');
          return [];
        }
        return parsed;
      } catch (_) {}
    }
    return [];
  }

  public getLocalCommandes(): CommandeOut[] {
    const saved = localStorage.getItem('local_commandes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Purge anciennes commandes démo si présentes
        if (Array.isArray(parsed) && parsed.some((c: any) => c.numero === 'CMD-2026-0089')) {
          localStorage.removeItem('local_commandes');
          return [];
        }
        return parsed;
      } catch (_) {}
    }
    return [];
  }

  public addLocalCommande(cmdIn: CommandeIn): CommandeOut {
    const commandes = this.getLocalCommandes();
    const produits = this.getLocalProduits();

    const numero = `CMD-${new Date().getFullYear()}-${String(
      commandes.length + 101
    ).padStart(4, '0')}`;

    let totalEstime = 0;
    const lignes = cmdIn.lignes.map((l, idx) => {
      const p = produits.find((pr) => pr.id === l.produitId);
      const pu = p?.prixUnitaire || 0;
      const total = pu * l.quantite;
      totalEstime += total;
      return {
        id: idx + 1,
        produitId: l.produitId,
        code: p?.code || 'ART-NC',
        designation: p?.designation || 'Article',
        quantite: l.quantite,
        prixUnitaireEstime: pu,
        totalEstime: total,
      };
    });

    const newCmd: CommandeOut = {
      id: Date.now(),
      numero,
      dateCommande: new Date().toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      statut: 'Transmise au serveur',
      observations: cmdIn.observations,
      totalEstime,
      lignes,
    };

    commandes.unshift(newCmd);
    localStorage.setItem('local_commandes', JSON.stringify(commandes));
    return newCmd;
  }

  public getLocalProfile(): ClientProfile {
    const saved = localStorage.getItem('local_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {}
    }
    return INITIAL_PROFILE;
  }

  public getLocalFactures(): Facture[] {
    return INITIAL_FACTURES;
  }

  public getLocalVersements(): Versement[] {
    return INITIAL_VERSEMENTS;
  }

  public getLocalVentes(): BonVente[] {
    return INITIAL_VENTES;
  }
}

export const apiClient = new ApiClient();
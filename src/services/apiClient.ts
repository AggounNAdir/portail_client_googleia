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

// Données initiales locales de continuité / mode démo (IntelliX Silwane ERP)
const INITIAL_PRODUITS: ProduitCatalogue[] = [
  {
    id: 101,
    code: 'EAU-LK-15',
    designation: 'Eau Minérale Lalla Khedidja 1.5L',
    unite: 'Bouteille',
    facteurConversion: 6,
    uniteFacteur: 6,
    prixUnitaire: 45.0,
    stockActuel: 340,
    tva: 19.0,
  },
  {
    id: 102,
    code: 'HUI-ELIO-5L',
    designation: 'Huile de Table Elio 5 Litres',
    unite: 'Bidon',
    facteurConversion: 4,
    uniteFacteur: 4,
    prixUnitaire: 650.0,
    stockActuel: 120,
    tva: 9.0,
  },
  {
    id: 103,
    code: 'SUC-CEV-1KG',
    designation: 'Sucre Blanc Cristallisé Cevital 1kg',
    unite: 'Paquet',
    facteurConversion: 10,
    uniteFacteur: 10,
    prixUnitaire: 95.0,
    stockActuel: 500,
    tva: 9.0,
  },
  {
    id: 104,
    code: 'CSC-REN-1KG',
    designation: 'Couscous Moyen Le Renard 1kg',
    unite: 'Paquet',
    facteurConversion: 10,
    uniteFacteur: 10,
    prixUnitaire: 140.0,
    stockActuel: 260,
    tva: 9.0,
  },
  {
    id: 105,
    code: 'CAF-FAM-250G',
    designation: 'Café Moulu Famico Pur Robusta 250g',
    unite: 'Paquet',
    facteurConversion: 24,
    uniteFacteur: 24,
    prixUnitaire: 260.0,
    stockActuel: 180,
    tva: 19.0,
  },
  {
    id: 106,
    code: 'JUS-ROU-1L',
    designation: 'Jus Rouiba Nectar Orange 1L',
    unite: 'Brique',
    facteurConversion: 12,
    uniteFacteur: 12,
    prixUnitaire: 165.0,
    stockActuel: 210,
    tva: 19.0,
  },
  {
    id: 107,
    code: 'PAT-SIM-500G',
    designation: 'Pâtes Spaghetti Sim N°3 500g',
    unite: 'Sachet',
    facteurConversion: 20,
    uniteFacteur: 20,
    prixUnitaire: 85.0,
    stockActuel: 450,
    tva: 9.0,
  },
  {
    id: 108,
    code: 'LAI-CND-1L',
    designation: 'Lait UHT Demi-Écrémé Candia 1L',
    unite: 'Brique',
    facteurConversion: 12,
    uniteFacteur: 12,
    prixUnitaire: 135.0,
    stockActuel: 300,
    tva: 9.0,
  },
  {
    id: 109,
    code: 'FRM-TAR-24P',
    designation: 'Fromage Fondu Tartino 24 Portions',
    unite: 'Boîte',
    facteurConversion: 16,
    uniteFacteur: 16,
    prixUnitaire: 290.0,
    stockActuel: 95,
    tva: 19.0,
  },
  {
    id: 110,
    code: 'BIS-BIM-CHO',
    designation: 'Biscuits Sablés Bimo Chocolat 150g',
    unite: 'Paquet',
    facteurConversion: 30,
    uniteFacteur: 30,
    prixUnitaire: 80.0,
    stockActuel: 380,
    tva: 19.0,
  },
];

const INITIAL_PROFILE: ClientProfile = {
  id: 1,
  code: 'CLT-0001',
  nom: 'Supérette El Bahdja (Bab Ezzouar)',
  adresse: '04 Boulevard Colonel Amirouche, Bab Ezzouar, Alger',
  tel: '0550 12 34 56',
  email: 'contact@elbahdja-superette.dz',
  solde: 45200.0,
  niveauPrix: 'Grossiste',
};

const INITIAL_COMMANDES: CommandeOut[] = [
  {
    id: 1001,
    numero: 'CMD-2026-0042',
    dateCommande: '12/09/2026 à 14:30',
    statut: 'Validée & Expédiée',
    observations: 'Livraison matin avant 11h - Quai de déchargement arrière',
    totalEstime: 64500.0,
    lignes: [
      {
        id: 1,
        produitId: 102,
        code: 'HUI-ELIO-5L',
        designation: 'Huile de Table Elio 5 Litres',
        unite: 'Bidon',
        quantite: 50,
        prixUnitaireEstime: 650.0,
        totalEstime: 32500.0,
      },
      {
        id: 2,
        produitId: 103,
        code: 'SUC-CEV-1KG',
        designation: 'Sucre Blanc Cristallisé Cevital 1kg',
        unite: 'Paquet',
        quantite: 200,
        prixUnitaireEstime: 95.0,
        totalEstime: 19000.0,
      },
      {
        id: 3,
        produitId: 108,
        code: 'LAI-CND-1L',
        designation: 'Lait UHT Demi-Écrémé Candia 1L',
        unite: 'Brique',
        quantite: 96,
        prixUnitaireEstime: 135.0,
        totalEstime: 13000.0,
      },
    ],
  },
  {
    id: 1002,
    numero: 'CMD-2026-0058',
    dateCommande: '15/09/2026 à 09:45',
    statut: 'En préparation dépôt',
    observations: 'Commande hebdomadaire réassort',
    totalEstime: 38200.0,
    lignes: [
      {
        id: 1,
        produitId: 101,
        code: 'EAU-LK-15',
        designation: 'Eau Minérale Lalla Khedidja 1.5L',
        unite: 'Bouteille',
        quantite: 120,
        prixUnitaireEstime: 45.0,
        totalEstime: 5400.0,
      },
      {
        id: 2,
        produitId: 106,
        code: 'JUS-ROU-1L',
        designation: 'Jus Rouiba Nectar Orange 1L',
        unite: 'Brique',
        quantite: 100,
        prixUnitaireEstime: 165.0,
        totalEstime: 16500.0,
      },
      {
        id: 3,
        produitId: 109,
        code: 'FRM-TAR-24P',
        designation: 'Fromage Fondu Tartino 24 Portions',
        unite: 'Boîte',
        quantite: 56,
        prixUnitaireEstime: 290.0,
        totalEstime: 16300.0,
      },
    ],
  },
];

const INITIAL_FACTURES: Facture[] = [
  {
    id: 201,
    numero: 'FAC-2026-0112',
    dateFacture: '01/09/2026',
    totalHT: 54201.68,
    totalTVA: 10298.32,
    totalTTC: 64500.0,
    statut: 'Payée',
  },
  {
    id: 202,
    numero: 'FAC-2026-0134',
    dateFacture: '10/09/2026',
    totalHT: 32100.84,
    totalTVA: 6099.16,
    totalTTC: 38200.0,
    statut: 'En attente',
  },
  {
    id: 203,
    numero: 'FAC-2026-0149',
    dateFacture: '15/09/2026',
    totalHT: 58823.53,
    totalTVA: 11176.47,
    totalTTC: 70000.0,
    statut: 'En attente',
  },
];

const INITIAL_VERSEMENTS: Versement[] = [
  {
    id: 301,
    numero: 'VER-2026-0089',
    dateVers: '05/09/2026',
    montant: 64500.0,
    mode: 'Chèque Bancaire (BNA)',
    reference: 'CHQ-892147',
  },
  {
    id: 302,
    numero: 'VER-2026-0094',
    dateVers: '12/09/2026',
    montant: 20000.0,
    mode: 'Virement BaridiMob',
    reference: 'BM-20260912-771',
  },
  {
    id: 303,
    numero: 'VER-2026-0099',
    dateVers: '16/09/2026',
    montant: 15000.0,
    mode: 'Espèces (Reçu Caisse)',
    reference: 'ESP-1609-04',
  },
];

const INITIAL_VENTES: BonVente[] = [
  {
    id: 401,
    numero: 'BV-2026-0201',
    dateBon: '08/09/2026',
    total: 24800.0,
    lignes: [
      { id: 1, designation: 'Huile de Table Elio 5L', quantite: 20, prixUnitaire: 650.0, montant: 13000.0 },
      { id: 2, designation: 'Café Moulu Famico 250g', quantite: 30, prixUnitaire: 260.0, montant: 7800.0 },
      { id: 3, designation: 'Jus Rouiba Orange 1L', quantite: 24, prixUnitaire: 165.0, montant: 3960.0 },
    ],
  },
  {
    id: 402,
    numero: 'BV-2026-0215',
    dateBon: '14/09/2026',
    total: 19500.0,
    lignes: [
      { id: 1, designation: 'Lait UHT Candia 1L', quantite: 60, prixUnitaire: 135.0, montant: 8100.0 },
      { id: 2, designation: 'Sucre Cevital 1kg', quantite: 120, prixUnitaire: 95.0, montant: 11400.0 },
    ],
  },
];

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

  public isRealJwtToken(token: string | null | undefined): boolean {
    if (!token) return false;
    const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
    if (
      cleanToken.startsWith('demo-') ||
      cleanToken.startsWith('vendeur-demo-') ||
      cleanToken.startsWith('vendeur-jwt-')
    ) {
      return false;
    }
    const parts = cleanToken.split('.');
    return parts.length === 3;
  }

  public isRealVendeurToken(): boolean {
    const token = this.getVendeurAccessToken();
    return this.isRealJwtToken(token);
  }

  public isDemoVendeurToken(): boolean {
    const token = this.getVendeurAccessToken();
    if (!token) return true;
    return !this.isRealJwtToken(token);
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

        // RÈGLE CRITIQUE : Ne JAMAIS déconnecter brutalement la session sur un simple appel de données (ex: /produits, /commandes, /factures).
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
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (_) {}
    }
    return INITIAL_PRODUITS;
  }

  public getLocalCommandes(): CommandeOut[] {
    const saved = localStorage.getItem('local_commandes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (_) {}
    }
    return INITIAL_COMMANDES;
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
      const pu = l.prixUnitaire || p?.prixUnitaire || 0;
      const uniteFacteur = l.facteurConversion || p?.facteurConversion || p?.uniteFacteur || 1;
      const total = l.total || (pu * uniteFacteur * l.quantite);
      totalEstime += total;
      return {
        id: idx + 1,
        produitId: l.produitId,
        code: p?.code || 'ART-NC',
        designation: p?.designation || 'Article',
        unite: l.unite || p?.unite || 'Pièce',
        quantite: l.quantite,
        prixUnitaireEstime: pu,
        totalEstime: total,
      };
    });

    if (cmdIn.total || cmdIn.montantTotal) {
      totalEstime = cmdIn.montantTotal || cmdIn.total || totalEstime;
    }

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

  // ---------- PROSPECTS CLIENTS (Table prospects_client) ----------
  public async getClients(): Promise<any[]> {
    return this.request<any[]>(
      '/clients',
      { method: 'GET' },
      () => [],
      'vendeur'
    );
  }

  public async getProspects(): Promise<any[]> {
    return this.request<any[]>(
      '/clients/prospects',
      { method: 'GET' },
      () => {
        const saved = localStorage.getItem('local_prospects');
        if (saved) {
          try {
            return JSON.parse(saved);
          } catch (_) {}
        }
        return [];
      },
      'vendeur'
    );
  }
}

export const apiClient = new ApiClient();
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

export type TokenType = 'client' | 'vendeur';

export const DEFAULT_API_BASE_URL = 'http://192.168.1.70:8000';

// Données initiales locales de référence (synchronisées avec les modèles Flutter)
const INITIAL_PRODUITS: ProduitCatalogue[] = [
  {
    id: 1,
    code: 'ART-001',
    designation: 'Paracétamol 500mg B/20',
    unite: 'Bte',
    prixUnitaire: 1.80,
    stockActuel: 145,
    tva: 19.0,
  },
  {
    id: 2,
    code: 'ART-002',
    designation: 'Amoxicilline 1g B/14',
    unite: 'Bte',
    prixUnitaire: 5.20,
    stockActuel: 68,
    tva: 19.0,
  },
  {
    id: 3,
    code: 'ART-003',
    designation: 'Sérum Salé 0.9% 500ml',
    unite: 'Flacon',
    prixUnitaire: 2.20,
    stockActuel: 240,
    tva: 19.0,
  },
  {
    id: 4,
    code: 'ART-004',
    designation: 'Oméprazole 20mg B/28',
    unite: 'Bte',
    prixUnitaire: 8.90,
    stockActuel: 35,
    tva: 19.0,
  },
  {
    id: 5,
    code: 'ART-005',
    designation: 'Vitamine C 1000mg Effervescente',
    unite: 'Tube',
    prixUnitaire: 4.50,
    stockActuel: 110,
    tva: 19.0,
  },
  {
    id: 6,
    code: 'ART-006',
    designation: 'Doliprane 1000mg B/8',
    unite: 'Bte',
    prixUnitaire: 2.10,
    stockActuel: 0,
    tva: 19.0,
  },
  {
    id: 7,
    code: 'ART-007',
    designation: 'Ibuprofène 400mg B/30',
    unite: 'Bte',
    prixUnitaire: 3.40,
    stockActuel: 82,
    tva: 19.0,
  },
  {
    id: 8,
    code: 'ART-008',
    designation: 'Bétadine Dermique 10% 125ml',
    unite: 'Flacon',
    prixUnitaire: 6.80,
    stockActuel: 40,
    tva: 19.0,
  },
];

const INITIAL_PROFILE: ClientProfile = {
  id: 1,
  code: 'CLT-0001',
  nom: 'Pharmacie Centrale El Madania',
  adresse: '14 Boulevard des Martyrs, El Madania',
  tel: '+213 23 54 12 80',
  email: 'contact@pharmacie-elmadania.dz',
  solde: 1450.00,
  niveauPrix: 'Tarif Grossiste / A+',
};

const INITIAL_COMMANDES: CommandeOut[] = [
  {
    id: 1,
    numero: 'CMD-2026-0089',
    dateCommande: '12/09/2026 14:30',
    statut: 'En cours de préparation',
    observations: 'Livrer par l\'entrée magasin arrière avant 16h',
    totalEstime: 88.40,
    lignes: [
      {
        id: 1,
        produitId: 1,
        code: 'ART-001',
        designation: 'Paracétamol 500mg B/20',
        quantite: 20,
        prixUnitaireEstime: 1.80,
        totalEstime: 36.00,
      },
      {
        id: 2,
        produitId: 2,
        code: 'ART-002',
        designation: 'Amoxicilline 1g B/14',
        quantite: 10,
        prixUnitaireEstime: 5.20,
        totalEstime: 52.00,
      },
    ],
  },
  {
    id: 2,
    numero: 'CMD-2026-0042',
    dateCommande: '04/09/2026 09:15',
    statut: 'Livrée & Facturée',
    observations: 'Commande urgente approvisionnement',
    totalEstime: 124.50,
    lignes: [
      {
        id: 3,
        produitId: 4,
        code: 'ART-004',
        designation: 'Oméprazole 20mg B/28',
        quantite: 10,
        prixUnitaireEstime: 8.90,
        totalEstime: 89.00,
      },
      {
        id: 4,
        produitId: 5,
        code: 'ART-005',
        designation: 'Vitamine C 1000mg Effervescente',
        quantite: 8,
        prixUnitaireEstime: 4.50,
        totalEstime: 36.00,
      },
    ],
  },
];

const INITIAL_FACTURES: Facture[] = [
  {
    id: 101,
    numero: 'FAC-2026-0144',
    dateFacture: '05/09/2026',
    totalHT: 124.50,
    totalTVA: 23.65,
    totalTTC: 148.15,
    statut: 'Non payée',
  },
  {
    id: 102,
    numero: 'FAC-2026-0098',
    dateFacture: '18/08/2026',
    totalHT: 560.00,
    totalTVA: 106.40,
    totalTTC: 666.40,
    statut: 'Réglée',
  },
];

const INITIAL_VERSEMENTS: Versement[] = [
  {
    id: 201,
    numero: 'REG-2026-0081',
    dateVers: '20/08/2026',
    montant: 666.40,
    mode: 'Virement bancaire',
    reference: 'VIR-BNP-882194',
  },
  {
    id: 202,
    numero: 'REG-2026-0045',
    dateVers: '02/07/2026',
    montant: 450.00,
    mode: 'Chèque',
    reference: 'CHQ-BEA-009812',
  },
];

const INITIAL_VENTES: BonVente[] = [
  {
    id: 301,
    numero: 'BV-2026-0034',
    dateBon: '05/09/2026',
    total: 148.15,
    lignes: [
      {
        id: 1,
        designation: 'Oméprazole 20mg B/28',
        quantite: 10,
        prixUnitaire: 8.90,
        montant: 89.00,
      },
      {
        id: 2,
        designation: 'Vitamine C 1000mg Effervescente',
        quantite: 8,
        prixUnitaire: 4.50,
        montant: 36.00,
      },
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

    // Le jeton attaché dépend de QUI appelle : un client du portail et un
    // commercial en tournée (Silwane Androway) ont des jetons JWT distincts.
    // Pour les routes partagées (ex: /produits), on envoie le jeton client s'il existe,
    // sinon le jeton vendeur si l'utilisateur connecté est un commercial.
    const token = tokenType === 'vendeur'
      ? this.getVendeurAccessToken()
      : (this.getAccessToken() || this.getVendeurAccessToken());

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

        if (tokenType === 'vendeur' || (!this.hasToken() && this.hasVendeurToken())) {
          this.clearVendeurAuth();
          window.dispatchEvent(new Event('vendeur:unauthorized'));
          const err: any = new Error(serverDetail);
          err.isAuthError = true;
          throw err;
        }
        this.clearAuth();
        window.dispatchEvent(new Event('auth:unauthorized'));
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
      // Ne JAMAIS masquer une erreur d'authentification 401 explicite du serveur avec des fausses données de démo !
      if (err?.isAuthError) {
        throw err;
      }
      // Si une fonction de données locales est fournie, on l'utilise pour garantir la continuité hors-ligne
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
        return JSON.parse(saved);
      } catch (_) {}
    }
    localStorage.setItem('local_produits', JSON.stringify(INITIAL_PRODUITS));
    return INITIAL_PRODUITS;
  }

  public getLocalCommandes(): CommandeOut[] {
    const saved = localStorage.getItem('local_commandes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {}
    }
    localStorage.setItem('local_commandes', JSON.stringify(INITIAL_COMMANDES));
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
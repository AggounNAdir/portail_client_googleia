/**
 * Service de communication HTTP direct avec le Backend FastAPI (api/main.py).
 * Se connecte aux endpoints /auth, /produits, /commandes, /clients, /factures, /ventes, /tournee.
 */

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:8000`;

export interface CaisseVendeur {
  creances_clients: number;
  nb_clients_debiteurs: number;
  periode_ca: number;
  periode_credit: number;
  periode_encaisse_total: number;
  periode_encaisse_especes: number;
  periode_verse_admin: number;
  periode_nb_remises: number;
  cumul_encaisse_especes: number;
  cumul_verse_admin: number;
  reste_a_verser: number;
  camion_valeur: number;
}

export interface RemiseAdmin {
  id: number;
  numero: string;
  date_vers: string;
  montant: number;
  mode: string;
  reference?: string | null;
  observations?: string | null;
  statut: string;
  cree_par?: string | null;
}

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('portail_client_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('portail_client_token', token);
    } else {
      localStorage.removeItem('portail_client_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('portail_client_token');
    }
    return this.token;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorMessage = `Erreur HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        errorMessage = errJson.detail || errorMessage;
      } catch {
        // pas de json
      }
      throw new Error(errorMessage);
    }

    return res.json();
  }

  // ========== AUTHENTIFICATION ==========
  async loginClient(code_client: string, password: string): Promise<{ access_token: string }> {
    const data = await this.request<{ access_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ code_client, password }),
    });
    this.setToken(data.access_token);
    localStorage.setItem('portail_user_role', 'client');
    return data;
  }

  async loginVendeur(code_vendeur: string, password: string): Promise<{ access_token: string; vendeur: any }> {
    const data = await this.request<{ access_token: string; vendeur: any }>('/auth/login-vendeur', {
      method: 'POST',
      body: JSON.stringify({ code_vendeur, password }),
    });
    this.setToken(data.access_token);
    localStorage.setItem('portail_user_role', 'vendeur');
    localStorage.setItem('portail_vendeur_info', JSON.stringify(data.vendeur));
    return data;
  }

  getUserRole(): 'client' | 'vendeur' | null {
    return (localStorage.getItem('portail_user_role') as any) || null;
  }

  getVendeurInfo(): any {
    try {
      const v = localStorage.getItem('portail_vendeur_info');
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  }

  logout() {
    this.setToken(null);
    localStorage.removeItem('portail_user_role');
    localStorage.removeItem('portail_vendeur_info');
  }

  // ========== CLIENT CONNECTÉ ==========
  async getMyProfile(): Promise<any> {
    return this.request('/clients/me');
  }

  // ========== VENDEUR EN TOURNÉE (Silwane Androway) ==========
  async getTourneePointages(): Promise<any[]> {
    return this.request('/tournee/pointages');
  }

  async enregistrerPointage(payload: {
    client_id?: number;
    code_client?: string;
    nom_client?: string;
    latitude?: number;
    longitude?: number;
    observations?: string;
  }): Promise<any> {
    return this.request('/tournee/pointage', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async creerProspect(payload: {
    nom: string;
    code?: string;
    tel?: string;
    adresse?: string;
    wilaya?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<any> {
    return this.request('/clients/prospect', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getProspects(): Promise<any[]> {
    return this.request('/clients/prospects?limit=200');
  }

  // ========== CATALOGUE PRODUITS ==========
  async getProduits(search?: string): Promise<any[]> {
    const query = search ? `?q=${encodeURIComponent(search)}` : '';
    return this.request(`/produits${query}`);
  }

  // ========== COMMANDES ==========
  async createCommande(payload: {
    lignes: { produit_id: number; quantite: number; prix_unitaire: number; facteur_conversion?: number; total?: number }[];
    montant_total?: number;
    observations?: string;
    is_prospect?: boolean;
    prospect_id?: number;
    client_id?: number;
    code_client?: string;
    nom_client?: string;
  }): Promise<any> {
    return this.request('/commandes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getMyCommandes(): Promise<any[]> {
    return this.request('/commandes/mes-commandes');
  }

  // ========== FACTURES ==========
  async getMyFactures(): Promise<any[]> {
    return this.request('/factures');
  }

  // ========== BONS DE LIVRAISON (VENTES) ==========
  async getMyVentes(): Promise<any[]> {
    return this.request('/clients/me/ventes');
  }

  // ========== SITUATION / VERSEMENTS TERRAIN ==========
  async getMyVersements(): Promise<any[]> {
    return this.request('/versements');
  }
  async getMySituation(dateDebut?: string, dateFin?: string): Promise<any> {
    const params = new URLSearchParams();
    if (dateDebut) params.set('date_debut', dateDebut);
    if (dateFin) params.set('date_fin', dateFin);
    const qs = params.toString();
    return this.request(`/clients/me/situation${qs ? `?${qs}` : ''}`);
  }

  async encaisserVersement(payload: {
    montant: number;
    mode?: string;
    reference?: string;
    client_id?: number;
    prospect_id?: number;
    code_client?: string;
    nom_client?: string;
    is_prospect?: boolean;
    vendeur_id?: number;
  }): Promise<any> {
    return this.request('/versements', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ========== STOCK INDIVIDUEL DU VENDEUR (CAMION / TOURNEE) ==========
  async getBackendStockCamion(): Promise<any[]> {
    return this.request('/tournee/stock-camion');
  }

  async chargerCamionBackend(lignes: { produit_id: number; quantite_colis: number }[], observations?: string): Promise<any> {
    return this.request('/tournee/chargement', {
      method: 'POST',
      body: JSON.stringify({ lignes, observations }),
    });
  }

  async dechargerCamionBackend(): Promise<any> {
    return this.request('/tournee/dechargement', {
      method: 'POST',
    });
  }

  async validerVenteDirecteBackend(payload: {
    client_id?: number;
    prospect_id?: number;
    code_client?: string;
    nom_client?: string;
    is_prospect?: boolean;
    lignes: { produit_id: number; quantite: number; prix_unitaire: number }[];
    montant_verse?: number;
    mode_reglement?: string;
    observations?: string;
  }): Promise<any> {
    return this.request('/tournee/vente-directe', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Situation réelle de caisse, calculée par le serveur (espèces encaissées − remises à l'administration).
  async getMaCaisse(dateDebut?: string, dateFin?: string): Promise<CaisseVendeur> {
    const params = new URLSearchParams();
    if (dateDebut) params.set('date_debut', dateDebut);
    if (dateFin) params.set('date_fin', dateFin);
    const qs = params.toString();
    return this.request(`/tournee/ma-caisse${qs ? `?${qs}` : ''}`);
  }

  async getMesRemises(dateDebut?: string, dateFin?: string): Promise<RemiseAdmin[]> {
    const params = new URLSearchParams();
    if (dateDebut) params.set('date_debut', dateDebut);
    if (dateFin) params.set('date_fin', dateFin);
    const qs = params.toString();
    return this.request(`/tournee/mes-remises${qs ? `?${qs}` : ''}`);
  }

  async getVentesTerrainBackend(): Promise<any[]> {
    return this.request('/tournee/ventes');
  }
}

export const api = new ApiService();
// Modèles TypeScript du Portail Client & Silwane Androway

export interface ProduitCatalogue {
  id: number;
  code: string;
  designation: string;
  unite: string;
  facteurConversion?: number;
  facteur_conversion?: number;
  uniteFacteur?: number;
  prixUnitaire: number;
  prix_unitaire?: number;
  stockActuel: number;
  stock_actuel?: number;
  tva: number;
}

export function getProductConversionFactor(
  p: Partial<ProduitCatalogue> | Record<string, unknown> | null | undefined
): number {
  if (!p) return 1;
  const obj = p as Record<string, unknown>;
  const raw =
    obj.facteurConversion ??
    obj.facteur_conversion ??
    obj.uniteFacteur ??
    obj.facteur ??
    obj.colisage ??
    obj.cond ??
    obj.nb_unite ??
    obj.ratio;
  const num = typeof raw === 'number' ? raw : parseFloat(String(raw));
  return !isNaN(num) && num > 0 ? num : 1;
}

export function getProductUnitPrice(
  p: Partial<ProduitCatalogue> | Record<string, unknown> | null | undefined
): number {
  if (!p) return 0;
  const obj = p as Record<string, unknown>;
  const raw =
    obj.prixUnitaire ??
    obj.prix_unitaire ??
    obj.prix_vente ??
    obj.prix ??
    obj.pu ??
    obj.price;
  const num = typeof raw === 'number' ? raw : parseFloat(String(raw));
  return !isNaN(num) && num > 0 ? num : 0;
}

export function getProductPackagePrice(
  p: Partial<ProduitCatalogue> | Record<string, unknown> | null | undefined
): number {
  return getProductUnitPrice(p) * getProductConversionFactor(p);
}

export interface CartItem {
  produit: ProduitCatalogue;
  quantite: number;
}

export interface CommandeLigneIn {
  produitId: number;
  quantite: number;
  prixUnitaire?: number;
  facteurConversion?: number;
  unite?: string;
  total?: number;
}

export interface CommandeIn {
  observations?: string | null;
  total?: number;
  montantTotal?: number;
  lignes: CommandeLigneIn[];
}

export interface CommandeLigneOut {
  id: number;
  produitId: number;
  code: string;
  designation: string;
  unite?: string;
  quantite: number;
  facteurConversion?: number;
  prixUnitaireEstime: number;
  totalEstime: number;
}

export interface CommandeOut {
  id: number;
  numero: string;
  dateCommande: string;
  statut: string;
  observations?: string | null;
  totalEstime: number;
  lignes: CommandeLigneOut[];
}

export interface ClientProfile {
  id: number;
  code: string;
  nom: string;
  adresse?: string | null;
  tel?: string | null;
  email?: string | null;
  solde: number;
  niveauPrix?: string | null;
}

export interface LigneBonVente {
  id: number;
  designation: string;
  quantite: number;
  prixUnitaire: number;
  montant: number;
}

export interface BonVente {
  id: number;
  numero: string;
  dateBon: string;
  total: number;
  lignes: LigneBonVente[];
}

export interface Facture {
  id: number;
  numero: string;
  dateFacture: string;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  statut?: string | null;
}

export interface Versement {
  id: number;
  numero: string;
  dateVers: string;
  montant: number;
  mode: string;
  reference?: string | null;
}

// Androway Tournée & Sync
export interface VendeurProfile {
  id: number;
  code: string;
  nom: string;
  tel?: string | null;
}

export type SyncItemType =
  | 'commande'
  | 'encaissement'
  | 'pointageVisite'
  | 'signatureBL'
  | 'prospectClient';

export type SyncStatus = 'pending' | 'inProgress' | 'success' | 'failed';

export interface SyncOperation {
  id: string;
  type: SyncItemType;
  payload: Record<string, any>;
  createdAt: string;
  status: SyncStatus;
  retryCount: number;
  errorReason?: string;
}

export interface ClientTourneeItem {
  id: number;
  code: string;
  nom: string;
  adresse: string;
  ville: string;
  creanceDZD: number;
  lat: number;
  lng: number;
  isVisited: boolean;
  visitedAt?: string | null;
}

export interface VisiteTerrain {
  clientId: number;
  codeClient: string;
  nomClient: string;
  targetLat: number;
  targetLng: number;
  adresse: string;
  isVisited: boolean;
  visitedAt?: string;
}

// POS Caisse
export interface PosArticleLigne {
  id: string;
  designation: string;
  codeBarre: string;
  prix: number;
  quantite: number;
  facteurConversion: number;
  uniteFacteur?: number;
  unite?: string;
  modeVente?: 'colis' | 'piece';
}

export interface DepotStockItem {
  id: number;
  code: string;
  nom: string;
  type: string;
  quantite: number;
}

export interface ProduitLotItem {
  id: number;
  numeroLot: string;
  datePeremption: string;
  quantiteDispo: number;
  alertePeremption: boolean;
}
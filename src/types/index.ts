export type UserRole = 'admin' | 'gestionnaire' | 'vendeur' | 'caissier' | 'lecture_seule';

export interface User {
  id: number;
  username: string;
  nom_complet: string;
  role: UserRole;
  actif: number;
  doit_changer_mdp?: number;
  date_creation: string;
  derniere_connexion?: string;
  cree_par?: string;
}

export type PricingTier = 'detail' | 'gros' | 'super_gros' | 'special';

export interface Produit {
  id: number;
  code: string;
  barcode: string;
  designation: string;
  unite: string;
  facteur_conversion: number;
  prix_achat: number;
  prix_vente: number;
  prix_super_gros: number;
  prix_gros: number;
  prix_detail: number;
  prix_special: number;
  stock_actuel: number;
  stock_min: number;
  prix_moyen_pondere: number;
  cout_total_stock: number;
  tva: number;
  actif: number;
  fournisseur?: string;
}

export interface Client {
  id: number;
  code: string;
  nom: string;
  adresse: string;
  tel: string;
  email: string;
  solde: number;
  nif?: string;
  nis?: string;
  nrc?: string;
  art_imp?: string;
  registre_commerce?: string;
  capitale_social?: string;
  ville?: string;
  niveau_prix: PricingTier;
  portail_actif?: number;
}

export interface Fournisseur {
  id: number;
  code: string;
  nom: string;
  adresse: string;
  tel: string;
  email: string;
  solde: number;
  nif?: string;
  nis?: string;
  nrc?: string;
  art_imp?: string;
  registre_commerce?: string;
  capitale_social?: string;
  ville?: string;
}

export interface PrixSpecialClient {
  id: number;
  client_id: number;
  produit_id: number;
  prix_special: number;
  date_debut?: string;
  date_fin?: string;
  actif: number;
  date_modification?: string;
}

export interface PrixPalier {
  id: number;
  produit_id: number;
  niveau: PricingTier;
  qte_min: number;
  prix: number;
  actif: number;
}

export interface LigneVente {
  id?: number;
  produit_id: number;
  designation?: string;
  code_produit?: string;
  unite?: string;
  facteur_conversion?: number;
  quantite: number;
  quantite_cartons?: number;
  prix_unitaire: number;
  total: number;
  total_ht: number;
  tva_taux: number;
  total_tva: number;
  total_ttc: number;
}

export interface BonVente {
  id: number;
  numero: string;
  date_bon: string;
  client_id: number;
  client_nom?: string;
  total: number;
  total_ht: number;
  tva_total: number;
  total_ttc: number;
  statut: 'Validé' | 'Annulé' | 'Brouillon';
  observations?: string;
  vendeur_id?: number;
  vendeur_nom?: string;
  montant_verse: number;
  reste_payer: number;
  signature_bl?: string;
  signataire_nom?: string;
  date_signature?: string;
  lignes: LigneVente[];
  est_facture?: boolean;
}

export interface LigneAchat {
  id?: number;
  produit_id: number;
  designation?: string;
  code_produit?: string;
  quantite: number;
  prix_unitaire: number;
  total: number;
  tva_taux: number;
  total_ht: number;
  total_ttc: number;
}

export interface BonAchat {
  id: number;
  numero: string;
  date_bon: string;
  fournisseur_id: number;
  fournisseur_nom?: string;
  total: number;
  statut: 'Validé' | 'Annulé' | 'Brouillon';
  date_creation: string;
  date_livraison?: string;
  num_facture_fournisseur?: string;
  num_bl_fournisseur?: string;
  observations?: string;
  ancien_solde?: number;
  nouveau_solde?: number;
  lignes: LigneAchat[];
}

export interface Facture {
  id: number;
  numero: string;
  date_facture: string;
  bon_vente_id: number;
  bon_vente_numero?: string;
  client_id: number;
  client_nom?: string;
  total_ht: number;
  tva: number;
  total_ttc: number;
  statut: 'Émise' | 'Payée' | 'Annulée';
  date_echeance?: string;
  observations?: string;
}

export interface Versement {
  id: number;
  numero: string;
  date_vers: string;
  tiers_type: 'client' | 'fournisseur' | 'prospect';
  tiers_id: number;
  tiers_nom?: string;
  montant: number;
  mode: 'Espèces' | 'Chèque' | 'Virement' | 'Traite';
  reference?: string;
  vendeur_id?: number;
  vendeur_nom?: string;
}

export interface LigneRetour {
  id?: number;
  produit_id: number;
  designation?: string;
  quantite: number;
  prix_unitaire: number;
  total: number;
}

export interface Retour {
  id: number;
  numero: string;
  date_retour: string;
  type_retour: 'vente' | 'achat';
  document_ref_id?: number;
  tiers_id: number;
  tiers_nom?: string;
  total: number;
  motif?: string;
  lignes: LigneRetour[];
}

export type MovementType =
  | 'VENTE'
  | 'ACHAT'
  | 'RETOUR_VENTE'
  | 'RETOUR_ACHAT'
  | 'AJUSTEMENT'
  | 'INITIALISATION';

export interface MouvementStock {
  id: number;
  date_mouvement: string;
  date_document?: string;
  produit_id: number;
  produit_code?: string;
  produit_nom?: string;
  type_mouvement: MovementType;
  quantite: number;
  stock_avant: number;
  stock_apres: number;
  cout_unitaire: number;
  valeur: number;
  pmp_apres?: number;
  document_type?: string;
  document_id?: number;
  document_numero?: string;
  tiers_nom?: string;
  motif?: string;
  utilisateur?: string;
}

export interface Vendeur {
  id: number;
  code: string;
  nom: string;
  tel?: string;
  actif: number;
}

export interface Prospect {
  id: number;
  code: string;
  nom: string;
  tel?: string;
  adresse?: string;
  wilaya?: string;
  latitude?: number;
  longitude?: number;
  vendeur_id?: number;
  vendeur_nom?: string;
  date_creation: string;
  statut: 'Nouveau' | 'En cours' | 'Converti' | 'Perdu';
  client_id?: number;
  solde: number;
}

export interface CommandePortail {
  id: number;
  numero: string;
  client_id: number;
  client_nom?: string;
  date_commande: string;
  statut: 'En attente' | 'Validée' | 'Refusée';
  total_estime: number;
  observations?: string;
  bon_vente_id?: number;
  lignes: {
    produit_id: number;
    produit_nom: string;
    quantite: number;
    prix_unitaire_estime: number;
    total_estime: number;
  }[];
}

export interface ProfilEntreprise {
  id: number;
  code: string;
  nom: string;
  type_profil: string;
  adresse: string;
  telephone: string;
  email: string;
  site_web?: string;
  ville: string;
  nif: string;
  nis: string;
  nrc: string;
  art_imp: string;
  registre_commerce: string;
  capitale_social: string;
  logo_path?: string;
  actif: number;
  est_defaut: number;
}

export interface JournalAudit {
  id: number;
  date_action: string;
  utilisateur: string;
  action: string;
  cible_type?: string;
  cible_id?: number;
  details?: string;
  reussite: number;
}
export interface SituationLigne {
  date: string;
  type: 'bon' | 'versement' | 'retour';
  numero: string;
  libelle: string;
  debit: number;
  credit: number;
  solde: number;
}

export interface SituationClient {
  clientCode: string;
  clientNom: string;
  dateEdition: string;
  soldeReport: number;
  totalDebit: number;
  totalCredit: number;
  soldeFinal: number;
  lignes: SituationLigne[];
}
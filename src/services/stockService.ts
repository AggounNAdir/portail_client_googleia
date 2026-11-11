import { MouvementStock, MovementType, Produit } from '../types';

export function calculerNouveauPmp(
  stockActuel: number,
  coutTotalActuel: number,
  pmpActuel: number,
  nouvelleQuantite: number,
  nouveauPrixAchat: number
): { nouveauStock: number; nouveauCoutTotal: number; nouveauPmp: number } {
  const stock = Math.max(0, stockActuel);
  const cout = Math.max(0, coutTotalActuel || stock * pmpActuel);

  if (stock <= 0) {
    const nouveauCoutTotal = nouvelleQuantite * nouveauPrixAchat;
    const nouveauStock = nouvelleQuantite;
    const nouveauPmp = nouveauStock > 0 ? nouveauCoutTotal / nouveauStock : nouveauPrixAchat;
    return { nouveauStock, nouveauCoutTotal, nouveauPmp };
  }

  const nouveauCoutTotal = cout + nouvelleQuantite * nouveauPrixAchat;
  const nouveauStock = stock + nouvelleQuantite;
  const nouveauPmp = nouveauStock > 0 ? nouveauCoutTotal / nouveauStock : nouveauPrixAchat;

  return {
    nouveauStock,
    nouveauCoutTotal: Math.round(nouveauCoutTotal * 100) / 100,
    nouveauPmp: Math.round(nouveauPmp * 100) / 100,
  };
}

export function deduireSortieStock(
  stockActuel: number,
  coutTotalActuel: number,
  pmpActuel: number,
  quantiteSortie: number
): { nouveauStock: number; nouveauCoutTotal: number; pmp: number } {
  const stock = Math.max(0, stockActuel);
  const pmp = pmpActuel > 0 ? pmpActuel : (stock > 0 ? coutTotalActuel / stock : 0);
  const reductionCout = quantiteSortie * pmp;
  const nouveauCoutTotal = Math.max(0, coutTotalActuel - reductionCout);
  const nouveauStock = Math.max(0, stock - quantiteSortie);

  return {
    nouveauStock,
    nouveauCoutTotal: Math.round(nouveauCoutTotal * 100) / 100,
    pmp,
  };
}

export function creerMouvement({
  mouvements,
  produit,
  typeMouvement,
  quantite,
  documentType,
  documentId,
  documentNumero,
  tiersNom,
  motif,
  utilisateur = 'admin',
}: {
  mouvements: MouvementStock[];
  produit: Produit;
  typeMouvement: MovementType;
  quantite: number;
  documentType?: string;
  documentId?: number;
  documentNumero?: string;
  tiersNom?: string;
  motif?: string;
  utilisateur?: string;
}): MouvementStock {
  const now = new Date();
  const dateFormatted = now.toISOString().replace('T', ' ').substring(0, 19);

  const stockAvant = produit.stock_actuel;
  const stockApres = stockAvant + quantite;
  const coutUnitaire = produit.prix_moyen_pondere > 0 ? produit.prix_moyen_pondere : produit.prix_achat;
  const valeur = quantite * coutUnitaire;

  const nextId = mouvements.length > 0 ? Math.max(...mouvements.map((m) => m.id)) + 1 : 1;

  return {
    id: nextId,
    date_mouvement: dateFormatted,
    date_document: dateFormatted.split(' ')[0],
    produit_id: produit.id,
    produit_code: produit.code,
    produit_nom: produit.designation,
    type_mouvement: typeMouvement,
    quantite,
    stock_avant: stockAvant,
    stock_apres: stockApres,
    cout_unitaire: coutUnitaire,
    valeur: Math.round(valeur * 100) / 100,
    pmp_apres: produit.prix_moyen_pondere,
    document_type: documentType,
    document_id: documentId,
    document_numero: documentNumero,
    tiers_nom: tiersNom,
    motif,
    utilisateur,
  };
}

export function genererNumeroDocument(prefix: string, list: { numero: string }[]): string {
  const year = new Date().getFullYear();
  const yearPrefix = `${prefix}-${year}-`;
  const existingForYear = list.filter((item) => item.numero && item.numero.startsWith(yearPrefix));

  let maxNum = 0;
  for (const item of existingForYear) {
    const parts = item.numero.split('-');
    const last = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(last) && last > maxNum) {
      maxNum = last;
    }
  }

  const nextNum = maxNum + 1;
  return `${yearPrefix}${nextNum.toString().padStart(4, '0')}`;
}

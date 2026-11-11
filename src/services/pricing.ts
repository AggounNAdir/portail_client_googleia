import { Client, PricingTier, PrixPalier, PrixSpecialClient, Produit } from '../types';

export interface ResolvedPrice {
  prix: number;
  source: 'special_client' | 'palier' | 'niveau' | 'prix_vente' | 'defaut';
  libelle: string;
  niveau: PricingTier;
  margePct: number;
  statutMarge: 'ok' | 'sous_marge' | 'sous_cout' | 'cout_inconnu';
  coutRef: number;
}

export function getCoutReference(produit: Produit): number {
  if (produit.prix_moyen_pondere && produit.prix_moyen_pondere > 0) {
    return produit.prix_moyen_pondere;
  }
  return produit.prix_achat || 0;
}

export function resoudrePrix({
  produit,
  client,
  quantite = 1,
  prixSpeciaux = [],
  paliers = [],
  niveauForce,
}: {
  produit: Produit;
  client?: Client | null;
  quantite?: number;
  prixSpeciaux?: PrixSpecialClient[];
  paliers?: PrixPalier[];
  niveauForce?: PricingTier;
}): ResolvedPrice {
  const niveau: PricingTier = niveauForce || client?.niveau_prix || 'detail';
  const cout = getCoutReference(produit);
  const now = new Date().toISOString().split('T')[0];

  // 1. Prix spécial client x produit (priorité absolue)
  if (client) {
    const special = prixSpeciaux.find(
      (ps) =>
        ps.client_id === client.id &&
        ps.produit_id === produit.id &&
        ps.actif === 1 &&
        (!ps.date_debut || ps.date_debut <= now) &&
        (!ps.date_fin || ps.date_fin >= now)
    );
    if (special && special.prix_special > 0) {
      const p = special.prix_special;
      return evaluateMargin(p, cout, 'special_client', 'Prix spécial client ★', niveau);
    }
  }

  // 2. Palier de quantité pour le niveau
  const palierApplicable = paliers
    .filter(
      (p) =>
        p.produit_id === produit.id &&
        p.niveau === niveau &&
        p.actif === 1 &&
        quantite >= p.qte_min
    )
    .sort((a, b) => b.qte_min - a.qte_min)[0];

  if (palierApplicable && palierApplicable.prix > 0) {
    return evaluateMargin(
      palierApplicable.prix,
      cout,
      'palier',
      `Palier ≥ ${palierApplicable.qte_min} (${getLibelleNiveau(niveau)})`,
      niveau
    );
  }

  // 3. Prix selon niveau du client
  let prixNiveau = 0;
  if (niveau === 'super_gros') prixNiveau = produit.prix_super_gros;
  else if (niveau === 'gros') prixNiveau = produit.prix_gros;
  else if (niveau === 'special') prixNiveau = produit.prix_special;
  else prixNiveau = produit.prix_detail;

  if (prixNiveau && prixNiveau > 0) {
    return evaluateMargin(
      prixNiveau,
      cout,
      'niveau',
      `Niveau ${getLibelleNiveau(niveau)}`,
      niveau
    );
  }

  // 4. Repli sur prix_vente
  if (produit.prix_vente && produit.prix_vente > 0) {
    return evaluateMargin(
      produit.prix_vente,
      cout,
      'prix_vente',
      'Prix standard',
      niveau
    );
  }

  // 5. Défaut
  return {
    prix: 0,
    source: 'defaut',
    libelle: 'Non défini',
    niveau,
    margePct: 0,
    statutMarge: 'cout_inconnu',
    coutRef: cout,
  };
}

function evaluateMargin(
  prix: number,
  cout: number,
  source: ResolvedPrice['source'],
  libelle: string,
  niveau: PricingTier
): ResolvedPrice {
  let margePct = 0;
  let statutMarge: ResolvedPrice['statutMarge'] = 'ok';

  if (cout <= 0) {
    statutMarge = 'cout_inconnu';
  } else {
    margePct = ((prix - cout) / cout) * 100;
    if (prix < cout) {
      statutMarge = 'sous_cout';
    } else if (margePct < 5) {
      statutMarge = 'sous_marge';
    }
  }

  return {
    prix,
    source,
    libelle,
    niveau,
    margePct: Math.round(margePct * 10) / 10,
    statutMarge,
    coutRef: cout,
  };
}

export function getLibelleNiveau(niveau: PricingTier): string {
  switch (niveau) {
    case 'super_gros':
      return 'Super Gros';
    case 'gros':
      return 'Gros';
    case 'special':
      return 'Spécial';
    default:
      return 'Détail';
  }
}

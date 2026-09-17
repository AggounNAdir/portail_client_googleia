// Service Produits Catalogue

import { ProduitCatalogue } from '../types';
import { apiClient } from './apiClient';

// Helper pour normaliser un produit venant de FastAPI (snake_case ou camelCase)
export function normalizeProduit(raw: any): ProduitCatalogue {
<<<<<<< HEAD
  const prix = raw.prixUnitaire ?? raw.prix_unitaire ?? raw.prix_vente ?? raw.prix ?? raw.pu ?? raw.price ?? 0;
  const stock = raw.stockActuel ?? raw.stock_actuel ?? raw.stock ?? raw.qte ?? 0;
  const tvaVal = raw.tva ?? raw.taux_tva ?? raw.tva_taux ?? 19.0;

  // 1. Libellé / Type de l'unité (Pièce, g, kg, carton, bte...) depuis la colonne 'unite'
  const uniteLibelle = raw.unite ?? raw.unit ?? raw.type_unite ?? raw.unite_mesure ?? 'Pièce';
  const uniteStr = String(uniteLibelle !== undefined && uniteLibelle !== null ? uniteLibelle : 'Pièce').trim();

  // 2. Facteur de conversion (nombre d'unités dans un carton/colis) depuis la colonne 'facteur_conversion'
  // Supporte : facteur_conversion, facteurConversion, facteur, facteur_conv, colisage, nb_unite, cond, conditionnement
  const rawFacteur =
    raw.facteur_conversion ??
    raw.facteurConversion ??
    raw.facteur_conv ??
    raw.facteur ??
    raw.colisage ??
    raw.nb_unite ??
    raw.cond ??
    raw.conditionnement ??
    1;

  let facteurConversion = 1;
  if (typeof rawFacteur === 'number' && !isNaN(rawFacteur) && rawFacteur > 0) {
    facteurConversion = rawFacteur;
  } else if (typeof rawFacteur === 'string') {
    const directNum = parseFloat(rawFacteur.replace(',', '.').trim());
    if (!isNaN(directNum) && directNum > 0) {
      facteurConversion = directNum;
    } else {
      const match = rawFacteur.match(/\d+(\.\d+)?/);
      if (match) {
        const extracted = parseFloat(match[0]);
        if (!isNaN(extracted) && extracted > 0) {
          facteurConversion = extracted;
        }
      }
    }
  }

=======
  const prix = raw.prixUnitaire ?? raw.prix_unitaire ?? raw.prix ?? raw.pu ?? raw.price ?? 0;
  const stock = raw.stockActuel ?? raw.stock_actuel ?? raw.stock ?? raw.qte ?? 0;
  const tvaVal = raw.tva ?? raw.taux_tva ?? raw.tva_taux ?? 19.0;

>>>>>>> 498e5f5a23b6492ce4798e8d69b4035eb4f78f67
  return {
    id: Number(raw.id ?? Math.floor(Math.random() * 100000)),
    code: String(raw.code ?? raw.reference ?? raw.ref ?? 'ART-NC'),
    designation: String(raw.designation ?? raw.nom ?? raw.libelle ?? raw.label ?? 'Article'),
<<<<<<< HEAD
    unite: uniteStr,
    facteurConversion,
    uniteFacteur: facteurConversion,
=======
    unite: String(raw.unite ?? raw.unit ?? 'U'),
>>>>>>> 498e5f5a23b6492ce4798e8d69b4035eb4f78f67
    prixUnitaire: typeof prix === 'number' ? prix : parseFloat(prix) || 0,
    stockActuel: typeof stock === 'number' ? stock : parseFloat(stock) || 0,
    tva: typeof tvaVal === 'number' ? tvaVal : parseFloat(tvaVal) || 19.0,
  };
}

export class ProduitService {
  async getCatalogue(query?: string, limit = 50, offset = 0, clientId?: number): Promise<ProduitCatalogue[]> {
    const searchParams = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    if (query && query.trim()) {
      searchParams.set('q', query.trim());
    }
    if (clientId) {
      searchParams.set('client_id', clientId.toString());
    }

    const rawList = await apiClient.request<any[]>(
      `/produits?${searchParams.toString()}`,
      { method: 'GET' },
      () => {
        let items = apiClient.getLocalProduits();
        if (query && query.trim()) {
          const q = query.trim().toLowerCase();
          items = items.filter(
            (p) =>
              p.code.toLowerCase().includes(q) ||
              p.designation.toLowerCase().includes(q)
          );
        }
        return items.slice(offset, offset + limit);
      },
      'any'
    );

    if (!Array.isArray(rawList)) {
      return apiClient.getLocalProduits();
    }

    return rawList.map(normalizeProduit);
  }
}

export const produitService = new ProduitService();

// Service Produits Catalogue

import { ProduitCatalogue } from '../types';
import { apiClient } from './apiClient';

// Helper pour normaliser un produit venant de FastAPI (snake_case ou camelCase)
export function normalizeProduit(raw: any): ProduitCatalogue {
  const prix = raw.prixUnitaire ?? raw.prix_unitaire ?? raw.prix ?? raw.pu ?? raw.price ?? 0;
  const stock = raw.stockActuel ?? raw.stock_actuel ?? raw.stock ?? raw.qte ?? 0;
  const tvaVal = raw.tva ?? raw.taux_tva ?? raw.tva_taux ?? 19.0;

  return {
    id: Number(raw.id ?? Math.floor(Math.random() * 100000)),
    code: String(raw.code ?? raw.reference ?? raw.ref ?? 'ART-NC'),
    designation: String(raw.designation ?? raw.nom ?? raw.libelle ?? raw.label ?? 'Article'),
    unite: String(raw.unite ?? raw.unit ?? 'U'),
    prixUnitaire: typeof prix === 'number' ? prix : parseFloat(prix) || 0,
    stockActuel: typeof stock === 'number' ? stock : parseFloat(stock) || 0,
    tva: typeof tvaVal === 'number' ? tvaVal : parseFloat(tvaVal) || 19.0,
  };
}

export class ProduitService {
  async getCatalogue(query?: string, limit = 50, offset = 0): Promise<ProduitCatalogue[]> {
    const searchParams = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    if (query && query.trim()) {
      searchParams.set('q', query.trim());
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
      }
    );

    if (!Array.isArray(rawList)) {
      return apiClient.getLocalProduits();
    }

    return rawList.map(normalizeProduit);
  }
}

export const produitService = new ProduitService();

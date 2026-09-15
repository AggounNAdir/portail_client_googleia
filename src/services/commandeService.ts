// Service Commandes

import { CommandeIn, CommandeOut } from '../types';
import { apiClient } from './apiClient';

export function normalizeCommande(raw: any): CommandeOut {
  const total = raw.totalEstime ?? raw.total_estime ?? raw.total ?? raw.montant_total ?? 0;
  const rawLignes = raw.lignes ?? raw.items ?? [];
  const lignes = Array.isArray(rawLignes)
    ? rawLignes.map((l: any) => {
        const pu = l.prixUnitaireEstime ?? l.prix_unitaire ?? l.pu ?? l.prix ?? 0;
        const tot = l.totalEstime ?? l.total ?? l.montant ?? (pu * (l.quantite || 1));
        return {
          id: Number(l.id || Math.floor(Math.random() * 100000)),
          produitId: Number(l.produitId ?? l.produit_id ?? l.id_produit ?? 0),
          code: String(l.code || l.reference || 'ART'),
          designation: String(l.designation || l.nom || 'Article'),
          quantite: Number(l.quantite || 1),
          prixUnitaireEstime: typeof pu === 'number' ? pu : parseFloat(pu) || 0,
          totalEstime: typeof tot === 'number' ? tot : parseFloat(tot) || 0,
        };
      })
    : [];

  return {
    id: Number(raw.id || Math.floor(Math.random() * 100000)),
    numero: String(raw.numero || raw.num || `CMD-${raw.id || 'TEMP'}`),
    dateCommande: String(raw.dateCommande || raw.date_commande || raw.date || new Date().toISOString().split('T')[0]),
    statut: String(raw.statut || raw.status || 'EN_ATTENTE'),
    totalEstime: typeof total === 'number' ? total : parseFloat(total) || 0,
    observations: raw.observations ?? raw.observation ?? raw.note ?? undefined,
    lignes,
  };
}

export class CommandeService {
  async getCommandes(limit = 20, offset = 0): Promise<CommandeOut[]> {
    const rawList = await apiClient.request<any[]>(
      `/commandes?limit=${limit}&offset=${offset}`,
      { method: 'GET' },
      () => {
        const list = apiClient.getLocalCommandes();
        return list.slice(offset, offset + limit);
      }
    );

    if (!Array.isArray(rawList)) {
      return apiClient.getLocalCommandes();
    }

    return rawList.map(normalizeCommande);
  }

  async creerCommande(commande: CommandeIn): Promise<CommandeOut> {
    const raw = await apiClient.request<any>(
      '/commandes',
      {
        method: 'POST',
        body: JSON.stringify({
          observations: commande.observations || null,
          lignes: commande.lignes.map((l) => ({
            produit_id: l.produitId,
            quantite: l.quantite,
          })),
        }),
      },
      () => {
        return apiClient.addLocalCommande(commande);
      }
    );

    return normalizeCommande(raw);
  }
}

export const commandeService = new CommandeService();

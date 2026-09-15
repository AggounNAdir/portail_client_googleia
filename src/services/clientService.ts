// Service Client & Finances

import { ClientProfile, Facture, Versement, BonVente, LigneBonVente } from '../types';
import { apiClient } from './apiClient';

export function normalizeProfile(raw: any): ClientProfile {
  const solde = raw.solde ?? raw.solde_actuel ?? raw.credit ?? raw.balance ?? 0;
  return {
    id: Number(raw.id || 1),
    code: String(raw.code || raw.code_client || 'CLI-001'),
    nom: String(raw.nom || raw.raison_sociale || raw.name || 'Client'),
    email: raw.email || '',
    tel: raw.tel || raw.telephone || '',
    adresse: raw.adresse || '',
    solde: typeof solde === 'number' ? solde : parseFloat(solde) || 0,
    niveauPrix: raw.niveauPrix || raw.niveau_prix || null,
  };
}

export function normalizeFacture(raw: any): Facture {
  const ht = raw.totalHT ?? raw.total_ht ?? raw.montant_ht ?? raw.ht ?? 0;
  const tva = raw.totalTVA ?? raw.total_tva ?? raw.montant_tva ?? raw.tva ?? 0;
  const ttc = raw.totalTTC ?? raw.total_ttc ?? raw.montant_ttc ?? raw.total ?? (ht + tva);

  return {
    id: Number(raw.id || Math.floor(Math.random() * 100000)),
    numero: String(raw.numero || raw.num || `FAC-${raw.id || 'TEMP'}`),
    dateFacture: String(raw.dateFacture || raw.date_facture || raw.date || ''),
    totalHT: typeof ht === 'number' ? ht : parseFloat(ht) || 0,
    totalTVA: typeof tva === 'number' ? tva : parseFloat(tva) || 0,
    totalTTC: typeof ttc === 'number' ? ttc : parseFloat(ttc) || 0,
    statut: raw.statut || raw.status || null,
  };
}

export function normalizeVersement(raw: any): Versement {
  const montant = raw.montant ?? raw.montant_versement ?? raw.valeur ?? 0;

  return {
    id: Number(raw.id || Math.floor(Math.random() * 100000)),
    numero: String(raw.numero || raw.num || `VER-${raw.id || 'TEMP'}`),
    dateVers: String(raw.dateVers || raw.date_versement || raw.date || ''),
    montant: typeof montant === 'number' ? montant : parseFloat(montant) || 0,
    mode: String(raw.mode || raw.mode_reglement || 'ESPECES'),
    reference: raw.reference || raw.ref || null,
  };
}

export function normalizeBonVente(raw: any): BonVente {
  const total = raw.total ?? raw.montant_total ?? raw.total_ttc ?? 0;
  const rawLignes = raw.lignes ?? raw.items ?? raw.lignes_bon ?? [];

  const lignes: LigneBonVente[] = Array.isArray(rawLignes)
    ? rawLignes.map((l: any) => {
        const pu = l.prixUnitaire ?? l.prix_unitaire ?? l.pu ?? l.prix ?? 0;
        const qte = l.quantite ?? l.qte ?? 1;
        const montant = l.montant ?? l.total ?? (pu * qte);
        return {
          id: Number(l.id || Math.floor(Math.random() * 100000)),
          designation: String(l.designation || l.nom || l.libelle || 'Article'),
          quantite: Number(qte),
          prixUnitaire: typeof pu === 'number' ? pu : parseFloat(pu) || 0,
          montant: typeof montant === 'number' ? montant : parseFloat(montant) || 0,
        };
      })
    : [];

  return {
    id: Number(raw.id || Math.floor(Math.random() * 100000)),
    numero: String(raw.numero || raw.num || `BV-${raw.id || 'TEMP'}`),
    dateBon: String(raw.dateBon || raw.date_bon || raw.date || ''),
    total: typeof total === 'number' ? total : parseFloat(total) || 0,
    lignes,
  };
}

export class ClientService {
  async getMyProfile(): Promise<ClientProfile> {
    const raw = await apiClient.request<any>(
      '/clients/me',
      { method: 'GET' },
      () => apiClient.getLocalProfile()
    );
    return normalizeProfile(raw);
  }

  async getFactures(limit = 20, offset = 0): Promise<Facture[]> {
    const rawList = await apiClient.request<any[]>(
      `/clients/me/factures?limit=${limit}&offset=${offset}`,
      { method: 'GET' },
      () => apiClient.getLocalFactures().slice(offset, offset + limit)
    );
    if (!Array.isArray(rawList)) return apiClient.getLocalFactures();
    return rawList.map(normalizeFacture);
  }

  async getVersements(limit = 20, offset = 0): Promise<Versement[]> {
    const rawList = await apiClient.request<any[]>(
      `/clients/me/versements?limit=${limit}&offset=${offset}`,
      { method: 'GET' },
      () => apiClient.getLocalVersements().slice(offset, offset + limit)
    );
    if (!Array.isArray(rawList)) return apiClient.getLocalVersements();
    return rawList.map(normalizeVersement);
  }

  async getVentes(limit = 20, offset = 0): Promise<BonVente[]> {
    const rawList = await apiClient.request<any[]>(
      `/clients/me/ventes?limit=${limit}&offset=${offset}`,
      { method: 'GET' },
      () => apiClient.getLocalVentes().slice(offset, offset + limit)
    );
    if (!Array.isArray(rawList)) return apiClient.getLocalVentes();
    return rawList.map(normalizeBonVente);
  }
}

export const clientService = new ClientService();


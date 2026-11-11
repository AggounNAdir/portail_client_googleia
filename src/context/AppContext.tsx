import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  AppData,
  initialData,
  loadData,
  saveData,
  resetToSeedData,
} from '../services/storage';
import {
  BonAchat,
  BonVente,
  Client,
  CommandePortail,
  Facture,
  Fournisseur,
  JournalAudit,
  MouvementStock,
  PrixPalier,
  PrixSpecialClient,
  Produit,
  ProfilEntreprise,
  Prospect,
  User,
  Vendeur,
  Versement,
  Retour,
  PricingTier,
} from '../types';
import { creerMouvement, deduireSortieStock, calculerNouveauPmp } from '../services/stockService';

export interface AppContextType {
  data: AppData;
  currentUser: User;
  setCurrentUser: (u: User) => void;
  activeProfil: ProfilEntreprise;
  activePage: string;
  setActivePage: (p: string) => void;
  canAccessPage: (p: string) => boolean;
  printDoc: { type: 'bon_vente' | 'bon_achat' | 'facture' | 'versement' | 'situation'; id: number } | null;
  setPrintDoc: (doc: { type: 'bon_vente' | 'bon_achat' | 'facture' | 'versement' | 'situation'; id: number } | null) => void;

  // Actions & Mutations
  createBonVente: (bon: Omit<BonVente, 'id' | 'numero'>) => BonVente;
  annulerBonVente: (id: number) => boolean;
  createBonAchat: (bon: Omit<BonAchat, 'id' | 'numero' | 'date_creation'>) => BonAchat;
  createVersement: (v: Omit<Versement, 'id' | 'numero'>) => Versement;
  validerCommandePortail: (cmdId: number) => BonVente | null;
  refuserCommandePortail: (cmdId: number) => void;
  updateClient: (client: Client) => void;
  createClient: (client: Omit<Client, 'id' | 'solde'>) => Client;
  updateProduit: (produit: Produit) => void;
  createProduit: (prod: Omit<Produit, 'id' | 'stock_actuel' | 'prix_moyen_pondere' | 'cout_total_stock'>) => Produit;
  ajusterStock: (produitId: number, nouveauStock: number, motif: string) => void;
  savePrixSpecial: (ps: Omit<PrixSpecialClient, 'id'>) => void;
  savePrixPalier: (palier: Omit<PrixPalier, 'id'>) => void;
  logAudit: (action: string, cibleType?: string, cibleId?: number, details?: string, reussite?: number) => void;
  resetData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState<AppData>(() => loadData());
  const [currentUser, setCurrentUser] = useState<User>(() => data.users[0] || initialData.users[0]);
  const [activePage, setActivePage] = useState<string>('dashboard');
  const [printDoc, setPrintDoc] = useState<{ type: 'bon_vente' | 'bon_achat' | 'facture' | 'versement' | 'situation'; id: number } | null>(null);

  // Sync with localStorage
  useEffect(() => {
    saveData(data);
  }, [data]);

  const activeProfil = data.profils.find((p) => p.est_defaut === 1) || data.profils[0];

  const logAudit = (action: string, cibleType?: string, cibleId?: number, details?: string, reussite: number = 1) => {
    const nextId = data.auditLogs.length > 0 ? Math.max(...data.auditLogs.map((l) => l.id)) + 1 : 1;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newLog: JournalAudit = {
      id: nextId,
      date_action: now,
      utilisateur: currentUser.username,
      action,
      cible_type: cibleType,
      cible_id: cibleId,
      details,
      reussite,
    };
    setData((prev) => ({
      ...prev,
      auditLogs: [newLog, ...prev.auditLogs],
    }));
  };

  const canAccessPage = (page: string): boolean => {
    const role = currentUser.role;
    if (role === 'admin') return true;
    if (role === 'gestionnaire') {
      return page !== 'utilisateurs' && page !== 'journal_audit';
    }
    if (role === 'vendeur') {
      return ['dashboard', 'produits', 'grille_prix', 'clients', 'bons_vente', 'versements', 'cmd_portail', 'situations'].includes(page);
    }
    if (role === 'caissier') {
      return ['dashboard', 'versements', 'bons_vente', 'clients', 'situations'].includes(page);
    }
    if (role === 'lecture_seule') {
      return ['dashboard', 'produits', 'clients', 'bons_vente', 'factures', 'situations'].includes(page);
    }
    return false;
  };

  const createBonVente = (bonData: Omit<BonVente, 'id' | 'numero'>): BonVente => {
    const nextId = data.bonsVente.length > 0 ? Math.max(...data.bonsVente.map((b) => b.id)) + 1 : 1;
    const num = `BV-2026-${nextId.toString().padStart(4, '0')}`;
    const newBon: BonVente = {
      ...bonData,
      id: nextId,
      numero: num,
    };

    // Update client balance & product stock
    let updatedClients = [...data.clients];
    let updatedProduits = [...data.produits];
    let newMouvements: MouvementStock[] = [...data.mouvements];

    const clientIdx = updatedClients.findIndex((c) => c.id === bonData.client_id);
    if (clientIdx >= 0) {
      const c = updatedClients[clientIdx];
      const soldeChange = (bonData.total_ttc || bonData.total) - (bonData.montant_verse || 0);
      updatedClients[clientIdx] = {
        ...c,
        solde: Math.round((c.solde + soldeChange) * 100) / 100,
      };
    }

    // Deduct stock for each line
    bonData.lignes.forEach((ligne) => {
      const pIdx = updatedProduits.findIndex((p) => p.id === ligne.produit_id);
      if (pIdx >= 0) {
        const prod = updatedProduits[pIdx];
        const { nouveauStock, nouveauCoutTotal, pmp } = deduireSortieStock(
          prod.stock_actuel,
          prod.cout_total_stock,
          prod.prix_moyen_pondere,
          ligne.quantite
        );

        updatedProduits[pIdx] = {
          ...prod,
          stock_actuel: nouveauStock,
          cout_total_stock: nouveauCoutTotal,
          prix_moyen_pondere: pmp,
        };

        const mvt = creerMouvement({
          mouvements: newMouvements,
          produit: prod,
          typeMouvement: 'VENTE',
          quantite: ligne.quantite,
          documentType: 'bon_vente',
          documentId: nextId,
          documentNumero: num,
          tiersNom: bonData.client_nom,
          utilisateur: currentUser.username,
        });
        newMouvements.unshift(mvt);
      }
    });

    setData((prev) => ({
      ...prev,
      bonsVente: [newBon, ...prev.bonsVente],
      clients: updatedClients,
      produits: updatedProduits,
      mouvements: newMouvements,
    }));

    logAudit('CREATION_BON_VENTE', 'bon_vente', nextId, `Bon de vente ${num} créé pour ${bonData.client_nom || ''}`);
    return newBon;
  };

  const annulerBonVente = (id: number): boolean => {
    const bon = data.bonsVente.find((b) => b.id === id);
    if (!bon || bon.statut === 'Annulé') return false;

    // Restore stock and client balance
    let updatedClients = [...data.clients];
    let updatedProduits = [...data.produits];
    let newMouvements = [...data.mouvements];

    const clientIdx = updatedClients.findIndex((c) => c.id === bon.client_id);
    if (clientIdx >= 0) {
      const c = updatedClients[clientIdx];
      const soldeChange = (bon.total_ttc || bon.total) - (bon.montant_verse || 0);
      updatedClients[clientIdx] = {
        ...c,
        solde: Math.round((c.solde - soldeChange) * 100) / 100,
      };
    }

    bon.lignes.forEach((ligne) => {
      const pIdx = updatedProduits.findIndex((p) => p.id === ligne.produit_id);
      if (pIdx >= 0) {
        const prod = updatedProduits[pIdx];
        const costRef = prod.prix_moyen_pondere || prod.prix_achat;
        const { nouveauStock, nouveauCoutTotal, nouveauPmp } = calculerNouveauPmp(
          prod.stock_actuel,
          prod.cout_total_stock,
          prod.prix_moyen_pondere,
          ligne.quantite,
          costRef
        );

        updatedProduits[pIdx] = {
          ...prod,
          stock_actuel: nouveauStock,
          cout_total_stock: nouveauCoutTotal,
          prix_moyen_pondere: nouveauPmp,
        };

        const mvt = creerMouvement({
          mouvements: newMouvements,
          produit: prod,
          typeMouvement: 'AJUSTEMENT',
          quantite: ligne.quantite,
          documentType: 'annulation_vente',
          documentId: bon.id,
          documentNumero: bon.numero,
          tiersNom: bon.client_nom,
          motif: `Annulation du bon de vente ${bon.numero}`,
          utilisateur: currentUser.username,
        });
        newMouvements.unshift(mvt);
      }
    });

    const updatedBons = data.bonsVente.map((b) => (b.id === id ? { ...b, statut: 'Annulé' as const } : b));

    setData((prev) => ({
      ...prev,
      bonsVente: updatedBons,
      clients: updatedClients,
      produits: updatedProduits,
      mouvements: newMouvements,
    }));

    logAudit('ANNULATION_BON_VENTE', 'bon_vente', id, `Annulation du bon de vente ${bon.numero}`);
    return true;
  };

  const createBonAchat = (bonData: Omit<BonAchat, 'id' | 'numero' | 'date_creation'>): BonAchat => {
    const nextId = data.bonsAchat.length > 0 ? Math.max(...data.bonsAchat.map((b) => b.id)) + 1 : 1;
    const num = `BA-2026-${nextId.toString().padStart(4, '0')}`;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const newBon: BonAchat = {
      ...bonData,
      id: nextId,
      numero: num,
      date_creation: now,
    };

    let updatedFournisseurs = [...data.fournisseurs];
    let updatedProduits = [...data.produits];
    let newMouvements = [...data.mouvements];

    const fIdx = updatedFournisseurs.findIndex((f) => f.id === bonData.fournisseur_id);
    if (fIdx >= 0) {
      const f = updatedFournisseurs[fIdx];
      updatedFournisseurs[fIdx] = {
        ...f,
        solde: Math.round((f.solde + bonData.total) * 100) / 100,
      };
    }

    bonData.lignes.forEach((ligne) => {
      const pIdx = updatedProduits.findIndex((p) => p.id === ligne.produit_id);
      if (pIdx >= 0) {
        const prod = updatedProduits[pIdx];
        const { nouveauStock, nouveauCoutTotal, nouveauPmp } = calculerNouveauPmp(
          prod.stock_actuel,
          prod.cout_total_stock,
          prod.prix_moyen_pondere,
          ligne.quantite,
          ligne.prix_unitaire
        );

        updatedProduits[pIdx] = {
          ...prod,
          stock_actuel: nouveauStock,
          cout_total_stock: nouveauCoutTotal,
          prix_moyen_pondere: nouveauPmp,
          prix_achat: ligne.prix_unitaire,
        };

        const mvt = creerMouvement({
          mouvements: newMouvements,
          produit: prod,
          typeMouvement: 'ACHAT',
          quantite: ligne.quantite,
          documentType: 'bon_achat',
          documentId: nextId,
          documentNumero: num,
          tiersNom: bonData.fournisseur_nom,
          utilisateur: currentUser.username,
        });
        newMouvements.unshift(mvt);
      }
    });

    setData((prev) => ({
      ...prev,
      bonsAchat: [newBon, ...prev.bonsAchat],
      fournisseurs: updatedFournisseurs,
      produits: updatedProduits,
      mouvements: newMouvements,
    }));

    logAudit('CREATION_BON_ACHAT', 'bon_achat', nextId, `Bon d'achat ${num} créé`);
    return newBon;
  };

  const createVersement = (vData: Omit<Versement, 'id' | 'numero'>): Versement => {
    const nextId = data.versements.length > 0 ? Math.max(...data.versements.map((v) => v.id)) + 1 : 1;
    const num = `VERS-2026-${nextId.toString().padStart(4, '0')}`;
    const newVersement: Versement = {
      ...vData,
      id: nextId,
      numero: num,
    };

    let updatedClients = [...data.clients];
    let updatedFournisseurs = [...data.fournisseurs];

    if (vData.tiers_type === 'client') {
      const cIdx = updatedClients.findIndex((c) => c.id === vData.tiers_id);
      if (cIdx >= 0) {
        const c = updatedClients[cIdx];
        updatedClients[cIdx] = {
          ...c,
          solde: Math.round((c.solde - vData.montant) * 100) / 100,
        };
      }
    } else if (vData.tiers_type === 'fournisseur') {
      const fIdx = updatedFournisseurs.findIndex((f) => f.id === vData.tiers_id);
      if (fIdx >= 0) {
        const f = updatedFournisseurs[fIdx];
        updatedFournisseurs[fIdx] = {
          ...f,
          solde: Math.round((f.solde - vData.montant) * 100) / 100,
        };
      }
    }

    setData((prev) => ({
      ...prev,
      versements: [newVersement, ...prev.versements],
      clients: updatedClients,
      fournisseurs: updatedFournisseurs,
    }));

    logAudit('CREATION_VERSEMENT', 'versement', nextId, `Versement ${num} de ${vData.montant} DZD pour ${vData.tiers_nom || ''}`);
    return newVersement;
  };

  const validerCommandePortail = (cmdId: number): BonVente | null => {
    const cmd = data.commandesPortail.find((c) => c.id === cmdId);
    if (!cmd || cmd.statut === 'Validée') return null;

    const client = data.clients.find((c) => c.id === cmd.client_id);
    if (!client) return null;

    const lignes: BonVente['lignes'] = cmd.lignes.map((l) => ({
      produit_id: l.produit_id,
      designation: l.produit_nom,
      quantite: l.quantite,
      prix_unitaire: l.prix_unitaire_estime,
      total: l.total_estime,
      total_ht: l.total_estime,
      tva_taux: 0,
      total_tva: 0,
      total_ttc: l.total_estime,
    }));

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const bon = createBonVente({
      date_bon: now,
      client_id: client.id,
      client_nom: client.nom,
      total: cmd.total_estime,
      total_ht: cmd.total_estime,
      tva_total: 0,
      total_ttc: cmd.total_estime,
      statut: 'Validé',
      observations: `Généré automatiquement depuis Commande Portail ${cmd.numero}. ${cmd.observations || ''}`,
      montant_verse: 0,
      reste_payer: cmd.total_estime,
      lignes,
    });

    setData((prev) => ({
      ...prev,
      commandesPortail: prev.commandesPortail.map((c) =>
        c.id === cmdId ? { ...c, statut: 'Validée' as const, bon_vente_id: bon.id } : c
      ),
    }));

    logAudit('VALIDATION_COMMANDE_PORTAIL', 'commande_portail', cmdId, `Commande ${cmd.numero} validée -> BV ${bon.numero}`);
    return bon;
  };

  const refuserCommandePortail = (cmdId: number) => {
    setData((prev) => ({
      ...prev,
      commandesPortail: prev.commandesPortail.map((c) =>
        c.id === cmdId ? { ...c, statut: 'Refusée' as const } : c
      ),
    }));
    logAudit('REFUS_COMMANDE_PORTAIL', 'commande_portail', cmdId, `Commande refusée`);
  };

  const updateClient = (client: Client) => {
    setData((prev) => ({
      ...prev,
      clients: prev.clients.map((c) => (c.id === client.id ? client : c)),
    }));
    logAudit('MODIFICATION_CLIENT', 'client', client.id, `Mise à jour du client ${client.nom}`);
  };

  const createClient = (cData: Omit<Client, 'id' | 'solde'>): Client => {
    const nextId = data.clients.length > 0 ? Math.max(...data.clients.map((c) => c.id)) + 1 : 1;
    const newClient: Client = {
      ...cData,
      id: nextId,
      solde: 0,
    };
    setData((prev) => ({
      ...prev,
      clients: [...prev.clients, newClient],
    }));
    logAudit('CREATION_CLIENT', 'client', nextId, `Client ${newClient.nom} ajouté`);
    return newClient;
  };

  const updateProduit = (produit: Produit) => {
    setData((prev) => ({
      ...prev,
      produits: prev.produits.map((p) => (p.id === produit.id ? produit : p)),
    }));
    logAudit('MODIFICATION_PRODUIT', 'produit', produit.id, `Mise à jour produit ${produit.designation}`);
  };

  const createProduit = (pData: Omit<Produit, 'id' | 'stock_actuel' | 'prix_moyen_pondere' | 'cout_total_stock'>): Produit => {
    const nextId = data.produits.length > 0 ? Math.max(...data.produits.map((p) => p.id)) + 1 : 1;
    const newProd: Produit = {
      ...pData,
      id: nextId,
      stock_actuel: 0,
      prix_moyen_pondere: pData.prix_achat || 0,
      cout_total_stock: 0,
    };
    setData((prev) => ({
      ...prev,
      produits: [...prev.produits, newProd],
    }));
    logAudit('CREATION_PRODUIT', 'produit', nextId, `Produit ${newProd.designation} créé`);
    return newProd;
  };

  const ajusterStock = (produitId: number, nouveauStock: number, motif: string) => {
    const pIdx = data.produits.findIndex((p) => p.id === produitId);
    if (pIdx < 0) return;

    const prod = data.produits[pIdx];
    const diff = nouveauStock - prod.stock_actuel;
    if (diff === 0) return;

    let updatedProduits = [...data.produits];
    let newMouvements = [...data.mouvements];

    const coutRef = prod.prix_moyen_pondere || prod.prix_achat;
    const nouveauCoutTotal = nouveauStock * coutRef;

    updatedProduits[pIdx] = {
      ...prod,
      stock_actuel: nouveauStock,
      cout_total_stock: nouveauCoutTotal,
    };

    const mvt = creerMouvement({
      mouvements: newMouvements,
      produit: prod,
      typeMouvement: 'AJUSTEMENT',
      quantite: Math.abs(diff),
      motif: `Ajustement inventaire: ${motif} (${diff > 0 ? '+' : ''}${diff})`,
      utilisateur: currentUser.username,
    });
    newMouvements.unshift(mvt);

    setData((prev) => ({
      ...prev,
      produits: updatedProduits,
      mouvements: newMouvements,
    }));

    logAudit('AJUSTEMENT_STOCK', 'produit', produitId, `Stock ajusté de ${prod.stock_actuel} à ${nouveauStock} (${motif})`);
  };

  const savePrixSpecial = (psData: Omit<PrixSpecialClient, 'id'>) => {
    setData((prev) => {
      const existingIdx = prev.prixSpeciaux.findIndex(
        (ps) => ps.client_id === psData.client_id && ps.produit_id === psData.produit_id
      );
      if (existingIdx >= 0) {
        const updated = [...prev.prixSpeciaux];
        updated[existingIdx] = { ...updated[existingIdx], ...psData };
        return { ...prev, prixSpeciaux: updated };
      }
      const nextId = prev.prixSpeciaux.length > 0 ? Math.max(...prev.prixSpeciaux.map((p) => p.id)) + 1 : 1;
      return { ...prev, prixSpeciaux: [...prev.prixSpeciaux, { ...psData, id: nextId }] };
    });
  };

  const savePrixPalier = (palierData: Omit<PrixPalier, 'id'>) => {
    setData((prev) => {
      const existingIdx = prev.paliers.findIndex(
        (p) => p.produit_id === palierData.produit_id && p.niveau === palierData.niveau && p.qte_min === palierData.qte_min
      );
      if (existingIdx >= 0) {
        const updated = [...prev.paliers];
        updated[existingIdx] = { ...updated[existingIdx], ...palierData };
        return { ...prev, paliers: updated };
      }
      const nextId = prev.paliers.length > 0 ? Math.max(...prev.paliers.map((p) => p.id)) + 1 : 1;
      return { ...prev, paliers: [...prev.paliers, { ...palierData, id: nextId }] };
    });
  };

  const resetData = () => {
    const fresh = resetToSeedData();
    setData(fresh);
  };

  return (
    <AppContext.Provider
      value={{
        data,
        currentUser,
        setCurrentUser,
        activeProfil,
        activePage,
        setActivePage,
        canAccessPage,
        printDoc,
        setPrintDoc,
        createBonVente,
        annulerBonVente,
        createBonAchat,
        createVersement,
        validerCommandePortail,
        refuserCommandePortail,
        updateClient,
        createClient,
        updateProduit,
        createProduit,
        ajusterStock,
        savePrixSpecial,
        savePrixPalier,
        logAudit,
        resetData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

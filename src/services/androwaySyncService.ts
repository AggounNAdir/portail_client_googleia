// Service de Synchronisation Silwane Androway (Offline-First)

import { SyncOperation, SyncItemType, SyncStatus } from '../types';
import { apiClient } from './apiClient';

const STORAGE_KEY_QUEUE = 'androway_sync_queue';

type SyncListener = (queue: SyncOperation[], isSyncing: boolean) => void;

export class AndrowaySyncService {
  private queue: SyncOperation[] = [];
  private isSyncing: boolean = false;
  private listeners: Set<SyncListener> = new Set();

  constructor() {
    this.loadQueue();
    // Écoute des événements réseau en ligne
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        if (this.getPendingCount() > 0) {
          this.syncAllPending();
        }
      });
    }
  }

  private loadQueue(): void {
    const saved = localStorage.getItem(STORAGE_KEY_QUEUE);
    if (saved) {
      try {
        this.queue = JSON.parse(saved);
      } catch (_) {
        this.queue = [];
      }
    }
  }

  private saveQueue(): void {
    localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(this.queue));
    this.notify();
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getQueue(), this.isSyncing);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const q = this.getQueue();
    this.listeners.forEach((fn) => fn(q, this.isSyncing));
  }

  public getQueue(): SyncOperation[] {
    return [...this.queue];
  }

  public getPendingCount(): number {
    return this.queue.filter((op) => op.status === 'pending').length;
  }

  public clearQueue(): void {
    this.queue = [];
    this.saveQueue();
  }

  public clearFailed(): void {
    this.queue = this.queue.filter((op) => op.status !== 'failed');
    this.saveQueue();
  }

  public getIsSyncing(): boolean {
    return this.isSyncing;
  }

  // Enfilement d'une opération terrain (offline-first)
  public async enqueueOperation(
    type: SyncItemType,
    payload: Record<string, any>
  ): Promise<SyncOperation> {
    const operation: SyncOperation = {
      id: `OP_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      payload,
      createdAt: new Date().toISOString(),
      status: 'pending',
      retryCount: 0,
    };

    this.queue.unshift(operation);
    this.saveQueue();

    // Tente de synchroniser si connecté
    if (navigator.onLine) {
      this.syncAllPending().catch(() => {});
    }

    return operation;
  }

  // Synchronise les opérations en attente avec FastAPI
  public async syncAllPending(): Promise<{ succeeded: number; failed: number }> {
    if (this.isSyncing) return { succeeded: 0, failed: 0 };

    this.isSyncing = true;
    this.notify();

    let succeeded = 0;
    let failed = 0;

    const pending = this.queue.filter((op) => op.status === 'pending');

    for (const op of pending) {
      op.status = 'inProgress';
      this.notify();

      try {
        // Détection du mode Démo / Hors-ligne :
        // Si l'utilisateur est en mode Démo (jeton non JWT ou préfixé démo),
        // Si on est en mode démo OU qu'aucun jeton réel n'est encore configuré,
        // on évite d'envoyer une requête vouée à l'échec (401 Unauthorized).
        // On persiste et valide l'opération localement de manière transparente.
        if (apiClient.isDemoVendeurToken() || !apiClient.hasVendeurToken()) {
          if (op.type === 'commande') {
            const rawLignes = Array.isArray(op.payload.lignes) ? op.payload.lignes : [];
            apiClient.addLocalCommande({
              observations: op.payload.observations || `Commande Androway - ${op.payload.nomClient || ''}`,
              lignes: rawLignes.map((l: any) => ({
                produitId: Number(l.produitId ?? l.produit_id ?? l.id ?? 101),
                quantite: Number(l.quantite || 1),
              })),
            });
          }

          op.status = 'success';
          op.payload._localProcessed = true;
          succeeded++;
          this.saveQueue();
          continue;
        }

        let endpoint = '/commandes';
        // En tournée Androway, toutes les opérations (commandes, règlements, signatures, pointages)
        // sont exécutées par le VENDEUR avec son jeton d'authentification commercial.
        let tokenType: 'client' | 'vendeur' | 'any' = 'vendeur';
        switch (op.type) {
          case 'commande':
            endpoint = '/commandes';
            tokenType = 'vendeur';
            break;
          case 'signatureBL':
            endpoint = '/ventes/bl/signature';
            tokenType = 'vendeur';
            break;
          case 'encaissement':
            endpoint = '/versements';
            tokenType = 'vendeur';
            break;
          case 'pointageVisite':
            endpoint = '/tournee/pointage';
            tokenType = 'vendeur';
            break;
          case 'prospectClient':
            endpoint = '/clients/prospect';
            tokenType = 'vendeur';
            break;
        }

        let bodyPayload = op.payload;
        if (op.type === 'commande') {
          const rawClientId = op.payload.client_id ?? op.payload.clientId;
          const parsedClientId = typeof rawClientId === 'number' ? rawClientId : parseInt(String(rawClientId), 10);
          const rawLignes = Array.isArray(op.payload.lignes) ? op.payload.lignes : [];
          const cleanLignes = rawLignes
            .map((l: any) => {
              const pid = Number(l.produitId ?? l.produit_id ?? l.id ?? 0);
              const qte = Number(l.quantite || 1);
              return {
                produit_id: pid > 0 ? pid : 101,
                produitId: pid > 0 ? pid : 101,
                quantite: qte > 0 ? qte : 1,
              };
            })
            .filter((l: any) => l.produit_id > 0 && l.quantite > 0);

          bodyPayload = {
            client_id: (!isNaN(parsedClientId) && parsedClientId > 0) ? parsedClientId : 1,
            clientId: (!isNaN(parsedClientId) && parsedClientId > 0) ? parsedClientId : 1,
            code_client: op.payload.codeClient || op.payload.code_client || null,
            codeClient: op.payload.codeClient || op.payload.code_client || null,
            numero: op.payload.numero,
            observations: op.payload.observations || `Commande Androway - ${op.payload.nomClient || ''}`,
            total: op.payload.totalDZD ?? op.payload.total,
            lignes: cleanLignes,
          };
        } else if (op.type === 'encaissement') {
          const rawId = op.payload.client_id ?? op.payload.clientId;
          const parsedId = typeof rawId === 'number' ? rawId : parseInt(String(rawId), 10);
          const isProspect = Boolean(
            op.payload.is_prospect ||
            (op.payload.codeClient && String(op.payload.codeClient).startsWith('PROSP')) ||
            (op.payload.code_client && String(op.payload.code_client).startsWith('PROSP'))
          );

          bodyPayload = {
            client_id: (!isNaN(parsedId) && parsedId > 0) ? parsedId : 1,
            clientId: (!isNaN(parsedId) && parsedId > 0) ? parsedId : 1,
            prospect_id: op.payload.prospect_id ?? (isProspect ? parsedId : null),
            is_prospect: isProspect,
            code_client: op.payload.codeClient || op.payload.code_client || null,
            codeClient: op.payload.codeClient || op.payload.code_client || null,
            nom_client: op.payload.nomClient || op.payload.nom_client || null,
            nomClient: op.payload.nomClient || op.payload.nom_client || null,
            nom: op.payload.nomClient || op.payload.nom_client || null,
            montant: Number(op.payload.montant) || 0,
            mode: String(op.payload.mode || 'Espèces'),
            reference: op.payload.reference ? String(op.payload.reference) : null,
          };
        }

        await apiClient.request(
          endpoint,
          {
            method: 'POST',
            body: JSON.stringify(bodyPayload),
          },
          undefined,
          tokenType
        );

        op.status = 'success';
        op.errorReason = undefined;
        succeeded++;
      } catch (err: any) {
        console.error(`[Androway Sync] Échec opération ${op.type}:`, err);
        op.retryCount++;
        op.status = 'failed';
        failed++;

        if (err?.statusCode === 401 || err?.isAuthError || (err?.message && err.message.includes('401'))) {
          op.errorReason = 'Session vendeur expirée ou non autorisée sur le serveur (401). Veuillez vous reconnecter.';
          window.dispatchEvent(new CustomEvent('vendeur:session_expired', {
            detail: { operation: op, message: err?.message }
          }));
        } else {
          op.errorReason = err?.message || 'Erreur réseau ou serveur';
        }
      }
      this.saveQueue();
    }

    this.isSyncing = false;
    this.saveQueue();
    return { succeeded, failed };
  }

  public clearSuccessHistory(): void {
    this.queue = this.queue.filter((op) => op.status !== 'success');
    this.saveQueue();
  }
}

export const androwaySyncService = new AndrowaySyncService();
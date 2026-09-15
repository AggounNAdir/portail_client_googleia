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
        let endpoint = '/commandes';
        // ✅ 'commande' est créée au nom du CLIENT (POST /commandes exige un
        // jeton client) ; toutes les autres opérations de tournée terrain
        // sont créées au nom du VENDEUR connecté (jeton vendeur distinct).
        let tokenType: 'client' | 'vendeur' = 'client';
        switch (op.type) {
          case 'commande':
            endpoint = '/commandes';
            tokenType = 'client';
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

        await apiClient.request(
          endpoint,
          {
            method: 'POST',
            body: JSON.stringify(op.payload),
          },
          () => {
            // En mode local, on valide l'opération avec succès
            return { status: 'synced_offline', id: op.id };
          },
          tokenType
        );

        op.status = 'success';
        succeeded++;
      } catch (err) {
        op.retryCount++;
        op.status = 'failed';
        failed++;
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
import React, { useState, useEffect } from 'react';
import {
  MapPin,
  CheckCircle2,
  Navigation,
  DollarSign,
  ShoppingCart,
  Plus,
  RefreshCw,
  UserPlus,
  X,
  CreditCard,
  AlertCircle,
  Clock,
  Sparkles,
  Search,
  LogOut,
  Lock,
  Package,
} from 'lucide-react';
import { ClientTourneeItem, ProduitCatalogue } from '../types';
import { androwaySyncService } from '../services/androwaySyncService';
import { gpsTourneeService } from '../services/gpsTourneeService';
import { vendeurAuthService } from '../services/vendeurAuthService';
import { apiClient } from '../services/apiClient';
import { produitService } from '../services/produitService';

const INITIAL_TOURNEE: ClientTourneeItem[] = [];

// Helper de formatage monétaire avec 2 décimales (ex: "1 250,00" ou "0,00")
const formatDZD = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(String(val || 0));
  if (isNaN(num)) return '0,00';
  return num.toLocaleString('fr-DZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const AndrowayTourneePage: React.FC = () => {
  const [clients, setClients] = useState<ClientTourneeItem[]>(() => {
    const saved = localStorage.getItem('androway_tournee_clients');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Purge anciennes données démo de tournée
        if (Array.isArray(parsed) && parsed.some((c: any) => c.code === 'CLT-0012')) {
          localStorage.removeItem('androway_tournee_clients');
          return [];
        }
        return parsed;
      } catch (_) {}
    }
    return INITIAL_TOURNEE;
  });

  const [pendingCount, setPendingCount] = useState(androwaySyncService.getPendingCount());
  const [isSyncing, setIsSyncing] = useState(androwaySyncService.getIsSyncing());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'tous' | 'clients' | 'prospects'>('tous');

  // Modales
  const [sellingClient, setSellingClient] = useState<ClientTourneeItem | null>(null);
  const [paymentClient, setPaymentClient] = useState<ClientTourneeItem | null>(null);
  const [showProspectModal, setShowProspectModal] = useState(false);

  // Vente rapide state
  interface OrderArticleItem {
    id: number;
    code?: string;
    designation: string;
    prix: number;
    unite: string;
    facteurConversion: number;
    uniteFacteur: number;
    stock?: number;
    quantite: number;
  }
  const [orderArticles, setOrderArticles] = useState<OrderArticleItem[]>([]);
  const [isLoadingProduits, setIsLoadingProduits] = useState(false);
  const [articleSearchQuery, setArticleSearchQuery] = useState('');

  // Encaissement state
  const [montantEncaissement, setMontantEncaissement] = useState<string>('');
  const [modeReglement, setModeReglement] = useState<string>('Espèces');
  const [refReglement, setRefReglement] = useState<string>('');

  // Nouveau Prospect state
  const [prospectNom, setProspectNom] = useState('');
  const [prospectTel, setProspectTel] = useState('');
  const [prospectAdresse, setProspectAdresse] = useState('');
  const [prospectWilaya, setProspectWilaya] = useState('16 - Alger');

  // Notification
  const [notification, setNotification] = useState<string | null>(null);

  // ✅ Authentification vendeur (Silwane Androway) — distincte du login
  // client : tant que le commercial ne s'est pas connecté avec son propre
  // code vendeur, aucune opération de tournée (pointage, prospect,
  // encaissement, signature BL) n'est possible côté API.
  const [vendeurAuthed, setVendeurAuthed] = useState<boolean>(() => vendeurAuthService.isAuthenticated());
  const [vendeurCode, setVendeurCode] = useState('');
  const [vendeurPassword, setVendeurPassword] = useState('');
  const [vendeurLoginError, setVendeurLoginError] = useState<string | null>(null);
  const [vendeurLoginLoading, setVendeurLoginLoading] = useState(false);
  const vendeurProfile = vendeurAuthService.getCachedVendeur();

  useEffect(() => {
    const handleVendeurUnauthorized = () => setVendeurAuthed(false);
    window.addEventListener('vendeur:unauthorized', handleVendeurUnauthorized);
    return () => window.removeEventListener('vendeur:unauthorized', handleVendeurUnauthorized);
  }, []);

  const handleVendeurLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendeurCode.trim() || !vendeurPassword) return;
    setVendeurLoginError(null);
    setVendeurLoginLoading(true);
    try {
      await vendeurAuthService.login(vendeurCode.trim(), vendeurPassword);
      setVendeurAuthed(true);
      setVendeurPassword('');
    } catch (err: any) {
      setVendeurLoginError(err?.message || 'Code vendeur ou mot de passe incorrect.');
    } finally {
      setVendeurLoginLoading(false);
    }
  };

  const handleVendeurLogout = async () => {
    await vendeurAuthService.logout();
    setVendeurAuthed(false);
  };

  useEffect(() => {
    localStorage.setItem('androway_tournee_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    const unsub = androwaySyncService.subscribe((_queue, syncing) => {
      setPendingCount(androwaySyncService.getPendingCount());
      setIsSyncing(syncing);
    });
    return unsub;
  }, []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const chargerDonneesDepuisServeur = async () => {
    try {
      // 1. Charger les clients officiels
      let serverClients: any[] = [];
      try {
        serverClients = await apiClient.getProspects();
      } catch (_) {}

      // 2. Charger les prospects
      let serverProspects: any[] = [];
      try {
        serverProspects = await apiClient.getProspects();
      } catch (_) {}

      setClients((prev) => {
        const clientMap = new Map<string, ClientTourneeItem>();

        // Ajouter les clients existants dans l'état local d'abord
        prev.forEach((c) => clientMap.set(c.nom.toLowerCase().trim(), c));

        // Injecter / Mettre à jour avec les clients officiels de la base SQLite
        if (Array.isArray(serverClients)) {
          serverClients.forEach((sc) => {
            const nomKey = (sc.nom || '').toLowerCase().trim();
            const existing = clientMap.get(nomKey);
            clientMap.set(nomKey, {
              id: sc.id,
              code: sc.code || `CLT-${String(sc.id).padStart(4, '0')}`,
              nom: sc.nom || 'Client',
              adresse: sc.adresse || existing?.adresse || 'Adresse',
              ville: sc.ville || sc.wilaya || existing?.ville || 'Algérie',
              creanceDZD: Number(sc.solde || sc.creanceDZD || 0),
              lat: Number(sc.lat || existing?.lat || 36.75),
              lng: Number(sc.lng || existing?.lng || 3.05),
              isVisited: existing ? existing.isVisited : false,
              visitedAt: existing?.visitedAt,
            });
          });
        }

        // Injecter les prospects non-convertis s'ils ne sont pas déjà en client officiel
        if (Array.isArray(serverProspects)) {
          serverProspects.forEach((sp) => {
            const nomKey = (sp.nom || sp.nom_prospect || '').toLowerCase().trim();
            // Si le prospect n'a pas encore été converti en client officiel
            if (!clientMap.has(nomKey)) {
              const pCode = sp.code || `PROSP-${String(sp.id).padStart(3, '0')}`;
              clientMap.set(nomKey, {
                id: sp.id,
                code: pCode,
                nom: sp.nom || sp.nom_prospect || 'Prospect',
                adresse: sp.adresse || 'Adresse',
                ville: sp.wilaya || sp.ville || 'Algérie',
                creanceDZD: Number(sp.solde || sp.creanceDZD || 0),
                lat: Number(sp.lat || 36.75),
                lng: Number(sp.lng || 3.05),
                isVisited: false,
              });
            }
          });
        }

        return Array.from(clientMap.values());
      });
    } catch (_) {}
  };

  const chargerCatalogueArticles = async (clientId?: number, query?: string) => {
    setIsLoadingProduits(true);
    try {
      const items = await produitService.getCatalogue(query, 100, 0, clientId);
      setOrderArticles((prev) => {
        // Préserver les quantités déjà sélectionnées si applicable
        const prevQuantites = new Map<number, number>();
        prev.forEach((p) => {
          if (p.quantite > 0) prevQuantites.set(p.id, p.quantite);
        });

        return items.map((p) => ({
          id: p.id,
          code: p.code,
          designation: p.designation,
          prix: p.prixUnitaire,
          unite: p.unite || 'Pièce',
          facteurConversion: p.facteurConversion || p.uniteFacteur || 1,
          uniteFacteur: p.facteurConversion || p.uniteFacteur || 1,
          stock: p.stockActuel,
          quantite: prevQuantites.get(p.id) || 0,
        }));
      });
    } catch (err) {
      console.error('Erreur chargement catalogue pour vente tournée:', err);
    } finally {
      setIsLoadingProduits(false);
    }
  };

  // Ouvrir le modal vente pour un client et charger ses produits réels
  const handleOpenVenteModal = (client: ClientTourneeItem) => {
    setSellingClient(client);
    setArticleSearchQuery('');
    // Charger immédiatement le catalogue réel pour ce client depuis le serveur
    const isProspect = client.code.startsWith('PROSP');
    chargerCatalogueArticles(isProspect ? undefined : client.id);
  };

  useEffect(() => {
    if (vendeurAuthed) {
      chargerDonneesDepuisServeur();
      chargerCatalogueArticles();
    }
  }, [vendeurAuthed]);

  const handleSyncClick = async () => {
    await androwaySyncService.syncAllPending();
    await chargerDonneesDepuisServeur();
    await chargerCatalogueArticles();
    showToast('Données, clients et catalogue actualisés avec le serveur');
  };

  const visitedCount = clients.filter((c) => c.isVisited).length;
  const progressPercent = Math.round((visitedCount / clients.length) * 100);

  // Pointer GPS
  const handlePointerGps = async (client: ClientTourneeItem) => {
    const success = await gpsTourneeService.pointerPresenceVisite(client.id);

    // Enqueue dans Androway Sync
    const pos = await gpsTourneeService.getCurrentPosition();
    const isProspect = client.code.startsWith('PROSP');
    await androwaySyncService.enqueueOperation('pointageVisite', {
      clientId: client.id,
      client_id: client.id,
      prospect_id: isProspect ? client.id : null,
      is_prospect: isProspect,
      codeClient: client.code,
      nomClient: client.nom,
      lat: pos?.latitude,
      lng: pos?.longitude,
      heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    });

    setClients((prev) =>
      prev.map((c) =>
        c.id === client.id
          ? {
              ...c,
              isVisited: true,
              visitedAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            }
          : c
      )
    );

    showToast(`Visite enregistrée avec coordonnées GPS pour ${client.nom}`);
  };

  // Valider Vente Terrain
  const handleValiderVente = async () => {
    if (!sellingClient) return;
    const lignesChoisis = orderArticles
      .filter((a) => a.quantite > 0)
      .map((a) => ({
        id: a.id,
        produitId: a.id,
        code: a.code,
        designation: a.designation,
        prix: a.prix,
        prixUnitaire: a.prix,
        unite: a.unite,
        uniteFacteur: a.uniteFacteur,
        quantite: a.quantite,
        montant: a.prix * a.uniteFacteur * a.quantite,
      }));

    if (lignesChoisis.length === 0) {
      alert('Veuillez sélectionner au moins un article');
      return;
    }

    const total = lignesChoisis.reduce((s, a) => s + a.montant, 0);
    const numBC = `BC-${Date.now().toString().substring(7)}`;
    const isProspect = sellingClient.code.startsWith('PROSP');

    await androwaySyncService.enqueueOperation('commande', {
      numero: numBC,
      client_id: isProspect ? null : sellingClient.id,
      prospect_id: isProspect ? sellingClient.id : null,
      is_prospect: isProspect,
      codeClient: sellingClient.code,
      nomClient: sellingClient.nom,
      totalDZD: total,
      lignes: lignesChoisis,
      date: new Date().toISOString(),
    });

    // Marquer visité
    setClients((prev) =>
      prev.map((c) =>
        c.id === sellingClient.id
          ? { ...c, isVisited: true, visitedAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }
          : c
      )
    );

    setSellingClient(null);
    setOrderArticles((prev) => prev.map((a) => ({ ...a, quantite: 0 })));
    showToast(`Bon de commande ${numBC} généré (${formatDZD(total)} DZD) !`);
  };

  // Valider Encaissement
  const handleValiderEncaissement = async () => {
    if (!paymentClient) return;
    const montantNum = parseFloat(montantEncaissement);
    if (isNaN(montantNum) || montantNum <= 0) {
      alert('Veuillez saisir un montant valide');
      return;
    }

    const numRecu = `REG-${Date.now().toString().substring(7)}`;
    const isProspect = paymentClient.code.startsWith('PROSP');

    await androwaySyncService.enqueueOperation('encaissement', {
      recu: numRecu,
      client_id: typeof paymentClient.id === 'number' ? paymentClient.id : parseInt(String(paymentClient.id), 10) || 0,
      clientId: paymentClient.id,
      prospect_id: isProspect ? paymentClient.id : null,
      is_prospect: isProspect,
      codeClient: paymentClient.code,
      nomClient: paymentClient.nom,
      montant: montantNum,
      mode: modeReglement,
      reference: refReglement || null,
      date: new Date().toISOString(),
    });

    // Mettre à jour créance locale
    setClients((prev) =>
      prev.map((c) =>
        c.id === paymentClient.id
          ? {
              ...c,
              creanceDZD: Math.max(0, c.creanceDZD - montantNum),
              isVisited: true,
              visitedAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            }
          : c
      )
    );

    setPaymentClient(null);
    setMontantEncaissement('');
    setRefReglement('');
    showToast(`Règlement de ${formatDZD(montantNum)} DZD enregistré (${numRecu})`);
  };

  // Créer Nouveau Prospect
  const handleCreerProspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prospectNom.trim()) return;

    const newId = Date.now();
    const newCode = `PROSP-${String(clients.length + 1).padStart(3, '0')}`;
    const pos = await gpsTourneeService.getCurrentPosition();

    const newClient: ClientTourneeItem = {
      id: newId,
      code: newCode,
      nom: prospectNom,
      adresse: prospectAdresse || 'Nouvelle adresse',
      ville: prospectWilaya,
      creanceDZD: 0,
      lat: pos?.latitude || 36.75,
      lng: pos?.longitude || 3.05,
      isVisited: true,
      visitedAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };

    await androwaySyncService.enqueueOperation('prospectClient', {
      code: newCode,
      nom: prospectNom,
      tel: prospectTel,
      adresse: prospectAdresse,
      wilaya: prospectWilaya,
      lat: pos?.latitude,
      lng: pos?.longitude,
      vendeur_id: vendeurProfile?.id || null,
    });

    // Déclencher une tentative de synchronisation immédiate en tâche de fond
    void androwaySyncService.syncAllPending();

    setClients((prev) => [newClient, ...prev]);
    setShowProspectModal(false);
    setProspectNom('');
    setProspectTel('');
    setProspectAdresse('');
    showToast(`Prospect ${prospectNom} créé et synchronisé avec succès !`);
  };

  const filteredClients = clients.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      c.nom.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.ville.toLowerCase().includes(q);
    if (!matchesSearch) return false;

    const isProspect = c.code.startsWith('PROSP');
    if (filterType === 'clients') return !isProspect;
    if (filterType === 'prospects') return isProspect;
    return true;
  });

  // ✅ Porte d'entrée : tant que le commercial ne s'est pas connecté avec
  // son propre code vendeur, on affiche un formulaire dédié plutôt que la
  // tournée (dont toutes les actions nécessitent un jeton vendeur valide).
  if (!vendeurAuthed) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center p-4 sm:p-6">
        <div className="w-full rounded-3xl bg-slate-900 p-6 text-white shadow-lg sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/20 px-3 py-1 text-xs font-bold text-teal-400">
            <Navigation className="h-3.5 w-3.5" />
            Silwane Androway • Module Terrain
          </div>
          <h2 className="mt-3 text-xl font-black tracking-tight">Connexion Commercial</h2>
          <p className="mt-1 text-xs text-slate-400">
            Ce module est réservé aux commerciaux en tournée. Connectez-vous avec votre
            code vendeur — distinct de votre compte client.
          </p>

          <form onSubmit={handleVendeurLogin} className="mt-6 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Code vendeur *
              </label>
              <input
                type="text"
                required
                autoFocus
                value={vendeurCode}
                onChange={(e) => setVendeurCode(e.target.value)}
                placeholder="Ex: VND-0001"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-sm text-white placeholder:text-slate-500 focus:border-teal-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Mot de passe *
              </label>
              <input
                type="password"
                required
                value={vendeurPassword}
                onChange={(e) => setVendeurPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-sm text-white placeholder:text-slate-500 focus:border-teal-500 focus:outline-hidden"
              />
            </div>

            {vendeurLoginError && (
              <div className="flex items-center gap-2 rounded-xl bg-red-500/10 p-2.5 text-xs font-semibold text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {vendeurLoginError}
              </div>
            )}

            <button
              type="submit"
              disabled={vendeurLoginLoading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 text-sm font-bold text-white shadow-md hover:bg-teal-700 disabled:opacity-50"
            >
              <Lock className="h-4 w-4" />
              {vendeurLoginLoading ? 'Connexion…' : 'Se connecter'}
            </button>

            <button
              type="button"
              onClick={() => {
                vendeurAuthService.loginAsDemo(vendeurCode || 'VND-001');
                setVendeurAuthed(true);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 py-2.5 text-xs font-semibold text-teal-300 hover:bg-slate-700/80 transition"
            >
              <Sparkles className="h-3.5 w-3.5 text-teal-400" />
              Tester en mode Démo Vendeur (Hors-ligne)
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 pb-24">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-2xl md:bottom-8">
          <Sparkles className="h-4 w-4 text-teal-400" />
          {notification}
        </div>
      )}

      {/* En-tête Tournée Thème Silwane Androway */}
      <div className="overflow-hidden rounded-3xl bg-slate-900 p-5 text-white shadow-lg sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/20 px-3 py-1 text-xs font-bold text-teal-400">
              <Navigation className="h-3.5 w-3.5" />
              Silwane Androway • Module Terrain
            </div>
            <h2 className="mt-2 text-xl font-black tracking-tight sm:text-2xl">
              Tournée Commerciale du Jour
            </h2>
            <p className="text-xs text-slate-400">
              Vente nomade, encaissement de créances et pointage GPS en mode déconnecté
            </p>
            <button
              type="button"
              onClick={handleVendeurLogout}
              className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-white"
            >
              <LogOut className="h-3 w-3" />
              Connecté : {vendeurProfile?.nom || vendeurProfile?.code || 'Commercial'} — Déconnexion
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSyncClick}
              disabled={isSyncing}
              className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-teal-700/30 hover:bg-teal-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              Sync Batch ({pendingCount})
            </button>

            <button
              onClick={() => setShowProspectModal(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-xs hover:bg-white/20"
            >
              <UserPlus className="h-4 w-4 text-teal-300" />
              Nouveau Prospect
            </button>
          </div>
        </div>

        {/* Barre de progression de la tournée */}
        <div className="mt-6 border-t border-slate-800 pt-4">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
            <span>Progression des visites</span>
            <span className="font-mono font-bold text-teal-400">
              {visitedCount} / {clients.length} clients ({progressPercent}%)
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-teal-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Barre de recherche et onglets de filtrage */}
      <div className="mt-6 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrer par nom, ville, code..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm shadow-xs focus:border-teal-600 focus:outline-hidden focus:ring-2 focus:ring-teal-100"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl bg-slate-100 p-1 text-xs">
          <button
            type="button"
            onClick={() => setFilterType('tous')}
            className={`flex-1 rounded-xl py-1.5 px-3 font-bold transition-all ${
              filterType === 'tous'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Tous ({clients.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('clients')}
            className={`flex-1 rounded-xl py-1.5 px-3 font-bold transition-all ${
              filterType === 'clients'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Clients Admin ({clients.filter((c) => !c.code.startsWith('PROSP')).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('prospects')}
            className={`flex-1 rounded-xl py-1.5 px-3 font-bold transition-all ${
              filterType === 'prospects'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Prospects Vendeur ({clients.filter((c) => c.code.startsWith('PROSP')).length})
          </button>
        </div>
      </div>

      {/* Liste des clients de la tournée */}
      {filteredClients.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
            <MapPin className="h-7 w-7" />
          </div>
          <h4 className="mt-4 text-base font-bold text-slate-800">Aucun client dans la tournée</h4>
          <p className="mt-1.5 max-w-md text-xs text-slate-500">
            Aucune donnée de tournée n'est encore enregistrée. Vous pouvez ajouter un nouveau client ou prospect via le bouton ci-dessous, ou synchroniser avec votre serveur Silwane.
          </p>
          <button
            type="button"
            onClick={() => setShowProspectModal(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-teal-700"
          >
            <UserPlus className="h-4 w-4" />
            Nouveau Prospect / Client
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {filteredClients.map((client) => {
            return (
              <div
                key={client.id}
                className={`rounded-2xl border bg-white p-4 shadow-xs transition-all ${
                  client.isVisited ? 'border-teal-200 bg-teal-50/20' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400">
                        {client.code}
                      </span>
                      {client.code.startsWith('PROSP') ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800 border border-purple-200">
                          🎯 Prospect Vendeur
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                          👤 Client Admin
                        </span>
                      )}
                      {client.isVisited ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-[10px] font-bold text-teal-800">
                          <CheckCircle2 className="h-3 w-3" />
                          Visité à {client.visitedAt || 'OK'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                          <Clock className="h-3 w-3" />
                          À visiter
                        </span>
                      )}
                    </div>

                    <h3 className="mt-1 text-base font-bold text-slate-900">
                      {client.nom}
                    </h3>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {client.adresse}, {client.ville}
                      </span>
                      <span className="font-semibold text-slate-700">
                        Créance :{' '}
                        <span
                          className={
                            client.creanceDZD > 0
                              ? 'font-bold text-amber-700'
                              : 'font-medium text-slate-500'
                          }
                        >
                          {formatDZD(client.creanceDZD)} DZD
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Boutons d'actions terrain */}
                  <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 sm:border-0 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => {
                        handleOpenVenteModal(client);
                      }}
                      className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      Vendre
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPaymentClient(client);
                        setMontantEncaissement(client.creanceDZD > 0 ? client.creanceDZD.toString() : '');
                      }}
                      className="inline-flex items-center gap-1 rounded-xl bg-teal-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-700"
                    >
                      <DollarSign className="h-3.5 w-3.5" />
                      Encaisser
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePointerGps(client)}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      <Navigation className="h-3.5 w-3.5 text-slate-500" />
                      Pointer GPS
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Vente Terrain / Prise de Commande */}
      {sellingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Prise de commande terrain
                </h3>
                <p className="text-xs text-slate-500">
                  Client : <span className="font-semibold text-slate-800">{sellingClient.nom}</span> ({sellingClient.code})
                </p>
              </div>
              <button
                onClick={() => setSellingClient(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Barre de recherche et actualisation catalogue */}
            <div className="mt-3 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher par désignation ou référence..."
                  value={articleSearchQuery}
                  onChange={(e) => setArticleSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {articleSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setArticleSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  const isProspect = sellingClient.code.startsWith('PROSP');
                  chargerCatalogueArticles(isProspect ? undefined : sellingClient.id);
                }}
                disabled={isLoadingProduits}
                title="Rafraîchir les produits depuis le serveur"
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoadingProduits ? 'animate-spin text-blue-600' : ''}`} />
                <span className="hidden sm:inline">Serveur</span>
              </button>
            </div>

            {/* En-tête statistiques catalogue */}
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
              <span>
                {orderArticles.filter((art) => {
                  if (!articleSearchQuery.trim()) return true;
                  const q = articleSearchQuery.toLowerCase().trim();
                  return (
                    art.designation.toLowerCase().includes(q) ||
                    (art.code && art.code.toLowerCase().includes(q))
                  );
                }).length}{' '}
                produit(s) disponible(s)
              </span>
              <span className="font-semibold text-blue-600">
                {orderArticles.filter((a) => a.quantite > 0).length} sélectionné(s)
              </span>
            </div>

            {/* Liste scrollable des produits */}
            <div className="mt-2 flex-1 max-h-80 space-y-2 overflow-y-auto pr-1">
              {isLoadingProduits && orderArticles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <RefreshCw className="h-7 w-7 animate-spin text-blue-600" />
                  <p className="mt-2 text-xs">Chargement des produits du serveur...</p>
                </div>
              ) : orderArticles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
                  <Package className="h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-xs font-semibold text-slate-700">Aucun produit disponible</p>
                  <p className="text-[11px] text-slate-400">Vérifiez la connexion au serveur Silwane ou synchronisez le catalogue.</p>
                </div>
              ) : (
                orderArticles
                  .filter((art) => {
                    if (!articleSearchQuery.trim()) return true;
                    const q = articleSearchQuery.toLowerCase().trim();
                    return (
                      art.designation.toLowerCase().includes(q) ||
                      (art.code && art.code.toLowerCase().includes(q))
                    );
                  })
                  .map((art) => {
                    const originalIdx = orderArticles.findIndex((a) => a.id === art.id);
                    return (
                      <div
                        key={art.id}
                        className={`flex items-center justify-between rounded-xl border p-2.5 text-xs transition-colors ${
                          art.quantite > 0
                            ? 'border-blue-300 bg-blue-50/40'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex-1 pr-2">
                          <div className="font-semibold text-slate-900 leading-snug">{art.designation}</div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            {art.code && (
                              <span className="font-mono text-[10px] text-slate-400">
                                Ref: {art.code}
                              </span>
                            )}
                            <span className="font-bold text-slate-800">
                              {formatDZD(art.prix)} DZD
                            </span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                              Unité: <span className="font-bold text-slate-900">{art.unite || 'Pièce'}</span>
                            </span>
                            <span className="rounded bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                              Facteur: <span className="font-bold text-indigo-900">{art.facteurConversion ?? 1}</span>
                            </span>
                            {typeof art.stock === 'number' && (
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                  art.stock > 0
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-rose-50 text-rose-600'
                                }`}
                              >
                                Stock: {art.stock}
                              </span>
                            )}
                          </div>
                          {art.quantite > 0 && (
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 rounded-lg bg-blue-50/80 px-2 py-1 text-[11px] font-semibold text-blue-800 border border-blue-200">
                              <span>
                                Montant produit : <strong className="text-blue-950 font-black">{formatDZD(art.prix * art.facteurConversion * art.quantite)} DZD</strong>
                              </span>
                              <span className="text-[10px] font-normal text-blue-700">
                                ({formatDZD(art.prix)} DZD × {art.facteurConversion} × {art.quantite})
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (originalIdx === -1) return;
                              const updated = [...orderArticles];
                              updated[originalIdx].quantite = Math.max(0, updated[originalIdx].quantite - 1);
                              setOrderArticles(updated);
                            }}
                            disabled={art.quantite === 0}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-40"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={art.quantite === 0 ? '' : art.quantite}
                            placeholder="0"
                            onChange={(e) => {
                              if (originalIdx === -1) return;
                              const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                              const updated = [...orderArticles];
                              updated[originalIdx].quantite = val;
                              setOrderArticles(updated);
                            }}
                            className="h-7 w-12 rounded-lg border border-slate-200 text-center font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (originalIdx === -1) return;
                              const updated = [...orderArticles];
                              updated[originalIdx].quantite += 1;
                              setOrderArticles(updated);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 font-bold text-white hover:bg-blue-700"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
              <div className="flex flex-col">
                <span className="font-semibold text-slate-600">Total Commande :</span>
                <span className="text-[11px] text-slate-400">
                  {orderArticles.filter((a) => a.quantite > 0).reduce((s, a) => s + a.quantite, 0)} unité(s)
                </span>
              </div>
              <span className="text-xl font-black text-blue-600">
                {formatDZD(
                  orderArticles.reduce((s, a) => s + a.prix * a.facteurConversion * a.quantite, 0)
                )}{' '}
                DZD
              </span>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setSellingClient(null)}
                className="w-1/3 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleValiderVente}
                disabled={orderArticles.filter((a) => a.quantite > 0).length === 0}
                className="w-2/3 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-50"
              >
                Valider le Bon de Commande
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Encaissement Créance */}
      {paymentClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Encaisser un règlement
                </h3>
                <p className="text-xs text-slate-500">{paymentClient.nom}</p>
              </div>
              <button
                onClick={() => setPaymentClient(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-slate-50 p-3 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Créance actuelle :</span>
                  <span className="font-bold text-amber-700">
                    {formatDZD(paymentClient.creanceDZD)} DZD
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Montant à encaisser (DZD) *
                </label>
                <input
                  type="number"
                  value={montantEncaissement}
                  onChange={(e) => setMontantEncaissement(e.target.value)}
                  placeholder="Ex: 25000"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-bold text-slate-900 focus:border-teal-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Mode de règlement
                </label>
                <select
                  value={modeReglement}
                  onChange={(e) => setModeReglement(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-teal-600 focus:outline-hidden"
                >
                  <option value="Espèces">Espèces</option>
                  <option value="Chèque bancaire">Chèque bancaire</option>
                  <option value="BaridiMob / Edahabia">BaridiMob / Edahabia</option>
                  <option value="Virement bancaire">Virement bancaire</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Référence / N° Chèque (optionnel)
                </label>
                <input
                  type="text"
                  value={refReglement}
                  onChange={(e) => setRefReglement(e.target.value)}
                  placeholder="Ex: CHQ-882193"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-teal-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setPaymentClient(null)}
                className="w-1/3 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleValiderEncaissement}
                className="w-2/3 rounded-xl bg-teal-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-teal-700"
              >
                Enregistrer le Versement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Nouveau Prospect */}
      {showProspectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Créer un Nouveau Prospect
                </h3>
              </div>
              <button
                onClick={() => setShowProspectModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreerProspect} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Nom / Raison Sociale *
                </label>
                <input
                  type="text"
                  required
                  value={prospectNom}
                  onChange={(e) => setProspectNom(e.target.value)}
                  placeholder="Ex: Pharmacie El Kouba"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-teal-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={prospectTel}
                  onChange={(e) => setProspectTel(e.target.value)}
                  placeholder="0550 12 34 56"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-teal-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Adresse
                </label>
                <input
                  type="text"
                  value={prospectAdresse}
                  onChange={(e) => setProspectAdresse(e.target.value)}
                  placeholder="Rue, quartier, repère..."
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-teal-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Wilaya
                </label>
                <select
                  value={prospectWilaya}
                  onChange={(e) => setProspectWilaya(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-teal-600 focus:outline-hidden"
                >
                  <option value="16 - Alger">16 - Alger</option>
                  <option value="09 - Blida">09 - Blida</option>
                  <option value="31 - Oran">31 - Oran</option>
                  <option value="25 - Constantine">25 - Constantine</option>
                  <option value="19 - Sétif">19 - Sétif</option>
                </select>
              </div>

              <div className="rounded-xl bg-teal-50 p-2.5 text-[11px] text-teal-800">
                <span className="font-bold">Géolocalisation automatique :</span> Les coordonnées GPS actuelles du commercial seront attachées au prospect.
              </div>

              <div className="mt-5 flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProspectModal(false)}
                  className="w-1/3 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="w-2/3 rounded-xl bg-teal-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-teal-700"
                >
                  Créer & Ajouter à la tournée
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

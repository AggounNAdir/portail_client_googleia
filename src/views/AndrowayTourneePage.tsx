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
} from 'lucide-react';
import { ClientTourneeItem } from '../types';
import { androwaySyncService } from '../services/androwaySyncService';
import { gpsTourneeService } from '../services/gpsTourneeService';
import { vendeurAuthService } from '../services/vendeurAuthService';

const INITIAL_TOURNEE: ClientTourneeItem[] = [];

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

  // Modales
  const [sellingClient, setSellingClient] = useState<ClientTourneeItem | null>(null);
  const [paymentClient, setPaymentClient] = useState<ClientTourneeItem | null>(null);
  const [showProspectModal, setShowProspectModal] = useState(false);

  // Vente rapide state
  const [orderArticles, setOrderArticles] = useState([
    { id: 1, designation: 'Paracétamol 500mg B/20', prix: 180, quantite: 0 },
    { id: 2, designation: 'Amoxicilline 1g B/14', prix: 520, quantite: 0 },
    { id: 3, designation: 'Sérum Salé 0.9% 500ml', prix: 220, quantite: 0 },
    { id: 4, designation: 'Oméprazole 20mg B/28', prix: 890, quantite: 0 },
    { id: 5, designation: 'Vitamine C 1000mg Eff.', prix: 450, quantite: 0 },
  ]);

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

  const visitedCount = clients.filter((c) => c.isVisited).length;
  const progressPercent = Math.round((visitedCount / clients.length) * 100);

  // Pointer GPS
  const handlePointerGps = async (client: ClientTourneeItem) => {
    const success = await gpsTourneeService.pointerPresenceVisite(client.id);

    // Enqueue dans Androway Sync
    const pos = await gpsTourneeService.getCurrentPosition();
    await androwaySyncService.enqueueOperation('pointageVisite', {
      clientId: client.id,
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
    const lignesChoisis = orderArticles.filter((a) => a.quantite > 0);
    if (lignesChoisis.length === 0) {
      alert('Veuillez sélectionner au moins un article');
      return;
    }

    const total = lignesChoisis.reduce((s, a) => s + a.prix * a.quantite, 0);
    const numBC = `BC-${Date.now().toString().substring(7)}`;

    await androwaySyncService.enqueueOperation('commande', {
      numero: numBC,
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
    showToast(`Bon de commande ${numBC} généré (${total.toLocaleString()} DZD) !`);
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

    await androwaySyncService.enqueueOperation('encaissement', {
      recu: numRecu,
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
    showToast(`Règlement de ${montantNum.toLocaleString()} DZD enregistré (${numRecu})`);
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
    });

    setClients((prev) => [newClient, ...prev]);
    setShowProspectModal(false);
    setProspectNom('');
    setProspectTel('');
    setProspectAdresse('');
    showToast(`Prospect ${prospectNom} créé et synchronisé avec succès !`);
  };

  const filteredClients = clients.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.nom.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.ville.toLowerCase().includes(q)
    );
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
              onClick={() => androwaySyncService.syncAllPending()}
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

      {/* Barre de recherche des clients */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrer client, ville, référence..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm shadow-xs focus:border-teal-600 focus:outline-hidden focus:ring-2 focus:ring-teal-100"
          />
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
                          {client.creanceDZD.toLocaleString()} DZD
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Boutons d'actions terrain */}
                  <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 sm:border-0 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSellingClient(client);
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
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Prise de commande terrain
                </h3>
                <p className="text-xs text-slate-500">
                  Client : <span className="font-semibold text-slate-800">{sellingClient.nom}</span>
                </p>
              </div>
              <button
                onClick={() => setSellingClient(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
              {orderArticles.map((art, idx) => (
                <div
                  key={art.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 p-2.5 text-xs"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900">{art.designation}</div>
                    <div className="text-[11px] text-slate-500">{art.prix} DZD / u</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...orderArticles];
                        updated[idx].quantite = Math.max(0, updated[idx].quantite - 1);
                        setOrderArticles(updated);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 font-bold hover:bg-slate-200"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-bold">{art.quantite}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...orderArticles];
                        updated[idx].quantite += 1;
                        setOrderArticles(updated);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 font-bold hover:bg-slate-200"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
              <span className="font-semibold text-slate-600">Total Commande :</span>
              <span className="text-lg font-black text-blue-600">
                {orderArticles
                  .reduce((s, a) => s + a.prix * a.quantite, 0)
                  .toLocaleString()}{' '}
                DZD
              </span>
            </div>

            <div className="mt-5 flex gap-2">
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
                className="w-2/3 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700"
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
                    {paymentClient.creanceDZD.toLocaleString()} DZD
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

import React, { useState, useEffect } from 'react';
import {
  Store,
  ShoppingCart,
  Receipt,
  FileText,
  Scale,
  User,
  Plus,
  Minus,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  Star,
  Package,
  Phone,
  MapPin,
  Calendar,
  LogOut,
  Printer,
  ChevronRight,
  ShoppingBag,
  AlertCircle,
  Lock,
  RefreshCw,
  Server,
  Navigation,
  Compass,
  Truck,
  Users,
  UserCheck,
  ChevronDown
} from 'lucide-react';
import { api, type CaisseVendeur, type RemiseAdmin } from '../../services/apiClient';

interface ClientProfile {
  id: number;
  code: string;
  nom: string;
  adresse?: string;
  tel?: string;
  email?: string;
  solde: number;
  niveau_prix: string;
}

const fmt = (n: number | string | null | undefined) =>
  Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface VendeurProfile {
  id: number;
  code: string;
  nom: string;
  tel?: string;
}

interface ProduitBackend {
  id: number;
  code: string;
  designation: string;
  unite?: string;
  facteur_conversion?: number;
  prix: number;
  prix_base?: number;
  niveau?: string;
  is_prix_special?: boolean;
  stock_disponible?: number;
}

const fmtDA = (n: any) =>
  Number(n || 0).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const PortailClientApp: React.FC = () => {
  // Authentication state
  const [token, setToken] = useState<string | null>(() => api.getToken());
  const [authRole, setAuthRole] = useState<'client' | 'vendeur'>(() => api.getUserRole() || 'client');
  const [loginRoleTab, setLoginRoleTab] = useState<'client' | 'vendeur'>('client');

  // Login form inputs
  const [loginCode, setLoginCode] = useState('CL-001');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active user data
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [vendeurProfile, setVendeurProfile] = useState<VendeurProfile | null>(() => api.getVendeurInfo());

  // Backend Data
  const [produits, setProduits] = useState<ProduitBackend[]>([]);
  const [commandes, setCommandes] = useState<any[]>([]);
  const [factures, setFactures] = useState<any[]>([]);
  const [ventes, setVentes] = useState<any[]>([]);
  const [pointages, setPointages] = useState<any[]>([]);
  const [prospects, setProspects] = useState<any[]>([]);

  // Navigation tab
  const [navTab, setNavTab] = useState<
    'accueil' | 'catalogue' | 'commandes' | 'factures' | 'bons' | 'situation' | 'tournee' | 'prospects' | 'stock_camion' | 'situation_vendeur' | 'profil'
  >('accueil');
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);

  // Vendor stock & direct sales state
  const [vendeurStock, setVendeurStock] = useState<Record<number, number>>({});
  const [ventesTerrain, setVentesTerrain] = useState<any[]>([]);
  const [versementsTerrain, setVersementsTerrain] = useState<any[]>([]);
  const [caisse, setCaisse] = useState<CaisseVendeur | null>(null);
  const [caisseJour, setCaisseJour] = useState<CaisseVendeur | null>(null);
  const [remises, setRemises] = useState<RemiseAdmin[]>([]);
  const [caisseError, setCaisseError] = useState('');

  // Versement encaissement state
  const [encaisserMontant, setEncaisserMontant] = useState<number>(0);
  const [encaisserMode, setEncaisserMode] = useState<string>('Espèces');
  const [encaisserTiersNom, setEncaisserTiersNom] = useState<string>('');
  const [encaisserTiersId, setEncaisserTiersId] = useState<string>('');
  const [encaisserRecherche, setEncaisserRecherche] = useState<string>('');

  // Catalogue & Cart
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<{ produit: ProduitBackend; quantite: number }[]>([]);
  const [observations, setObservations] = useState('');
  const [orderSuccessMsg, setOrderSuccessMsg] = useState('');
  const [montantEncaisseVente, setMontantEncaisseVente] = useState(0);
  const [modeReglementVente, setModeReglementVente] = useState('Espèces');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Tournée / Pointage GPS form
  const [gpsClientName, setGpsClientName] = useState('');
  const [gpsObservations, setGpsObservations] = useState('');
  const [gpsSuccessMsg, setGpsSuccessMsg] = useState('');

  // Prospect form
  const [newProspectNom, setNewProspectNom] = useState('');
  const [newProspectTel, setNewProspectTel] = useState('');
  const [newProspectAdresse, setNewProspectAdresse] = useState('');
  const [newProspectWilaya, setNewProspectWilaya] = useState('');

  // Vendeur order target: Prospect or Client
  const [targetType, setTargetType] = useState<'prospect' | 'client'>('prospect');
  const [selectedProspectId, setSelectedProspectId] = useState<number | null>(null);
  const [selectedClientCode, setSelectedClientCode] = useState<string>('CL-001');
    // Relevé de compte client
  const [situation, setSituation] = useState<any | null>(null);
  const [sitDebut, setSitDebut] = useState('');
  const [sitFin, setSitFin] = useState('');
  const [sitLoading, setSitLoading] = useState(false);
  const loadSituation = async (debut: string = sitDebut, fin: string = sitFin) => {
    setSitLoading(true);
    try {
      const s = await api.getMySituation(debut || undefined, fin || undefined);
      setSituation(s);
    } catch (err) {
      console.error('Erreur chargement situation:', err);
    } finally {
      setSitLoading(false);
    }
  };
  // Categories helper
  const categories = ['all', 'Glace Bâtonnet', 'Cône', 'Bac Crème', 'Sorbet'];
  const getProductCategory = (designation: string): string => {
    if (designation.toLowerCase().includes('bâtonnet') || designation.toLowerCase().includes('batonnet')) return 'Glace Bâtonnet';
    if (designation.toLowerCase().includes('cône') || designation.toLowerCase().includes('cone')) return 'Cône';
    if (designation.toLowerCase().includes('bac')) return 'Bac Crème';
    if (designation.toLowerCase().includes('sorbet')) return 'Sorbet';
    return 'Autres';
  };

  useEffect(() => {
    if (token) {
      const currentRole = api.getUserRole();
      if (currentRole) setAuthRole(currentRole);
      loadBackendData();
    }
  }, [token]);

  const loadBackendData = async () => {
    try {
      const role = api.getUserRole();
      if (role === 'client') {
        const profile = await api.getMyProfile();
        setClientProfile(profile);

        const prods = await api.getProduits();
        const normalizedProds = (prods || []).map((p: any) => ({
          id: p.id,
          code: p.code || `PRD-${p.id}`,
          designation: p.designation || '',
          unite: p.unite || 'Carton',
          facteur_conversion: Number(p.facteur_conversion || 1),
          prix: Number(p.prix_unitaire ?? p.prix ?? p.prix_vente ?? p.prix_detail ?? 0),
          prix_base: Number(p.prix_base ?? p.prix_vente ?? 0),
          stock_disponible: Number(p.stock_actuel ?? p.stock_disponible ?? 0),
          is_prix_special: !!p.is_prix_special,
        }));
        setProduits(normalizedProds);

        try {
          const cmds = await api.getMyCommandes();
          setCommandes(cmds || []);
        } catch {}

        try {
          const facts = await api.getMyFactures();
          setFactures(facts || []);
        } catch {}

        try {
          const vts = await api.getMyVentes();
          setVentes(vts || []);
        } catch {}

        await loadSituation('', '');

      } else if (role === 'vendeur') {
        const vInfo = api.getVendeurInfo();
        setVendeurProfile(vInfo);

        const prods = await api.getProduits();
        const normalizedProds = (prods || []).map((p: any) => ({
          id: p.id,
          code: p.code || `PRD-${p.id}`,
          designation: p.designation || '',
          unite: p.unite || 'Carton',
          facteur_conversion: Number(p.facteur_conversion || 1),
          prix: Number(p.prix_unitaire ?? p.prix ?? p.prix_vente ?? p.prix_detail ?? 0),
          prix_base: Number(p.prix_base ?? p.prix_vente ?? 0),
          stock_disponible: Number(p.stock_actuel ?? p.stock_disponible ?? 0),
          is_prix_special: !!p.is_prix_special,
        }));
        setProduits(normalizedProds);

        try {
          const pts = await api.getTourneePointages();
          setPointages(pts || []);
        } catch {}

        try {
          const prosps = await api.getProspects();
          setProspects(prosps || []);
        } catch {}

        // Charger le stock et les ventes depuis le backend, source de vérité.
        if (vInfo?.id) {
          try {
            const [stock, sales] = await Promise.all([
              api.getBackendStockCamion(),
              api.getVentesTerrainBackend(),
            ]);
            setVendeurStock(
              Object.fromEntries(
                stock.map((item: any) => [item.produit_id, Number(item.quantite_colis) || 0]),
              ),
            );
            setVentesTerrain(sales || []);
          } catch (err) {
            console.error('Erreur chargement stock ou ventes vendeur:', err);
            setVendeurStock({});
            setVentesTerrain([]);
          }
        }

        try {
          const vers = await api.getMyVersements();
          setVersementsTerrain(vers || []);
        } catch {}

        // Situation RÉELLE de la caisse : chiffres calculés par le serveur.
        try {
          const d = new Date();
          const aujourdhui = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          const [c, cj, rem] = await Promise.all([
            api.getMaCaisse(),
            api.getMaCaisse(aujourdhui, aujourdhui),
            api.getMesRemises(),
          ]);
          setCaisse(c);
          setCaisseJour(cj);
          setRemises(rem || []);
          setCaisseError('');
        } catch (err: any) {
          setCaisseError(err.message || 'Impossible de charger la caisse.');
        }
      }
    } catch (err: any) {
      console.error('Erreur chargement backend:', err);
      if (err.message?.includes('401') || err.message?.includes('token')) {
        handleLogout();
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      if (loginRoleTab === 'client') {
        const res = await api.loginClient(loginCode.trim(), loginPassword);
        setToken(res.access_token);
        setAuthRole('client');
      } else {
        const res = await api.loginVendeur(loginCode.trim(), loginPassword);
        setToken(res.access_token);
        setVendeurProfile(res.vendeur);
        setAuthRole('vendeur');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Identifiants invalides ou serveur indisponible');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    setToken(null);
    setClientProfile(null);
    setVendeurProfile(null);
    setSituation(null);
    setCart([]);
  };
  // Cart operations
  const addToCart = (produit: ProduitBackend) => {
    const idx = cart.findIndex((i) => i.produit.id === produit.id);
    if (authRole === 'vendeur' && venteDirecteTerrain) {
      const quantiteActuelle = idx >= 0 ? cart[idx].quantite : 0;
      const stockDisponible = vendeurStock[produit.id] ?? 0;
      if (quantiteActuelle + 1 > stockDisponible) {
        alert(`Stock camion insuffisant pour ${produit.designation}.`);
        return;
      }
    }
    if (idx >= 0) {
      const updated = [...cart];
      updated[idx].quantite += 1;
      setCart(updated);
    } else {
      setCart([...cart, { produit, quantite: 1 }]);
    }
  };

  const updateCartQty = (prodId: number, delta: number) => {
    const idx = cart.findIndex((i) => i.produit.id === prodId);
    if (idx < 0) return;
    const newQty = cart[idx].quantite + delta;
    if (newQty <= 0) {
      setCart(cart.filter((i) => i.produit.id !== prodId));
    } else {
      if (delta > 0 && authRole === 'vendeur' && venteDirecteTerrain) {
        const stockDisponible = vendeurStock[prodId] ?? 0;
        if (newQty > stockDisponible) {
          alert(`Stock camion insuffisant pour ${cart[idx].produit.designation}.`);
          return;
        }
      }
      const updated = [...cart];
      updated[idx].quantite = newQty;
      setCart(updated);
    }
  };

  const getItemTotal = (item: { produit: ProduitBackend; quantite: number }) => {
    const facteur = item.produit.facteur_conversion && item.produit.facteur_conversion > 0 ? item.produit.facteur_conversion : 1;
    return item.quantite * facteur * Number(item.produit.prix || 0);
  };

  const cartTotalTTC = cart.reduce((sum, item) => sum + getItemTotal(item), 0);

  // Sale mode for Vendeur: Commande en attente VS Vente Directe Terrain
  const [venteDirecteTerrain, setVenteDirecteTerrain] = useState<boolean>(true);

  const handleSendOrder = async () => {
    if (cart.length === 0 || isSubmittingOrder) return;
    setIsSubmittingOrder(true);
    try {
      const lignes = cart.map((item) => {
        const facteur = item.produit.facteur_conversion && item.produit.facteur_conversion > 0
          ? item.produit.facteur_conversion
          : 1;
        const prixUnitaire = Number(item.produit.prix || 0);
        return {
          produit_id: item.produit.id,
          quantite: item.quantite,
          prix_unitaire: prixUnitaire,
          facteur_conversion: facteur,
          total: item.quantite * facteur * prixUnitaire,
        };
      });
      const payload = {
        lignes,
        montant_total: cartTotalTTC,
        observations: observations.trim() || undefined,
      };

      if (authRole === 'vendeur') {
        let selectedProspect: any | undefined;
        if (targetType === 'prospect') {
          const prospectId = selectedProspectId ?? prospects[0]?.id;
          selectedProspect = prospects.find((prospect) => prospect.id === prospectId);
          if (!selectedProspect) {
            throw new Error('Sélectionnez un prospect valide avant de continuer.');
          }
        } else {
          if (!selectedClientCode.trim()) {
            throw new Error('Saisissez le code du client avant de continuer.');
          }
        }

        if (venteDirecteTerrain) {
          const produitSansStock = cart.find(
            (item) => item.quantite > (vendeurStock[item.produit.id] ?? 0),
          );
          if (produitSansStock) {
            throw new Error(`Stock camion insuffisant pour ${produitSansStock.produit.designation}.`);
          }
          if (
            !Number.isFinite(montantEncaisseVente)
            || montantEncaisseVente < 0
            || montantEncaisseVente > cartTotalTTC
          ) {
            throw new Error('Le montant encaissé doit être compris entre 0 et le total de la vente.');
          }
          const result = await api.validerVenteDirecteBackend({
            is_prospect: targetType === 'prospect',
            prospect_id: targetType === 'prospect' ? selectedProspect.id : undefined,
            code_client: targetType === 'client' ? selectedClientCode.trim() : undefined,
            lignes: lignes.map(({ produit_id, quantite, prix_unitaire }) => ({
              produit_id,
              quantite,
              prix_unitaire,
            })),
            montant_verse: montantEncaisseVente,
            mode_reglement: modeReglementVente,
            observations: observations.trim() || undefined,
          });
          setCart([]);
          setObservations('');
          setMontantEncaisseVente(0);
          setOrderSuccessMsg(
            `Bon ${result.numero} validé. Encaissé ${Number(result.montant_verse).toLocaleString()} DZD, reste ${Number(result.reste_payer).toLocaleString()} DZD.`,
          );
        } else {
          const commandePayload = {
            ...payload,
            is_prospect: targetType === 'prospect',
            prospect_id: targetType === 'prospect' ? selectedProspect?.id : undefined,
            code_client: targetType === 'client' ? selectedClientCode.trim() : undefined,
            nom_client: targetType === 'prospect' ? selectedProspect?.nom : undefined,
          };
          const result = await api.createCommande(commandePayload);
          setCart([]);
          setObservations('');
          setOrderSuccessMsg(
            `Commande ${result.numero || ''} enregistrée avec succès pour ${commandePayload.nom_client || commandePayload.code_client || 'le client'} !`,
          );
        }
      } else {
        const result = await api.createCommande(payload);
        setCart([]);
        setObservations('');
        setOrderSuccessMsg(`Commande ${result.numero || ''} enregistrée avec succès !`);
      }

      setNavTab(authRole === 'client' ? 'commandes' : 'situation_vendeur');
      await loadBackendData();
      setTimeout(() => setOrderSuccessMsg(''), 7000);
    } catch (err: any) {
      alert(`Erreur : ${err.message}`);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Vendeur actions
  const handleEnregistrerPointage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.enregistrerPointage({
        nom_client: gpsClientName,
        observations: gpsObservations,
        latitude: 36.752887,
        longitude: 3.042048,
      });
      setGpsClientName('');
      setGpsObservations('');
      setGpsSuccessMsg('Pointage GPS de visite enregistré !');
      loadBackendData();
      setTimeout(() => setGpsSuccessMsg(''), 5000);
    } catch (err: any) {
      alert(`Erreur : ${err.message}`);
    }
  };

  const handleCreerProspect = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.creerProspect({
        nom: newProspectNom,
        tel: newProspectTel,
        adresse: newProspectAdresse,
        wilaya: newProspectWilaya,
      });
      setNewProspectNom('');
      setNewProspectTel('');
      setNewProspectAdresse('');
      setNewProspectWilaya('');
      alert('Nouveau prospect terrain enregistré !');
      loadBackendData();
    } catch (err: any) {
      alert(`Erreur : ${err.message}`);
    }
  };

  // ========== ÉCRAN DE CONNEXION AVEC DOUBLE CHOIX CLIENT & VENDEUR ==========
  if (!token) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#1e293b] border border-slate-700/80 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-2xl mx-auto shadow-lg ring-4 ring-blue-500/20">
              GH
            </div>
            <h1 className="text-2xl font-black text-white tracking-wide">GHILASS GLACE</h1>
            <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider">
              Portail B2B & Application Commerciale
            </p>
          </div>

          {/* Toggle Dual Login: Client vs Vendeur */}
          <div className="bg-[#0f172a] p-1 rounded-2xl flex border border-slate-700">
            <button
              type="button"
              onClick={() => {
                setLoginRoleTab('client');
                setLoginCode('CL-001');
                setLoginError('');
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
                loginRoleTab === 'client'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User size={15} />
              <span>Espace Client</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLoginRoleTab('vendeur');
                setLoginCode('VND-01');
                setLoginError('');
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
                loginRoleTab === 'vendeur'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Truck size={15} />
              <span>Commercial / Vendeur</span>
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                {loginRoleTab === 'client' ? 'Code Client' : 'Code Commercial / Vendeur'}
              </label>
              <input
                type="text"
                required
                value={loginCode}
                onChange={(e) => setLoginCode(e.target.value)}
                placeholder={loginRoleTab === 'client' ? 'Ex: CL-001' : 'Ex: VND-01'}
                className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Mot de Passe
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Votre mot de passe"
                className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
                <AlertCircle size={16} />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className={`w-full text-white font-bold py-3 rounded-xl text-sm transition shadow-lg flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 ${
                loginRoleTab === 'client'
                  ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
              }`}
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Connexion en cours...</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>
                    {loginRoleTab === 'client'
                      ? 'Se Connecter en tant que Client'
                      : 'Ouvrir la Tournée Commerciale'}
                  </span>
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-700/60 text-center space-y-2">
            <div className="inline-flex items-center space-x-2 text-[11px] text-slate-400 bg-slate-900/60 px-3 py-1 rounded-full border border-slate-800">
              <Server size={12} className="text-emerald-400" />
              <span>
                Relié aux endpoints :{' '}
                <code className="text-slate-300">
                  {loginRoleTab === 'client' ? '/auth/login' : '/auth/login-vendeur'}
                </code>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== APPLICATION UTILISATEUR CONNECTÉ ==========
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <header className="bg-[#1e293b] border-b border-slate-700/80 sticky top-0 z-30 px-4 py-3 shadow-md backdrop-blur">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setNavTab('accueil')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black text-base shadow-lg ring-2 ring-blue-400/30">
              GH
            </div>
            <div>
              <div className="text-sm font-extrabold text-white leading-tight tracking-wide">
                GHILASS GLACE
              </div>
              <div className="text-[11px] text-blue-400 font-semibold flex items-center space-x-1.5">
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                  authRole === 'vendeur' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                }`}>
                  {authRole === 'vendeur' ? 'Commercial' : 'Client B2B'}
                </span>
                <span>•</span>
                <span>{authRole === 'vendeur' ? vendeurProfile?.nom : clientProfile?.nom}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setNavTab('catalogue')}
              className="relative px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-white transition flex items-center space-x-2 shadow-sm cursor-pointer"
            >
              <ShoppingCart size={17} className="text-emerald-400" />
              <span className="text-xs font-bold hidden sm:inline">Panier</span>
              {cart.length > 0 && (
                <span className="bg-emerald-500 text-white text-[11px] font-black px-1.5 py-0.5 rounded-full flex items-center justify-center shadow">
                  {cart.reduce((s, i) => s + i.quantite, 0)}
                </span>
              )}
            </button>

            <button
              onClick={handleLogout}
              title="Se déconnecter"
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition cursor-pointer"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 pb-24 space-y-6">
        {/* Navigation Tabs selon le rôle connecté */}
        <section className="border-b border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setIsNavigationOpen((open) => !open)}
            aria-expanded={isNavigationOpen}
            aria-controls="main-navigation-tabs"
            className="flex w-full items-center justify-between rounded-xl bg-slate-800/80 px-4 py-3 text-left text-xs font-bold text-white transition hover:bg-slate-800 cursor-pointer"
          >
            <span>Navigation</span>
            <ChevronDown
              size={16}
              className={`transition-transform ${isNavigationOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {isNavigationOpen && (
            <div
              id="main-navigation-tabs"
              className="mt-3 max-h-[calc(100dvh-12rem)] overflow-y-auto overscroll-contain"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                {authRole === 'client' ? (
                  <>
                    {[
                      { id: 'accueil', label: 'Accueil', icon: <Store size={15} /> },
                      { id: 'catalogue', label: 'Commander', icon: <ShoppingCart size={15} /> },
                      { id: 'commandes', label: `Mes Commandes (${commandes.length})`, icon: <Clock size={15} /> },
                      { id: 'bons', label: `Livraisons BL (${ventes.length})`, icon: <Package size={15} /> },
                      { id: 'factures', label: `Factures (${factures.length})`, icon: <Receipt size={15} /> },
                      { id: 'situation', label: 'Relevé de Compte', icon: <Scale size={15} /> },
                      { id: 'profil', label: 'Mon Profil', icon: <User size={15} /> },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setNavTab(tab.id as any)}
                        className={`px-3.5 py-2 rounded-xl flex items-center space-x-1.5 whitespace-nowrap transition cursor-pointer ${
                          navTab === tab.id
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        {tab.icon}
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    {[
                      { id: 'accueil', label: 'Tournée Terrain', icon: <Compass size={15} /> },
                      { id: 'catalogue', label: 'Prise de Commande', icon: <ShoppingCart size={15} /> },
                      { id: 'stock_camion', label: 'Mon Stock Camion', icon: <Package size={15} /> },
                      { id: 'situation_vendeur', label: 'Ma Caisse & Situation', icon: <Scale size={15} /> },
                      { id: 'tournee', label: `Pointages Visite (${pointages.length})`, icon: <MapPin size={15} /> },
                      { id: 'prospects', label: `Prospects (${prospects.length})`, icon: <Users size={15} /> },
                      { id: 'profil', label: 'Mon Compte', icon: <User size={15} /> },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setNavTab(tab.id as any)}
                        className={`px-3.5 py-2 rounded-xl flex items-center space-x-1.5 whitespace-nowrap transition cursor-pointer ${
                          navTab === tab.id
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        {tab.icon}
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </section>

        {/* CONTENU : ACCUEIL COMMERCIAL */}
        {navTab === 'accueil' && authRole === 'vendeur' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-[#1e293b] via-[#1e293b] to-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-xl space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Application Commerciale • Silwane Androway Tournée
              </span>
              <h2 className="text-xl md:text-2xl font-black text-white">
                Bienvenue, {vendeurProfile?.nom} ({vendeurProfile?.code})
              </h2>
              <p className="text-xs text-slate-400 max-w-xl">
                Prenez des commandes directement chez vos clients, enregistrez vos pointages de visite géolocalisés et ajoutez de nouveaux prospects sur le terrain.
              </p>

              <div className="pt-3 flex flex-wrap gap-3">
                <button
                  onClick={() => setNavTab('catalogue')}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-2 shadow-lg transition cursor-pointer"
                >
                  <ShoppingCart size={16} />
                  <span>Nouvelle Commande Client</span>
                </button>
                <button
                  onClick={() => setNavTab('tournee')}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-2 border border-slate-600 transition cursor-pointer"
                >
                  <MapPin size={16} />
                  <span>Pointer une Visite Client</span>
                </button>
                <button
                  onClick={() => setNavTab('prospects')}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-2 border border-slate-600 transition cursor-pointer"
                >
                  <Users size={16} />
                  <span>Nouveau Prospect</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CONTENU : ACCUEIL CLIENT */}
        {navTab === 'accueil' && authRole === 'client' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-[#1e293b] via-[#1e293b] to-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                    Espace Partenaire B2B
                  </span>
                  <h2 className="text-xl md:text-2xl font-black text-white">
                    {clientProfile?.nom}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Catégorie Tarifaire : <b className="text-blue-300 uppercase">{clientProfile?.niveau_prix}</b>
                  </p>
                </div>

                <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 min-w-[220px] text-right space-y-1 shadow">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold block">
                    Solde du compte (créance)
                  </span>
                  <div className={`text-2xl font-black font-mono ${(clientProfile?.solde || 0) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {(clientProfile?.solde || 0).toLocaleString()} <span className="text-sm font-bold">DZD</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    {(clientProfile?.solde || 0) > 0 ? 'Solde débiteur à régler' : 'Compte en règle'}
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-700/70 flex flex-wrap gap-3">
                <button
                  onClick={() => setNavTab('catalogue')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-2 shadow-lg transition cursor-pointer"
                >
                  <ShoppingBag size={16} />
                  <span>Passer une commande</span>
                </button>
                <button
                  onClick={() => setNavTab('situation')}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-2 border border-slate-600 transition cursor-pointer"
                >
                  <Scale size={16} />
                  <span>Consulter mon relevé</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CATALOGUE (CLIENT ET VENDEUR) */}
        {navTab === 'catalogue' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-semibold transition cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {cat === 'all' ? 'Tous les produits' : cat}
                  </button>
                ))}
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-center space-x-2 shadow-sm">
                <Search size={16} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher article..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none"
                />
              </div>

              <div className="space-y-3">
                {produits
                  .filter((p) => {
                    const matchSearch =
                      p.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      p.code.toLowerCase().includes(searchQuery.toLowerCase());
                    const matchCategory =
                      selectedCategory === 'all' || getProductCategory(p.designation) === selectedCategory;
                    return matchSearch && matchCategory;
                  })
                  .map((p) => {
                    const inCart = cart.find((i) => i.produit.id === p.id);
                    return (
                      <div
                        key={p.id}
                        className="bg-slate-800 border border-slate-700/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-white">{p.designation}</span>
                            {p.is_prix_special && (
                              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-1.5 py-0.2 rounded flex items-center space-x-0.5">
                                <Star size={10} fill="currentColor" />
                                <span>Prix Négocié</span>
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {p.code} • {p.unite || 'Carton'}
                            {p.facteur_conversion && p.facteur_conversion > 1 ? ` (${p.facteur_conversion} pcs/colis)` : ''}
                          </span>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end space-x-4">
                          <div className="text-right">
                            <div className="text-sm font-black text-emerald-400 font-mono">
                              {p.facteur_conversion && p.facteur_conversion > 1
                                ? `${(Number(p.prix || 0) * p.facteur_conversion).toLocaleString()} DZD`
                                : `${Number(p.prix || 0).toLocaleString()} DZD`}
                            </div>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {p.facteur_conversion && p.facteur_conversion > 1
                                ? `(${Number(p.prix || 0).toLocaleString()} DZD / pièce)`
                                : `Par ${p.unite || 'unité'}`}
                            </span>
                          </div>

                          {inCart ? (
                            <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700 rounded-lg p-1">
                              <button
                                onClick={() => updateCartQty(p.id, -1)}
                                className="w-6 h-6 rounded bg-slate-800 text-white flex items-center justify-center font-bold"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="w-6 text-center font-bold text-xs text-white">
                                {inCart.quantite}
                              </span>
                              <button
                                onClick={() => updateCartQty(p.id, 1)}
                                className="w-6 h-6 rounded bg-blue-600 text-white flex items-center justify-center font-bold"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(p)}
                              className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                            >
                              <Plus size={14} />
                              <span>Ajouter</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Cart Drawer */}
            <div className="lg:col-span-5 bg-slate-800 border border-slate-700 rounded-3xl p-5 flex flex-col justify-between shadow-lg h-fit sticky top-20">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2 pb-3 border-b border-slate-700 mb-3">
                  <ShoppingCart size={16} className="text-emerald-400" />
                  <span>Votre Bon de Commande</span>
                </h3>

                {cart.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Votre panier est vide.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {cart.map((item, idx) => {
                      const facteur = item.produit.facteur_conversion && item.produit.facteur_conversion > 0 ? item.produit.facteur_conversion : 1;
                      const prixColis = facteur * Number(item.produit.prix || 0);
                      const totalLigne = item.quantite * prixColis;

                      return (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-900 border border-slate-700/60 flex items-center justify-between text-xs"
                        >
                          <div className="flex-1 pr-2">
                            <div className="font-bold text-white">{item.produit.designation}</div>
                            <div className="text-[10px] text-slate-400">
                              {Number(item.produit.prix || 0).toLocaleString()} DZD/pc
                              {facteur > 1 ? ` × ${facteur} = ${prixColis.toLocaleString()} DZD/${item.produit.unite || 'colis'}` : ''}
                            </div>
                          </div>

                          <div className="w-24 text-right font-bold text-emerald-400 font-mono">
                            {totalLigne.toLocaleString()} DZD
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* If Vendeur: Selector for Client vs Prospect */}
              {authRole === 'vendeur' && (
                <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-3 my-3 space-y-2 text-xs">
                  <span className="font-bold text-indigo-300 block uppercase text-[10px]">
                    Destinataire de la commande (Tournée)
                  </span>

                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setTargetType('prospect')}
                      className={`flex-1 py-1.5 rounded-lg font-bold text-[11px] transition ${
                        targetType === 'prospect'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Prospect Terrain
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetType('client')}
                      className={`flex-1 py-1.5 rounded-lg font-bold text-[11px] transition ${
                        targetType === 'client'
                          ? 'bg-blue-600 text-white shadow'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Client Officiel
                    </button>
                  </div>

                  {targetType === 'prospect' ? (
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">
                        Sélectionner le prospect :
                      </label>
                      {prospects.length === 0 ? (
                        <p className="text-[11px] text-amber-400 italic">
                          Aucun prospect créé. Ajoutez-en un dans l'onglet "Prospects".
                        </p>
                      ) : (
                        <select
                          value={selectedProspectId || prospects[0]?.id}
                          onChange={(e) => setSelectedProspectId(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500 text-xs"
                        >
                          {prospects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nom} ({p.code}) - {p.wilaya || 'N/A'}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">
                        Code client officiel :
                      </label>
                      <input
                        type="text"
                        value={selectedClientCode}
                        onChange={(e) => setSelectedClientCode(e.target.value)}
                        placeholder="Ex: CL-001"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500 text-xs font-mono"
                      />
                    </div>
                  )}
                  {/* Vendeur mode: Vente directe avec déstockage camion immédiat OU Commande en attente */}
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-1 font-semibold">
                      Type d'opération terrain :
                    </span>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => setVenteDirecteTerrain(true)}
                        className={`flex-1 py-1.5 rounded-lg font-bold text-[11px] transition ${
                          venteDirecteTerrain
                            ? 'bg-emerald-600 text-white shadow'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        ⚡ Vente Directe (Déstocker Camion)
                      </button>
                      <button
                        type="button"
                        onClick={() => setVenteDirecteTerrain(false)}
                        className={`flex-1 py-1.5 rounded-lg font-bold text-[11px] transition ${
                          !venteDirecteTerrain
                            ? 'bg-amber-600 text-white shadow'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        ⏳ Précommande (En attente)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t border-slate-700 pt-3 mt-4 space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold text-slate-300 uppercase">Total Estimé TTC :</span>
                  <span className="text-xl font-black text-emerald-400 font-mono">
                    {cartTotalTTC.toLocaleString()} DZD
                  </span>
                </div>

                {authRole === 'vendeur' && venteDirecteTerrain && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">
                        Montant encaissé (0 = vente à crédit) :
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={cartTotalTTC}
                        step="0.01"
                        value={montantEncaisseVente}
                        onChange={(e) => setMontantEncaisseVente(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-xs"
                      />
                      <span className="text-[10px] text-amber-400 block mt-1">
                        Reste à payer : {Math.max(0, cartTotalTTC - montantEncaisseVente).toLocaleString()} DZD
                      </span>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">
                        Mode de règlement :
                      </label>
                      <select
                        value={modeReglementVente}
                        onChange={(e) => setModeReglementVente(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-xs"
                      >
                        <option>Espèces</option>
                        <option>Chèque</option>
                        <option>Virement</option>
                        <option>Carte</option>
                      </select>
                    </div>
                  </div>
                )}

                <textarea
                  placeholder="Remarque pour la livraison..."
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                />

                <button
                  onClick={handleSendOrder}
                  disabled={cart.length === 0 || isSubmittingOrder}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center space-x-2 transition ${
                    cart.length > 0 && !isSubmittingOrder
                      ? 'bg-emerald-600 hover:bg-emerald-500 cursor-pointer shadow-lg shadow-emerald-600/30'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 size={16} />
                  <span>
                    {isSubmittingOrder
                      ? 'Enregistrement...'
                      : authRole === 'vendeur' && venteDirecteTerrain
                        ? 'Valider la vente terrain'
                        : 'Envoyer la commande au serveur'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TOURNÉE TERRAIN (POINTAGE GPS) */}
        {navTab === 'tournee' && authRole === 'vendeur' && (
          <div className="space-y-4 max-w-xl">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <MapPin size={16} className="text-indigo-400" />
              <span>Pointage de Visite Client Géolocalisé</span>
            </h3>

            {gpsSuccessMsg && (
              <div className="p-3 bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold">
                {gpsSuccessMsg}
              </div>
            )}

            <form onSubmit={handleEnregistrerPointage} className="bg-slate-800 border border-slate-700 p-5 rounded-2xl space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Nom du Client visité :</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Superette El Baraka"
                  value={gpsClientName}
                  onChange={(e) => setGpsClientName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Observations de visite :</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Commande passée, stock vérifié..."
                  value={gpsObservations}
                  onChange={(e) => setGpsObservations(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl transition shadow flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Navigation size={14} />
                <span>Enregistrer le Pointage GPS</span>
              </button>
            </form>
          </div>
        )}

        {/* GESTION PROSPECTS TERRAIN (LISTE & CRÉATION) */}
        {navTab === 'prospects' && authRole === 'vendeur' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Formulaire nouveau prospect (5 cols) */}
            <div className="md:col-span-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Users size={16} className="text-indigo-400" />
                <span>Nouveau Prospect Terrain</span>
              </h3>

              <form onSubmit={handleCreerProspect} className="bg-slate-800 border border-slate-700 p-5 rounded-2xl space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Nom de l'établissement :</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Alimentation Générale Bouzid"
                    value={newProspectNom}
                    onChange={(e) => setNewProspectNom(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Téléphone :</label>
                    <input
                      type="text"
                      placeholder="0550 12 34 56"
                      value={newProspectTel}
                      onChange={(e) => setNewProspectTel(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Wilaya :</label>
                    <input
                      type="text"
                      placeholder="Alger, Blida..."
                      value={newProspectWilaya}
                      onChange={(e) => setNewProspectWilaya(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Adresse :</label>
                  <input
                    type="text"
                    placeholder="Rue, quartier..."
                    value={newProspectAdresse}
                    onChange={(e) => setNewProspectAdresse(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl transition shadow flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <UserCheck size={14} />
                  <span>Enregistrer le Prospect</span>
                </button>
              </form>
            </div>

            {/* Liste des prospects existants (7 cols) */}
            <div className="md:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>Liste de vos Prospects ({prospects.length})</span>
                </h3>
                <button
                  onClick={loadBackendData}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 cursor-pointer"
                >
                  <RefreshCw size={12} />
                  <span>Actualiser</span>
                </button>
              </div>

              {prospects.length === 0 ? (
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center text-xs text-slate-400">
                  Aucun prospect enregistré pour le moment. Remplissez le formulaire pour en ajouter un.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {prospects.map((p) => (
                    <div
                      key={p.id}
                      className="bg-slate-800 border border-slate-700/80 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:border-indigo-500/40 transition"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs text-white">{p.nom}</span>
                          <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono px-1.5 py-0.2 rounded">
                            {p.code}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap gap-x-3">
                          <span>Wilaya : <b className="text-slate-300">{p.wilaya || 'N/A'}</b></span>
                          {p.tel && <span>Tél : <b className="text-slate-300">{p.tel}</b></span>}
                        </div>
                        {p.adresse && (
                          <div className="text-[10px] text-slate-500 mt-0.5">{p.adresse}</div>
                        )}
                      </div>

                      <div>
                        <button
                          onClick={() => {
                            setSelectedProspectId(p.id);
                            setTargetType('prospect');
                            setNavTab('catalogue');
                          }}
                          className="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                        >
                          <ShoppingCart size={13} />
                          <span>Prendre commande</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STOCK INDIVIDUEL DU VENDEUR (CAMION / TOURNEE) */}
        {navTab === 'stock_camion' && authRole === 'vendeur' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-900/40 via-[#1e293b] to-slate-900 border border-indigo-500/40 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  Inventaire Embarqué • Camion Commercial
                </span>
                <h3 className="text-xl font-black text-white mt-1">
                  Stock Individuel de {vendeurProfile?.nom} ({vendeurProfile?.code})
                </h3>
                <p className="text-xs text-slate-400">
                  Ce stock diminue en temps réel à chaque vente directe effectuée chez vos clients sur le terrain.
                </p>
              </div>

              <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Colis Embarqués</span>
                <span className="text-2xl font-black text-indigo-400 font-mono">
                  {Object.values(vendeurStock).reduce((sum, q) => sum + (Number(q) || 0), 0)} Colis
                </span>
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-3xl overflow-hidden shadow">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-700 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3.5">Code</th>
                      <th className="p-3.5">Désignation</th>
                      <th className="p-3.5 text-center">Conditionnement</th>
                      <th className="p-3.5 text-right">Prix Unitaire</th>
                      <th className="p-3.5 text-center">Quantité Restante</th>
                      <th className="p-3.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60">
                    {produits.map((prod) => {
                      const qtyRestante = vendeurStock[prod.id] ?? 0;
                      return (
                        <tr key={prod.id} className="hover:bg-slate-700/30 transition">
                          <td className="p-3.5 font-mono font-bold text-indigo-400">{prod.code}</td>
                          <td className="p-3.5 font-bold text-white">{prod.designation}</td>
                          <td className="p-3.5 text-center text-slate-300">
                            {prod.unite || 'Carton'} ({prod.facteur_conversion || 1} pcs)
                          </td>
                          <td className="p-3.5 text-right font-mono text-emerald-400 font-bold">
                            {Number(prod.prix || 0).toLocaleString()} DZD/pc
                          </td>
                          <td className="p-3.5 text-center">
                            <span
                              className={`px-3 py-1 rounded-full font-mono font-black text-xs ${
                                qtyRestante > 5
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {qtyRestante} colis
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => {
                                addToCart(prod);
                                setNavTab('catalogue');
                              }}
                              disabled={qtyRestante <= 0}
                              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 mx-auto cursor-pointer"
                            >
                              <ShoppingCart size={13} />
                              <span>Vendre</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SITUATION ET CAISSE DU VENDEUR */}
        {navTab === 'situation_vendeur' && authRole === 'vendeur' && (
          <div className="space-y-6">
            {caisseError && (
              <div className="bg-red-500/10 border border-red-500/40 text-red-300 rounded-2xl p-4 text-xs flex items-center justify-between">
                <span>Situation de caisse indisponible : {caisseError}</span>
                <button onClick={loadBackendData} className="underline cursor-pointer">Réessayer</button>
              </div>
            )}

            {/* SITUATION RÉELLE DE LA CAISSE (calculée par le serveur) */}
            <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 shadow space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Scale size={16} className="text-indigo-400" />
                  <span>Ma situation réelle</span>
                </h3>
                <button
                  onClick={loadBackendData}
                  className="text-[11px] text-slate-300 hover:text-white flex items-center space-x-1 cursor-pointer"
                >
                  <RefreshCw size={12} />
                  <span>Actualiser</span>
                </button>
              </div>

              <div
                className={`rounded-2xl p-5 border ${
                  (caisse?.reste_a_verser ?? 0) > 0
                    ? 'bg-amber-500/10 border-amber-500/40'
                    : 'bg-emerald-500/10 border-emerald-500/40'
                }`}
              >
                <span className="text-[11px] uppercase font-semibold text-slate-300 block">
                  Reste à verser à l'administration
                </span>
                <div
                  className={`text-3xl font-black font-mono mt-1 ${
                    (caisse?.reste_a_verser ?? 0) > 0 ? 'text-amber-300' : 'text-emerald-300'
                  }`}
                >
                  {caisse ? fmt(caisse.reste_a_verser) : '—'} DZD
                </div>
                <span className="text-[11px] text-slate-400 block mt-1">
                  {!caisse
                    ? 'Chargement…'
                    : caisse.reste_a_verser > 0
                    ? 'Espèces encaissées que vous devez encore remettre à l\'administration.'
                    : caisse.reste_a_verser < 0
                    ? 'Vous avez versé plus que vos encaissements : contactez l\'administration.'
                    : 'Caisse à jour : rien à verser.'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-3">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Encaissé aujourd'hui</span>
                  <div className="font-black text-emerald-400 font-mono mt-1">{caisseJour ? fmt(caisseJour.periode_encaisse_especes) : '—'}</div>
                  <span className="text-[10px] text-slate-500">espèces, DZD</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-3">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Versé aujourd'hui</span>
                  <div className="font-black text-indigo-400 font-mono mt-1">{caisseJour ? fmt(caisseJour.periode_verse_admin) : '—'}</div>
                  <span className="text-[10px] text-slate-500">à l'administration, DZD</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-3">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total encaissé (espèces)</span>
                  <div className="font-black text-emerald-400 font-mono mt-1">{caisse ? fmt(caisse.cumul_encaisse_especes) : '—'}</div>
                  <span className="text-[10px] text-slate-500">depuis le début, DZD</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-3">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total versé</span>
                  <div className="font-black text-indigo-400 font-mono mt-1">{caisse ? fmt(caisse.cumul_verse_admin) : '—'}</div>
                  <span className="text-[10px] text-slate-500">depuis le début, DZD</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-3">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Chiffre d'affaires (ventes)</span>
                  <div className="font-black text-white font-mono mt-1">{caisse ? fmt(caisse.periode_ca) : '—'} DZD</div>
                  <span className="text-[10px] text-slate-500">{ventesTerrain.length} livraisons directes terrain</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-3">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Reste dû par les clients</span>
                  <div className="font-black text-amber-400 font-mono mt-1">{caisse ? fmt(caisse.creances_clients) : '—'} DZD</div>
                  <span className="text-[10px] text-slate-500">
                    {caisse ? `${caisse.nb_clients_debiteurs} client(s) débiteur(s) • crédit accordé à la vente : ${fmt(caisse.periode_credit)}` : ''}
                  </span>
                </div>
                <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-3">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Valeur du camion</span>
                  <div className="font-black text-purple-400 font-mono mt-1">{caisse ? fmt(caisse.camion_valeur) : '—'} DZD</div>
                  <span className="text-[10px] text-slate-500">stock actuel</span>
                </div>
              </div>
            </div>

            {/* Historique des versements remis à l'administration */}
            <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 space-y-4 shadow">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Receipt size={16} className="text-indigo-400" />
                <span>Mes versements à l'administration</span>
              </h3>
              {remises.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Aucun versement enregistré. Il apparaît ici dès que l'administration reçoit votre argent.
                </div>
              ) : (
                <div className="space-y-2">
                  {remises.map((r) => (
                    <div
                      key={r.id}
                      className={`p-3.5 rounded-2xl bg-slate-900/80 border border-slate-700/80 flex items-center justify-between text-xs ${
                        r.statut === 'Annulé' ? 'opacity-50' : ''
                      }`}
                    >
                      <div>
                        <div className="font-bold text-white">{r.numero}</div>
                        <span className="text-[10px] text-slate-400">
                          {r.date_vers}{r.reference ? ` • ${r.reference}` : ''}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-black font-mono ${r.statut === 'Annulé' ? 'line-through text-slate-400' : 'text-indigo-300'}`}>
                          {fmt(r.montant)} DZD
                        </span>
                        {r.statut === 'Annulé' && <div className="text-[10px] text-red-400">Annulé</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Encaisser un règlement chez un client/prospect */}
            <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 space-y-4 shadow">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Scale size={16} className="text-indigo-400" />
                <span>Encaisser un Versement chez un Client</span>
              </h3>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (encaisserMontant <= 0) return;
                  if (!encaisserTiersId) {
                    alert('Sélectionnez un client dans la liste.');
                    return;
                  }
                  const tiers = prospects.find((t: any) => String(t.id) === encaisserTiersId);
                  if (!tiers) {
                    alert('Client introuvable, actualisez la liste.');
                    return;
                  }
                  try {
                    await api.encaisserVersement({
                      montant: encaisserMontant,
                      mode: encaisserMode,
                      nom_client: tiers.nom,
                      code_client: tiers.code,
                      is_prospect: true,
                      prospect_id: tiers.id,
                    });
                    setEncaisserMontant(0);
                    setEncaisserTiersId('');
                    setEncaisserRecherche('');
                    alert(`Versement de ${fmt(encaisserMontant)} DZD encaissé : ${tiers.nom}`);
                    loadBackendData();
                  } catch (err: any) {
                    alert(`Erreur : ${err.message}`);
                  }
                }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs"
              >
                <div className="sm:col-span-2 space-y-2">
                  <input
                    type="text"
                    placeholder="Rechercher un client (nom ou code)…"
                    value={encaisserRecherche}
                    onChange={(e) => setEncaisserRecherche(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                  <select
                    required
                    value={encaisserTiersId}
                    onChange={(e) => setEncaisserTiersId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">— Choisir un client —</option>
                    {prospects
                      .filter((t: any) => {
                        const q = encaisserRecherche.trim().toLowerCase();
                        return (
                          !q ||
                          String(t.nom || '').toLowerCase().includes(q) ||
                          String(t.code || '').toLowerCase().includes(q)
                        );
                      })
                      .map((t: any) => (
                        <option key={t.id} value={String(t.id)}>
                          {t.nom}
                          {t.code ? ` (${t.code})` : ''}
                          {t.solde ? ` — solde ${fmt(t.solde)}` : ''}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Montant Reçu (DZD) :</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="Ex: 15000"
                      value={encaisserMontant || ''}
                      onChange={(e) => setEncaisserMontant(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl transition shadow flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Plus size={15} />
                    <span>Enregistrer Encaissement</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Historique des ventes directes sur camion */}
            <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 space-y-4 shadow">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Truck size={16} className="text-emerald-400" />
                <span>Journal des Ventes Directes Terrain (Tournée en cours)</span>
              </h3>

              {ventesTerrain.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Aucune vente terrain enregistrée. Vos ventes validées apparaîtront ici.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {ventesTerrain.map((v) => (
                    <div
                      key={v.id}
                      className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-700/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-white flex items-center space-x-2">
                          <span>{v.client_nom}</span>
                          <span className="text-[10px] text-slate-400">• {v.date_bon}</span>
                        </div>
                        <span className="text-[11px] text-emerald-400">{v.numero} • {v.statut}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-white font-mono">{Number(v.total).toLocaleString()} DZD</span>
                        <div className="text-[10px] text-slate-400">{v.articles_count} articles</div>
                        {Number(v.reste_payer) > 0 && (
                          <div className="text-[10px] text-amber-400">
                            Reste {Number(v.reste_payer).toLocaleString()} DZD
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* BONS DE LIVRAISON CLIENT */}
        {navTab === 'bons' && authRole === 'client' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Package size={16} className="text-blue-400" />
              <span>Vos Bons de Livraison</span>
            </h3>
            {ventes.length === 0 ? (
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center text-xs text-slate-400">
                Aucun bon de livraison enregistré.
              </div>
            ) : (
              <div className="space-y-3">
                {ventes.map((vente) => (
                  <section
                    key={vente.id}
                    className="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 pb-3">
                      <div>
                        <div className="font-mono font-bold text-blue-400">
                          BL {vente.numero}
                        </div>
                        <div className="text-xs text-slate-400">
                          {vente.date_bon} · {vente.statut}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase text-slate-400">Total</div>
                        <div className="font-mono font-bold text-white">
                          {Number(vente.total || 0).toLocaleString('fr-FR')} DZD
                        </div>
                      </div>
                    </div>

                    {(vente.lignes || []).length === 0 ? (
                      <p className="text-xs text-slate-400">Aucun détail d’article pour ce bon.</p>
                    ) : (
                      <div className="divide-y divide-slate-700/70">
                        {vente.lignes.map((ligne: any, index: number) => (
                          <div
                            key={`${ligne.produit_id}-${index}`}
                            className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs"
                          >
                            <div>
                              <div className="font-semibold text-white">{ligne.designation}</div>
                              <div className="text-slate-400">
                                {Number(ligne.quantite || 0).toLocaleString('fr-FR')} ×{' '}
                                {Number(ligne.prix_unitaire || 0).toLocaleString('fr-FR')} DZD
                              </div>
                            </div>
                            <div className="font-mono font-semibold text-slate-200">
                              {Number(ligne.total || 0).toLocaleString('fr-FR')} DZD
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FACTURES CLIENT */}
        {navTab === 'factures' && authRole === 'client' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Receipt size={16} className="text-purple-400" />
              <span>Vos Factures Officielles</span>
            </h3>
            {factures.length === 0 ? (
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center text-xs text-slate-400">
                Aucune facture enregistrée.
              </div>
            ) : (
              <div className="space-y-3">
                {factures.map((fac) => (
                  <div key={fac.id} className="bg-slate-800 border border-slate-700/80 rounded-2xl p-4 flex justify-between items-center">
                    <div>
                      <span className="font-mono font-bold text-blue-400">{fac.numero}</span>
                      <div className="text-xs text-slate-400">{fac.date_facture}</div>
                    </div>
                    <span className="font-mono font-bold text-white">{fac.total_ttc?.toLocaleString()} DZD</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

          {/* SITUATION CLIENT */}
        {navTab === 'situation' && authRole === 'client' && (
          <div className="space-y-4">
            {/* En-tête + filtre de période */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-white">Relevé de Compte</h3>
                  <p className="text-xs text-slate-400">
                    {situation?.client_nom || clientProfile?.nom} • {situation?.client_code || clientProfile?.code}
                  </p>
                </div>
                <button
                  onClick={() => loadSituation()}
                  className="p-2 rounded-xl bg-slate-700 text-slate-200 hover:bg-slate-600 cursor-pointer"
                  title="Actualiser"
                >
                  <RefreshCw size={14} className={sitLoading ? 'animate-spin' : ''} />
                </button>
              </div>
              <div className="flex flex-wrap items-end gap-2 text-[11px] text-slate-400">
                <label>
                  Du
                  <input
                    type="date"
                    value={sitDebut}
                    onChange={(e) => setSitDebut(e.target.value)}
                    className="mt-1 block rounded-lg bg-slate-900 border border-slate-700 px-2 py-1 text-xs text-white"
                  />
                </label>
                <label>
                  Au
                  <input
                    type="date"
                    value={sitFin}
                    onChange={(e) => setSitFin(e.target.value)}
                    className="mt-1 block rounded-lg bg-slate-900 border border-slate-700 px-2 py-1 text-xs text-white"
                  />
                </label>
                <button
                  onClick={() => loadSituation()}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer"
                >
                  Appliquer
                </button>
                {(sitDebut || sitFin) && (
                  <button
                    onClick={() => {
                      setSitDebut('');
                      setSitFin('');
                      loadSituation('', '');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-200 text-xs cursor-pointer"
                  >
                    Effacer
                  </button>
                )}
              </div>
            </div>

            {!situation ? (
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center text-xs text-slate-400">
                {sitLoading ? 'Chargement du relevé...' : 'Relevé indisponible. Vérifiez la connexion au serveur.'}
              </div>
            ) : (
              <>
                {/* Résumé */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-slate-800 border border-slate-700 rounded-2xl p-3">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total facturé</span>
                    <span className="text-sm font-black text-white font-mono">{fmtDA(situation.total_debit)}</span>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-2xl p-3">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total réglé</span>
                    <span className="text-sm font-black text-emerald-400 font-mono">{fmtDA(situation.total_credit)}</span>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-2xl p-3">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Solde antérieur</span>
                    <span className="text-sm font-black text-slate-200 font-mono">{fmtDA(situation.solde_report)}</span>
                  </div>
                </div>

                {/* Tableau des mouvements */}
                {situation.lignes.length === 0 ? (
                  <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center text-xs text-slate-400">
                    Aucun mouvement sur cette période.
                  </div>
                ) : (
                  <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-x-auto">
                    <table className="w-full min-w-[620px] text-left text-xs">
                      <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-700">
                        <tr>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Pièce</th>
                          <th className="px-3 py-2">Libellé</th>
                          <th className="px-3 py-2 text-right">Débit</th>
                          <th className="px-3 py-2 text-right">Crédit</th>
                          <th className="px-3 py-2 text-right">Solde</th>
                        </tr>
                      </thead>
                      <tbody>
                        {situation.lignes.map((l: any, i: number) => (
                          <tr key={`${l.type}-${l.numero}-${i}`} className="border-b border-slate-700/60">
                            <td className="px-3 py-2 text-slate-300 whitespace-nowrap">{l.date}</td>
                            <td className="px-3 py-2 font-mono font-bold text-blue-400">{l.numero}</td>
                            <td className="px-3 py-2 text-slate-300">{l.libelle}</td>
                            <td className="px-3 py-2 text-right font-mono text-white">
                              {l.debit > 0 ? fmtDA(l.debit) : ''}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-emerald-400">
                              {l.credit > 0 ? fmtDA(l.credit) : ''}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-slate-100">
                              {fmtDA(l.solde)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Situation finale */}
                <div
                  className={`rounded-2xl border p-5 text-center ${
                    situation.solde_final > 0
                      ? 'bg-amber-500/10 border-amber-500/40'
                      : 'bg-emerald-500/10 border-emerald-500/40'
                  }`}
                >
                  <span className="text-[11px] text-slate-400 uppercase font-semibold block">
                    Situation finale
                  </span>
                  <div
                    className={`text-2xl font-black font-mono ${
                      situation.solde_final > 0 ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {fmtDA(Math.abs(situation.solde_final))} DZD
                  </div>
                  <span className="text-xs text-slate-300">
                    {situation.solde_final > 0
                      ? 'Montant restant à payer'
                      : situation.solde_final < 0
                      ? 'Crédit en votre faveur'
                      : 'Compte soldé'}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* PROFIL */}
        {navTab === 'profil' && (
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 max-w-lg space-y-4">
            <h3 className="text-base font-bold text-white">
              {authRole === 'vendeur' ? 'Compte Commercial' : 'Informations Entreprise'}
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-700">
                <span className="text-slate-400">Nom :</span>
                <span className="font-bold text-white">
                  {authRole === 'vendeur' ? vendeurProfile?.nom : clientProfile?.nom}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-700">
                <span className="text-slate-400">Code :</span>
                <span className="font-mono font-bold text-blue-400">
                  {authRole === 'vendeur' ? vendeurProfile?.code : clientProfile?.code}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

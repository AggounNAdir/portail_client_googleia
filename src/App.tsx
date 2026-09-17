import React, { useState, useEffect } from 'react';
import {
  Package,
  FileText,
  ShoppingCart,
  MapPin,
  CreditCard,
  Wallet,
  User,
} from 'lucide-react';
import { authService } from './services/authService';
import { vendeurAuthService } from './services/vendeurAuthService';
import { CartItem, ProduitCatalogue, CommandeOut } from './types';
import { Header } from './components/Header';
import { NavigationRail, NavTabItem } from './components/NavigationRail';
import { BottomNavBar } from './components/BottomNavBar';
import { LoginPage } from './views/LoginPage';
import { CataloguePage } from './views/CataloguePage';
import { CommandesPage } from './views/CommandesPage';
import { CartPage } from './views/CartPage';
import { AndrowayTourneePage } from './views/AndrowayTourneePage';
import { PosCaissePage } from './views/PosCaissePage';
import { FinancesPage } from './views/FinancesPage';
import { ProfilePage } from './views/ProfilePage';

export type UserRole = 'client' | 'vendeur';

const CART_STORAGE_KEY = 'portail_client_cart';

export const App: React.FC = () => {
  const [userRole, setUserRole] = useState<UserRole | null>(() => {
    if (vendeurAuthService.isAuthenticated()) return 'vendeur';
    if (authService.isAuthenticated()) return 'client';
    return null;
  });

  const [currentTab, setCurrentTab] = useState<string>(() => {
    if (vendeurAuthService.isAuthenticated()) return 'androway';
    return 'catalogue';
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.some((item: any) => item.produit?.code === 'ART-001')) {
          localStorage.removeItem(CART_STORAGE_KEY);
          return [];
        }
        return parsed;
      } catch (_) {}
    }
    return [];
  });

  // Sauvegarde panier dans localStorage
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  // Écoute des événements d'expiration de session (401)
  useEffect(() => {
    const handleClientUnauthorized = () => {
      if (userRole === 'client') {
        setUserRole(null);
      }
    };
    const handleVendeurUnauthorized = () => {
      if (userRole === 'vendeur') {
        setUserRole(null);
      }
    };

    window.addEventListener('auth:unauthorized', handleClientUnauthorized);
    window.addEventListener('vendeur:unauthorized', handleVendeurUnauthorized);

    return () => {
      window.removeEventListener('auth:unauthorized', handleClientUnauthorized);
      window.removeEventListener('vendeur:unauthorized', handleVendeurUnauthorized);
    };
  }, [userRole]);

  const handleAddToCart = (produit: ProduitCatalogue, quantite: number = 1) => {
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.produit.id === produit.id);
      if (existingIndex !== -1) {
        const next = [...prevCart];
        next[existingIndex] = {
          ...next[existingIndex],
          quantite: next[existingIndex].quantite + quantite,
        };
        return next;
      }
      return [...prevCart, { produit, quantite }];
    });
  };

  const handleUpdateQuantity = (produitId: number, quantite: number) => {
    if (quantite <= 0) {
      handleRemoveFromCart(produitId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.produit.id === produitId ? { ...item, quantite } : item
      )
    );
  };

  const handleRemoveFromCart = (produitId: number) => {
    setCart((prevCart) => prevCart.filter((item) => item.produit.id !== produitId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleLogout = async () => {
    await authService.logout();
    await vendeurAuthService.logout();
    setUserRole(null);
    setCurrentTab('catalogue');
  };

  const handleLoginSuccess = (role: UserRole) => {
    setUserRole(role);
    if (role === 'vendeur') {
      setCurrentTab('androway'); // Redirige directement vers la tournée Androway
    } else {
      setCurrentTab('catalogue'); // Redirige vers le catalogue client
    }
  };

  if (!userRole) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantite, 0);

  // Configuration des onglets selon le rôle de l'utilisateur connecté
  const clientTabs: (NavTabItem & { title: string; subtitle: string })[] = [
    {
      id: 'catalogue',
      label: 'Produits',
      icon: Package,
      title: 'Catalogue Produits',
      subtitle: 'Consultez les prix et disponibilités en temps réel',
    },
    {
      id: 'commandes',
      label: 'Commandes',
      icon: FileText,
      title: 'Historique Commandes',
      subtitle: 'Suivi de vos commandes passées',
    },
    {
      id: 'panier',
      label: 'Panier',
      icon: ShoppingCart,
      badge: totalCartCount,
      title: 'Mon Panier',
      subtitle: 'Validation et devis de commande',
    },
    {
      id: 'finances',
      label: 'Finances',
      icon: Wallet,
      title: 'Finances & Règlements',
      subtitle: 'Consultation de vos factures et règlements',
    },
    {
      id: 'compte',
      label: 'Compte',
      icon: User,
      title: 'Mon Compte Client',
      subtitle: 'Détails de tarification et solde comptable',
    },
  ];

  const vendeurTabs: (NavTabItem & { title: string; subtitle: string })[] = [
    {
      id: 'androway',
      label: 'Androway',
      icon: MapPin,
      title: 'Silwane Androway',
      subtitle: 'Gestion de tournée commerciale et pointage terrain',
    },
    {
      id: 'caisse',
      label: 'Caisse POS',
      icon: CreditCard,
      title: 'Caisse Comptoir POS',
      subtitle: 'Encaissement rapide et impression thermique 80mm',
    },
    {
      id: 'catalogue',
      label: 'Produits',
      icon: Package,
      title: 'Catalogue & Stock',
      subtitle: 'Consultation des stocks et prix articles',
    },
    {
      id: 'compte',
      label: 'Compte',
      icon: User,
      title: 'Mon Compte Commercial',
      subtitle: 'Détails du commercial et statut de synchronisation',
    },
  ];

  const activeTabs = userRole === 'vendeur' ? vendeurTabs : clientTabs;
  const currentTabMeta = activeTabs.find((t) => t.id === currentTab) || activeTabs[0];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 font-sans">
      {/* Navigation latérale Desktop */}
      <NavigationRail
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        tabs={activeTabs}
        userRole={userRole}
      />

      {/* Zone de contenu principale */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          title={currentTabMeta.title}
          subtitle={currentTabMeta.subtitle}
          onLogout={handleLogout}
          showSyncBadge={currentTab === 'androway' || currentTab === 'caisse'}
          userRole={userRole}
        />

        <main className="flex-1 overflow-y-auto">
          {currentTab === 'catalogue' && (
            <CataloguePage onAddToCart={handleAddToCart} userRole={userRole} />
          )}
          {currentTab === 'commandes' && <CommandesPage />}
          {currentTab === 'panier' && (
            <CartPage
              cart={cart}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveFromCart}
              onClearCart={handleClearCart}
              onOrderCompleted={(_cmd: CommandeOut) => {
                setCurrentTab('commandes'); // Redirection vers l'historique des commandes
              }}
              onGoToCatalogue={() => setCurrentTab('catalogue')}
            />
          )}
          {currentTab === 'androway' && <AndrowayTourneePage />}
          {currentTab === 'caisse' && <PosCaissePage />}
          {currentTab === 'finances' && <FinancesPage />}
          {currentTab === 'compte' && <ProfilePage onLogout={handleLogout} userRole={userRole} />}
        </main>
      </div>

      {/* Navigation inférieure Mobile */}
      <BottomNavBar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        tabs={activeTabs}
      />
    </div>
  );
};

export default App;

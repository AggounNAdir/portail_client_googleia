import React, { useState, useEffect } from 'react';
import { authService } from './services/authService';
import { vendeurAuthService } from './services/vendeurAuthService';
import { CartItem, ProduitCatalogue, CommandeOut } from './types';
import { Header } from './components/Header';
import { NavigationRail } from './components/NavigationRail';
import { BottomNavBar } from './components/BottomNavBar';
import { LoginPage, UserRole } from './views/LoginPage';
import { CataloguePage } from './views/CataloguePage';
import { CommandesPage } from './views/CommandesPage';
import { CartPage } from './views/CartPage';
import { AndrowayTourneePage } from './views/AndrowayTourneePage';
import { PosCaissePage } from './views/PosCaissePage';
import { FinancesPage } from './views/FinancesPage';
import { ProfilePage } from './views/ProfilePage';

const CART_STORAGE_KEY = 'portail_client_cart';

export const App: React.FC = () => {
  const [userRole, setUserRole] = useState<UserRole | null>(() => {
    if (vendeurAuthService.isAuthenticated()) return 'vendeur';
    if (authService.isAuthenticated()) return 'client';
    return null;
  });

  const [currentTab, setCurrentTab] = useState<number>(() => {
    if (vendeurAuthService.isAuthenticated()) return 3; // Silwane Androway tournée par défaut
    return 0;
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
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
    setCurrentTab(0);
  };

  const handleLoginSuccess = (role: UserRole) => {
    setUserRole(role);
    if (role === 'vendeur') {
      setCurrentTab(3); // Redirige directement vers la tournée Androway
    } else {
      setCurrentTab(0); // Redirige vers le catalogue client
    }
  };

  if (!userRole) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const tabTitles = [
    'Catalogue Produits',
    'Historique Commandes',
    'Mon Panier',
    'Silwane Androway',
    'Caisse Comptoir POS',
    'Finances & Règlements',
    userRole === 'vendeur' ? 'Mon Compte Commercial' : 'Mon Compte Client',
  ];

  const tabSubtitles = [
    'Consultez les prix et disponibilités en temps réel',
    'Suivi de vos commandes passées',
    'Validation et devis de commande',
    'Gestion de tournée commerciale et pointage terrain',
    'Encaissement rapide et impression thermique 80mm',
    'Consultation de vos factures et règlements',
    userRole === 'vendeur'
      ? 'Détails du commercial et statut de synchronisation'
      : 'Détails de tarification et solde comptable',
  ];

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantite, 0);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 font-sans">
      {/* Navigation latérale Desktop */}
      <NavigationRail
        currentIndex={currentTab}
        onSelectIndex={setCurrentTab}
        cartCount={totalCartCount}
      />

      {/* Zone de contenu principale */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          title={tabTitles[currentTab]}
          subtitle={tabSubtitles[currentTab]}
          onLogout={handleLogout}
          showSyncBadge={currentTab === 3 || currentTab === 4}
          userRole={userRole}
        />

        <main className="flex-1 overflow-y-auto">
          {currentTab === 0 && <CataloguePage onAddToCart={handleAddToCart} />}
          {currentTab === 1 && <CommandesPage />}
          {currentTab === 2 && (
            <CartPage
              cart={cart}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveFromCart}
              onClearCart={handleClearCart}
              onOrderCompleted={(_cmd: CommandeOut) => {
                setCurrentTab(1); // Redirection vers l'historique des commandes
              }}
              onGoToCatalogue={() => setCurrentTab(0)}
            />
          )}
          {currentTab === 3 && <AndrowayTourneePage />}
          {currentTab === 4 && <PosCaissePage />}
          {currentTab === 5 && <FinancesPage />}
          {currentTab === 6 && <ProfilePage onLogout={handleLogout} userRole={userRole} />}
        </main>
      </div>

      {/* Navigation inférieure Mobile */}
      <BottomNavBar
        currentIndex={currentTab}
        onSelectIndex={setCurrentTab}
        cartCount={totalCartCount}
      />
    </div>
  );
};

export default App;

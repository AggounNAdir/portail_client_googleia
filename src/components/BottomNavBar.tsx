import React from 'react';
import {
  Package,
  FileText,
  ShoppingCart,
  MapPin,
  CreditCard,
  Wallet,
  User,
} from 'lucide-react';

interface BottomNavBarProps {
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  cartCount: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentIndex,
  onSelectIndex,
  cartCount,
}) => {
  const destinations = [
    { label: 'Produits', icon: Package },
    { label: 'Commandes', icon: FileText },
    { label: 'Panier', icon: ShoppingCart, badge: cartCount },
    { label: 'Androway', icon: MapPin },
    { label: 'Caisse', icon: CreditCard },
    { label: 'Finances', icon: Wallet },
    { label: 'Compte', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-slate-200 bg-white/95 px-1 backdrop-blur-md md:hidden">
      {destinations.map((item, index) => {
        const Icon = item.icon;
        const isSelected = currentIndex === index;

        return (
          <button
            key={item.label}
            onClick={() => onSelectIndex(index)}
            className={`relative flex flex-col items-center justify-center py-1 text-[10px] font-medium transition-colors ${
              isSelected ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="relative mb-0.5">
              <Icon className={`h-5 w-5 ${isSelected ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white shadow-xs">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

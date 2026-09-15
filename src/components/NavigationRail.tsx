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

interface NavigationProps {
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  cartCount: number;
}

export const NavigationRail: React.FC<NavigationProps> = ({
  currentIndex,
  onSelectIndex,
  cartCount,
}) => {
  const destinations = [
    { label: 'Produits', icon: Package },
    { label: 'Commandes', icon: FileText },
    { label: 'Panier', icon: ShoppingCart, badge: cartCount },
    { label: 'Androway', icon: MapPin },
    { label: 'Caisse POS', icon: CreditCard },
    { label: 'Finances', icon: Wallet },
    { label: 'Compte', icon: User },
  ];

  return (
    <aside className="hidden h-screen w-20 flex-col items-center border-r border-slate-200 bg-white py-4 shadow-xs md:flex lg:w-56">
      {/* Brand Logo */}
      <div className="mb-6 flex items-center gap-3 px-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-black text-white shadow-sm">
          PC
        </div>
        <div className="hidden text-left lg:block">
          <div className="text-sm font-bold text-slate-900 leading-tight">Portail Client</div>
          <div className="text-[11px] font-medium text-slate-400">Silwane ERP</div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex w-full flex-1 flex-col gap-1.5 px-2">
        {destinations.map((item, index) => {
          const Icon = item.icon;
          const isSelected = currentIndex === index;

          return (
            <button
              key={item.label}
              onClick={() => onSelectIndex(index)}
              className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                isSelected
                  ? 'bg-blue-50 text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`h-5 w-5 transition-transform ${
                    isSelected ? 'text-blue-600 scale-105' : 'text-slate-500'
                  }`}
                />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="hidden truncate lg:inline">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-slate-100 pt-3 text-center text-[10px] text-slate-400">
        <span className="hidden lg:inline">v1.0.0 • IntelliX</span>
      </div>
    </aside>
  );
};

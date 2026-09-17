import React from 'react';
import { NavTabItem } from './NavigationRail';

interface BottomNavBarProps {
  currentTab: string;
  onSelectTab: (tabId: string) => void;
  tabs: NavTabItem[];
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentTab,
  onSelectTab,
  tabs,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-slate-200 bg-white/95 px-1 backdrop-blur-md md:hidden">
      {tabs.map((item) => {
        const Icon = item.icon;
        const isSelected = currentTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
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

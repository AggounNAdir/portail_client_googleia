import React, { useState, useEffect } from 'react';
import { Search, X, Plus, RefreshCw, CheckCircle2, AlertTriangle, PackageX } from 'lucide-react';
import { ProduitCatalogue } from '../types';
import { produitService } from '../services/produitService';

interface CataloguePageProps {
  onAddToCart: (produit: ProduitCatalogue, quantite: number) => void;
}

export const CataloguePage: React.FC<CataloguePageProps> = ({ onAddToCart }) => {
  const [produits, setProduits] = useState<ProduitCatalogue[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addedNotice, setAddedNotice] = useState<string | null>(null);

  const loadProduits = async (query?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await produitService.getCatalogue(query);
      setProduits(items);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger le catalogue');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProduits();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadProduits(searchQuery);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    loadProduits('');
  };

  const handleAdd = (prd: ProduitCatalogue) => {
    onAddToCart(prd, 1);
    setAddedNotice(`Ajouté : ${prd.designation}`);
    setTimeout(() => setAddedNotice(null), 2000);
  };

  return (
    <div className="relative mx-auto max-w-5xl p-4 sm:p-6">
      {/* Barre d'action supérieure */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par référence ou nom..."
            className="w-full rounded-2xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm shadow-xs transition-colors focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-100"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-2.5 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        <button
          type="button"
          onClick={() => loadProduits(searchQuery)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* Notification Toast */}
      {addedNotice && (
        <div className="fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xl md:bottom-8">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          {addedNotice}
        </div>
      )}

      {/* Contenu principal */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-3 text-sm font-medium">Chargement des articles...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-red-200 bg-red-50 py-16 text-center text-red-700">
          <AlertTriangle className="h-10 w-10 text-red-500" />
          <p className="mt-2 text-sm font-semibold">{error}</p>
          <button
            onClick={() => loadProduits(searchQuery)}
            className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700"
          >
            Réessayer
          </button>
        </div>
      ) : produits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
          <PackageX className="h-12 w-12 text-slate-300" />
          <p className="mt-3 text-base font-semibold text-slate-600">
            Aucun article trouvé dans le catalogue
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Essayez de modifier vos termes de recherche
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {produits.map((prd) => {
            const enStock = prd.stockActuel > 0;

            return (
              <div
                key={prd.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400">
                      {prd.code}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        enStock
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {enStock ? `${prd.stockActuel} ${prd.unite} dispo` : 'Rupture'}
                    </span>
                  </div>

                  <h3 className="mt-2 text-sm font-bold text-slate-900 leading-snug">
                    {prd.designation}
                  </h3>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                  <div>
                    <div className="text-base font-black text-blue-600">
                      {(prd.prixUnitaire ?? 0).toFixed(2)} € <span className="text-xs font-normal text-slate-500">HT</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Unité : {prd.unite || 'U'} • TVA {prd.tva ?? 19}%
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAdd(prd)}
                    className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-blue-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Ajouter
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

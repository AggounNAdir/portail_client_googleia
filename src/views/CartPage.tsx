import React, { useState } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { CartItem, CommandeOut } from '../types';
import { commandeService } from '../services/commandeService';

interface CartPageProps {
  cart: CartItem[];
  onUpdateQuantity: (produitId: number, quantite: number) => void;
  onRemoveItem: (produitId: number) => void;
  onClearCart: () => void;
  onOrderCompleted: (createdCmd: CommandeOut) => void;
  onGoToCatalogue: () => void;
}

export const CartPage: React.FC<CartPageProps> = ({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOrderCompleted,
  onGoToCatalogue,
}) => {
  const [observations, setObservations] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successDialogCmd, setSuccessDialogCmd] = useState<CommandeOut | null>(null);

  const totalHT = cart.reduce(
    (sum, item) => sum + (item.produit?.prixUnitaire || 0) * (item.quantite || 1),
    0
  );
  const totalArticles = cart.reduce((sum, item) => sum + (item.quantite || 0), 0);

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;

    setIsSubmitting(true);
    try {
      const created = await commandeService.creerCommande({
        observations: observations.trim() || undefined,
        lignes: cart.map((i) => ({
          produitId: i.produit.id,
          quantite: i.quantite,
        })),
      });

      onClearCart();
      setSuccessDialogCmd(created);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la validation de la commande');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
            Mon Panier de Commande
          </h2>
          <p className="text-xs text-slate-500">
            {cart.length > 0 ? `${cart.length} référence(s) sélectionnée(s)` : 'Votre panier est vide'}
          </p>
        </div>

        {cart.length > 0 && (
          <button
            onClick={onClearCart}
            className="text-xs font-semibold text-red-600 hover:text-red-700"
          >
            Vider le panier
          </button>
        )}
      </div>

      {cart.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white py-20 text-center text-slate-400">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <ShoppingCart className="h-8 w-8" />
          </div>
          <p className="mt-4 text-base font-semibold text-slate-700">
            Votre panier est actuellement vide
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Consultez le catalogue pour ajouter des produits
          </p>
          <button
            onClick={onGoToCatalogue}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
          >
            Parcourir le catalogue
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Liste des articles */}
          <div className="space-y-3 lg:col-span-2">
            {cart.map((item) => {
              const itemTotal = item.produit.prixUnitaire * item.quantite;

              return (
                <div
                  key={item.produit.id}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400">
                        {item.produit.code}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        ({item.produit.unite})
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 leading-snug">
                      {item.produit.designation}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-blue-600">
                      {(item.produit?.prixUnitaire || 0).toFixed(2)} € HT
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-2 sm:border-0 sm:pt-0">
                    <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.produit.id, item.quantite - 1)}
                        className="rounded-lg p-1 text-slate-600 hover:bg-white hover:text-slate-900"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-8 text-center text-xs font-bold text-slate-900">
                        {item.quantite}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.produit.id, item.quantite + 1)}
                        className="rounded-lg p-1 text-slate-600 hover:bg-white hover:text-slate-900"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-black text-slate-900">
                        {((item.produit?.prixUnitaire || 0) * item.quantite).toFixed(2)} €
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.produit.id)}
                      className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Remarques / Observations */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Instructions de livraison / Observations
              </label>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Ex: Livrer avant 14h, numéro de bon client..."
                rows={2}
                className="w-full rounded-xl border border-slate-300 p-3 text-xs focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Récapitulatif commande */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900">Récapitulatif</h3>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Articles au total</span>
                  <span className="font-semibold text-slate-900">{totalArticles}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Sous-total HT</span>
                  <span className="font-semibold text-slate-900">{totalHT.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>TVA estimée (19%)</span>
                  <span className="font-semibold text-slate-900">{(totalHT * 0.19).toFixed(2)} €</span>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-bold text-slate-900">Total TTC estimé</span>
                    <span className="text-lg font-black text-blue-600">
                      {(totalHT * 1.19).toFixed(2)} €
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmitOrder}
                disabled={isSubmitting || cart.length === 0}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    Confirmer la commande
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialogue de confirmation de commande réussie */}
      {successDialogCmd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 text-green-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900">
              Commande confirmée !
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Votre commande a été transmise avec succès au système central.
            </p>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Numéro :</span>
                <span className="font-mono font-bold text-slate-800">{successDialogCmd.numero}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Montant HT :</span>
                <span className="font-bold text-blue-600">{successDialogCmd.totalEstime.toFixed(2)} €</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const cmd = successDialogCmd;
                setSuccessDialogCmd(null);
                onOrderCompleted(cmd);
              }}
              className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
            >
              Voir mes commandes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

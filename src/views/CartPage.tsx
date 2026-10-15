import React, { useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Send,
  PackageCheck,
  AlertCircle,
} from 'lucide-react';
import { CartItem, CommandeOut, getProductConversionFactor, getProductUnitPrice } from '../types';
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
  const [submitError, setSubmitError] = useState<string | null>(null);

  const totalHT = cart.reduce((sum, item) => {
    const pu = getProductUnitPrice(item.produit);
    const facteur = getProductConversionFactor(item.produit);
    return sum + pu * facteur * (item.quantite || 1);
  }, 0);

  const totalArticles = cart.reduce((sum, item) => sum + (item.quantite || 0), 0);
  const totalTTC = totalHT * 1.19;

  const handleSubmitOrder = async () => {
    if (cart.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const created = await commandeService.creerCommande({
        observations: observations.trim() || undefined,
        total: totalHT,
        montantTotal: totalHT,
        lignes: cart.map((i) => {
          const pu = getProductUnitPrice(i.produit);
          const facteur = getProductConversionFactor(i.produit);
          const totalLigne = pu * facteur * (i.quantite || 1);
          return {
            produitId: i.produit.id,
            quantite: i.quantite,
            prixUnitaire: pu,
            facteurConversion: facteur,
            unite: i.produit.unite || 'Pièce',
            total: totalLigne,
          };
        }),
      });

      onClearCart();
      setSuccessDialogCmd(created);
    } catch (err: any) {
      setSubmitError(err.message || 'Erreur lors de la validation de la commande');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 pb-36 lg:pb-16">
      {/* Barre d'entête du panier */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-blue-600" />
            Mon Panier de Commande
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {cart.length > 0
              ? `${cart.length} référence(s) sélectionnée(s) (${totalArticles} colis / unités)`
              : 'Votre panier est actuellement vide'}
          </p>
        </div>

        {cart.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClearCart}
              className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline px-2 py-1"
            >
              Vider le panier
            </button>
            {/* Bouton de validation rapide visible directement en haut de page */}
            <button
              type="button"
              onClick={handleSubmitOrder}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Validation...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Valider la commande
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Alerte Erreur de soumission */}
      {submitError && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <div className="flex-1">{submitError}</div>
        </div>
      )}

      {/* Si panier vide */}
      {cart.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white py-20 px-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <ShoppingCart className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-800">
            Votre panier est actuellement vide
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            Le bouton <strong className="text-slate-700">Valider la commande</strong> s&apos;affichera dès que vous aurez ajouté au moins un produit du catalogue.
          </p>
          <button
            type="button"
            onClick={onGoToCatalogue}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 transition-colors"
          >
            <PackageCheck className="h-4 w-4" />
            Parcourir le catalogue
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Liste des articles du panier */}
          <div className="space-y-3 lg:col-span-2">
            {cart.map((item) => {
              const pu = getProductUnitPrice(item.produit);
              const facteur = getProductConversionFactor(item.produit);
              const itemTotal = pu * facteur * item.quantite;
              const prixColis = pu * facteur;

              return (
                <div
                  key={`cart-item-${item.produit.id}`}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-shadow sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400">
                        {item.produit.code}
                      </span>
                      {facteur > 1 && (
                        <span className="rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                          Colis de {facteur} {item.produit.unite || 'unités'}
                        </span>
                      )}
                    </div>
                    <h4 className="mt-1 text-sm font-bold text-slate-900">
                      {item.produit.designation}
                    </h4>

                    {/* Prix unitaire et colis */}
                    <div className="mt-1 flex flex-wrap items-baseline gap-2">
                      {facteur > 1 ? (
                        <>
                          <span className="text-xs font-bold text-blue-600">
                            {prixColis.toLocaleString('fr-DZ', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{' '}
                            DA / colis
                          </span>
                          <span className="text-[11px] text-slate-500">
                            (P.U unitaire :{' '}
                            {pu.toLocaleString('fr-DZ', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{' '}
                            DA)
                          </span>
                        </>
                      ) : (
                        <span className="font-semibold text-blue-600">
                          {pu.toLocaleString('fr-DZ', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          DA HT
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contrôles de quantité et sous-total */}
                  <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-2 sm:border-0 sm:pt-0">
                    <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.produit.id, item.quantite - 1)}
                        className="rounded-lg p-1 text-slate-600 hover:bg-white hover:text-slate-900 transition-colors"
                        title="Diminuer"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-8 text-center text-xs font-bold text-slate-900">
                        {item.quantite}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.produit.id, item.quantite + 1)}
                        className="rounded-lg p-1 text-slate-600 hover:bg-white hover:text-slate-900 transition-colors"
                        title="Augmenter"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-black text-slate-900">
                        {itemTotal.toLocaleString('fr-DZ', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        DA
                      </div>
                      {facteur > 1 && (
                        <div className="text-[11px] font-semibold text-indigo-600">
                          {item.quantite} colis × {facteur} = {item.quantite * facteur}{' '}
                          {item.produit.unite || 'unités'}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.produit.id)}
                      className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Supprimer la ligne"
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
                placeholder="Ex: Livrer avant 14h, numéro de bon client, contact sur place..."
                rows={2}
                className="w-full rounded-xl border border-slate-300 p-3 text-xs focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Récapitulatif commande (Desktop) */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900">Récapitulatif de la commande</h3>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Nombre d&apos;articles</span>
                  <span className="font-semibold text-slate-900">{cart.length} référence(s)</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Colis / unités totales</span>
                  <span className="font-semibold text-slate-900">{totalArticles}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Sous-total HT</span>
                  <span className="font-semibold text-slate-900">
                    {totalHT.toLocaleString('fr-DZ', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    DA
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>TVA estimée (19%)</span>
                  <span className="font-semibold text-slate-900">
                    {(totalHT * 0.19).toLocaleString('fr-DZ', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    DA
                  </span>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-bold text-slate-900">Total TTC estimé</span>
                    <span className="text-lg font-black text-emerald-600">
                      {totalTTC.toLocaleString('fr-DZ', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      DA
                    </span>
                  </div>
                </div>
              </div>

              {/* BOUTON PRINCIPAL VALIDER LA COMMANDE */}
              <button
                type="button"
                onClick={handleSubmitOrder}
                disabled={isSubmitting || cart.length === 0}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 px-4 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Validation en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    Valider la commande
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <p className="mt-2 text-center text-[11px] text-slate-400">
                La commande sera directement transmise au serveur central.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* BARRE FIXE FLOTTANTE DE VALIDATION MOBILE (TOUJOURS VISIBLE SANS SCROLLER) */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-16 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur-md shadow-2xl">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Total TTC ({totalArticles} colis)
              </div>
              <div className="text-base font-black text-emerald-600 leading-tight">
                {totalTTC.toLocaleString('fr-DZ', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                DA
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmitOrder}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/30 transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Valider la commande
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Dialogue de confirmation de commande réussie */}
      {successDialogCmd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-md my-auto max-h-[90dvh] overflow-y-auto rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 text-green-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900">
              Commande validée avec succès !
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Votre commande a été transmise au système central et enregistrée.
            </p>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Numéro de bon :</span>
                <span className="font-mono font-bold text-slate-800">
                  {successDialogCmd.numero}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Montant HT :</span>
                <span className="font-bold text-blue-600">
                  {(successDialogCmd.totalEstime ?? 0).toLocaleString('fr-DZ', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  DA
                </span>
              </div>
              <div className="flex justify-between py-1 border-t border-slate-200 mt-1 pt-1">
                <span className="text-slate-500">Statut :</span>
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                  {successDialogCmd.statut || 'EN_ATTENTE'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const cmd = successDialogCmd;
                setSuccessDialogCmd(null);
                onOrderCompleted(cmd);
              }}
              className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              Consulter mes commandes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  Printer,
  Plus,
  Minus,
  Trash2,
  Receipt,
  RotateCcw,
  Barcode,
  CheckCircle2,
  X,
  CreditCard,
} from 'lucide-react';
import { PosArticleLigne } from '../types';
import { posThermalPrinterService, ReceiptData } from '../services/posThermalPrinterService';

const ARTICLES_RAPIDES = [
  { designation: 'Paracétamol 500mg B/20', prix: 180.0, codeBarre: '6131102948123' },
  { designation: 'Amoxicilline 1g B/14', prix: 520.0, codeBarre: '6131105829104' },
  { designation: 'Sérum Salé 0.9% 500ml', prix: 220.0, codeBarre: '6131108273619' },
  { designation: 'Oméprazole 20mg B/28', prix: 890.0, codeBarre: '6131109182736' },
  { designation: 'Vitamine C 1000mg Eff.', prix: 450.0, codeBarre: '6131104829102' },
];

export const PosCaissePage: React.FC = () => {
  const [panier, setPanier] = useState<PosArticleLigne[]>([
    {
      id: '1',
      designation: 'Paracétamol 500mg B/20',
      codeBarre: '6131102948123',
      prix: 180,
      quantite: 2,
    },
    {
      id: '2',
      designation: 'Amoxicilline 1g B/14',
      codeBarre: '6131105829104',
      prix: 520,
      quantite: 1,
    },
  ]);

  const [especesRecues, setEspecesRecues] = useState<number>(2000);
  const [modePaiement, setModePaiement] = useState<string>('Espèces');
  const [ticketDialog, setTicketDialog] = useState<{
    bytesLength: number;
    receiptData: ReceiptData;
  } | null>(null);

  const [barcodeInput, setBarcodeInput] = useState('');

  const totalTTC = panier.reduce((sum, item) => sum + item.prix * item.quantite, 0);
  const totalHT = totalTTC / 1.19;
  const tva = totalTTC - totalHT;
  const monnaieRendue = Math.max(0, especesRecues - totalTTC);

  const handleAjouterArticle = (designation: string, prix: number, codeBarre: string) => {
    setPanier((prev) => {
      const idx = prev.findIndex((it) => it.codeBarre === codeBarre);
      if (idx !== -1) {
        const next = [...prev];
        next[idx].quantite += 1;
        return next;
      }
      return [
        ...prev,
        {
          id: Date.now().toString(),
          designation,
          prix,
          codeBarre,
          quantite: 1,
        },
      ];
    });
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    const found = ARTICLES_RAPIDES.find((a) => a.codeBarre === barcodeInput.trim());
    if (found) {
      handleAjouterArticle(found.designation, found.prix, found.codeBarre);
    } else {
      handleAjouterArticle(`Article Scanné ${barcodeInput}`, 300, barcodeInput.trim());
    }
    setBarcodeInput('');
  };

  const handleImprimerTicket = () => {
    const receiptData: ReceiptData = {
      numeroTicket: `TICK-${Date.now().toString().substring(7)}`,
      nomClient: 'Client Comptoir Silwane',
      articles: panier.map((a) => ({
        designation: a.designation,
        quantite: a.quantite,
        prix: a.prix,
        total: a.prix * a.quantite,
      })),
      totalHT,
      tva,
      totalTTC,
      modeReglement: modePaiement,
      especesRecues,
      monnaieRendue,
    };

    const bytes = posThermalPrinterService.generateEscPosReceipt(receiptData);
    setTicketDialog({
      bytesLength: bytes.length,
      receiptData,
    });
  };

  const handleValiderNouvelleVente = () => {
    setPanier([]);
    setTicketDialog(null);
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-5xl flex-col p-4 sm:p-6 pb-20 md:pb-6">
      {/* Raccourcis Articles Rapides */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Raccourcis Articles Caisse
          </span>
          <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-1.5">
            <div className="relative">
              <Barcode className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scanner code-barre..."
                className="h-8 w-44 rounded-xl border border-slate-300 bg-white pl-8 pr-2 text-xs focus:border-blue-600 focus:outline-hidden"
              />
            </div>
            <button
              type="submit"
              className="h-8 rounded-xl bg-slate-800 px-2.5 text-xs font-bold text-white hover:bg-slate-700"
            >
              OK
            </button>
          </form>
        </div>

        <div className="flex flex-wrap gap-2">
          {ARTICLES_RAPIDES.map((art) => (
            <button
              key={art.codeBarre}
              type="button"
              onClick={() => handleAjouterArticle(art.designation, art.prix, art.codeBarre)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:border-blue-300 hover:bg-blue-50"
            >
              <Plus className="h-3.5 w-3.5 text-blue-600" />
              <span>{art.designation}</span>
              <span className="font-bold text-slate-900">({art.prix.toFixed(0)} DA)</span>
            </button>
          ))}
        </div>
      </div>

      {/* Panier Caisse */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        {panier.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-slate-400">
            <Receipt className="h-12 w-12 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-600">
              Panier de caisse vide
            </p>
            <p className="text-xs text-slate-400">
              Scannez un code-barre ou cliquez sur un article rapide
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {panier.map((item, i) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-3 text-xs sm:text-sm"
              >
                <div className="flex-1 pr-2">
                  <div className="font-bold text-slate-900">{item.designation}</div>
                  <div className="font-mono text-[11px] text-slate-400">
                    CB: {item.codeBarre} • {item.prix.toFixed(0)} DZD
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setPanier((prev) => {
                          if (item.quantite > 1) {
                            const n = [...prev];
                            n[i].quantite -= 1;
                            return n;
                          }
                          return prev.filter((_, idx) => idx !== i);
                        });
                      }}
                      className="rounded-lg p-1 text-slate-600 hover:bg-white"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-7 text-center font-bold">{item.quantite}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setPanier((prev) => {
                          const n = [...prev];
                          n[i].quantite += 1;
                          return n;
                        });
                      }}
                      className="rounded-lg p-1 text-slate-600 hover:bg-white"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="w-20 text-right font-black text-slate-900 sm:w-24">
                    {(item.prix * item.quantite).toFixed(0)} DA
                  </div>

                  <button
                    type="button"
                    onClick={() => setPanier((prev) => prev.filter((_, idx) => idx !== i))}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bloc Rendu Monnaie & Total Ticket */}
      <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total TTC Comptoir
            </div>
            <div className="text-2xl font-black text-slate-900 sm:text-3xl">
              {totalTTC.toFixed(2)} <span className="text-lg text-slate-500">DZD</span>
            </div>
            <div className="text-[11px] text-slate-400">
              HT: {totalHT.toFixed(2)} DA • TVA 19%: {tva.toFixed(2)} DA
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl bg-slate-50 p-3">
              <label className="block text-[11px] font-semibold text-slate-500">
                Espèces reçues (DA)
              </label>
              <input
                type="number"
                value={especesRecues}
                onChange={(e) => setEspecesRecues(parseFloat(e.target.value) || 0)}
                className="w-28 rounded-lg border border-slate-300 bg-white p-1 text-sm font-bold text-slate-800"
              />
            </div>

            <div className="rounded-2xl bg-green-50 p-3 border border-green-200">
              <div className="text-[11px] font-semibold text-green-700">
                Rendu monnaie
              </div>
              <div className="text-base font-black text-green-700">
                {monnaieRendue.toFixed(2)} DA
              </div>
            </div>

            <button
              type="button"
              disabled={panier.length === 0}
              onClick={handleImprimerTicket}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-40"
            >
              <Printer className="h-4 w-4 text-teal-400" />
              Encaisser & Imprimer Ticket 80mm
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DIALOG: Ticket 80mm Généré */}
      {ticketDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-slate-900" />
                <h3 className="text-base font-bold text-slate-900">
                  Ticket 80mm Généré
                </h3>
              </div>
              <button
                onClick={() => setTicketDialog(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 text-xs text-slate-600">
              Trame ESC/POS binaire générée avec succès ({ticketDialog.bytesLength} octets).
            </div>

            {/* Visualisation conforme du ticket thermique 80mm */}
            <div className="mt-3 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-[11px] leading-relaxed text-slate-800 shadow-inner">
              <div className="text-center font-bold">GROUPE INTELLIX SILWANE</div>
              <div className="text-center text-[10px] text-slate-500">Distribution Commerciale Algérie</div>
              <div className="text-center text-[10px] text-slate-500">RC: 16/00-098234B02 | NIF: 000216098234851</div>
              <div className="my-2 border-b border-dashed border-slate-300" />
              <div>Ticket : {ticketDialog.receiptData.numeroTicket}</div>
              <div>Client : {ticketDialog.receiptData.nomClient}</div>
              <div className="my-2 border-b border-dashed border-slate-300" />
              <div className="space-y-1">
                {ticketDialog.receiptData.articles.map((a, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="truncate pr-2">{a.designation} (x{a.quantite})</span>
                    <span className="font-bold">{a.total.toFixed(0)} DA</span>
                  </div>
                ))}
              </div>
              <div className="my-2 border-b border-dashed border-slate-300" />
              <div className="flex justify-between font-black text-xs text-slate-900">
                <span>TOTAL TTC :</span>
                <span>{ticketDialog.receiptData.totalTTC.toFixed(2)} DZD</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Espèces reçues :</span>
                <span>{ticketDialog.receiptData.especesRecues?.toFixed(2)} DA</span>
              </div>
              <div className="flex justify-between text-green-700 font-bold">
                <span>Rendu monnaie :</span>
                <span>{ticketDialog.receiptData.monnaieRendue?.toFixed(2)} DA</span>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setTicketDialog(null)}
                className="w-1/3 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={handleValiderNouvelleVente}
                className="inline-flex w-2/3 items-center justify-center gap-1.5 rounded-xl bg-teal-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-teal-700"
              >
                <CheckCircle2 className="h-4 w-4" />
                Valider & Nouvelle Vente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

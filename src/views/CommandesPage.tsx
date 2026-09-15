import React, { useState, useEffect } from 'react';
import { FileText, ChevronDown, ChevronUp, RefreshCw, Clock, AlertCircle } from 'lucide-react';
import { CommandeOut } from '../types';
import { commandeService } from '../services/commandeService';

export const CommandesPage: React.FC = () => {
  const [commandes, setCommandes] = useState<CommandeOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadCommandes = async () => {
    setIsLoading(true);
    try {
      const data = await commandeService.getCommandes();
      setCommandes(data);
    } catch (_) {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCommandes();
  }, []);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
            Historique de vos commandes
          </h2>
          <p className="text-xs text-slate-500">
            Suivi des commandes passées via le portail ou sur le terrain
          </p>
        </div>
        <button
          onClick={loadCommandes}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-3 text-sm font-medium">Chargement des commandes...</p>
        </div>
      ) : commandes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white py-20 text-center text-slate-400">
          <FileText className="h-12 w-12 text-slate-300" />
          <p className="mt-3 text-base font-semibold text-slate-700">
            Aucune commande enregistrée
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Vos commandes créées apparaîtront ici avec leur détail
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {commandes.map((cmd) => {
            const isExpanded = expandedId === cmd.id;

            return (
              <div
                key={cmd.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition-shadow hover:shadow-sm"
              >
                <div
                  onClick={() => toggleExpand(cmd.id)}
                  className="flex cursor-pointer flex-col justify-between gap-2 p-4 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-slate-900">
                          {cmd.numero}
                        </span>
                        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800">
                          {cmd.statut}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                        <Clock className="h-3.5 w-3.5" />
                        {cmd.dateCommande}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 sm:border-0 sm:pt-0">
                    <div className="text-right sm:mr-3">
                      <div className="text-sm font-black text-slate-900">
                        {(cmd.totalEstime ?? 0).toFixed(2)} € <span className="text-xs font-normal text-slate-500">HT</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {(cmd.lignes || []).length} article(s)
                      </div>
                    </div>

                    <div className="text-slate-400">
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/70 p-4">
                    {cmd.observations && (
                      <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                        <span className="font-semibold">Note / Observation :</span> {cmd.observations}
                      </div>
                    )}

                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-100 font-semibold text-slate-600">
                          <tr>
                            <th className="p-2.5">Réf</th>
                            <th className="p-2.5">Désignation</th>
                            <th className="p-2.5 text-center">Qté</th>
                            <th className="p-2.5 text-right">P.U. Est.</th>
                            <th className="p-2.5 text-right">Total HT</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(cmd.lignes || []).map((l) => (
                            <tr key={l.id} className="hover:bg-slate-50/50">
                              <td className="p-2.5 font-mono text-slate-500">{l.code}</td>
                              <td className="p-2.5 font-medium text-slate-800">{l.designation}</td>
                              <td className="p-2.5 text-center font-bold text-slate-900">{l.quantite}</td>
                              <td className="p-2.5 text-right text-slate-600">{(l.prixUnitaireEstime ?? 0).toFixed(2)} €</td>
                              <td className="p-2.5 text-right font-bold text-blue-600">{(l.totalEstime ?? 0).toFixed(2)} €</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

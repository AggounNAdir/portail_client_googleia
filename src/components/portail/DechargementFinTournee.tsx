import React, { useEffect, useState } from 'react';
import { api, type DechargementBon } from '../../services/apiClient';

interface Produit {
  id: number;
  code: string;
  designation: string;
}

interface Props {
  produits: Produit[];
  /** Colis restants dans le camion, par produit_id. */
  vendeurStock: Record<number, number>;
  /** Appelé après une demande ou une annulation pour rafraîchir le stock. */
  onChange?: () => void;
}

const MOTIFS: { value: string; label: string }[] = [
  { value: 'GARDE', label: 'Gardé dans le camion' },
  { value: 'CASSE', label: 'Casse / abîmé' },
  { value: 'MANQUANT', label: 'Manquant' },
  { value: 'AUTRE', label: 'Autre' },
];

const STATUT_STYLE: Record<string, string> = {
  'En attente': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Validé': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Rejeté': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  'Annulé': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

export default function DechargementFinTournee({ produits, vendeurStock, onChange }: Props) {
  const [rendu, setRendu] = useState<Record<number, string>>({});
  const [motifs, setMotifs] = useState<Record<number, string>>({});
  const [observations, setObservations] = useState('');
  const [bons, setBons] = useState<DechargementBon[]>([]);
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const enCamion = produits.filter((p) => (vendeurStock[p.id] ?? 0) > 0);
  const enAttente = bons.find((b) => b.statut === 'En attente');

  const charger = async () => {
    try {
      setBons((await api.getMesDechargements()) || []);
    } catch {
      /* hors ligne : on garde l'affichage précédent */
    }
  };

  useEffect(() => {
    charger();
  }, []);

  // Par défaut, on suppose que tout ce qui reste dans le camion est rendu.
  const valeur = (p: Produit) => rendu[p.id] ?? String(vendeurStock[p.id] ?? 0);
  const ecart = (p: Produit) => (vendeurStock[p.id] ?? 0) - (Number(valeur(p)) || 0);

  const envoyer = async () => {
    setErreur('');
    let lignes;
    try {
      lignes = enCamion.map((p) => {
        const colis = Number(valeur(p));
        if (!Number.isFinite(colis) || colis < 0) throw new Error(`Quantité invalide pour ${p.designation}.`);
        const manque = ecart(p) > 1e-9;
        if (manque && !motifs[p.id]) throw new Error(`Indiquez le motif de l'écart pour ${p.designation}.`);
        return { produit_id: p.id, quantite_colis: colis, ...(manque ? { motif_ecart: motifs[p.id] } : {}) };
      });
    } catch (e: any) {
      setErreur(e?.message || 'Saisie invalide.');
      return;
    }
    setEnvoi(true);
    try {
      await api.demanderDechargement(lignes, observations.trim() || undefined);
      setRendu({});
      setMotifs({});
      setObservations('');
      await charger();
      onChange?.();
    } catch (e: any) {
      setErreur(e?.message || 'Envoi impossible.');
    } finally {
      setEnvoi(false);
    }
  };

  const annuler = async (id: number) => {
    setErreur('');
    try {
      await api.annulerDechargement(id);
      await charger();
      onChange?.();
    } catch (e: any) {
      setErreur(e?.message || 'Annulation impossible.');
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-3xl p-5 shadow space-y-4">
      <div>
        <h4 className="text-sm font-black text-white">Fin de tournée — décharger le camion</h4>
        <p className="text-xs text-slate-400">
          Saisissez les colis réellement rendus. L'administration valide ensuite et le stock réintègre le dépôt.
          Pendant ce temps, ventes et chargements sont bloqués.
        </p>
      </div>

      {enAttente ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs text-amber-300 flex items-center justify-between gap-3">
          <span>
            Demande <b className="font-mono">{enAttente.numero}</b> en attente de validation par l'administration.
          </span>
          <button
            onClick={() => annuler(enAttente.id)}
            className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-xl font-bold cursor-pointer"
          >
            Annuler la demande
          </button>
        </div>
      ) : enCamion.length === 0 ? (
        <p className="text-xs text-slate-400">Le camion est vide : rien à décharger.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700">
                <tr>
                  <th className="p-2">Produit</th>
                  <th className="p-2 text-center">Dans le camion</th>
                  <th className="p-2 text-center">Rendu (colis)</th>
                  <th className="p-2">Motif de l'écart</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {enCamion.map((p) => (
                  <tr key={p.id}>
                    <td className="p-2 text-white font-bold">{p.designation}</td>
                    <td className="p-2 text-center font-mono text-slate-300">{vendeurStock[p.id]}</td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        min={0}
                        max={vendeurStock[p.id]}
                        step="any"
                        value={valeur(p)}
                        onChange={(e) => setRendu({ ...rendu, [p.id]: e.target.value })}
                        className="w-24 bg-slate-900 border border-slate-600 rounded-lg px-2 py-1 text-center font-mono text-white"
                      />
                    </td>
                    <td className="p-2">
                      {ecart(p) > 1e-9 ? (
                        <select
                          value={motifs[p.id] || ''}
                          onChange={(e) => setMotifs({ ...motifs, [p.id]: e.target.value })}
                          className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-1 text-white"
                        >
                          <option value="">— choisir —</option>
                          {MOTIFS.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label} ({ecart(p)} colis)
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-emerald-400">Conforme</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <input
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Observations (facultatif)"
            className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-xs text-white"
          />
          <button
            onClick={envoyer}
            disabled={envoi}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
          >
            {envoi ? 'Envoi…' : 'Envoyer le déchargement'}
          </button>
        </>
      )}

      {erreur && <p className="text-xs text-rose-400">{erreur}</p>}

      {bons.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400">Mes derniers déchargements</span>
          {bons.slice(0, 5).map((b) => (
            <div key={b.id} className="flex items-center justify-between text-xs bg-slate-900/60 rounded-xl px-3 py-2">
              <span className="font-mono text-slate-300">{b.numero}</span>
              <span className="text-slate-400">
                écart {b.total_ecart_pieces} pcs{b.motif_rejet ? ` — ${b.motif_rejet}` : ''}
              </span>
              <span className={`px-2 py-0.5 rounded-full border font-bold ${STATUT_STYLE[b.statut] || ''}`}>{b.statut}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

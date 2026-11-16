import React, { useEffect, useState } from 'react';
import { api, type RetourVendeurBon } from '../../services/apiClient';

interface Produit {
  id: number;
  code: string;
  designation: string;
}

interface Props {
  produits: Produit[];
  /** Colis restants dans le camion, par produit_id. */
  vendeurStock: Record<number, number>;
  /** Appelé après une demande ou une annulation (rafraîchit le stock du camion). */
  onChange?: () => void;
}

interface LigneSaisie {
  produit_id: number;
  quantite_colis: number;
  motif: string;
  commentaire?: string;
}

const MOTIFS_PAR_DEFAUT = [
  { code: 'INVENDU', libelle: 'Invendu' },
  { code: 'CASSE', libelle: 'Cassé / abîmé' },
  { code: 'PERIME', libelle: 'Périmé / date courte' },
  { code: 'ERREUR_CHARGEMENT', libelle: 'Erreur de chargement' },
  { code: 'RETOUR_CLIENT', libelle: 'Repris chez un client' },
  { code: 'AUTRE', libelle: 'Autre (préciser)' },
];

const STATUT_STYLE: Record<string, string> = {
  'En attente': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Confirmé': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Rejeté': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  'Annulé': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

export default function RetourVendeur({ produits, vendeurStock, onChange }: Props) {
  const [motifs, setMotifs] = useState(MOTIFS_PAR_DEFAUT);
  const [produitId, setProduitId] = useState('');
  const [colis, setColis] = useState('1');
  const [motif, setMotif] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [lignes, setLignes] = useState<LigneSaisie[]>([]);
  const [retournePar, setRetournePar] = useState('');
  const [observations, setObservations] = useState('');
  const [bons, setBons] = useState<RetourVendeurBon[]>([]);
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const nomProduit = (id: number) => produits.find((p) => p.id === id)?.designation || `#${id}`;
  const enCamion = produits.filter((p) => (vendeurStock[p.id] ?? 0) > 0);
  const dejaSaisi = (id: number) => lignes.filter((l) => l.produit_id === id).reduce((s, l) => s + l.quantite_colis, 0);
  const disponible = (id: number) => (vendeurStock[id] ?? 0) - dejaSaisi(id);

  const charger = async () => {
    try {
      setBons((await api.getMesRetoursVendeur()) || []);
    } catch {
      /* hors ligne : on garde l'affichage précédent */
    }
  };

  useEffect(() => {
    charger();
    api.getMotifsRetourVendeur().then((m) => m?.length && setMotifs(m)).catch(() => {});
  }, []);

  const ajouter = () => {
    setErreur('');
    const id = Number(produitId);
    const q = Number(colis);
    if (!id) return setErreur('Choisissez un produit.');
    if (!Number.isFinite(q) || q <= 0) return setErreur('La quantité doit être supérieure à zéro.');
    if (!motif) return setErreur('Le motif du retour est obligatoire.');
    if (motif === 'AUTRE' && !commentaire.trim()) return setErreur('Motif « Autre » : précisez la raison.');
    if (q > disponible(id) + 1e-9) return setErreur(`Il ne reste que ${disponible(id)} colis de ${nomProduit(id)} dans le camion.`);
    setLignes([...lignes, { produit_id: id, quantite_colis: q, motif, commentaire: commentaire.trim() || undefined }]);
    setColis('1');
    setMotif('');
    setCommentaire('');
  };

  const envoyer = async () => {
    setErreur('');
    if (lignes.length === 0) return setErreur('Ajoutez au moins un produit à retourner.');
    setEnvoi(true);
    try {
      await api.demanderRetourVendeur(lignes, retournePar.trim() || undefined, observations.trim() || undefined);
      setLignes([]);
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
      await api.annulerRetourVendeur(id);
      await charger();
      onChange?.();
    } catch (e: any) {
      setErreur(e?.message || 'Annulation impossible.');
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-3xl p-5 shadow space-y-4">
      <div>
        <h4 className="text-sm font-black text-white">Retourner de la marchandise au dépôt</h4>
        <p className="text-xs text-slate-400">
          Indiquez le produit, la quantité et le motif. Votre camion baissera quand l'administration aura confirmé le retour.
        </p>
      </div>

      {enCamion.length === 0 ? (
        <p className="text-xs text-slate-400">Votre camion est vide : rien à retourner.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
          <label className="md:col-span-4 text-[10px] uppercase font-bold text-slate-400">
            Produit
            <select
              value={produitId}
              onChange={(e) => setProduitId(e.target.value)}
              className="mt-1 w-full bg-slate-900 border border-slate-600 rounded-xl px-2 py-2 text-xs text-white normal-case"
            >
              <option value="">— choisir —</option>
              {enCamion.map((p) => (
                <option key={p.id} value={p.id} disabled={disponible(p.id) <= 0}>
                  {p.designation} (camion : {disponible(p.id)} colis)
                </option>
              ))}
            </select>
          </label>
          <label className="md:col-span-2 text-[10px] uppercase font-bold text-slate-400">
            Colis
            <input
              type="number"
              min={0}
              step="any"
              value={colis}
              onChange={(e) => setColis(e.target.value)}
              className="mt-1 w-full bg-slate-900 border border-slate-600 rounded-xl px-2 py-2 text-xs text-center font-mono text-white"
            />
          </label>
          <label className="md:col-span-3 text-[10px] uppercase font-bold text-slate-400">
            Motif
            <select
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              className="mt-1 w-full bg-slate-900 border border-slate-600 rounded-xl px-2 py-2 text-xs text-white normal-case"
            >
              <option value="">— choisir —</option>
              {motifs.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.libelle}
                </option>
              ))}
            </select>
          </label>
          <label className="md:col-span-3 text-[10px] uppercase font-bold text-slate-400">
            Commentaire
            <input
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder={motif === 'AUTRE' ? 'Obligatoire' : 'Facultatif'}
              className="mt-1 w-full bg-slate-900 border border-slate-600 rounded-xl px-2 py-2 text-xs text-white normal-case"
            />
          </label>
          <button
            onClick={ajouter}
            className="md:col-span-12 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-xl text-xs font-bold cursor-pointer"
          >
            + Ajouter à la liste
          </button>
        </div>
      )}

      {lignes.length > 0 && (
        <div className="space-y-2">
          <div className="divide-y divide-slate-700/60 border border-slate-700 rounded-2xl">
            {lignes.map((l, i) => (
              <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                <span className="text-white font-bold">{nomProduit(l.produit_id)}</span>
                <span className="font-mono text-slate-300">{l.quantite_colis} colis</span>
                <span className="text-slate-400">
                  {motifs.find((m) => m.code === l.motif)?.libelle}
                  {l.commentaire ? ` — ${l.commentaire}` : ''}
                </span>
                <button
                  onClick={() => setLignes(lignes.filter((_, j) => j !== i))}
                  className="text-rose-400 hover:text-rose-300 font-bold cursor-pointer"
                  aria-label="Retirer"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <input
            value={retournePar}
            onChange={(e) => setRetournePar(e.target.value)}
            placeholder="Retourné par (laisser vide si c'est vous)"
            className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-xs text-white"
          />
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
            {envoi ? 'Envoi…' : 'Envoyer la demande de retour'}
          </button>
        </div>
      )}

      {erreur && <p className="text-xs text-rose-400">{erreur}</p>}

      {bons.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400">Mes derniers retours</span>
          {bons.slice(0, 6).map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-2 text-xs bg-slate-900/60 rounded-xl px-3 py-2">
              <span className="font-mono text-slate-300">{b.numero}</span>
              <span className="text-slate-400">
                {Number(b.total_colis || 0)} colis{b.motif_rejet ? ` — ${b.motif_rejet}` : ''}
              </span>
              <span className="flex items-center gap-2">
                {b.statut === 'En attente' && (
                  <button onClick={() => annuler(b.id)} className="text-slate-300 underline cursor-pointer">
                    Annuler
                  </button>
                )}
                <span className={`px-2 py-0.5 rounded-full border font-bold ${STATUT_STYLE[b.statut] || ''}`}>{b.statut}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

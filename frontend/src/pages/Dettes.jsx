import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/useAuth';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '@tekkipro/shared/apiError';
import { getApiSuccessMessage, getLocalSuccessMessage } from '@tekkipro/shared/apiSuccess';
import { FiDollarSign, FiCheck, FiClock, FiRefreshCw, FiCheckCircle, FiPhone, FiCreditCard } from 'react-icons/fi';
import PageHeader from '../components/PageHeader';
import ProBadge from '../components/ProBadge';

export default function Dettes() {
  const { plan } = useAuth();
  const isPro = plan !== 'GRATUIT';
  const [data, setData] = useState({ dettes: [], totalDettes: 0, nombreEnCours: 0 });
  const [filter, setFilter] = useState('EN_COURS');
  const [showModal, setShowModal] = useState(false);
  const [selectedDette, setSelectedDette] = useState(null);
  const [montantRemb, setMontantRemb] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadDettes = useCallback(async (nextFilter = '') => {
    setLoading(true);
    try {
      const res = await api.get('/dettes', { params: { statut: nextFilter || undefined } });
      setData(res.data.data);
    } catch {
      toast.error('Erreur de chargement des dettes');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadDettes(filter); }, [filter, loadDettes]);

  const rembourser = async (e) => {
    e.preventDefault();
    const montant = parseFloat(montantRemb);
    if (!montant || montant <= 0) {
      toast.error('Montant invalide');
      return;
    }
    if (montant > selectedDette.montantRestant) {
      toast.error(`Le montant ne peut pas dépasser ${formatCFA(selectedDette.montantRestant)}`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post(`/dettes/${selectedDette.id}/rembourser`, { montant });
      toast.success(getApiSuccessMessage(res, { fallback: getLocalSuccessMessage({ entity: 'dette', action: 'repay' }) }));
      setShowModal(false);
      setMontantRemb('');
      setSelectedDette(null);
      loadDettes(filter);
    } catch (error) {
      toast.error(getApiErrorMessage(error, { fallback: 'Erreur lors du remboursement' }));
    } finally { setSubmitting(false); }
  };

  const openRemb = (dette) => {
    setSelectedDette(dette);
    setMontantRemb('');
    setShowModal(true);
  };

  const formatCFA = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0)) + ' CFA';

  const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  return (
    <div className="min-h-[calc(100vh-64px)] bg-transparent p-5 md:p-8 flex flex-col gap-6 font-sans">

      <PageHeader
        icon={<FiCreditCard size={20} />}
        title="Crédits & Dettes"
        subtitle="Suivi des remboursements en cours"
        action={
          <button onClick={() => loadDettes(filter)} className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B5E20] text-white font-bold text-[0.85rem] rounded-xl hover:-translate-y-0.5 transition-all border-none cursor-pointer">
            <FiRefreshCw size={16} /> Actualiser
          </button>
        }
      />

      {!isPro && (
        <div className="flex items-center gap-2 text-[0.78rem] text-muted-foreground">
          <span>Export PDF</span>
          <ProBadge variant="label" requiredPlan="PRO" />
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total dettes — red fill */}
        <div className="relative flex flex-col gap-3 p-5 bg-gradient-to-br from-[#D32F2F] to-[#B71C1C] rounded-[22px] shadow-[0_6px_20px_rgba(211,47,47,0.25)] overflow-hidden transition-all hover:-translate-y-1">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/15 text-white">
            <FiDollarSign size={20} />
          </div>
          <div>
            <span className="text-[1.4rem] font-extrabold text-white leading-tight block" style={{ fontFamily: 'Sora,sans-serif' }}>{formatCFA(data.totalDettes)}</span>
            <span className="text-[0.78rem] font-semibold text-white/65">Total dettes en cours</span>
          </div>
        </div>

        {/* Nombre en cours — amber/white card */}
        <div className="relative flex flex-col gap-3 p-5 bg-white border border-amber-200/60 rounded-[22px] shadow-sm overflow-hidden transition-all hover:-translate-y-1">
          <div className="absolute top-0 left-4 right-4 h-[3px] rounded-full bg-gradient-to-r from-amber-400 to-amber-500" />
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
            <FiClock size={20} />
          </div>
          <div>
            <span className="text-[1.6rem] font-extrabold text-amber-500 leading-tight block" style={{ fontFamily: 'Sora,sans-serif' }}>{data.nombreEnCours}</span>
            <span className="text-[0.78rem] font-semibold text-gray-500">Dettes en cours</span>
          </div>
        </div>

        {/* Remboursées — green/white card */}
        <div className="relative flex flex-col gap-3 p-5 bg-white border border-[#1B5E20]/12 rounded-[22px] shadow-sm overflow-hidden transition-all hover:-translate-y-1">
          <div className="absolute top-0 left-4 right-4 h-[3px] rounded-full bg-gradient-to-r from-[#1B5E20] to-[#2E7D32]" />
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#1B5E20]/10 text-[#1B5E20]">
            <FiCheckCircle size={20} />
          </div>
          <div>
            <span className="text-[1.6rem] font-extrabold text-[#1B5E20] leading-tight block" style={{ fontFamily: 'Sora,sans-serif' }}>{data.dettes?.filter(d => d.statut === 'REMBOURSEE').length || 0}</span>
            <span className="text-[0.78rem] font-semibold text-gray-500">Remboursées</span>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'EN_COURS', label: 'En cours' },
          { key: 'PAYEE', label: 'Payées' },
          { key: '', label: 'Toutes' }
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-[0.82rem] font-bold border transition-all cursor-pointer ${filter === f.key ? 'bg-[#1B5E20] text-white border-[#1B5E20] shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1B5E20]/30'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 font-semibold text-sm">Chargement des dettes...</div>
      ) : (
        <div className="bg-white border border-[#1B5E20]/10 rounded-[18px] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[750px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-[0.78rem] uppercase tracking-wide">Client</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-[0.78rem] uppercase tracking-wide">Vente N°</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-[0.78rem] uppercase tracking-wide">Produits</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-[0.78rem] uppercase tracking-wide">Date</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-[0.78rem] uppercase tracking-wide">Total</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-[0.78rem] uppercase tracking-wide">Payé</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-[0.78rem] uppercase tracking-wide">Restant</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-[0.78rem] uppercase tracking-wide">Statut</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-[0.78rem] uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.dettes?.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <strong className="font-semibold text-gray-800">{d.client?.prenom} {d.client?.nom}</strong>
                      {d.client?.telephone && (
                        <div className="flex items-center gap-1 mt-0.5 text-[0.75rem] text-gray-400">
                          <FiPhone size={11} /> {d.client.telephone}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#1B5E20]/8 text-[#1B5E20] font-semibold text-[0.78rem]">
                        {d.vente?.numero || '-'}
                      </span>
                    </td>
                    <td className="px-5 py-4 max-w-[200px]">
                      {d.vente?.details?.map((det, i) => (
                        <div key={i} className="text-[0.78rem] text-gray-500">{det.produit?.nom}</div>
                      )) || '-'}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-gray-600">{formatDate(d.createdAt)}</td>
                    <td className="px-5 py-4 font-semibold text-gray-800">{formatCFA(d.montantTotal)}</td>
                    <td className="px-5 py-4 font-semibold text-[#1B5E20]">{formatCFA(d.montantPaye)}</td>
                    <td className="px-5 py-4 font-bold text-[0.95rem]" style={{ color: d.montantRestant > 0 ? '#D32F2F' : '#1B5E20' }}>
                      {formatCFA(d.montantRestant)}
                    </td>
                    <td className="px-5 py-4">
                      {d.statut === 'PAYEE' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1B5E20]/10 text-[#1B5E20] font-semibold text-[0.78rem]">
                          <FiCheckCircle size={12} /> Payée
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 font-semibold text-[0.78rem]">
                          <FiClock size={12} /> En cours
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {d.statut === 'EN_COURS' && (
                        <button
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-br from-[#1B5E20] to-[#0D3B14] text-white text-[0.8rem] font-bold rounded-lg hover:opacity-90 transition-all cursor-pointer"
                          onClick={() => openRemb(d)}
                        >
                          <FiDollarSign size={14} /> Rembourser
                        </button>
                      )}
                      {d.remboursements?.length > 0 && (
                        <div className="mt-1 text-[0.73rem] text-gray-400">
                          {d.remboursements.length} paiement(s) effectué(s)
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(!data.dettes || data.dettes.length === 0) && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <FiDollarSign size={48} className="opacity-30" />
              <p className="font-semibold text-sm m-0">
                Aucune dette {filter === 'EN_COURS' ? 'en cours' : filter === 'PAYEE' ? 'payée' : ''}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal remboursement */}
      {showModal && selectedDette && (
        <div
          className="modal fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-[24px] shadow-2xl w-full max-w-md p-7 flex flex-col gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="flex items-center gap-2 text-[1.1rem] font-extrabold text-gray-800 m-0" style={{ fontFamily: 'Sora,sans-serif' }}>
              <FiCreditCard size={20} className="text-[#1B5E20]" /> Remboursement de dette
            </h3>

            {/* Summary block */}
            <div className="bg-gray-50 rounded-[14px] p-4 border border-gray-100 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-[0.85rem] text-gray-400">Client</span>
                <strong className="font-semibold text-gray-800">{selectedDette.client?.prenom} {selectedDette.client?.nom}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[0.85rem] text-gray-400">Vente</span>
                <span className="text-gray-700">{selectedDette.vente?.numero}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[0.85rem] text-gray-400">Montant total</span>
                <span className="text-gray-700">{formatCFA(selectedDette.montantTotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[0.85rem] text-gray-400">Déjà payé</span>
                <span className="font-semibold text-[#1B5E20]">{formatCFA(selectedDette.montantPaye)}</span>
              </div>
              <div className="flex justify-between items-center pt-2.5 mt-0.5 border-t-2 border-gray-200">
                <span className="font-bold text-[0.95rem] text-gray-800">Reste à payer</span>
                <span className="font-bold text-[1.1rem] text-[#D32F2F]">{formatCFA(selectedDette.montantRestant)}</span>
              </div>
            </div>

            {/* Historique remboursements */}
            {selectedDette.remboursements?.length > 0 && (
              <div className="flex flex-col gap-1">
                <div className="text-[0.82rem] font-semibold text-gray-500 mb-1">Historique des paiements</div>
                {selectedDette.remboursements.map((r, i) => (
                  <div key={i} className="flex justify-between items-center py-1.5 text-[0.82rem] border-b border-gray-100 last:border-0">
                    <span className="text-gray-400">{formatDate(r.createdAt)}</span>
                    <span className="font-semibold text-[#1B5E20]">+{formatCFA(r.montant)}</span>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={rembourser} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.85rem] font-semibold text-gray-700">Montant du remboursement *</label>
                <input
                  type="number"
                  value={montantRemb}
                  onChange={(e) => setMontantRemb(e.target.value)}
                  max={selectedDette.montantRestant}
                  min="1"
                  step="1"
                  required
                  placeholder={`Max: ${formatCFA(selectedDette.montantRestant)}`}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[1.1rem] font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1B5E20]/30 focus:border-[#1B5E20] transition-all"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 text-[0.82rem] font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-[#1B5E20]/30 transition-all cursor-pointer"
                  onClick={() => setMontantRemb(Math.round(selectedDette.montantRestant / 2).toString())}
                >
                  50%
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 text-[0.82rem] font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-[#1B5E20]/30 transition-all cursor-pointer"
                  onClick={() => setMontantRemb(selectedDette.montantRestant.toString())}
                >
                  Tout payer
                </button>
              </div>

              {montantRemb && parseFloat(montantRemb) > 0 && (
                <div className="bg-[#1B5E20]/8 text-[#047857] px-3.5 py-2.5 rounded-xl text-[0.85rem] font-semibold">
                  {parseFloat(montantRemb) >= selectedDette.montantRestant
                    ? 'Cette dette sera entièrement remboursée !'
                    : `Restant après paiement: ${formatCFA(selectedDette.montantRestant - parseFloat(montantRemb))}`
                  }
                </div>
              )}

              <div className="flex gap-3 mt-1">
                <button
                  type="button"
                  className="flex-1 px-5 py-2.5 text-[0.9rem] font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all cursor-pointer"
                  onClick={() => setShowModal(false)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-br from-[#1B5E20] to-[#0D3B14] text-white text-[0.9rem] font-bold rounded-xl hover:opacity-90 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiCheck size={16} /> {submitting ? 'Enregistrement...' : 'Confirmer le paiement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

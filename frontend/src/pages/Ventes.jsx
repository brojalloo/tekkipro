import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import api from '../services/api';
import { useAuth } from '../context/useAuth';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '@tekkipro/shared/apiError';
import { getApiSuccessMessage, getLocalSuccessMessage } from '@tekkipro/shared/apiSuccess';
import {
  FiFileText, FiX, FiFilter, FiDollarSign, FiSmartphone, FiCreditCard,
  FiShoppingCart, FiTrendingUp, FiAlertCircle, FiCheckCircle, FiCalendar,
  FiUser, FiPackage, FiClock, FiSearch, FiRefreshCw, FiLock, FiChevronDown,
  FiChevronUp, FiHash, FiChevronLeft, FiChevronRight
} from 'react-icons/fi';
import { PlanLimitBanner } from '../components/UpgradeBanner';
import PageHeader from '../components/PageHeader';

// Singleton formatter — created once, reused on every call
const _fmt = new Intl.NumberFormat('fr-FR');
const formatCFA = (n) => _fmt.format(Math.round(n || 0)) + ' FCFA';

const PAGE_SIZE = 30;

export default function Ventes() {
  const { isAdmin, isPro, planLimits } = useAuth();
  const [ventes, setVentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ dateDebut: '', dateFin: '', statut: '' });
  const [search, setSearch] = useState('');

  const loadVentes = useCallback(async (nextFilters = {}) => {
    try {
      const params = {};
      if (nextFilters.dateDebut) params.dateDebut = nextFilters.dateDebut;
      if (nextFilters.dateFin) params.dateFin = nextFilters.dateFin;
      if (nextFilters.statut) params.statut = nextFilters.statut;
      const res = await api.get('/ventes', { params });
      setVentes(res.data.data);
    } catch {
      toast.error('Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadVentes(); }, [loadVentes]);

  const annulerVente = async (id) => {
    if (!window.confirm('Annuler cette vente ? Le stock sera restauré.')) return;
    try {
      const response = await api.patch(`/ventes/${id}/annuler`);
      toast.success(getApiSuccessMessage(response, { fallback: getLocalSuccessMessage({ entity: 'vente', action: 'cancel' }) }));
      loadVentes(filters);
    } catch (error) {
      toast.error(getApiErrorMessage(error, { fallback: 'Erreur' }));
    }
  };

  const voirFacture = async (id) => {
    if (!isPro) {
      toast.error('Export PDF réservé au plan Pro. Passez à un plan supérieur.');
      return;
    }
    try {
      const response = await api.get(`/factures/${id}/pdf`, { responseType: 'blob' });
      const fileUrl = URL.createObjectURL(response.data);
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 60_000);
    } catch (error) {
      toast.error(getApiErrorMessage(error, { fallback: 'Impossible d\'ouvrir la facture PDF' }));
    }
  };

  const stats = useMemo(() => {
    const completees = ventes.filter(v => v.statut === 'COMPLETEE');
    const enCredit = ventes.filter(v => v.statut === 'EN_CREDIT');
    const actives = ventes.filter(v => v.statut !== 'ANNULEE');
    const totalCA = actives.reduce((s, v) => s + (v.montantTotal || 0), 0);
    const totalCredit = enCredit.reduce((s, v) => s + (v.montantTotal || 0), 0);
    return { total: ventes.length, completees: completees.length, enCredit: enCredit.length, totalCA, totalCredit };
  }, [ventes]);

  const displayed = useMemo(() => {
    if (!search.trim()) return ventes;
    const q = search.toLowerCase();
    return ventes.filter(v =>
      v.numero?.toLowerCase().includes(q) ||
      (v.client && `${v.client.prenom || ''} ${v.client.nom}`.toLowerCase().includes(q)) ||
      (v.user && `${v.user.prenom || ''} ${v.user.nom}`.toLowerCase().includes(q))
    );
  }, [ventes, search]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-10 h-10 border-[3px] border-muted border-t-primary rounded-full animate-spin" />
      <p>Chargement des ventes...</p>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-64px)] bg-transparent p-4 md:p-8 flex flex-col gap-5 font-sans">
      <PageHeader
        icon={<FiShoppingCart size={20} />}
        title="Ventes"
        subtitle="Historique et gestion des transactions"
      />

      <PlanLimitBanner label="ventes ce mois" current={ventes.filter(v => v.statut !== 'ANNULEE').length} limit={planLimits.ventesParMois} icon={<FiShoppingCart size={14} />} />

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <div className="relative flex flex-col gap-3 p-4 md:p-5 bg-gradient-to-br from-[#1B5E20] to-[#0D3B14] rounded-[18px] md:rounded-[22px] shadow-[0_6px_20px_rgba(27,94,32,0.25)] overflow-hidden transition-all hover:-translate-y-1">
          <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/15 text-white shrink-0"><FiShoppingCart size={18} /></div>
          <div className="flex flex-col">
            <span className="text-[1.4rem] md:text-[1.6rem] font-extrabold text-white leading-tight" style={{fontFamily:'Sora,sans-serif'}}>{stats.total}</span>
            <span className="text-[0.72rem] md:text-[0.78rem] font-semibold text-white/65 mt-0.5">Total ventes</span>
          </div>
        </div>
        <div className="relative flex flex-col gap-3 p-4 md:p-5 bg-gradient-to-br from-[#FFD600] to-[#F9A825] rounded-[18px] md:rounded-[22px] shadow-[0_6px_20px_rgba(255,214,0,0.25)] overflow-hidden transition-all hover:-translate-y-1">
          <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#071C08]/15 text-[#071C08] shrink-0"><FiTrendingUp size={18} /></div>
          <div className="flex flex-col">
            <span className="text-[1rem] md:text-[1.3rem] font-extrabold text-[#071C08] leading-tight" style={{fontFamily:'Sora,sans-serif'}}>{formatCFA(stats.totalCA)}</span>
            <span className="text-[0.72rem] md:text-[0.78rem] font-semibold text-[#071C08]/60 mt-0.5">Chiffre d'affaires</span>
          </div>
        </div>
        <div className="relative flex flex-col gap-3 p-4 md:p-5 bg-white border border-[#1B5E20]/12 rounded-[18px] md:rounded-[22px] shadow-sm overflow-hidden transition-all hover:-translate-y-1">
          <div className="absolute top-0 left-4 right-4 h-[3px] rounded-full bg-gradient-to-r from-[#1B5E20] to-[#2E7D32]" />
          <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#1B5E20]/10 text-[#1B5E20] shrink-0"><FiCheckCircle size={18} /></div>
          <div className="flex flex-col">
            <span className="text-[1.4rem] md:text-[1.6rem] font-extrabold text-[#1B5E20] leading-tight" style={{fontFamily:'Sora,sans-serif'}}>{stats.completees}</span>
            <span className="text-[0.72rem] md:text-[0.78rem] font-semibold text-muted-foreground mt-0.5">Complétées</span>
          </div>
        </div>
        <div className="relative flex flex-col gap-3 p-4 md:p-5 bg-white border border-amber-200/60 rounded-[18px] md:rounded-[22px] shadow-sm overflow-hidden transition-all hover:-translate-y-1">
          <div className="absolute top-0 left-4 right-4 h-[3px] rounded-full bg-gradient-to-r from-amber-400 to-amber-500" />
          <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 shrink-0"><FiAlertCircle size={18} /></div>
          <div className="flex flex-col">
            <span className="text-[1.4rem] md:text-[1.6rem] font-extrabold text-amber-500 leading-tight" style={{fontFamily:'Sora,sans-serif'}}>{stats.enCredit}</span>
            <span className="text-[0.72rem] md:text-[0.78rem] font-semibold text-muted-foreground mt-0.5">En crédit · {formatCFA(stats.totalCredit)}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 p-4 bg-white border border-border/80 rounded-[18px] shadow-sm">
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-border/80 rounded-xl flex-1 min-w-[130px] focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(27,94,32,0.08)]">
            <FiCalendar size={13} className="text-muted-foreground shrink-0" />
            <input type="date" value={filters.dateDebut} className="border-none bg-transparent outline-none text-[0.82rem] font-medium text-foreground w-full"
              onChange={(e) => setFilters({ ...filters, dateDebut: e.target.value })} />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-border/80 rounded-xl flex-1 min-w-[130px] focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(27,94,32,0.08)]">
            <FiCalendar size={13} className="text-muted-foreground shrink-0" />
            <input type="date" value={filters.dateFin} className="border-none bg-transparent outline-none text-[0.82rem] font-medium text-foreground w-full"
              onChange={(e) => setFilters({ ...filters, dateFin: e.target.value })} />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-border/80 rounded-xl flex-1 min-w-[130px] focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(27,94,32,0.08)]">
            <FiFilter size={13} className="text-muted-foreground shrink-0" />
            <select value={filters.statut} className="border-none bg-transparent outline-none text-[0.82rem] font-medium text-foreground w-full"
              onChange={(e) => setFilters({ ...filters, statut: e.target.value })}>
              <option value="">Tous statuts</option>
              <option value="COMPLETEE">Complétée</option>
              <option value="EN_CREDIT">En crédit</option>
              <option value="ANNULEE">Annulée</option>
            </select>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B5E20] text-white rounded-xl text-[0.82rem] font-bold cursor-pointer border-none hover:-translate-y-0.5 transition-all whitespace-nowrap" onClick={() => loadVentes(filters)}>
            <FiRefreshCw size={13} /> Filtrer
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-border/80 rounded-xl flex-1 focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(27,94,32,0.08)]">
            <FiSearch size={14} className="text-muted-foreground shrink-0" />
            <input type="text" placeholder="Rechercher (n°, client, vendeur)..." className="border-none bg-transparent outline-none text-[0.82rem] font-medium text-foreground w-full placeholder:text-muted-foreground"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <span className="text-[0.78rem] font-semibold text-muted-foreground whitespace-nowrap shrink-0">{displayed.length} résultat{displayed.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <VentesTable
        displayed={displayed}
        isPro={isPro}
        isAdmin={isAdmin}
        voirFacture={voirFacture}
        annulerVente={annulerVente}
      />
    </div>
  );
}

function StatusBadge({ statut }) {
  if (statut === 'COMPLETEE') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.72rem] font-bold bg-[#1B5E20]/08 text-[#1B5E20] border border-[#1B5E20]/15 whitespace-nowrap">
      <FiCheckCircle size={10} /> Complétée
    </span>
  );
  if (statut === 'EN_CREDIT') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.72rem] font-bold bg-amber-500/10 text-amber-600 border border-amber-200 whitespace-nowrap">
      <FiAlertCircle size={10} /> En crédit
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.72rem] font-bold bg-slate-100 text-slate-400 border border-slate-200 whitespace-nowrap">
      <FiX size={10} /> Annulée
    </span>
  );
}

function PaymentBadge({ mode }) {
  if (mode === 'CASH') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.72rem] font-bold bg-[#1B5E20]/08 text-[#1B5E20] border border-[#1B5E20]/15 whitespace-nowrap">
      <FiDollarSign size={10} /> Cash
    </span>
  );
  if (mode === 'MOBILE_MONEY') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.72rem] font-bold bg-blue-500/08 text-blue-600 border border-blue-200 whitespace-nowrap">
      <FiSmartphone size={10} /> MoMo
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.72rem] font-bold bg-amber-500/08 text-amber-600 border border-amber-200 whitespace-nowrap">
      <FiCreditCard size={10} /> Crédit
    </span>
  );
}

// Mobile card for a single vente
function VenteCard({ v, isPro, isAdmin, voirFacture, annulerVente }) {
  const [open, setOpen] = useState(false);
  const date = new Date(v.createdAt);
  const isAnnulee = v.statut === 'ANNULEE';

  return (
    <div className={`p-4 transition-colors ${isAnnulee ? 'opacity-50' : ''} ${open ? 'bg-[#1B5E20]/[0.02]' : ''}`}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-[0.78rem] text-[#1B5E20] bg-[#1B5E20]/10 px-2 py-0.5 rounded-lg tracking-tight" style={{fontFamily:'Sora,sans-serif'}}>
              {v.numero}
            </span>
            <StatusBadge statut={v.statut} />
            <PaymentBadge mode={v.modePaiement} />
          </div>
          <div className="flex items-center gap-2 text-[0.75rem] text-muted-foreground mt-0.5">
            <FiClock size={11} />
            <span>{date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })} · {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          {v.client && (
            <div className="flex items-center gap-1.5 text-[0.75rem] text-foreground font-medium mt-0.5">
              <div className="w-5 h-5 flex items-center justify-center bg-gradient-to-br from-[#1B5E20] to-[#2E7D32] text-white rounded-full text-[0.65rem] font-extrabold shrink-0">
                {(v.client.prenom || v.client.nom || '?')[0].toUpperCase()}
              </div>
              {v.client.prenom || ''} {v.client.nom}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`font-extrabold text-[0.9rem] tabular-nums ${isAnnulee ? 'line-through text-muted-foreground' : 'text-foreground'}`} style={{fontFamily:'Sora,sans-serif'}}>
            {formatCFA(v.montantTotal)}
          </span>
          {v.montantPaye != null && v.statut === 'EN_CREDIT' && (
            <span className="text-[0.7rem] text-amber-600 font-semibold">Payé : {formatCFA(v.montantPaye)}</span>
          )}
          {v.details?.length > 0 && (
            <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1 text-[0.72rem] font-semibold text-[#1B5E20]/60 hover:text-[#1B5E20] transition-colors border-none bg-transparent cursor-pointer p-0">
              <FiPackage size={11} /> {v.details.length} art.
              {open ? <FiChevronUp size={11} /> : <FiChevronDown size={11} />}
            </button>
          )}
        </div>
      </div>

      {/* Expanded articles */}
      {open && v.details?.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {v.details.map((d, i) => (
            <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-white border border-[#1B5E20]/10 rounded-xl shadow-sm">
              <div className="w-6 h-6 flex items-center justify-center bg-[#1B5E20]/08 rounded-lg text-[#1B5E20] shrink-0">
                <FiPackage size={11} />
              </div>
              <div className="flex flex-col">
                <span className="text-[0.75rem] font-semibold text-foreground leading-tight">
                  {d.produit?.nom}
                  {d.uniteNom && <em className="not-italic text-amber-600 font-bold ml-1 text-[0.7rem]">({d.uniteNom})</em>}
                </span>
                <span className="text-[0.7rem] text-muted-foreground">×{d.quantite}{d.sousTotal != null && ` · ${formatCFA(d.sousTotal)}`}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3">
        <button
          type="button"
          onClick={() => voirFacture(v.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[0.73rem] font-bold border transition-all
            ${!isPro ? 'bg-slate-50 border-slate-200 text-muted-foreground cursor-not-allowed' : 'bg-white border-[#1B5E20]/20 text-[#1B5E20] hover:bg-[#1B5E20] hover:text-white hover:border-[#1B5E20]'}`}>
          {isPro ? <FiFileText size={12} /> : <FiLock size={12} />}
          PDF
        </button>
        {isAdmin && v.statut !== 'ANNULEE' && (
          <button
            type="button"
            onClick={() => annulerVente(v.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[0.73rem] font-bold border bg-white border-[#D32F2F]/20 text-[#D32F2F] hover:bg-[#D32F2F] hover:text-white hover:border-[#D32F2F] transition-all">
            <FiX size={12} />
            Annuler
          </button>
        )}
      </div>
    </div>
  );
}

function VentesTable({ displayed, isPro, isAdmin, voirFacture, annulerVente }) {
  const [expanded, setExpanded] = useState(null);
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(displayed.length / PAGE_SIZE);
  const paginated = useMemo(
    () => displayed.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [displayed, page]
  );
  const totalCA = useMemo(
    () => displayed.filter(v => v.statut !== 'ANNULEE').reduce((s, v) => s + (v.montantTotal || 0), 0),
    [displayed]
  );

  // Reset to page 0 whenever the list changes
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPage(0); setExpanded(null); }, [displayed]);

  if (displayed.length === 0) {
    return (
      <div className="bg-white border border-border/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex flex-col items-center justify-center py-16 px-8 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[#1B5E20]/08 flex items-center justify-center text-[#1B5E20]/40">
            <FiShoppingCart size={28} />
          </div>
          <p className="text-[0.95rem] font-bold text-foreground m-0">Aucune vente trouvée</p>
          <span className="text-[0.82rem] text-muted-foreground text-center">Modifiez vos filtres ou effectuez une nouvelle vente</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-white border border-border/80 rounded-2xl overflow-hidden shadow-sm">
      {/* Kente top bar */}
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1B5E20] via-[#FFD600] to-[#D32F2F]" />

      {/* ── Mobile card list (< md) ── */}
      <div className="md:hidden divide-y divide-border/60 mt-[3px]">
        {paginated.map(v => (
          <VenteCard
            key={v.id}
            v={v}
            isPro={isPro}
            isAdmin={isAdmin}
            voirFacture={voirFacture}
            annulerVente={annulerVente}
          />
        ))}
      </div>

      {/* ── Desktop table (≥ md) ── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse min-w-[860px] text-left">
          <thead>
            <tr className="bg-[#1B5E20]/[0.035] border-b border-[#1B5E20]/10">
              <th className="pl-5 pr-2 py-3.5 w-8" />
              <th className="px-4 py-3.5 text-[0.7rem] font-bold text-[#1B5E20]/60 uppercase tracking-widest whitespace-nowrap">
                <div className="flex items-center gap-1.5"><FiHash size={11} /> N° Vente</div>
              </th>
              <th className="px-4 py-3.5 text-[0.7rem] font-bold text-[#1B5E20]/60 uppercase tracking-widest whitespace-nowrap">
                <div className="flex items-center gap-1.5"><FiClock size={11} /> Date</div>
              </th>
              <th className="px-4 py-3.5 text-[0.7rem] font-bold text-[#1B5E20]/60 uppercase tracking-widest">
                <div className="flex items-center gap-1.5"><FiUser size={11} /> Client</div>
              </th>
              <th className="px-4 py-3.5 text-[0.7rem] font-bold text-[#1B5E20]/60 uppercase tracking-widest">
                <div className="flex items-center gap-1.5"><FiUser size={11} /> Vendeur</div>
              </th>
              <th className="px-4 py-3.5 text-[0.7rem] font-bold text-[#1B5E20]/60 uppercase tracking-widest">
                <div className="flex items-center gap-1.5"><FiPackage size={11} /> Articles</div>
              </th>
              <th className="px-4 py-3.5 text-[0.7rem] font-bold text-[#1B5E20]/60 uppercase tracking-widest whitespace-nowrap">
                <div className="flex items-center gap-1.5"><FiTrendingUp size={11} /> Montant</div>
              </th>
              <th className="px-4 py-3.5 text-[0.7rem] font-bold text-[#1B5E20]/60 uppercase tracking-widest">Paiement</th>
              <th className="px-4 py-3.5 text-[0.7rem] font-bold text-[#1B5E20]/60 uppercase tracking-widest">Statut</th>
              <th className="px-4 py-3.5 text-[0.7rem] font-bold text-[#1B5E20]/60 uppercase tracking-widest text-right pr-5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((v, idx) => {
              const isExpanded = expanded === v.id;
              const isAnnulee = v.statut === 'ANNULEE';
              const isCredit = v.statut === 'EN_CREDIT';
              const nbArticles = v.details?.length || 0;
              const date = new Date(v.createdAt);

              return (
                <Fragment key={v.id}>
                  <tr
                    onClick={() => setExpanded(prev => prev === v.id ? null : v.id)}
                    className={[
                      'group border-b border-[#1B5E20]/06 last:border-0 cursor-pointer transition-colors',
                      isExpanded ? 'bg-[#1B5E20]/[0.03]' : 'hover:bg-[#1B5E20]/[0.025]',
                      isAnnulee ? 'opacity-50' : '',
                      isCredit && !isExpanded ? 'bg-amber-50/60' : '',
                      idx % 2 === 1 && !isCredit && !isExpanded ? 'bg-slate-50/50' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    <td className="pl-5 pr-2 py-4 align-middle w-8">
                      <div className={`w-6 h-6 flex items-center justify-center rounded-lg transition-all text-[#1B5E20]/40 group-hover:text-[#1B5E20]/70 ${isExpanded ? 'bg-[#1B5E20]/10 text-[#1B5E20]' : ''}`}>
                        {isExpanded ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <span className="font-extrabold text-[0.8rem] text-[#1B5E20] bg-[#1B5E20]/10 px-2.5 py-1 rounded-lg tracking-tight" style={{fontFamily:'Sora,sans-serif'}}>
                        {v.numero}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-middle whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-[0.82rem] font-semibold text-foreground">
                          {date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-[0.72rem] text-muted-foreground mt-0.5">
                          {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-middle">
                      {v.client ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 flex items-center justify-center bg-gradient-to-br from-[#1B5E20] to-[#2E7D32] text-white rounded-full text-[0.7rem] font-extrabold shrink-0 shadow-sm">
                            {(v.client.prenom || v.client.nom || '?')[0].toUpperCase()}
                          </div>
                          <span className="text-[0.82rem] font-semibold text-foreground leading-tight">
                            {v.client.prenom || ''} {v.client.nom}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[0.8rem] text-muted-foreground/50 italic">Comptoir</span>
                      )}
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 flex items-center justify-center bg-slate-100 rounded-full text-muted-foreground shrink-0">
                          <FiUser size={11} />
                        </div>
                        <span className="text-[0.8rem] text-muted-foreground font-medium">
                          {v.user?.prenom} {v.user?.nom}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-middle">
                      {nbArticles > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[0.75rem] font-bold">
                          <FiPackage size={11} /> {nbArticles} article{nbArticles > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-[0.8rem]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 align-middle whitespace-nowrap">
                      <span className={`font-extrabold text-[0.92rem] tabular-nums ${isAnnulee ? 'line-through text-muted-foreground' : 'text-foreground'}`} style={{fontFamily:'Sora,sans-serif'}}>
                        {formatCFA(v.montantTotal)}
                      </span>
                      {v.montantPaye != null && v.statut === 'EN_CREDIT' && (
                        <div className="text-[0.7rem] text-amber-600 font-semibold mt-0.5">
                          Payé : {formatCFA(v.montantPaye)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <PaymentBadge mode={v.modePaiement} />
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <StatusBadge statut={v.statut} />
                    </td>
                    <td className="px-4 py-4 pr-5 align-middle" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          title={isPro ? `Voir la facture PDF de la vente ${v.numero}` : `Facture PDF indisponible pour la vente ${v.numero}`}
                          aria-label={isPro ? `Voir la facture PDF de la vente ${v.numero}` : `Facture PDF indisponible pour la vente ${v.numero}`}
                          onClick={() => voirFacture(v.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[0.73rem] font-bold border transition-all
                            ${!isPro
                              ? 'bg-slate-50 border-slate-200 text-muted-foreground cursor-not-allowed'
                              : 'bg-white border-[#1B5E20]/20 text-[#1B5E20] hover:bg-[#1B5E20] hover:text-white hover:border-[#1B5E20] hover:shadow-[0_4px_12px_rgba(27,94,32,0.25)]'}`}>
                          {isPro ? <FiFileText size={13} /> : <FiLock size={13} />}
                          <span>PDF</span>
                        </button>
                        {isAdmin && v.statut !== 'ANNULEE' && (
                          <button
                            type="button"
                            title={`Annuler la vente ${v.numero}`}
                            aria-label={`Annuler la vente ${v.numero}`}
                            onClick={() => annulerVente(v.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[0.73rem] font-bold border bg-white border-[#D32F2F]/20 text-[#D32F2F] hover:bg-[#D32F2F] hover:text-white hover:border-[#D32F2F] hover:shadow-[0_4px_12px_rgba(211,47,47,0.2)] transition-all">
                            <FiX size={13} />
                            <span>Annuler</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {isExpanded && v.details?.length > 0 && (
                    <tr className="border-b border-[#1B5E20]/06 last:border-0 bg-[#1B5E20]/[0.02]">
                      <td colSpan={10} className="px-5 pb-4 pt-0">
                        <div className="ml-8 flex flex-wrap gap-2 pt-1">
                          {v.details.map((d, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white border border-[#1B5E20]/10 rounded-xl shadow-sm">
                              <div className="w-7 h-7 flex items-center justify-center bg-[#1B5E20]/08 rounded-lg text-[#1B5E20] shrink-0">
                                <FiPackage size={13} />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[0.8rem] font-semibold text-foreground leading-tight">
                                  {d.produit?.nom}
                                  {d.uniteNom && <em className="not-italic text-amber-600 font-bold ml-1 text-[0.73rem]">({d.uniteNom})</em>}
                                </span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[0.72rem] text-muted-foreground">Qté : <strong className="text-foreground">×{d.quantite}</strong></span>
                                  {d.prixUnitaire && (
                                    <span className="text-[0.72rem] text-muted-foreground">· {formatCFA(d.prixUnitaire)} / u</span>
                                  )}
                                  {d.sousTotal != null && (
                                    <span className="text-[0.72rem] font-bold text-[#1B5E20]">= {formatCFA(d.sousTotal)}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>

          <tfoot>
            <tr className="bg-[#1B5E20]/[0.035] border-t-2 border-[#1B5E20]/10">
              <td colSpan={5} className="px-5 py-3.5">
                <span className="text-[0.78rem] font-bold text-[#1B5E20]/60 uppercase tracking-widest">
                  {displayed.length} vente{displayed.length !== 1 ? 's' : ''} affichée{displayed.length !== 1 ? 's' : ''}
                </span>
              </td>
              <td colSpan={2} className="px-4 py-3.5">
                <div className="flex flex-col">
                  <span className="text-[0.68rem] font-bold text-[#1B5E20]/50 uppercase tracking-widest mb-0.5">CA total (hors annulées)</span>
                  <span className="text-[1rem] font-extrabold text-[#1B5E20] tabular-nums" style={{fontFamily:'Sora,sans-serif'}}>
                    {formatCFA(totalCA)}
                  </span>
                </div>
              </td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 px-4 md:px-5 py-3 border-t border-border/60 bg-slate-50/60">
          <span className="text-[0.78rem] font-semibold text-muted-foreground">
            Page {page + 1} / {totalPages} · {displayed.length} vente{displayed.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-border/60 bg-white text-foreground hover:bg-[#1B5E20] hover:text-white hover:border-[#1B5E20] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              <FiChevronLeft size={15} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(0, Math.min(page - 2, totalPages - 5));
              const p = start + i;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg border text-[0.8rem] font-bold transition-all
                    ${p === page
                      ? 'bg-[#1B5E20] text-white border-[#1B5E20] shadow-sm'
                      : 'border-border/60 bg-white text-foreground hover:border-[#1B5E20]/40'}`}>
                  {p + 1}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-border/60 bg-white text-foreground hover:bg-[#1B5E20] hover:text-white hover:border-[#1B5E20] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              <FiChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/useAuth';
import {
  FiPlus, FiEdit, FiTrash2, FiAlertTriangle, FiSearch, FiPackage,
  FiGrid, FiDollarSign, FiBox, FiTag, FiLayers, FiCheckCircle,
  FiFilter, FiBarChart2
} from 'react-icons/fi';
import { PlanLimitBanner } from '../components/UpgradeBanner';
import PageHeader from '../components/PageHeader';
import toast from 'react-hot-toast';

export default function Produits() {
  const { isAdmin, planLimits } = useAuth();
  const [produits, setProduits] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterAlerte, setFilterAlerte] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadProduits(); }, []);

  const loadProduits = async () => {
    try {
      const res = await api.get('/produits', { params: { search: search || undefined } });
      setProduits(res.data.data);
    } catch (_error) {
      toast.error('Erreur chargement produits');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadProduits();
  };

  const handleDelete = async (id, nom) => {
    if (!window.confirm(`Désactiver le produit "${nom}" ?`)) return;
    try {
      await api.delete(`/produits/${id}`);
      toast.success('Produit désactivé avec succès.');
      loadProduits();
    } catch (_error) {
      toast.error('Erreur');
    }
  };

  const formatCFA = (n) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';

  const alertCount = produits.filter(p => p.stock <= p.stockAlerte).length;
  const totalValue = produits.reduce((s, p) => s + (p.prixAchat * p.stock), 0);
  const displayed = filterAlerte ? produits.filter(p => p.stock <= p.stockAlerte) : produits;

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-transparent flex flex-col gap-5 p-4 md:p-6 lg:p-8 font-sans">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4"><div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin" /><p>Chargement des produits...</p></div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-transparent flex flex-col gap-5 p-4 md:p-6 lg:p-8 font-sans">
      <PageHeader
        icon={<FiPackage size={20} />}
        title="Produits"
        subtitle="Catalogue complet de vos articles"
        action={isAdmin && (
          <Link to="/app/produits/nouveau" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1B5E20] text-white rounded-[14px] text-[0.88rem] font-bold shadow-md shadow-[#1B5E20]/20 hover:bg-[#155230] hover:-translate-y-0.5 transition-all" style={{fontFamily:'Sora,sans-serif'}}>
            <FiPlus size={16} /> Nouveau Produit
          </Link>
        )}
      />

      {/* Plan Limit Banner */}
      <PlanLimitBanner label="produits" current={produits.length} limit={planLimits.produits} icon={<FiPackage size={14} />} />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="relative flex flex-col gap-3 p-5 bg-gradient-to-br from-[#1B5E20] to-[#0D3B14] border border-[#1B5E20]/50 rounded-[22px] shadow-lg shadow-[#1B5E20]/20 hover:-translate-y-1 hover:shadow-xl transition-all overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,214,0,0.1),transparent_60%)] pointer-events-none" />
          <div className="flex items-center justify-between">
            <div className="w-[42px] h-[42px] flex items-center justify-center rounded-xl shrink-0 bg-white/15 text-white"><FiPackage size={20} /></div>
            <span className="text-[0.72rem] font-bold text-white/50 uppercase tracking-widest">Actifs</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[1.35rem] font-extrabold text-white tracking-tight" style={{fontFamily:'Sora,sans-serif'}}>{produits.length}</span>
            <span className="text-[0.78rem] font-semibold text-white/60">Produits</span>
          </div>
        </div>

        <div className="relative flex flex-col gap-3 p-5 bg-gradient-to-br from-[#FFD600] to-[#F9A825] border border-[#FFD600]/50 rounded-[22px] shadow-lg shadow-[#FFD600]/20 hover:-translate-y-1 hover:shadow-xl transition-all overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_60%)] pointer-events-none" />
          <div className="flex items-center justify-between">
            <div className="w-[42px] h-[42px] flex items-center justify-center rounded-xl shrink-0 bg-black/10 text-[#1B3300]"><FiBarChart2 size={20} /></div>
            <span className="text-[0.72rem] font-bold text-[#5D4037]/60 uppercase tracking-widest">Total</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[1.2rem] font-extrabold text-[#1B3300] tracking-tight truncate" style={{fontFamily:'Sora,sans-serif'}}>{formatCFA(totalValue)}</span>
            <span className="text-[0.78rem] font-semibold text-[#5D4037]/70">Valeur du stock</span>
          </div>
        </div>

        <div className="relative flex flex-col gap-3 p-5 bg-gradient-to-br from-white to-amber-50/60 border border-amber-200/60 rounded-[22px] shadow-lg shadow-slate-200/40 hover:-translate-y-1 hover:shadow-xl transition-all overflow-hidden cursor-pointer" onClick={() => setFilterAlerte(!filterAlerte)}>
          <div className="flex items-center justify-between">
            <div className="w-[42px] h-[42px] flex items-center justify-center rounded-xl shrink-0 bg-amber-400/15 text-amber-600"><FiAlertTriangle size={20} /></div>
            <span className="text-[0.72rem] font-bold text-muted-foreground uppercase tracking-widest">Stock</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[1.35rem] font-extrabold text-amber-700 tracking-tight" style={{fontFamily:'Sora,sans-serif'}}>{alertCount}</span>
            <span className="text-[0.78rem] font-semibold text-muted-foreground">En alerte stock</span>
          </div>
          {filterAlerte && <span className="absolute top-4 right-4 text-[0.65rem] font-bold bg-amber-400/15 text-amber-700 px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-amber-300/40"><FiFilter size={12} /> Filtré</span>}
        </div>

        <div className="relative flex flex-col gap-3 p-5 bg-gradient-to-br from-white to-slate-50 border border-border/80 rounded-[22px] shadow-lg shadow-slate-200/40 hover:-translate-y-1 hover:shadow-xl transition-all overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-[42px] h-[42px] flex items-center justify-center rounded-xl shrink-0 bg-violet-100 text-violet-600"><FiGrid size={20} /></div>
            <span className="text-[0.72rem] font-bold text-muted-foreground uppercase tracking-widest">Types</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[1.35rem] font-extrabold text-foreground tracking-tight" style={{fontFamily:'Sora,sans-serif'}}>{[...new Set(produits.map(p => p.categorie?.nom).filter(Boolean))].length}</span>
            <span className="text-[0.78rem] font-semibold text-muted-foreground">Catégories</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 md:px-5 bg-gradient-to-br from-white to-slate-50/80 border border-border/70 rounded-[20px] shadow-sm">
        <form className="flex items-center gap-3 pl-4 pr-1.5 py-1.5 bg-[#1B5E20]/5 border border-[#1B5E20]/15 rounded-2xl md:min-w-[380px] focus-within:border-[#1B5E20]/40 focus-within:shadow-[0_0_0_3px_rgba(27,94,32,0.08)] transition-all" onSubmit={handleSearch}>
          <FiSearch size={16} className="text-[#1B5E20]/60 shrink-0" />
          <input
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-foreground placeholder:text-muted-foreground w-full"
            placeholder="Rechercher par nom, catégorie..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="px-4 py-2 bg-[#1B5E20] text-white font-bold text-xs rounded-xl hover:bg-[#155230] transition-colors">Chercher</button>
        </form>
        <div className="flex items-center gap-3">
          <span className="text-[0.82rem] font-semibold text-muted-foreground">{displayed.length} produit{displayed.length > 1 ? 's' : ''}</span>
          {filterAlerte && <span className="text-[0.72rem] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1"><FiFilter size={11} /> Filtre alerte actif</span>}
        </div>
      </div>

      {/* Table */}
      <div className="bg-gradient-to-b from-white to-slate-50/80 border border-border/70 rounded-[28px] shadow-lg shadow-slate-200/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-[#1B5E20]/10 bg-[#1B5E20]/4">
                <th className="px-6 py-4 text-[0.72rem] font-extrabold text-[#1B5E20]/70 uppercase tracking-widest">Produit</th>
                <th className="px-6 py-4 text-[0.72rem] font-extrabold text-[#1B5E20]/70 uppercase tracking-widest">Catégorie</th>
                <th className="px-6 py-4 text-[0.72rem] font-extrabold text-[#1B5E20]/70 uppercase tracking-widest">Prix Vente</th>
                {isAdmin && <th className="px-6 py-4 text-[0.72rem] font-extrabold text-[#1B5E20]/70 uppercase tracking-widest">Prix Achat</th>}
                <th className="px-6 py-4 text-[0.72rem] font-extrabold text-[#1B5E20]/70 uppercase tracking-widest">Stock</th>
                <th className="px-6 py-4 text-[0.72rem] font-extrabold text-[#1B5E20]/70 uppercase tracking-widest">Unités de vente</th>
                {isAdmin && <th className="px-6 py-4 text-[0.72rem] font-extrabold text-[#1B5E20]/70 uppercase tracking-widest text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {displayed.map(p => (
                <tr key={p.id} className={`border-b border-muted/40 last:border-0 transition-all ${p.stock <= p.stockAlerte ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-[#1B5E20]/3'}`}>
                  <td className="px-6 py-4 align-middle">
                    <div className="flex items-center gap-3.5">
                      <div className={`w-10 h-10 flex items-center justify-center rounded-xl shrink-0 ${!p.actif ? 'bg-muted text-muted-foreground' : 'bg-[#1B5E20]/10 text-[#1B5E20]'}`}>
                        <FiBox size={16} />
                      </div>
                      <div>
                        <strong className="text-[0.92rem] font-semibold text-foreground">{p.nom}</strong>
                        {!p.actif && <span className="inline-block ml-2 px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-[0.62rem] font-bold align-middle">Inactif</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 align-middle">
                    <span className="inline-block px-2.5 py-1 bg-[#1B5E20]/8 border border-[#1B5E20]/15 rounded-full text-[0.73rem] font-semibold text-[#1B5E20]">{p.categorie?.nom || '—'}</span>
                  </td>
                  <td className="px-6 py-4 align-middle">
                    {(() => {
                      const defU = p.unitesVente?.find(u => u.estDefaut) || p.unitesVente?.[0];
                      if (defU) return <><span className="text-[0.92rem] font-extrabold text-foreground font-mono">{formatCFA(defU.prix)}</span><span className="text-[0.7rem] text-muted-foreground font-medium ml-1">/ {defU.nom}</span></>;
                      return <span className="text-[0.92rem] font-extrabold text-foreground font-mono">{formatCFA(p.prixVente)}</span>;
                    })()}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 align-middle">
                      {(() => {
                        const defU = p.unitesVente?.find(u => u.estDefaut) || p.unitesVente?.[0];
                        if (defU?.prixAchat) return <><span className="text-[0.88rem] font-semibold text-muted-foreground font-mono">{formatCFA(defU.prixAchat)}</span><span className="text-[0.7rem] text-muted-foreground font-medium ml-1">/ {defU.nom}</span></>;
                        return <span className="text-[0.88rem] font-semibold text-muted-foreground font-mono">{formatCFA(p.prixAchat)}</span>;
                      })()}
                    </td>
                  )}
                  <td className="px-6 py-4 align-middle">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const defU = p.unitesVente?.find(u => u.estDefaut) || p.unitesVente?.[0];
                        const isAlert = p.stock <= p.stockAlerte;
                        if (defU && defU.facteurConversion > 0) {
                          const qty = p.stock / defU.facteurConversion;
                          return <span className={`text-[0.92rem] font-extrabold ${isAlert ? 'text-amber-600' : 'text-foreground'}`}>{qty % 1 === 0 ? qty : qty.toFixed(2)} {defU.nom}</span>;
                        }
                        return <span className={`text-[0.92rem] font-extrabold ${isAlert ? 'text-amber-600' : 'text-foreground'}`}>{p.stock} {p.uniteBase}</span>;
                      })()}
                      {p.stock <= p.stockAlerte && <span className="text-amber-500 animate-pulse"><FiAlertTriangle size={13} /></span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 align-middle">
                    <div className="flex flex-wrap gap-1.5">
                      {p.unitesVente?.map(u => (
                        <span key={u.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#FFD600]/10 border border-[#FFD600]/25 text-[#B8860B] rounded-[8px] text-[0.72rem] font-bold whitespace-nowrap">
                          <FiLayers size={10} /> {u.nom} ({u.facteurConversion} {p.uniteBase}) = {formatCFA(u.prix)}
                        </span>
                      ))}
                      {(!p.unitesVente || p.unitesVente.length === 0) && <span className="text-muted-foreground text-[0.8rem]">—</span>}
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 align-middle">
                      <div className="flex gap-2 justify-end">
                        <Link to={`/app/produits/${p.id}/edit`} className="w-9 h-9 flex items-center justify-center border border-[#1B5E20]/20 rounded-[10px] bg-[#1B5E20]/5 text-[#1B5E20] transition-all hover:bg-[#1B5E20]/15 hover:border-[#1B5E20]/35" title="Modifier">
                          <FiEdit size={15} />
                        </Link>
                        <button className="w-9 h-9 flex items-center justify-center border border-destructive/20 rounded-[10px] bg-destructive/5 text-destructive transition-all hover:bg-destructive/15 hover:border-destructive/35" onClick={() => handleDelete(p.id, p.nom)} title={`Désactiver le produit ${p.nom}`}>
                          <FiTrash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {displayed.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-[#1B5E20]/8 text-[#1B5E20]/40 mb-4"><FiPackage size={32} /></div>
              <p className="text-[1rem] font-semibold text-muted-foreground mb-1">Aucun produit trouvé</p>
              <span className="text-[0.82rem] text-muted-foreground/60">{filterAlerte ? 'Aucun produit en alerte stock' : 'Ajoutez votre premier produit'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

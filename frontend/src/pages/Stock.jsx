import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/useAuth';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '@tekkipro/shared/apiError';
import { getApiSuccessMessage, getLocalSuccessMessage } from '@tekkipro/shared/apiSuccess';
import {
  FiPlus, FiAlertTriangle, FiDatabase, FiTrendingUp, FiPackage,
  FiBox, FiLayers, FiCalendar, FiTruck, FiDollarSign, FiHash, FiChevronDown,
  FiCheckCircle, FiX, FiSearch, FiArrowDownCircle, FiBarChart2,
  FiShield, FiActivity
} from 'react-icons/fi';
import PageHeader from '../components/PageHeader';
import UsageMeter from '../components/UsageMeter';

export default function Stock() {
  const { isAdmin, plan, planUsage } = useAuth();
  const [inventaire, setInventaire] = useState(null);
  const [historique, setHistorique] = useState([]);
  const [produits, setProduits] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ produitId: '', quantite: '', prixAchat: '', fournisseurId: '', uniteVenteId: '' });
  const [tab, setTab] = useState('inventaire');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!showModal) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showModal]);

  const loadData = async () => {
    const [inventaireResult, historiqueResult, produitsResult, fournisseursResult] = await Promise.allSettled([
      api.get('/stock/inventaire'),
      api.get('/stock/historique'),
      api.get('/produits'),
      api.get('/fournisseurs'),
    ]);

    const hasCriticalError = [inventaireResult, historiqueResult, produitsResult].some(
      (result) => result.status !== 'fulfilled'
    );

    if (inventaireResult.status === 'fulfilled') {
      setInventaire(inventaireResult.value.data.data);
    }

    if (historiqueResult.status === 'fulfilled') {
      setHistorique(historiqueResult.value.data.data);
    }

    if (produitsResult.status === 'fulfilled') {
      setProduits(produitsResult.value.data.data);
    }

    if (fournisseursResult.status === 'fulfilled') {
      setFournisseurs(fournisseursResult.value.data.data);
    } else {
      setFournisseurs([]);
    }

    if (hasCriticalError) {
      toast.error('Erreur de chargement du stock');
    }

    setLoading(false);
  };

  const handleEntreeStock = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await api.post('/stock/entree', { ...form, uniteVenteId: form.uniteVenteId ? parseInt(form.uniteVenteId) : undefined });
      toast.success(getApiSuccessMessage(response, { fallback: getLocalSuccessMessage({ entity: 'stock', action: 'update' }) }));
      setShowModal(false);
      setForm({ produitId: '', quantite: '', prixAchat: '', fournisseurId: '', uniteVenteId: '' });
      loadData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, { fallback: 'Erreur' }));
    } finally {
      setSubmitting(false);
    }
  };

  const formatCFA = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0)) + ' FCFA';

  const selectedProduct = produits.find(p => String(p.id) === String(form.produitId));
  const selectedReceptionUnit = form.uniteVenteId && selectedProduct?.unitesVente?.length
    ? selectedProduct.unitesVente.find(u => String(u.id) === String(form.uniteVenteId))
    : null;
  const totalCost = form.quantite && form.prixAchat ? (parseFloat(form.quantite) * parseFloat(form.prixAchat)) : 0;

  const filteredProduits = inventaire?.produits?.filter(p =>
    p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.categorie?.nom || '').toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-transparent p-5 md:p-8 flex flex-col gap-6 font-sans">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="w-10 h-10 border-[3px] border-muted border-t-primary rounded-full animate-spin" />
          <p>Chargement du stock...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-transparent p-5 md:p-8 flex flex-col gap-6 font-sans">
      <PageHeader
        icon={<FiDatabase size={20} />}
        title="Stock"
        subtitle="Gestion des entrées et de l'inventaire"
        action={
          <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B5E20] text-white font-bold text-[0.85rem] rounded-xl hover:-translate-y-0.5 transition-all border-none cursor-pointer">
            <FiPlus size={16} /> Entrée stock
          </button>
        }
      />

      {plan === 'GRATUIT' && planUsage && (
        <div className="max-w-xs">
          <UsageMeter
            label="Produits actifs"
            used={planUsage.produits?.used ?? 0}
            limit={planUsage.produits?.limit ?? null}
          />
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total produits — green fill */}
        <div className="relative flex items-center gap-4 p-5 bg-gradient-to-br from-[#1B5E20] to-[#0D3B14] rounded-[22px] shadow-sm transition-all overflow-hidden hover:-translate-y-1 hover:shadow-md">
          <div className="w-12 h-12 flex items-center justify-center rounded-xl shrink-0 bg-white/15 text-white">
            <FiPackage size={22} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[1.15rem] font-extrabold text-white tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">{inventaire?.totalProduits || 0}</span>
            <span className="text-[0.76rem] font-semibold text-white/65 mt-0.5">Total produits</span>
          </div>
        </div>
        {/* Valeur stock — gold fill */}
        <div className="relative flex items-center gap-4 p-5 bg-gradient-to-br from-[#FFD600] to-[#F9A825] rounded-[22px] shadow-sm transition-all overflow-hidden hover:-translate-y-1 hover:shadow-md">
          <div className="w-12 h-12 flex items-center justify-center rounded-xl shrink-0 bg-[#071C08]/15 text-[#071C08]">
            <FiBarChart2 size={22} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[1.15rem] font-extrabold text-[#071C08] tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">{formatCFA(inventaire?.totalValeurStock)}</span>
            <span className="text-[0.76rem] font-semibold text-[#071C08]/65 mt-0.5">Valeur stock</span>
          </div>
        </div>
        {/* Alertes stock — white card with red/amber accent bar */}
        <div className="relative flex items-center gap-4 p-5 bg-white border border-border/80 rounded-[22px] shadow-sm transition-all overflow-hidden hover:-translate-y-1 hover:shadow-md">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#D32F2F] to-amber-500 rounded-t-[22px]" />
          <div className="w-12 h-12 flex items-center justify-center rounded-xl shrink-0 bg-amber-500/10 text-amber-600">
            <FiAlertTriangle size={22} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[1.15rem] font-extrabold text-amber-600 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">{inventaire?.produitsEnAlerte || 0}</span>
            <span className="text-[0.76rem] font-semibold text-muted-foreground mt-0.5">Alertes stock</span>
          </div>
        </div>
        {/* Mouvements — white card with green accent bar */}
        <div className="relative flex items-center gap-4 p-5 bg-white border border-border/80 rounded-[22px] shadow-sm transition-all overflow-hidden hover:-translate-y-1 hover:shadow-md">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#1B5E20] to-[#4CAF50] rounded-t-[22px]" />
          <div className="w-12 h-12 flex items-center justify-center rounded-xl shrink-0 bg-[#1B5E20]/10 text-[#1B5E20]">
            <FiActivity size={22} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[1.15rem] font-extrabold text-foreground tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">{historique.length}</span>
            <span className="text-[0.76rem] font-semibold text-muted-foreground mt-0.5">Mouvements</span>
          </div>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-gradient-to-b from-white/98 to-slate-50/96 border border-border/80 rounded-[22px] shadow-sm">
        <div className="flex gap-2" role="tablist" aria-label="Sections du stock">
          <button
            type="button"
            className={`px-4 py-2 rounded-xl text-[0.82rem] font-bold border transition-all ${tab === 'inventaire' ? 'bg-[#1B5E20] text-white border-[#1B5E20]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1B5E20]/30'}`}
            onClick={() => setTab('inventaire')}
            role="tab"
            aria-selected={tab === 'inventaire'}
            aria-controls="stock-panel-inventaire"
            id="stock-tab-inventaire"
          >
            Inventaire
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-xl text-[0.82rem] font-bold border transition-all ${tab === 'historique' ? 'bg-[#1B5E20] text-white border-[#1B5E20]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1B5E20]/30'}`}
            onClick={() => setTab('historique')}
            role="tab"
            aria-selected={tab === 'historique'}
            aria-controls="stock-panel-historique"
            id="stock-tab-historique"
          >
            Historique
          </button>
        </div>

        {tab === 'inventaire' && (
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50/90 border border-border/80 rounded-2xl min-w-[240px] transition-all shadow-inner focus-within:border-primary focus-within:shadow-[0_0_0_4px_rgba(27,94,32,0.08)]">
            <FiSearch size={16} />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-0">
        {tab === 'inventaire' ? (
          <div className="bg-gradient-to-b from-white/98 to-slate-50/96 border border-border/80 rounded-3xl overflow-x-auto shadow-sm relative backdrop-blur-md before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-gradient-to-r before:from-[#1B5E20] before:to-[#FFD600]" role="tabpanel" id="stock-panel-inventaire" aria-labelledby="stock-tab-inventaire">
            <table className="w-full border-collapse min-w-[800px] text-left">
              <caption className="visually-hidden">
                Inventaire du stock avec produit, catégorie, quantité disponible, unité, valeur et statut.
              </caption>
              <thead className="bg-[#1B5E20]/[0.04] border-b border-[#1B5E20]/10">
                <tr>
                  <th scope="col" className="px-5 py-3.5 text-[0.72rem] font-bold text-[#1B5E20]/70 uppercase tracking-wider">Produit</th>
                  <th scope="col" className="px-5 py-3.5 text-[0.72rem] font-bold text-[#1B5E20]/70 uppercase tracking-wider">Catégorie</th>
                  <th scope="col" className="px-5 py-3.5 text-[0.72rem] font-bold text-[#1B5E20]/70 uppercase tracking-wider">Stock</th>
                  <th scope="col" className="px-5 py-3.5 text-[0.72rem] font-bold text-[#1B5E20]/70 uppercase tracking-wider">Unité</th>
                  {isAdmin && <th scope="col" className="px-5 py-3.5 text-[0.72rem] font-bold text-[#1B5E20]/70 uppercase tracking-wider">Valeur Stock</th>}
                  <th scope="col" className="px-5 py-3.5 text-[0.72rem] font-bold text-[#1B5E20]/70 uppercase tracking-wider">Statut</th>
                </tr>
              </thead>
              <tbody>
                {filteredProduits.map(p => (
                  <tr key={p.id} className={`transition-all hover:bg-muted/50 hover:translate-x-0.5 border-b border-muted last:border-0 ${p.enAlerte ? 'bg-amber-500/5 hover:bg-amber-500/10' : ''}`}>
                    <th scope="row" className="px-5 py-4 font-normal align-middle">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 flex items-center justify-center bg-primary/10 text-primary rounded-[10px] shrink-0 shadow-sm">
                          <FiBox size={16} />
                        </div>
                        <strong className="font-bold text-foreground">{p.nom}</strong>
                      </div>
                    </th>
                    <td className="px-5 py-4 align-middle">
                      <span className="inline-block px-2.5 py-1 bg-muted rounded-full text-[0.76rem] font-semibold text-muted-foreground">{p.categorie?.nom || '—'}</span>
                    </td>
                    <td className="px-5 py-4 align-middle">
                      {(() => {
                        const defU = p.unitesVente?.find(u => u.estDefaut) || p.unitesVente?.[0];
                        if (defU && defU.facteurConversion > 0) {
                          const qty = p.stock / defU.facteurConversion;
                          return <span className={`font-extrabold text-[0.92rem] ${p.enAlerte ? 'text-destructive' : 'text-foreground'}`}>{qty % 1 === 0 ? qty : qty.toFixed(2)}</span>;
                        }
                        return <span className={`font-extrabold text-[0.92rem] ${p.enAlerte ? 'text-destructive' : 'text-foreground'}`}>{p.stock}</span>;
                      })()}
                    </td>
                    <td className="px-5 py-4 align-middle">
                      {(() => {
                        const defU = p.unitesVente?.find(u => u.estDefaut) || p.unitesVente?.[0];
                        return <span className="text-[0.82rem] font-medium text-muted-foreground">{defU ? defU.nom : p.uniteBase}</span>;
                      })()}
                    </td>
                    {isAdmin && <td className="px-5 py-4 align-middle font-bold text-foreground tabular-nums">{formatCFA(p.valeurStock)}</td>}
                    <td className="px-5 py-4 align-middle">
                      {p.stock === 0 ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[0.75rem] font-bold whitespace-nowrap bg-[#D32F2F]/10 text-[#D32F2F]">
                          <FiAlertTriangle size={13} /> Rupture
                        </span>
                      ) : p.enAlerte ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[0.75rem] font-bold whitespace-nowrap bg-amber-500/10 text-amber-600">
                          <FiAlertTriangle size={13} /> Alerte
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[0.75rem] font-bold whitespace-nowrap bg-[#1B5E20]/10 text-[#1B5E20]">
                          <FiCheckCircle size={13} /> OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredProduits.length === 0 && (
              <div className="flex flex-col items-center justify-center py-14 px-8 text-muted-foreground/60" role="status" aria-live="polite">
                <FiSearch size={40} />
                <p className="text-[0.95rem] font-bold text-muted-foreground m-0 mt-3 mb-1">Aucun produit trouvé</p>
                <span>Essayez un autre terme de recherche</span>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gradient-to-b from-white/98 to-slate-50/96 border border-border/80 rounded-3xl overflow-x-auto shadow-sm relative backdrop-blur-md before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-gradient-to-r before:from-[#1B5E20] before:to-[#FFD600]" role="tabpanel" id="stock-panel-historique" aria-labelledby="stock-tab-historique">
            <table className="w-full border-collapse min-w-[800px] text-left">
              <caption className="visually-hidden">
                Historique des entrées de stock avec date, produit, quantité, prix d'achat et fournisseur.
              </caption>
              <thead className="bg-[#1B5E20]/[0.04] border-b border-[#1B5E20]/10">
                <tr>
                  <th scope="col" className="px-5 py-3.5 text-[0.72rem] font-bold text-[#1B5E20]/70 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-5 py-3.5 text-[0.72rem] font-bold text-[#1B5E20]/70 uppercase tracking-wider">Produit</th>
                  <th scope="col" className="px-5 py-3.5 text-[0.72rem] font-bold text-[#1B5E20]/70 uppercase tracking-wider">Quantité</th>
                  <th scope="col" className="px-5 py-3.5 text-[0.72rem] font-bold text-[#1B5E20]/70 uppercase tracking-wider">Prix Achat</th>
                  <th scope="col" className="px-5 py-3.5 text-[0.72rem] font-bold text-[#1B5E20]/70 uppercase tracking-wider">Fournisseur</th>
                </tr>
              </thead>
              <tbody>
                {historique.map(e => (
                  <tr key={e.id} className="transition-all hover:bg-muted/50 hover:translate-x-0.5 border-b border-muted last:border-0">
                    <td className="px-5 py-4 align-middle">
                      <span className="text-[0.82rem] font-semibold text-muted-foreground">
                        {new Date(e.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </td>
                    <th scope="row" className="px-5 py-4 font-normal align-middle">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 flex items-center justify-center bg-[#1B6B3A]/10 text-[#1B6B3A] rounded-[10px] shrink-0 shadow-sm">
                          <FiArrowDownCircle size={16} />
                        </div>
                        <strong className="font-bold text-foreground">{e.produit?.nom}</strong>
                      </div>
                    </th>
                    <td className="px-5 py-4 align-middle">
                      <span className="inline-block px-2.5 py-1 bg-emerald-600/10 text-emerald-700 rounded-full text-[0.82rem] font-bold">+{e.quantite} {e.uniteNom || e.produit?.uniteBase}</span>
                    </td>
                    <td className="px-5 py-4 align-middle font-bold text-foreground tabular-nums">{formatCFA(e.prixAchat)}</td>
                    <td className="px-5 py-4 align-middle">
                      {e.fournisseur?.nom ? (
                        <span className="inline-flex items-center gap-1.5 text-[0.82rem] font-medium text-muted-foreground">
                          <FiTruck size={13} /> {e.fournisseur.nom}
                        </span>
                      ) : (
                        <span className="text-[0.82rem] font-medium text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {historique.length === 0 && (
              <div className="flex flex-col items-center justify-center py-14 px-8 text-muted-foreground/60" role="status" aria-live="polite">
                <FiCalendar size={40} />
                <p className="text-[0.95rem] font-bold text-muted-foreground m-0 mt-3 mb-1">Aucune entrée de stock</p>
                <span>Les mouvements de stock apparaîtront ici</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal entrée stock */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center z-[1000] p-6 animate-in fade-in duration-200" aria-hidden="true" onClick={() => setShowModal(false)}>
          <div className="bg-gradient-to-b from-white to-slate-50 border border-border/80 rounded-[28px] w-full max-w-[500px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300" role="dialog" aria-modal="true" aria-labelledby="stock-modal-title" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3.5 p-6 border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
              <div className="w-11 h-11 flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-white rounded-xl shadow-md shrink-0">
                <FiArrowDownCircle size={22} />
              </div>
              <div>
                <h3 id="stock-modal-title" className="text-[1.1rem] font-extrabold text-foreground m-0">Nouvelle entrée de stock</h3>
                <p className="text-[0.78rem] font-medium text-muted-foreground m-0 mt-1">Enregistrez un réapprovisionnement</p>
              </div>
              <button type="button" className="w-9 h-9 flex items-center justify-center bg-muted border-none rounded-xl text-muted-foreground cursor-pointer transition-all hover:bg-muted/80 hover:text-foreground shrink-0" onClick={() => setShowModal(false)} aria-label="Fermer la fenêtre d'entrée de stock">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleEntreeStock}>
              <div className="p-6 flex flex-col gap-4">
                {/* Produit */}
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-1.5 text-[0.82rem] font-semibold text-muted-foreground">
                    <FiPackage size={14} />
                    Produit <span className="text-destructive font-bold">*</span>
                  </label>
                  <select className="w-full px-4 py-3 bg-slate-50 border border-border rounded-xl text-[0.88rem] font-medium text-foreground transition-all outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                    value={form.produitId}
                    onChange={(e) => setForm({ ...form, produitId: e.target.value })}
                    required
                  >
                    <option value="">— Sélectionner un produit —</option>
                    {produits.map(p => {
                      const defU = p.unitesVente?.find(u => u.estDefaut) || p.unitesVente?.[0];
                      const stockLabel = defU && defU.facteurConversion > 0
                        ? `${(p.stock / defU.facteurConversion) % 1 === 0 ? (p.stock / defU.facteurConversion) : (p.stock / defU.facteurConversion).toFixed(2)} ${defU.nom}`
                        : `${p.stock} ${p.uniteBase}`;
                      return <option key={p.id} value={p.id}>{p.nom} (stock: {stockLabel})</option>;
                    })}
                  </select>
                </div>

                {/* Selected product info */}
                {selectedProduct && (
                  <div className="flex items-center gap-2 p-3 bg-gradient-to-b from-primary/5 to-transparent border border-primary/10 rounded-xl text-[0.82rem] font-medium text-muted-foreground">
                    <FiShield size={14} />
                    <span>Stock actuel : <strong>{(() => {
                      const defU = selectedProduct.unitesVente?.find(u => u.estDefaut) || selectedProduct.unitesVente?.[0];
                      if (defU && defU.facteurConversion > 0) {
                        const qty = selectedProduct.stock / defU.facteurConversion;
                        return `${qty % 1 === 0 ? qty : qty.toFixed(2)} ${defU.nom}`;
                      }
                      return `${selectedProduct.stock} ${selectedProduct.uniteBase}`;
                    })()}</strong></span>
                    {selectedProduct.stock <= selectedProduct.stockAlerte && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded-full text-[0.72rem] font-bold ml-auto">
                        <FiAlertTriangle size={12} /> En alerte
                      </span>
                    )}
                  </div>
                )}
                {/* Unité de réception */}
                {selectedProduct?.unitesVente?.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-1.5 text-[0.82rem] font-semibold text-muted-foreground"><FiLayers size={14} /> Unité de réception</label>
                    <select className="w-full px-4 py-3 bg-slate-50 border border-border rounded-xl text-[0.88rem] font-medium text-foreground transition-all outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10" value={form.uniteVenteId} onChange={(e) => setForm({ ...form, uniteVenteId: e.target.value })}>
                      {selectedProduct.unitesVente.map(u => (
                        <option key={u.id} value={u.id}>{u.nom} (= {u.facteurConversion.toLocaleString('fr-FR')} {selectedProduct.uniteBase})</option>
                      ))}
                      <option value="">Unité de base ({selectedProduct.uniteBase})</option>
                    </select>
                  </div>
                )}
                {/* Qty + Price row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-1.5 text-[0.82rem] font-semibold text-muted-foreground">
                      <FiHash size={14} />
                      Quantité <span className="text-destructive font-bold">*</span>
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 bg-slate-50 border border-border rounded-xl text-[0.88rem] font-medium text-foreground transition-all outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 placeholder:text-muted-foreground/60"
                      value={form.quantite}
                      onChange={(e) => setForm({ ...form, quantite: e.target.value })}
                      required
                      min="0.01"
                      step="0.01"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-1.5 text-[0.82rem] font-semibold text-muted-foreground">
                      <FiDollarSign size={14} />
                      Prix d'achat unitaire{selectedReceptionUnit ? ` — 1 ${selectedReceptionUnit.nom}` : ' — unité saisie'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        className="w-full px-4 py-3 pr-14 bg-slate-50 border border-border rounded-xl text-[0.88rem] font-medium text-foreground transition-all outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 placeholder:text-muted-foreground/60"
                        value={form.prixAchat}
                        onChange={(e) => setForm({ ...form, prixAchat: e.target.value })}
                        min="0"
                        placeholder="0"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[0.72rem] font-bold text-muted-foreground pointer-events-none">FCFA</span>
                    </div>
                  </div>
                </div>

                {/* Total cost indicator */}
                {totalCost > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-gradient-to-b from-[#1B6B3A]/10 to-[#1B6B3A]/5 border border-[#1B6B3A]/15 rounded-xl text-[0.82rem] font-medium text-[#1B6B3A]">
                    <FiBarChart2 size={15} />
                    <span>Coût total : <strong>{formatCFA(totalCost)}</strong></span>
                  </div>
                )}

                {/* Fournisseur */}
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-1.5 text-[0.82rem] font-semibold text-muted-foreground">
                    <FiTruck size={14} />
                    Fournisseur
                  </label>
                  <select className="w-full px-4 py-3 bg-slate-50 border border-border rounded-xl text-[0.88rem] font-medium text-foreground transition-all outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                    value={form.fournisseurId}
                    onChange={(e) => setForm({ ...form, fournisseurId: e.target.value })}
                  >
                    <option value="">— Aucun fournisseur —</option>
                    {fournisseurs.map(f => (
                      <option key={f.id} value={f.id}>{f.nom}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 p-5 border-t border-border bg-gradient-to-b from-slate-50/98 to-slate-100/90">
                <button type="button" className="px-5 py-2.5 bg-white border border-border rounded-xl text-muted-foreground text-[0.85rem] font-semibold cursor-pointer transition-all hover:bg-muted hover:text-foreground" onClick={() => setShowModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-[#1B5E20] to-[#0D3B14] text-white border-none rounded-xl text-[0.85rem] font-bold cursor-pointer transition-all shadow-[0_12px_26px_rgba(27,94,32,0.25)] hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none" disabled={submitting}>
                  {submitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiCheckCircle size={16} />}
                  {submitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

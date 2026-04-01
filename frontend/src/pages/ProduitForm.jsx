import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import BarcodeScannerInput from '../features/products/components/BarcodeScannerInput';
import { showUpgradeToast } from '../lib/upgradeToast';
import {
  FiPackage, FiSave, FiArrowLeft, FiGrid, FiPlus, FiTrash2,
  FiTag, FiDollarSign, FiBox, FiAlertTriangle, FiBarChart2,
  FiHash, FiFileText, FiTruck, FiLayers, FiInfo, FiCheck
} from 'react-icons/fi';

// Unités de base disponibles
const UNITES_BASE = [
  { value: 'g', label: 'Gramme (g)', famille: 'poids', exemple: 'Riz, sucre, farine, café...' },
  { value: 'ml', label: 'Millilitre (ml)', famille: 'liquide', exemple: 'Huile, lait, eau, jus...' },
  { value: 'piece', label: 'Pièce', famille: 'unitaire', exemple: 'Téléphone, savon, cahier...' },
  { value: 'paquet', label: 'Paquet', famille: 'emballage', exemple: 'Pâtes, biscuits, couches...' },
  { value: 'm', label: 'Mètre (m)', famille: 'longueur', exemple: 'Tissu, câble, tuyau...' },
];

// Suggestions d'unités de vente par famille
const SUGGESTIONS_UNITES = {
  g: [
    { nom: 'Sac 50kg', facteur: 50000 },
    { nom: 'Sac 25kg', facteur: 25000 },
    { nom: 'Kilogramme', facteur: 1000 },
    { nom: '500 grammes', facteur: 500 },
    { nom: '250 grammes', facteur: 250 },
    { nom: '100 grammes', facteur: 100 },
  ],
  ml: [
    { nom: 'Bidon 20L', facteur: 20000 },
    { nom: 'Bidon 5L', facteur: 5000 },
    { nom: 'Litre', facteur: 1000 },
    { nom: 'Bouteille 50cl', facteur: 500 },
    { nom: '33cl', facteur: 330 },
    { nom: '25cl', facteur: 250 },
  ],
  piece: [
    { nom: 'Carton', facteur: 24 },
    { nom: 'Douzaine', facteur: 12 },
    { nom: 'Lot de 6', facteur: 6 },
    { nom: 'Pièce', facteur: 1 },
  ],
  paquet: [
    { nom: 'Carton', facteur: 40 },
    { nom: 'Lot de 10', facteur: 10 },
    { nom: 'Paquet', facteur: 1 },
  ],
  m: [
    { nom: 'Rouleau 100m', facteur: 100 },
    { nom: 'Rouleau 50m', facteur: 50 },
    { nom: 'Mètre', facteur: 1 },
  ],
};

export default function ProduitForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [searchParams] = useSearchParams();
  const codeBarreFromUrl = searchParams.get('codeBarre') || '';
  const returnTo = searchParams.get('returnTo') || '';

  const [categories, setCategories] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [form, setForm] = useState({
    nom: '', description: '', prixVente: '', prixAchat: '',
    stockAlerte: '0', uniteBase: 'g', codeBarre: codeBarreFromUrl, categorieId: '', fournisseurId: '',
  });
  // Stock input: user enters quantity + selects which unit
  const [stockQty, setStockQty] = useState('');
  const [stockUniteIdx, setStockUniteIdx] = useState(-1); // -1 = base unit
  const [unitesVente, setUnitesVente] = useState([]);
  // Commercial pack helper (automatic conversion)
  const [commercialMode, setCommercialMode] = useState(''); // 'poids'|'volume'|'carton'|''
  const [commercialSize, setCommercialSize] = useState(''); // e.g. poids en kg ou volume en L ou unités par carton
  const [commercialCount, setCommercialCount] = useState(''); // nombre de packs (sacs,bidons,cartons)
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [scannerActive, setScannerActive] = useState(false);

  useEffect(() => {
    loadOptions();
    if (isEdit) loadProduit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadOptions = async () => {
    try {
      const [catRes, fournRes] = await Promise.all([
        api.get('/categories'),
        api.get('/fournisseurs'),
      ]);
      setCategories(catRes.data.data);
      setFournisseurs(fournRes.data.data);
    } catch (_e) { toast.error('Erreur de chargement des options'); }
  };

  const loadProduit = async () => {
    try {
      const res = await api.get(`/produits/${id}`);
      const p = res.data.data;
      setForm({
        nom: p.nom, description: p.description || '', prixVente: p.prixVente, prixAchat: p.prixAchat,
        stockAlerte: p.stockAlerte, uniteBase: p.uniteBase, codeBarre: p.codeBarre || '',
        categorieId: p.categorieId || '', fournisseurId: p.fournisseurId || '',
      });
      setUnitesVente((p.unitesVente || []).map(u => ({
        ...u,
        isNew: false,
      })));
      // Show current stock in base unit
      setStockQty(p.stock);
      setStockUniteIdx(-1);
    } catch (_e) {
      toast.error('Produit non trouvé');
      navigate('/app/produits');
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleScan = (code) => {
    setForm(prev => ({ ...prev, codeBarre: code }));
    toast.success(`Code-barres scanné : ${code}`);
    setScannerActive(false);
  };

  // Calculate stock in base unit
  const getStockBase = () => {
    const qty = parseFloat(stockQty || 0);
    // If commercial helper filled, compute from it (overrides stockQty)
    if (commercialMode && commercialSize && commercialCount) {
      const size = parseFloat(commercialSize || 0);
      const count = parseFloat(commercialCount || 0);
      if (isNaN(size) || isNaN(count)) return 0;
      if (commercialMode === 'poids') {
        // commercialSize in kg -> convert to grams
        return count * size * 1000;
      }
      if (commercialMode === 'volume') {
        // commercialSize in litres -> convert to ml
        return count * size * 1000;
      }
      if (commercialMode === 'carton') {
        // commercialSize = units per carton
        return count * size;
      }
    }
    if (stockUniteIdx >= 0 && unitesVente[stockUniteIdx]) {
      return qty * parseFloat(unitesVente[stockUniteIdx].facteurConversion || 0);
    }
    return qty;
  };

  // Add a new unit conversion row
  const addUnite = () => {
    setUnitesVente([...unitesVente, { nom: '', facteurConversion: '', prix: '', prixAchat: '', estDefaut: false, isNew: true }]);
  };

  const addCommercialUnitToList = () => {
    if (!commercialMode || !commercialSize) return toast.error('Remplissez la contenance');
    const size = parseFloat(commercialSize);
    if (isNaN(size) || size <= 0) return toast.error('Contenance invalide');
    let nom, facteur;
    if (commercialMode === 'poids') {
      nom = `Sac ${size}kg`;
      facteur = size * 1000; // grams
    } else if (commercialMode === 'volume') {
      nom = `Bidon ${size}L`;
      facteur = size * 1000; // ml
    } else {
      nom = `Carton ${size}`;
      facteur = size; // units per carton
    }
    // prevent duplicates
    if (unitesVente.some(u => u.nom === nom)) return toast.error(`${nom} existe déjà dans les unités`);
    setUnitesVente([...unitesVente, { nom, facteurConversion: String(facteur), prix: '', prixAchat: '', estDefaut: unitesVente.length === 0, isNew: true }]);
    toast.success(`Unité ${nom} ajoutée (ajoutez le prix si nécessaire)`);
  };

  // Add a suggested unit
  const addSuggestion = (suggestion) => {
    // Check if already exists
    if (unitesVente.some(u => u.nom === suggestion.nom)) {
      toast.error(`"${suggestion.nom}" existe déjà`);
      return;
    }
    setUnitesVente([...unitesVente, {
      nom: suggestion.nom,
      facteurConversion: suggestion.facteur,
      prix: '',
      prixAchat: '',
      estDefaut: unitesVente.length === 0,
      isNew: true,
    }]);
  };

  const updateUnite = (idx, field, value) => {
    const updated = [...unitesVente];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === 'estDefaut' && value) {
      // Only one default
      updated.forEach((u, i) => { if (i !== idx) u.estDefaut = false; });
    }
    setUnitesVente(updated);
  };

  const removeUnite = async (idx) => {
    const unite = unitesVente[idx];
    if (unite.id && !unite.isNew) {
      try {
        await api.delete(`/produits/unites/${unite.id}`);
      } catch (_e) { toast.error('Erreur de suppression'); }
    }
    setUnitesVente(unitesVente.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (form.prixVente === '' || form.prixVente === null || form.prixVente === undefined) errors.prixVente = 'Le prix de vente est obligatoire';
    if (!isEdit && (stockQty === '' || stockQty === null || stockQty === undefined)) errors.stockQty = 'Le stock initial est obligatoire';
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setLoading(true);
    try {
      const stockBase = isEdit ? (stockQty !== '' ? Number(stockQty) : undefined) : getStockBase();
      const validUnites = unitesVente.filter(u => u.nom && u.facteurConversion && u.prix);

      const data = {
        ...form,
        stock: stockBase,
        unitesVente: isEdit ? undefined : validUnites.map(u => ({
          nom: u.nom,
          facteurConversion: parseFloat(u.facteurConversion),
          prix: parseFloat(u.prix),
          prixAchat: u.prixAchat ? parseFloat(u.prixAchat) : null,
          estDefaut: Boolean(u.estDefaut),
        })),
      };

      if (isEdit) {
        await api.put(`/produits/${id}`, data);
        // Save new units
        for (const u of unitesVente.filter(u => u.isNew && u.nom && u.facteurConversion && u.prix)) {
          await api.post(`/produits/${id}/unites`, {
            nom: u.nom, facteurConversion: parseFloat(u.facteurConversion),
            prix: parseFloat(u.prix), prixAchat: u.prixAchat ? parseFloat(u.prixAchat) : null,
            estDefaut: Boolean(u.estDefaut),
          });
        }
        // Update existing units
        for (const u of unitesVente.filter(u => !u.isNew && u.id && u.nom && u.facteurConversion && u.prix)) {
          await api.put(`/produits/unites/${u.id}`, {
            nom: u.nom, facteurConversion: parseFloat(u.facteurConversion),
            prix: parseFloat(u.prix), prixAchat: u.prixAchat ? parseFloat(u.prixAchat) : null,
            estDefaut: Boolean(u.estDefaut),
          });
        }
        toast.success('Produit mis à jour avec succès.');
      } else {
        await api.post('/produits', data);
        toast.success('Produit créé avec succès.');
      }
      if (returnTo === 'vente') {
        navigate(`/app/ventes/nouvelle?codeBarre=${form.codeBarre}`);
      } else {
        navigate('/app/produits');
      }
    } catch (error) {
      if (error?.response?.data?.upgrade) {
        showUpgradeToast({ message: error.response.data.message, navigate });
      } else {
        toast.error(error.response?.data?.message || 'Erreur');
      }
    } finally {
      setLoading(false);
    }
  };

  const uniteBaseInfo = UNITES_BASE.find(u => u.value === form.uniteBase);
  const suggestions = SUGGESTIONS_UNITES[form.uniteBase] || [];
  const stockBase = getStockBase();

  // Format stock for display
  const formatStockDisplay = () => {
    if (!stockBase || stockBase <= 0) return null;
    const parts = [];
    parts.push(`${stockBase.toLocaleString('fr-FR')} ${form.uniteBase}`);
    // Show equivalents for each unit
    for (const u of unitesVente) {
      const f = parseFloat(u.facteurConversion);
      if (f > 0) {
        const equiv = stockBase / f;
        if (equiv >= 0.01) {
          parts.push(`${equiv % 1 === 0 ? equiv : equiv.toFixed(2)} ${u.nom}`);
        }
      }
    }
    return parts;
  };

  const marge = form.prixVente && form.prixAchat
    ? ((form.prixVente - form.prixAchat) / form.prixAchat * 100).toFixed(1)
    : null;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-transparent p-5 md:p-8 flex flex-col gap-6 font-sans">
      {/* Header */}
      <div className="relative p-8 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#071C08] via-[#0D2710] to-[#071C08] shadow-[0_8px_32px_rgba(7,28,8,0.35)]">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#1B5E20] via-[#FFD600] to-[#D32F2F] rounded-t-[28px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(27,94,32,0.35),transparent_55%)] pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <button onClick={() => returnTo === 'vente' ? navigate(`/app/ventes/nouvelle?codeBarre=${codeBarreFromUrl}`) : navigate('/app/produits')} className="w-10 h-10 flex items-center justify-center bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all border-none cursor-pointer">
              <FiArrowLeft size={20} />
            </button>
            <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-[#FFD600] to-[#F9A825] text-[#071C08] rounded-xl shadow-[0_6px_20px_rgba(255,214,0,0.3)] shrink-0"><FiPackage size={22} /></div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight m-0 mb-0.5 leading-tight" style={{fontFamily:'Sora,sans-serif'}}>{isEdit ? 'Modifier le produit' : 'Nouveau produit'}</h1>
              <p className="text-[0.85rem] font-medium text-white/55 m-0">{isEdit ? 'Mettez à jour les informations' : 'Ajoutez un produit à votre catalogue'}</p>
            </div>
          </div>
          <button type="submit" form="produit-form" disabled={loading} className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-[#FFD600] to-[#F9A825] text-[#071C08] font-extrabold text-[0.9rem] rounded-xl shadow-[0_4px_14px_rgba(255,214,0,0.35)] hover:-translate-y-0.5 transition-all border-none cursor-pointer disabled:opacity-70" style={{fontFamily:'Sora,sans-serif'}}>
            <FiSave size={18} /> {loading ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      <form id="produit-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-7 items-start">
        {/* Main Column */}
        <div className="flex flex-col gap-6 min-w-0">
          {/* Section: Informations de base */}
          <div className="bg-white border border-[#1B5E20]/10 rounded-[22px] shadow-sm p-6 flex flex-col gap-5">
            <h2 className="text-[1rem] font-extrabold text-[#1B5E20]" style={{fontFamily:'Sora,sans-serif'}}>Informations de base</h2>
            <div className="flex flex-col gap-5">
              <div className="space-y-2">
                <label>
                  <FiPackage size={14} />
                  Nom du produit
                  <span className="text-destructive font-bold">*</span>
                </label>
                <input
  className="w-full py-3 px-4 bg-white border-2 border-gray-100 rounded-xl text-[0.9rem] font-semibold transition-all focus:outline-none focus:border-[#1B5E20] focus:ring-4 focus:ring-[#1B5E20]/10"
                  type="text"
                  name="nom"
                  value={form.nom}
                  onChange={handleChange}
                  placeholder="Ex: Riz parfumé Uncle Ben's"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label>
                    <FiHash size={14} />
                    Code barre
                  </label>
                  <input
  className="w-full py-3 px-4 bg-white border-2 border-gray-100 rounded-xl text-[0.9rem] font-semibold transition-all focus:outline-none focus:border-[#1B5E20] focus:ring-4 focus:ring-[#1B5E20]/10"
                    type="text"
                    name="codeBarre"
                    value={form.codeBarre}
                    onChange={handleChange}
                    placeholder="Scanner ou saisir le code"
                  />
                  <button type="button" onClick={() => setScannerActive(v => !v)} className="mt-1 text-xs font-semibold text-[#1B5E20] hover:underline flex items-center gap-1 cursor-pointer border-none bg-transparent p-0">Scanner</button>
                  <BarcodeScannerInput active={scannerActive} onScan={handleScan} />
                </div>
                <div className="space-y-2">
                  <label>
                    <FiLayers size={14} />
                    Catégorie <span className="text-red-500">*</span>
                  </label>
                  <select className={`w-full py-3 px-4 bg-white border-2 rounded-xl text-[0.9rem] font-semibold transition-all focus:outline-none focus:border-[#1B5E20] focus:ring-4 focus:ring-[#1B5E20]/10 ${formErrors.categorieId ? 'border-red-400' : 'border-gray-100'}`} name="categorieId" value={form.categorieId} onChange={handleChange}>
                    <option value="">-- Aucune catégorie --</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                  {formErrors.categorieId && <p className="text-xs text-red-500 mt-1">{formErrors.categorieId}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <label>
                  <FiFileText size={14} />
                  Description
                </label>
                <textarea
  className="w-full py-3 px-4 bg-white border-2 border-gray-100 rounded-xl text-[0.9rem] font-semibold transition-all focus:outline-none focus:border-[#1B5E20] focus:ring-4 focus:ring-[#1B5E20]/10"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Description optionnelle du produit..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Section: Unité de base */}
          <div className="bg-card shadow-sm border border-border overflow-hidden rounded-2xl">
            <div className="flex flex-row items-center gap-3.5 border-b border-border/50 bg-muted/20 px-6 py-5">
              <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 shrink-0">
                <FiBox size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold m-0 text-foreground">Unité de base & Stock</h2>
                <p>L'unité de base sert à stocker le stock en interne</p>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex gap-3 p-3.5 bg-gradient-to-br from-amber-400/10 to-amber-500/5 border border-amber-500/15 rounded-xl mb-5 items-start">
                <FiInfo size={15} />
                <div>
                  <strong>Comment ça marche ?</strong>
                  <p>Choisissez l'unité la plus <em>petite</em> dans laquelle vous pourriez vendre ce produit. Le stock sera toujours stocké dans cette unité. Vous définirez ensuite les unités de vente (sac, kg, carton...) avec leur <em>facteur de conversion</em>.</p>
                </div>
              </div>

              <div className="space-y-2">
                <label>
                  <FiBox size={14} />
                  Unité de base
                  <span className="text-destructive font-bold">*</span>
                </label>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {UNITES_BASE.map(u => (
                    <button
                      key={u.value}
                      type="button"
                      className={`flex flex-col items-start p-3 border rounded-xl text-left transition-all hover:border-[#1B5E20]/30 ${form.uniteBase === u.value ? 'border-[#1B5E20] bg-[#1B5E20]/5 text-[#1B5E20] ring-1 ring-[#1B5E20]/20' : 'border-gray-100 bg-white'}`}
                      onClick={() => setForm({ ...form, uniteBase: u.value })}
                    >
                      <strong>{u.label}</strong>
                      <span>{u.exemple}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Commercial helper: show quick inputs to compute stock automatically */}
              {!isEdit && (form.uniteBase === 'g' || form.uniteBase === 'ml' || form.uniteBase === 'piece' || form.uniteBase === 'paquet') && (
                <div className="pf-commercial-helper">
                  <label>
                    <FiInfo size={14} /> Mode commercial (aide à la conversion automatique)
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <select className="w-full py-3 px-4 bg-white border-2 border-gray-100 rounded-xl text-[0.9rem] font-semibold transition-all focus:outline-none focus:border-[#1B5E20] focus:ring-4 focus:ring-[#1B5E20]/10" value={commercialMode} onChange={(e) => { setCommercialMode(e.target.value); setCommercialSize(''); setCommercialCount(''); }}>
                        <option value="">-- Aucun --</option>
                        {form.uniteBase === 'g' && <option value="poids">Sacs / Poids (kg)</option>}
                        {form.uniteBase === 'ml' && <option value="volume">Bidons / Volume (L)</option>}
                        {(form.uniteBase === 'piece' || form.uniteBase === 'paquet') && <option value="carton">Cartons / Unités par carton</option>}
                      </select>
                    </div>
                    {commercialMode && (
                      <>
                        <div className="space-y-2">
                          <label>Contenance ({commercialMode === 'poids' ? 'kg' : commercialMode === 'volume' ? 'L' : 'unités'})</label>
                          <input type="number" value={commercialSize} onChange={(e) => setCommercialSize(e.target.value)} placeholder={commercialMode === 'poids' ? 'Ex: 50' : commercialMode === 'volume' ? 'Ex: 20' : 'Ex: 40'} min="0" step="0.01" />
                        </div>
                        <div className="space-y-2">
                          <label>Nombre de packs</label>
                          <input type="number" value={commercialCount} onChange={(e) => setCommercialCount(e.target.value)} placeholder="Ex: 10" min="0" step="1" />
                        </div>
                      </>
                    )}
                  </div>
                  {commercialMode && commercialSize && commercialCount && (
                    <div className="flex gap-2.5 p-3.5 bg-primary/5 border border-primary/15 rounded-xl text-sm text-foreground" style={{marginTop:'0.6rem'}}>
                      <FiCheck size={15} />
                      <div>
                        <strong>Stock calculé :</strong> {getStockBase().toLocaleString('fr-FR')} {form.uniteBase}
                      </div>
                    </div>
                  )}
                  {commercialMode && commercialSize && (
                    <div style={{marginTop:'0.5rem'}}>
                      <button type="button" className="pf-btn" onClick={addCommercialUnitToList}>Ajouter l'unité commerciale</button>
                    </div>
                  )}
                </div>
              )}

              {!isEdit && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2" style={{ flex: 2 }}>
                    <label>
                      <FiBarChart2 size={14} />
                      Stock initial — quantité <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
  className={`w-full py-3 px-4 bg-white border-2 rounded-xl text-[0.9rem] font-semibold transition-all focus:outline-none focus:border-[#1B5E20] focus:ring-4 focus:ring-[#1B5E20]/10 ${formErrors.stockQty ? 'border-red-400' : 'border-gray-100'}`}
                        type="number"
                        value={stockQty}
                        onChange={(e) => setStockQty(e.target.value)}
                        placeholder="Ex: 20"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    {formErrors.stockQty && <p className="text-xs text-red-500 mt-1">{formErrors.stockQty}</p>}
                  </div>
                  <div className="space-y-2" style={{ flex: 2 }}>
                    <label>
                      <FiLayers size={14} />
                      Unité de la quantité saisie
                    </label>
                    <select
                      value={stockUniteIdx}
                      onChange={(e) => setStockUniteIdx(parseInt(e.target.value))}
                    >
                      <option value={-1}>En {uniteBaseInfo?.label || form.uniteBase} (unité de base)</option>
                      {unitesVente.map((u, i) => (
                        u.nom && u.facteurConversion ? (
                          <option key={i} value={i}>{u.nom} (1 = {parseFloat(u.facteurConversion).toLocaleString('fr-FR')} {form.uniteBase})</option>
                        ) : null
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {!isEdit && stockBase > 0 && (
                <div className="flex gap-2.5 p-3.5 bg-primary/5 border border-primary/15 rounded-xl text-sm text-foreground">
                  <FiCheck size={15} />
                  <div>
                    <strong>Stock en base :</strong> {stockBase.toLocaleString('fr-FR')} {form.uniteBase}
                    {formatStockDisplay()?.slice(1).map((eq, i) => (
                      <span key={i} className="text-muted-foreground font-medium"> = {eq}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label>
                    <FiAlertTriangle size={14} />
                    Seuil d'alerte stock (en {form.uniteBase})
                  </label>
                  <div className="relative">
                    <input
  className="w-full py-3 px-4 bg-white border-2 border-gray-100 rounded-xl text-[0.9rem] font-semibold transition-all focus:outline-none focus:border-[#1B5E20] focus:ring-4 focus:ring-[#1B5E20]/10"
                      type="number"
                      name="stockAlerte"
                      value={form.stockAlerte}
                      onChange={handleChange}
                      placeholder="0"
                      min="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground pointer-events-none">{form.uniteBase}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label>
                    <FiTruck size={14} />
                    Fournisseur
                  </label>
                  <select className="w-full py-3 px-4 bg-white border-2 border-gray-100 rounded-xl text-[0.9rem] font-semibold transition-all focus:outline-none focus:border-[#1B5E20] focus:ring-4 focus:ring-[#1B5E20]/10" name="fournisseurId" value={form.fournisseurId} onChange={handleChange}>
                    <option value="">-- Aucun fournisseur --</option>
                    {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Prix de référence */}
          <div className="bg-card shadow-sm border border-border overflow-hidden rounded-2xl">
            <div className="flex flex-row items-center gap-3.5 border-b border-border/50 bg-muted/20 px-6 py-5">
              <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-secondary/10 text-secondary shrink-0">
                <FiDollarSign size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold m-0 text-foreground">Prix de référence</h2>
                <p>Prix par défaut (utilisés si aucune unité de vente n'est définie)</p>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label>
                    <FiDollarSign size={14} />
                    Prix de vente (CFA) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
  className={`w-full py-3 px-4 bg-white border-2 rounded-xl text-[0.9rem] font-semibold transition-all focus:outline-none focus:border-[#1B5E20] focus:ring-4 focus:ring-[#1B5E20]/10 ${formErrors.prixVente ? 'border-red-400' : 'border-gray-100'}`}
                      type="number"
                      name="prixVente"
                      value={form.prixVente}
                      onChange={handleChange}
                      placeholder="0"
                      min="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground pointer-events-none">CFA</span>
                  </div>
                  {formErrors.prixVente && <p className="text-xs text-red-500 mt-1">{formErrors.prixVente}</p>}
                </div>
                <div className="space-y-2">
                  <label>
                    <FiDollarSign size={14} />
                    Prix d'achat (CFA)
                  </label>
                  <div className="relative">
                    <input
  className="w-full py-3 px-4 bg-white border-2 border-gray-100 rounded-xl text-[0.9rem] font-semibold transition-all focus:outline-none focus:border-[#1B5E20] focus:ring-4 focus:ring-[#1B5E20]/10"
                      type="number"
                      name="prixAchat"
                      value={form.prixAchat}
                      onChange={handleChange}
                      placeholder="0"
                      min="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground pointer-events-none">CFA</span>
                  </div>
                </div>
              </div>

              {marge !== null && !isNaN(marge) && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium mt-2 border ${Number(marge) > 0 ? 'bg-green-600/10 border-green-600/20 text-green-800' : Number(marge) < 0 ? 'bg-red-600/10 border-red-600/20 text-red-700' : 'bg-gray-500/10 border-gray-500/20 text-gray-600'}`}>
                  <FiBarChart2 size={16} />
                  <span>
                    Marge bénéficiaire: <strong>{marge}%</strong>
                    {Number(marge) > 0 && ` (+${(form.prixVente - form.prixAchat).toLocaleString()} CFA/unité)`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section: Unités de vente / Conversions */}
          <div className="bg-card shadow-sm border border-border overflow-hidden rounded-2xl">
            <div className="flex flex-row items-center gap-3.5 border-b border-border/50 bg-muted/20 px-6 py-5">
              <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-accent/10 text-accent shrink-0">
                <FiGrid size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold m-0 text-foreground">Unités de vente (conversions)</h2>
                <p>Définissez dans quelles unités vous vendez ce produit</p>
              </div>
              <button type="button" className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary/10 border border-secondary/20 rounded-lg text-secondary text-xs font-bold hover:bg-secondary/15 transition-all" onClick={addUnite}>
                <FiPlus size={16} />
                Ajouter
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex gap-3 p-3.5 bg-gradient-to-br from-amber-400/10 to-violet-500/5 border border-amber-500/15 rounded-xl mb-5 items-start">
                <FiInfo size={15} />
                <div>
                  <strong>Exemple : Riz (base = gramme)</strong>
                  <ul style={{margin:'0.3rem 0 0', paddingLeft:'1.2rem', fontSize:'0.78rem'}}>
                    <li><em>Sac 50kg</em> → facteur: 50 000 — prix: 15 000 CFA</li>
                    <li><em>Kilogramme</em> → facteur: 1 000 — prix: 350 CFA</li>
                    <li><em>500 grammes</em> → facteur: 500 — prix: 200 CFA</li>
                  </ul>
                  <p style={{margin:'0.3rem 0 0', fontSize:'0.78rem'}}>Le <strong>facteur de conversion</strong> = combien de {form.uniteBase} dans 1 unité de vente.</p>
                </div>
              </div>

              {/* Quick suggestions */}
              {suggestions.length > 0 && (
                <div className="mb-4">
                  <span className="text-xs font-bold text-muted-foreground block mb-2">Suggestions rapides :</span>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s, i) => (
                      <button key={i} type="button" className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#1B5E20]/20 rounded-full text-xs font-semibold text-[#1B5E20] bg-[#1B5E20]/5 hover:bg-[#1B5E20] hover:text-white transition-all" onClick={() => addSuggestion(s)}>
                        <FiPlus size={12} /> {s.nom} ({s.facteur.toLocaleString('fr-FR')} {form.uniteBase})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {unitesVente.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1.8fr_1.5fr_40px] gap-2 px-1 text-[0.7rem] font-bold text-muted-foreground uppercase tracking-widest hidden md:grid">
                    <span>Nom de l'unité</span>
                    <span>Facteur ({form.uniteBase})</span>
                    <span>Prix vente (CFA)</span>
                    <span>Défaut</span>
                    <span></span>
                  </div>
                  {unitesVente.map((u, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-[1.5fr_1.8fr_1.5fr_40px] gap-2 items-start bg-muted/30 md:bg-transparent p-3 md:p-0 rounded-xl md:rounded-none border md:border-none border-border">
                      <input
  className="w-full py-3 px-4 bg-white border-2 border-gray-100 rounded-xl text-[0.9rem] font-semibold transition-all focus:outline-none focus:border-[#1B5E20] focus:ring-4 focus:ring-[#1B5E20]/10"
                        type="text"
                        placeholder="Ex: Sac 50kg"
                        value={u.nom}
                        onChange={(e) => updateUnite(idx, 'nom', e.target.value)}
                      />
                      <div className="flex flex-col gap-1">
                        <input
  className="w-full py-3 px-4 bg-white border-2 border-gray-100 rounded-xl text-[0.9rem] font-semibold transition-all focus:outline-none focus:border-[#1B5E20] focus:ring-4 focus:ring-[#1B5E20]/10"
                          type="number"
                          placeholder="Ex: 50000"
                          value={u.facteurConversion || ''}
                          onChange={(e) => updateUnite(idx, 'facteurConversion', e.target.value)}
                          step="0.01"
                          min="0.01"
                        />
                        {u.facteurConversion && parseFloat(u.facteurConversion) > 0 && (
                          <span className="text-[0.7rem] font-bold text-primary pl-1 opacity-85">
                            1 {u.nom || '...'} = {parseFloat(u.facteurConversion).toLocaleString('fr-FR')} {form.uniteBase}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <input
  className="w-full py-3 px-4 bg-white border-2 border-gray-100 rounded-xl text-[0.9rem] font-semibold transition-all focus:outline-none focus:border-[#1B5E20] focus:ring-4 focus:ring-[#1B5E20]/10"
                          type="number"
                          placeholder="Prix CFA"
                          value={u.prix}
                          onChange={(e) => updateUnite(idx, 'prix', e.target.value)}
                          min="0"
                        />
                      </div>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <input
  className="w-full py-3 px-4 bg-white border-2 border-gray-100 rounded-xl text-[0.9rem] font-semibold transition-all focus:outline-none focus:border-[#1B5E20] focus:ring-4 focus:ring-[#1B5E20]/10"
                          type="checkbox"
                          checked={u.estDefaut || false}
                          onChange={(e) => updateUnite(idx, 'estDefaut', e.target.checked)}
                          style={{width:'18px',height:'18px', accentColor:'#6366f1'}}
                        />
                      </div>
                      <button type="button" className="pf-fraction-delete w-9 h-9 flex items-center justify-center bg-destructive/10 border border-destructive/20 rounded-lg text-destructive/50 hover:bg-destructive/20 hover:text-destructive transition-all" onClick={() => removeUnite(idx)}>
                        <FiTrash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {unitesVente.length === 0 && (
                <div className="text-center py-8 px-4 text-muted-foreground flex flex-col items-center">
                  <FiGrid size={28} />
                  <p>Aucune unité de vente définie</p>
                  <span>Ajoutez des unités de vente pour vendre en sac, kg, carton, etc.<br/>Utilisez les suggestions rapides ci-dessus ou cliquez « Ajouter »</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-5 sticky top-8">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col">
            <h3 className="flex items-center gap-2 text-sm font-bold text-foreground mb-4">
              <FiCheck size={16} />
              Actions
            </h3>
            <button type="submit" className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-br from-[#1B5E20] to-[#0D3B14] text-white rounded-xl font-bold shadow-[0_4px_16px_rgba(27,94,32,0.25)] hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(27,94,32,0.35)] transition-all disabled:opacity-50 disabled:transform-none" disabled={loading}>
              {loading ? (
                <>
                  <div className="pf-spinner" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <FiSave size={16} />
                  {isEdit ? 'Mettre à jour' : 'Créer le produit'}
                </>
              )}
            </button>
            <button type="button" className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mt-2.5 bg-muted border border-border rounded-xl text-muted-foreground font-semibold hover:bg-muted/80 hover:text-foreground transition-all" onClick={() => returnTo === 'vente' ? navigate(`/app/ventes/nouvelle?codeBarre=${codeBarreFromUrl}`) : navigate('/app/produits')}>
              <FiArrowLeft size={15} />
              Retour aux produits
            </button>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-bold text-foreground mb-4">
              <FiPackage size={16} />
              Aperçu
            </h3>
            <div className="flex flex-col gap-3">
              <div className="text-[1.05rem] font-bold text-foreground leading-snug">{form.nom || 'Nom du produit'}</div>
              {form.categorieId && (
                <span className="inline-block px-2.5 py-0.5 bg-accent/10 text-primary rounded-full text-xs font-semibold w-fit">
                  {categories.find(c => String(c.id) === String(form.categorieId))?.nom}
                </span>
              )}
              <div className="flex flex-wrap gap-2">
                <span><FiBox size={12} /> Base: {uniteBaseInfo?.label || form.uniteBase}</span>
                {!isEdit && stockBase > 0 && <span><FiBarChart2 size={12} /> Stock: {stockBase.toLocaleString('fr-FR')} {form.uniteBase}</span>}
                {isEdit && <span><FiBarChart2 size={12} /> (stock géré via entrées)</span>}
              </div>
              {unitesVente.filter(u => u.nom && u.facteurConversion).length > 0 && (
                <div className="flex flex-wrap gap-2" style={{marginTop:'0.5rem', borderTop:'1px solid #eee', paddingTop:'0.5rem'}}>
                  <strong style={{fontSize:'0.75rem', color:'#6366f1'}}>Unités de vente :</strong>
                  {unitesVente.filter(u => u.nom && u.facteurConversion).map((u, i) => (
                    <span key={i} style={{color:'#a855f7'}}>
                      <FiTag size={12} /> {u.nom} = {parseFloat(u.facteurConversion).toLocaleString('fr-FR')} {form.uniteBase}
                      {u.prix ? ` → ${Number(u.prix).toLocaleString()} CFA` : ''}
                      {u.estDefaut ? ' ★' : ''}
                    </span>
                  ))}
                </div>
              )}
              {!isEdit && stockBase > 0 && unitesVente.filter(u => u.nom && u.facteurConversion > 0).length > 0 && (
                <div className="flex flex-wrap gap-2" style={{marginTop:'0.5rem', borderTop:'1px solid #eee', paddingTop:'0.5rem'}}>
                  <strong style={{fontSize:'0.75rem', color:'#059669'}}>Équivalences stock :</strong>
                  {formatStockDisplay()?.map((eq, i) => (
                    <span key={i} style={{color:'#059669'}}><FiBox size={12} /> {eq}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

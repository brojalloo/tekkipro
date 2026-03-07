import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  FiPackage, FiSave, FiArrowLeft, FiGrid, FiPlus, FiTrash2,
  FiTag, FiDollarSign, FiBox, FiAlertTriangle, FiBarChart2,
  FiHash, FiFileText, FiTruck, FiLayers, FiInfo, FiCheck
} from 'react-icons/fi';
import './ProduitForm.css';

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

  const [categories, setCategories] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [form, setForm] = useState({
    nom: '', description: '', prixVente: '', prixAchat: '',
    stockAlerte: '0', uniteBase: 'g', codeBarre: '', categorieId: '', fournisseurId: '',
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

  useEffect(() => {
    loadOptions();
    if (isEdit) loadProduit();
  }, [id]);

  const loadOptions = async () => {
    try {
      const [catRes, fournRes] = await Promise.all([
        api.get('/categories'),
        api.get('/fournisseurs'),
      ]);
      setCategories(catRes.data.data);
      setFournisseurs(fournRes.data.data);
    } catch (e) { toast.error('Erreur de chargement des options'); }
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
    } catch (e) {
      toast.error('Produit non trouvé');
      navigate('/app/produits');
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
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
      } catch (e) { toast.error('Erreur de suppression'); }
    }
    setUnitesVente(unitesVente.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const stockBase = isEdit ? undefined : getStockBase();
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
        toast.success('Produit mis à jour');
      } else {
        await api.post('/produits', data);
        toast.success('Produit créé avec succès');
      }
      navigate('/app/produits');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur');
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
    <div className="pf-page">
      {/* Header */}
      <div className="pf-header">
        <div className="pf-header-bg" />
        <div className="pf-header-content">
          <div className="pf-header-left">
            <button type="button" className="pf-back-btn" onClick={() => navigate('/app/produits')}>
              <FiArrowLeft size={18} />
            </button>
            <div className="pf-header-icon">
              <FiPackage size={22} />
            </div>
            <div>
              <h1>{isEdit ? 'Modifier le produit' : 'Nouveau produit'}</h1>
              <p>{isEdit ? 'Mettez à jour les informations de votre produit' : 'Ajoutez un nouveau produit à votre catalogue'}</p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="pf-form-layout">
        {/* Main Column */}
        <div className="pf-main">
          {/* Section: Informations de base */}
          <div className="pf-section">
            <div className="pf-section-header">
              <div className="pf-section-icon blue">
                <FiTag size={18} />
              </div>
              <div>
                <h2>Informations de base</h2>
                <p>Nom, description et identification du produit</p>
              </div>
            </div>
            <div className="pf-section-body">
              <div className="pf-field">
                <label>
                  <FiPackage size={14} />
                  Nom du produit
                  <span className="pf-req">*</span>
                </label>
                <input
                  type="text"
                  name="nom"
                  value={form.nom}
                  onChange={handleChange}
                  placeholder="Ex: Riz parfumé Uncle Ben's"
                  required
                />
              </div>

              <div className="pf-row">
                <div className="pf-field">
                  <label>
                    <FiHash size={14} />
                    Code barre
                  </label>
                  <input
                    type="text"
                    name="codeBarre"
                    value={form.codeBarre}
                    onChange={handleChange}
                    placeholder="Scanner ou saisir le code"
                  />
                </div>
                <div className="pf-field">
                  <label>
                    <FiLayers size={14} />
                    Catégorie
                  </label>
                  <select name="categorieId" value={form.categorieId} onChange={handleChange}>
                    <option value="">-- Aucune catégorie --</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </div>
              </div>

              <div className="pf-field">
                <label>
                  <FiFileText size={14} />
                  Description
                </label>
                <textarea
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
          <div className="pf-section">
            <div className="pf-section-header">
              <div className="pf-section-icon amber">
                <FiBox size={18} />
              </div>
              <div>
                <h2>Unité de base & Stock</h2>
                <p>L'unité de base sert à stocker le stock en interne</p>
              </div>
            </div>
            <div className="pf-section-body">
              <div className="pf-stock-guide">
                <FiInfo size={15} />
                <div>
                  <strong>Comment ça marche ?</strong>
                  <p>Choisissez l'unité la plus <em>petite</em> dans laquelle vous pourriez vendre ce produit. Le stock sera toujours stocké dans cette unité. Vous définirez ensuite les unités de vente (sac, kg, carton...) avec leur <em>facteur de conversion</em>.</p>
                </div>
              </div>

              <div className="pf-field">
                <label>
                  <FiBox size={14} />
                  Unité de base
                  <span className="pf-req">*</span>
                </label>
                <div className="pf-unite-base-grid">
                  {UNITES_BASE.map(u => (
                    <button
                      key={u.value}
                      type="button"
                      className={`pf-unite-base-option ${form.uniteBase === u.value ? 'active' : ''}`}
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
                  <div className="pf-row">
                    <div className="pf-field">
                      <select value={commercialMode} onChange={(e) => { setCommercialMode(e.target.value); setCommercialSize(''); setCommercialCount(''); }}>
                        <option value="">-- Aucun --</option>
                        {form.uniteBase === 'g' && <option value="poids">Sacs / Poids (kg)</option>}
                        {form.uniteBase === 'ml' && <option value="volume">Bidons / Volume (L)</option>}
                        {(form.uniteBase === 'piece' || form.uniteBase === 'paquet') && <option value="carton">Cartons / Unités par carton</option>}
                      </select>
                    </div>
                    {commercialMode && (
                      <>
                        <div className="pf-field">
                          <label>Contenance ({commercialMode === 'poids' ? 'kg' : commercialMode === 'volume' ? 'L' : 'unités'})</label>
                          <input type="number" value={commercialSize} onChange={(e) => setCommercialSize(e.target.value)} placeholder={commercialMode === 'poids' ? 'Ex: 50' : commercialMode === 'volume' ? 'Ex: 20' : 'Ex: 40'} min="0" step="0.01" />
                        </div>
                        <div className="pf-field">
                          <label>Nombre de packs</label>
                          <input type="number" value={commercialCount} onChange={(e) => setCommercialCount(e.target.value)} placeholder="Ex: 10" min="0" step="1" />
                        </div>
                      </>
                    )}
                  </div>
                  {commercialMode && commercialSize && commercialCount && (
                    <div className="pf-stock-preview" style={{marginTop:'0.6rem'}}>
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
                <div className="pf-row">
                  <div className="pf-field" style={{ flex: 2 }}>
                    <label>
                      <FiBarChart2 size={14} />
                      Stock initial — quantité
                    </label>
                    <div className="pf-input-with-icon">
                      <input
                        type="number"
                        value={stockQty}
                        onChange={(e) => setStockQty(e.target.value)}
                        placeholder="Ex: 20"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="pf-field" style={{ flex: 2 }}>
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
                <div className="pf-stock-preview">
                  <FiCheck size={15} />
                  <div>
                    <strong>Stock en base :</strong> {stockBase.toLocaleString('fr-FR')} {form.uniteBase}
                    {formatStockDisplay()?.slice(1).map((eq, i) => (
                      <span key={i} className="pf-stock-equiv"> = {eq}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pf-row">
                <div className="pf-field">
                  <label>
                    <FiAlertTriangle size={14} />
                    Seuil d'alerte stock (en {form.uniteBase})
                  </label>
                  <div className="pf-input-with-icon">
                    <input
                      type="number"
                      name="stockAlerte"
                      value={form.stockAlerte}
                      onChange={handleChange}
                      placeholder="0"
                      min="0"
                    />
                    <span className="pf-input-suffix">{form.uniteBase}</span>
                  </div>
                </div>
                <div className="pf-field">
                  <label>
                    <FiTruck size={14} />
                    Fournisseur
                  </label>
                  <select name="fournisseurId" value={form.fournisseurId} onChange={handleChange}>
                    <option value="">-- Aucun fournisseur --</option>
                    {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Prix de référence */}
          <div className="pf-section">
            <div className="pf-section-header">
              <div className="pf-section-icon green">
                <FiDollarSign size={18} />
              </div>
              <div>
                <h2>Prix de référence</h2>
                <p>Prix par défaut (utilisés si aucune unité de vente n'est définie)</p>
              </div>
            </div>
            <div className="pf-section-body">
              <div className="pf-row">
                <div className="pf-field">
                  <label>
                    <FiDollarSign size={14} />
                    Prix de vente (CFA)
                  </label>
                  <div className="pf-input-with-icon">
                    <input
                      type="number"
                      name="prixVente"
                      value={form.prixVente}
                      onChange={handleChange}
                      placeholder="0"
                      min="0"
                    />
                    <span className="pf-input-suffix">CFA</span>
                  </div>
                </div>
                <div className="pf-field">
                  <label>
                    <FiDollarSign size={14} />
                    Prix d'achat (CFA)
                  </label>
                  <div className="pf-input-with-icon">
                    <input
                      type="number"
                      name="prixAchat"
                      value={form.prixAchat}
                      onChange={handleChange}
                      placeholder="0"
                      min="0"
                    />
                    <span className="pf-input-suffix">CFA</span>
                  </div>
                </div>
              </div>

              {marge !== null && !isNaN(marge) && (
                <div className={`pf-marge-indicator ${Number(marge) > 0 ? 'positive' : Number(marge) < 0 ? 'negative' : 'neutral'}`}>
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
          <div className="pf-section pf-section-fractions">
            <div className="pf-section-header">
              <div className="pf-section-icon purple">
                <FiGrid size={18} />
              </div>
              <div>
                <h2>Unités de vente (conversions)</h2>
                <p>Définissez dans quelles unités vous vendez ce produit</p>
              </div>
              <button type="button" className="pf-add-fraction-btn" onClick={addUnite}>
                <FiPlus size={16} />
                Ajouter
              </button>
            </div>
            <div className="pf-section-body">
              <div className="pf-fractions-info">
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
                <div className="pf-suggestions">
                  <span className="pf-suggestions-label">Suggestions rapides :</span>
                  <div className="pf-suggestions-list">
                    {suggestions.map((s, i) => (
                      <button key={i} type="button" className="pf-suggestion-btn" onClick={() => addSuggestion(s)}>
                        <FiPlus size={12} /> {s.nom} ({s.facteur.toLocaleString('fr-FR')} {form.uniteBase})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {unitesVente.length > 0 && (
                <div className="pf-fractions-list">
                  <div className="pf-fraction-header-row">
                    <span>Nom de l'unité</span>
                    <span>Facteur ({form.uniteBase})</span>
                    <span>Prix vente (CFA)</span>
                    <span>Défaut</span>
                    <span></span>
                  </div>
                  {unitesVente.map((u, idx) => (
                    <div key={idx} className="pf-fraction-row">
                      <input
                        type="text"
                        placeholder="Ex: Sac 50kg"
                        value={u.nom}
                        onChange={(e) => updateUnite(idx, 'nom', e.target.value)}
                      />
                      <div className="pf-fraction-contenance">
                        <input
                          type="number"
                          placeholder="Ex: 50000"
                          value={u.facteurConversion || ''}
                          onChange={(e) => updateUnite(idx, 'facteurConversion', e.target.value)}
                          step="0.01"
                          min="0.01"
                        />
                        {u.facteurConversion && parseFloat(u.facteurConversion) > 0 && (
                          <span className="pf-fraction-hint">
                            1 {u.nom || '...'} = {parseFloat(u.facteurConversion).toLocaleString('fr-FR')} {form.uniteBase}
                          </span>
                        )}
                      </div>
                      <div className="pf-fraction-prix">
                        <input
                          type="number"
                          placeholder="Prix CFA"
                          value={u.prix}
                          onChange={(e) => updateUnite(idx, 'prix', e.target.value)}
                          min="0"
                        />
                      </div>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <input
                          type="checkbox"
                          checked={u.estDefaut || false}
                          onChange={(e) => updateUnite(idx, 'estDefaut', e.target.checked)}
                          style={{width:'18px',height:'18px', accentColor:'#6366f1'}}
                        />
                      </div>
                      <button type="button" className="pf-fraction-delete" onClick={() => removeUnite(idx)}>
                        <FiTrash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {unitesVente.length === 0 && (
                <div className="pf-fractions-empty">
                  <FiGrid size={28} />
                  <p>Aucune unité de vente définie</p>
                  <span>Ajoutez des unités de vente pour vendre en sac, kg, carton, etc.<br/>Utilisez les suggestions rapides ci-dessus ou cliquez « Ajouter »</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="pf-sidebar">
          <div className="pf-sidebar-card pf-actions-card">
            <h3>
              <FiCheck size={16} />
              Actions
            </h3>
            <button type="submit" className="pf-btn-save" disabled={loading}>
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
            <button type="button" className="pf-btn-cancel" onClick={() => navigate('/app/produits')}>
              <FiArrowLeft size={15} />
              Retour aux produits
            </button>
          </div>

          <div className="pf-sidebar-card pf-preview-card">
            <h3>
              <FiPackage size={16} />
              Aperçu
            </h3>
            <div className="pf-preview-body">
              <div className="pf-preview-name">{form.nom || 'Nom du produit'}</div>
              {form.categorieId && (
                <span className="pf-preview-cat">
                  {categories.find(c => String(c.id) === String(form.categorieId))?.nom}
                </span>
              )}
              <div className="pf-preview-meta">
                <span><FiBox size={12} /> Base: {uniteBaseInfo?.label || form.uniteBase}</span>
                {!isEdit && stockBase > 0 && <span><FiBarChart2 size={12} /> Stock: {stockBase.toLocaleString('fr-FR')} {form.uniteBase}</span>}
                {isEdit && <span><FiBarChart2 size={12} /> (stock géré via entrées)</span>}
              </div>
              {unitesVente.filter(u => u.nom && u.facteurConversion).length > 0 && (
                <div className="pf-preview-meta" style={{marginTop:'0.5rem', borderTop:'1px solid #eee', paddingTop:'0.5rem'}}>
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
                <div className="pf-preview-meta" style={{marginTop:'0.5rem', borderTop:'1px solid #eee', paddingTop:'0.5rem'}}>
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

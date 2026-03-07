import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  FiShoppingCart, FiPlus, FiMinus, FiTrash2, FiUser, FiCheck,
  FiSearch, FiCreditCard, FiSmartphone, FiDollarSign, FiPackage,
  FiAlertCircle, FiTag, FiChevronDown
} from 'react-icons/fi';
import './NouvelleVente.css';

// Helper: format stock in human-readable form
const formatStockHuman = (stock, uniteBase, unitesVente) => {
  if (!unitesVente || unitesVente.length === 0) return `${stock} ${uniteBase}`;
  const defUnit = unitesVente.find(u => u.estDefaut) || unitesVente[0];
  if (defUnit && defUnit.facteurConversion > 0) {
    const qty = stock / defUnit.facteurConversion;
    return `${qty % 1 === 0 ? qty : qty.toFixed(2)} ${defUnit.nom}`;
  }
  return `${stock} ${uniteBase}`;
};

export default function NouvelleVente() {
  const [produits, setProduits] = useState([]);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [clientId, setClientId] = useState('');
  const [modePaiement, setModePaiement] = useState('CASH');
  const [montantPaye, setMontantPaye] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [prodRes, clientRes] = await Promise.all([
        api.get('/produits'),
        api.get('/clients'),
      ]);
      setProduits(prodRes.data.data.filter(p => p.actif));
      setClients(clientRes.data.data);
    } catch (e) { toast.error('Erreur de chargement des données'); }
  };

  const filteredProduits = useMemo(() =>
    produits.filter(p =>
      p.nom.toLowerCase().includes(search.toLowerCase()) ||
      p.codeBarre?.includes(search)
    ), [produits, search]);

  // Add product to cart in base unit (using prixVente)
  const addToCart = (produit) => {
    const existing = cart.find(c => c.produitId === produit.id && !c.uniteVenteId);
    if (existing) {
      setCart(cart.map(c => c === existing ? { ...c, quantite: c.quantite + 1 } : c));
    } else {
      setCart([...cart, {
        produitId: produit.id, nom: produit.nom, prixUnitaire: produit.prixVente,
        quantite: 1, uniteBase: produit.uniteBase, uniteVenteId: null, uniteNom: produit.uniteBase,
        facteurConversion: 1, stockDispo: produit.stock,
      }]);
    }
  };

  // Add product to cart in a specific selling unit
  const addUniteToCart = (produit, unite) => {
    const existing = cart.find(c => c.uniteVenteId === unite.id);
    if (existing) {
      setCart(cart.map(c => c === existing ? { ...c, quantite: c.quantite + 1 } : c));
    } else {
      setCart([...cart, {
        produitId: produit.id, nom: produit.nom, prixUnitaire: unite.prix,
        quantite: 1, uniteBase: produit.uniteBase, uniteVenteId: unite.id, uniteNom: unite.nom,
        facteurConversion: unite.facteurConversion, stockDispo: produit.stock,
      }]);
    }
  };

  const updateQuantite = (index, delta) => {
    setCart(cart.map((c, i) => i !== index ? c : { ...c, quantite: Math.max(1, c.quantite + delta) }));
  };
  const removeFromCart = (index) => setCart(cart.filter((_, i) => i !== index));
  const total = cart.reduce((sum, c) => sum + c.prixUnitaire * c.quantite, 0);

  const handleSubmit = async () => {
    if (cart.length === 0) { toast.error('Panier vide !'); return; }
    if (modePaiement === 'CREDIT' && !clientId) { toast.error('Sélectionnez un client pour le crédit'); return; }
    setLoading(true);
    try {
      const details = cart.map(c => ({
        produitId: c.produitId,
        quantite: c.quantite,
        uniteVenteId: c.uniteVenteId || undefined,
      }));
      const res = await api.post('/ventes', {
        details, clientId: clientId || undefined, modePaiement,
        montantPaye: montantPaye ? parseFloat(montantPaye) : undefined,
      });
      toast.success(`Vente ${res.data.data.numero} enregistrée !`);
      setCart([]); setClientId(''); setMontantPaye('');
      loadData();
    } catch (error) {
      const msg = error.response?.data?.message || 'Erreur de vente';
      if (error.response?.data?.upgrade) {
        toast.error(msg + ' Allez dans Abonnement pour upgrade.', { duration: 5000 });
      } else {
        toast.error(msg);
      }
    } finally { setLoading(false); }
  };

  const formatCFA = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

  return (
    <div className="nv-page">
      {/* Header */}
      <div className="nv-header">
        <div className="nv-header-bg" />
        <div className="nv-header-content">
          <div className="nv-header-left">
            <div className="nv-header-icon"><FiShoppingCart size={24} /></div>
            <div>
              <h1>Nouvelle Vente</h1>
              <p>Sélectionnez les produits et validez la vente</p>
            </div>
          </div>
          <div className="nv-cart-badge">
            <FiShoppingCart size={16} />
            <span>{cart.length} article{cart.length !== 1 ? 's' : ''}</span>
            <strong>{formatCFA(total)}</strong>
          </div>
        </div>
      </div>

      <div className="nv-layout">
        {/* LEFT — Products */}
        <div className="nv-products-section">
          <div className="nv-search-bar">
            <FiSearch size={16} />
            <input type="text" placeholder="Rechercher un produit ou scanner le code-barre…"
              value={search} onChange={(e) => setSearch(e.target.value)} />
            <span className="nv-search-count">{filteredProduits.length} produit{filteredProduits.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="nv-products-grid">
            {filteredProduits.map(p => (
              <div key={p.id} className={`nv-product-card ${p.stock <= p.stockAlerte ? 'low-stock' : ''}`}>
                <div className="nv-product-top">
                  <div className="nv-product-avatar">
                    <FiPackage size={18} />
                  </div>
                  <div className="nv-product-info">
                    <strong>{p.nom}</strong>
                    <span className={`nv-stock-badge ${p.stock <= p.stockAlerte ? 'danger' : 'success'}`}>
                      {p.stock <= p.stockAlerte && <FiAlertCircle size={11} />}
                      {formatStockHuman(p.stock, p.uniteBase, p.unitesVente)}
                    </span>
                    {/* Show stock equivalents for other units */}
                    {p.unitesVente?.filter(u => !u.estDefaut && u.facteurConversion > 0).slice(0, 2).map(u => (
                      <span key={u.id} className="nv-stock-equiv">
                        = {(p.stock / u.facteurConversion) % 1 === 0
                          ? (p.stock / u.facteurConversion)
                          : (p.stock / u.facteurConversion).toFixed(1)} {u.nom}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Show price of default unit or base price */}
                <div className="nv-product-price">
                  {(() => {
                    const defUnite = p.unitesVente?.find(u => u.estDefaut) || p.unitesVente?.[0];
                    if (defUnite) return <>{formatCFA(defUnite.prix)} <small>/ {defUnite.nom}</small></>;
                    return <>{formatCFA(p.prixVente)} <small>/ {p.uniteBase}</small></>;
                  })()}
                </div>
                {/* Buttons: one per selling unit */}
                {p.unitesVente?.length > 0 ? (
                  <div className="nv-fractions">
                    {p.unitesVente.map(u => (
                      <button key={u.id} className="nv-fraction-btn" onClick={() => addUniteToCart(p, u)}>
                        <FiTag size={11} /> 1 {u.nom} <span>{formatCFA(u.prix)}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <button className="nv-add-btn" onClick={() => addToCart(p)}>
                    <FiPlus size={15} /> 1 {p.uniteBase}
                  </button>
                )}
              </div>
            ))}
            {filteredProduits.length === 0 && (
              <div className="nv-empty-products">
                <FiSearch size={32} />
                <p>Aucun produit trouvé</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Cart */}
        <div className="nv-cart-section">
          <div className="nv-cart-card">
            <div className="nv-cart-header">
              <div className="nv-cart-icon"><FiShoppingCart size={18} /></div>
              <h3>Panier</h3>
              <span className="nv-cart-count">{cart.length}</span>
            </div>

            {cart.length === 0 ? (
              <div className="nv-cart-empty">
                <FiShoppingCart size={36} />
                <p>Panier vide</p>
                <span>Ajoutez des produits depuis la liste</span>
              </div>
            ) : (
              <>
                <div className="nv-cart-items">
                  {cart.map((item, idx) => (
                    <div key={idx} className="nv-cart-item">
                      <div className="nv-item-info">
                        <strong>{item.nom}</strong>
                        <span className="nv-fraction-tag">{item.uniteNom}</span>
                        <div className="nv-item-price">{formatCFA(item.prixUnitaire)} × {item.quantite}</div>
                      </div>
                      <div className="nv-item-controls">
                        <button className="nv-qty-btn" onClick={() => updateQuantite(idx, -1)}><FiMinus size={13} /></button>
                        <span className="nv-qty-value">{item.quantite}</span>
                        <button className="nv-qty-btn" onClick={() => updateQuantite(idx, 1)}><FiPlus size={13} /></button>
                        <button className="nv-remove-btn" onClick={() => removeFromCart(idx)}><FiTrash2 size={13} /></button>
                      </div>
                      <div className="nv-item-total">{formatCFA(item.prixUnitaire * item.quantite)}</div>
                    </div>
                  ))}
                </div>

                <div className="nv-cart-total">
                  <span>TOTAL</span>
                  <span className="nv-total-amount">{formatCFA(total)}</span>
                </div>

                {/* Client */}
                <div className="nv-field">
                  <label><FiUser size={14} /> Client <span className="nv-optional">(optionnel)</span></label>
                  <div className="nv-select-wrap">
                    <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                      <option value="">Client de passage</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.prenom} {c.nom} — {c.telephone}</option>
                      ))}
                    </select>
                    <FiChevronDown size={14} />
                  </div>
                </div>

                {/* Paiement */}
                <div className="nv-field">
                  <label>Mode de paiement</label>
                  <div className="nv-payment-modes">
                    {[
                      { key: 'CASH', icon: <FiDollarSign size={15} />, label: 'Cash' },
                      { key: 'MOBILE_MONEY', icon: <FiSmartphone size={15} />, label: 'MoMo' },
                      { key: 'CREDIT', icon: <FiCreditCard size={15} />, label: 'Crédit' },
                    ].map(m => (
                      <button key={m.key} type="button"
                        className={`nv-pay-btn ${modePaiement === m.key ? 'active' : ''}`}
                        onClick={() => { setModePaiement(m.key); if (m.key !== 'CREDIT') setMontantPaye(''); }}>
                        {m.icon} {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {modePaiement === 'CREDIT' && (
                  <div className="nv-field">
                    <label><FiDollarSign size={14} /> Montant payé maintenant</label>
                    <input type="number" className="nv-input" value={montantPaye}
                      onChange={(e) => setMontantPaye(e.target.value)}
                      placeholder="0" min="0" max={total} />
                    {montantPaye && (
                      <div className="nv-credit-info">
                        <FiAlertCircle size={13} />
                        Crédit restant: <strong>{formatCFA(total - parseFloat(montantPaye || 0))}</strong>
                      </div>
                    )}
                  </div>
                )}

                <button className="nv-submit-btn" onClick={handleSubmit} disabled={loading}>
                  {loading ? <div className="nv-spinner" /> : <FiCheck size={18} />}
                  {loading ? 'En cours…' : 'Valider la vente'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  FiPlus, FiAlertTriangle, FiDatabase, FiTrendingUp, FiPackage,
  FiBox, FiLayers, FiCalendar, FiTruck, FiDollarSign, FiHash, FiChevronDown,
  FiCheckCircle, FiX, FiSearch, FiArrowDownCircle, FiBarChart2,
  FiShield, FiActivity
} from 'react-icons/fi';
import './Stock.css';

export default function Stock() {
  const { isAdmin } = useAuth();
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

  const loadData = async () => {
    try {
      const [invRes, histRes, prodRes, fournRes] = await Promise.all([
        api.get('/stock/inventaire'),
        api.get('/stock/historique'),
        api.get('/produits'),
        api.get('/fournisseurs'),
      ]);
      setInventaire(invRes.data.data);
      setHistorique(histRes.data.data);
      setProduits(prodRes.data.data);
      setFournisseurs(fournRes.data.data);
    } catch (e) { toast.error('Erreur de chargement du stock'); } finally { setLoading(false); }
  };

  const handleEntreeStock = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/stock/entree', { ...form, uniteVenteId: form.uniteVenteId ? parseInt(form.uniteVenteId) : undefined });
      toast.success('Stock mis à jour avec succès !');
      setShowModal(false);
      setForm({ produitId: '', quantite: '', prixAchat: '', fournisseurId: '', uniteVenteId: '' });
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCFA = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0)) + ' FCFA';

  const selectedProduct = produits.find(p => String(p.id) === String(form.produitId));
  const totalCost = form.quantite && form.prixAchat ? (parseFloat(form.quantite) * parseFloat(form.prixAchat)) : 0;

  const filteredProduits = inventaire?.produits?.filter(p =>
    p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.categorie?.nom || '').toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <div className="stk-page">
        <div className="stk-loading">
          <div className="stk-loading-spinner" />
          <p>Chargement du stock...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="stk-page">
      {/* Header */}
      <div className="stk-header">
        <div className="stk-header-bg" />
        <div className="stk-header-content">
          <div className="stk-header-left">
            <div className="stk-header-icon">
              <FiDatabase size={24} />
            </div>
            <div>
              <h1>Gestion du Stock</h1>
              <p>Suivez votre inventaire et gérez vos entrées de stock</p>
            </div>
          </div>
          {isAdmin && (
            <button className="stk-btn-entree" onClick={() => setShowModal(true)}>
              <FiArrowDownCircle size={18} />
              Entrée de stock
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stk-stats">
        <div className="stk-stat-card">
          <div className="stk-stat-icon blue">
            <FiPackage size={22} />
          </div>
          <div className="stk-stat-info">
            <span className="stk-stat-value">{inventaire?.totalProduits || 0}</span>
            <span className="stk-stat-label">Produits en stock</span>
          </div>
        </div>
        <div className="stk-stat-card">
          <div className="stk-stat-icon green">
            <FiBarChart2 size={22} />
          </div>
          <div className="stk-stat-info">
            <span className="stk-stat-value">{formatCFA(inventaire?.totalValeurStock)}</span>
            <span className="stk-stat-label">Valeur totale</span>
          </div>
        </div>
        <div className="stk-stat-card">
          <div className="stk-stat-icon amber">
            <FiAlertTriangle size={22} />
          </div>
          <div className="stk-stat-info">
            <span className="stk-stat-value stk-alert-val">{inventaire?.produitsEnAlerte || 0}</span>
            <span className="stk-stat-label">Produits en alerte</span>
          </div>
        </div>
        <div className="stk-stat-card">
          <div className="stk-stat-icon purple">
            <FiActivity size={22} />
          </div>
          <div className="stk-stat-info">
            <span className="stk-stat-value">{historique.length}</span>
            <span className="stk-stat-label">Mouvements</span>
          </div>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="stk-toolbar">
        <div className="stk-tabs">
          <button
            className={`stk-tab ${tab === 'inventaire' ? 'active' : ''}`}
            onClick={() => setTab('inventaire')}
          >
            <FiLayers size={16} />
            Inventaire
            <span className="stk-tab-count">{inventaire?.totalProduits || 0}</span>
          </button>
          <button
            className={`stk-tab ${tab === 'historique' ? 'active' : ''}`}
            onClick={() => setTab('historique')}
          >
            <FiCalendar size={16} />
            Historique
            <span className="stk-tab-count">{historique.length}</span>
          </button>
        </div>

        {tab === 'inventaire' && (
          <div className="stk-search">
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
      <div className="stk-content">
        {tab === 'inventaire' ? (
          <div className="stk-table-card">
            <table className="stk-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Catégorie</th>
                  <th>Stock</th>
                  <th>Unité</th>
                  {isAdmin && <th>Valeur Stock</th>}
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {filteredProduits.map(p => (
                  <tr key={p.id} className={p.enAlerte ? 'stk-row-alert' : ''}>
                    <td>
                      <div className="stk-product-cell">
                        <div className="stk-product-avatar">
                          <FiBox size={16} />
                        </div>
                        <strong>{p.nom}</strong>
                      </div>
                    </td>
                    <td>
                      <span className="stk-cat-badge">{p.categorie?.nom || '—'}</span>
                    </td>
                    <td>
                      {(() => {
                        const defU = p.unitesVente?.find(u => u.estDefaut) || p.unitesVente?.[0];
                        if (defU && defU.facteurConversion > 0) {
                          const qty = p.stock / defU.facteurConversion;
                          return <span className={`stk-stock-val ${p.enAlerte ? 'alert' : ''}`}>{qty % 1 === 0 ? qty : qty.toFixed(2)}</span>;
                        }
                        return <span className={`stk-stock-val ${p.enAlerte ? 'alert' : ''}`}>{p.stock}</span>;
                      })()}
                    </td>
                    <td>
                      {(() => {
                        const defU = p.unitesVente?.find(u => u.estDefaut) || p.unitesVente?.[0];
                        return <span className="stk-unit">{defU ? defU.nom : p.uniteBase}</span>;
                      })()}
                    </td>
                    {isAdmin && <td className="stk-val-col">{formatCFA(p.valeurStock)}</td>}
                    <td>
                      {p.enAlerte ? (
                        <span className="stk-badge danger">
                          <FiAlertTriangle size={13} /> Stock faible
                        </span>
                      ) : (
                        <span className="stk-badge success">
                          <FiCheckCircle size={13} /> OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredProduits.length === 0 && (
              <div className="stk-empty">
                <FiSearch size={40} />
                <p>Aucun produit trouvé</p>
                <span>Essayez un autre terme de recherche</span>
              </div>
            )}
          </div>
        ) : (
          <div className="stk-table-card">
            <table className="stk-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Produit</th>
                  <th>Quantité</th>
                  <th>Prix Achat</th>
                  <th>Fournisseur</th>
                </tr>
              </thead>
              <tbody>
                {historique.map(e => (
                  <tr key={e.id}>
                    <td>
                      <span className="stk-date">
                        {new Date(e.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </td>
                    <td>
                      <div className="stk-product-cell">
                        <div className="stk-product-avatar green">
                          <FiArrowDownCircle size={16} />
                        </div>
                        <strong>{e.produit?.nom}</strong>
                      </div>
                    </td>
                    <td>
                      <span className="stk-qty-badge">+{e.quantite} {e.uniteNom || e.produit?.uniteBase}</span>
                    </td>
                    <td className="stk-val-col">{formatCFA(e.prixAchat)}</td>
                    <td>
                      {e.fournisseur?.nom ? (
                        <span className="stk-fournisseur">
                          <FiTruck size={13} /> {e.fournisseur.nom}
                        </span>
                      ) : (
                        <span className="stk-unit">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {historique.length === 0 && (
              <div className="stk-empty">
                <FiCalendar size={40} />
                <p>Aucune entrée de stock</p>
                <span>Les mouvements de stock apparaîtront ici</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal entrée stock */}
      {showModal && (
        <div className="stk-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="stk-modal" onClick={(e) => e.stopPropagation()}>
            <div className="stk-modal-header">
              <div className="stk-modal-icon">
                <FiArrowDownCircle size={22} />
              </div>
              <div>
                <h3>Nouvelle entrée de stock</h3>
                <p>Enregistrez un réapprovisionnement</p>
              </div>
              <button className="stk-modal-close" onClick={() => setShowModal(false)}>
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleEntreeStock}>
              <div className="stk-modal-body">
                {/* Produit */}
                <div className="stk-field">
                  <label>
                    <FiPackage size={14} />
                    Produit <span className="stk-req">*</span>
                  </label>
                  <select
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
                  <div className="stk-selected-info">
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
                      <span className="stk-alert-tag">
                        <FiAlertTriangle size={12} /> En alerte
                      </span>
                    )}
                  </div>
                )}
                {/* Unité de réception */}
                {selectedProduct?.unitesVente?.length > 0 && (
                  <div className="stk-field">
                    <label><FiLayers size={14} /> Unité de réception</label>
                    <select value={form.uniteVenteId} onChange={(e) => setForm({ ...form, uniteVenteId: e.target.value })}>
                      {selectedProduct.unitesVente.map(u => (
                        <option key={u.id} value={u.id}>{u.nom} (= {u.facteurConversion.toLocaleString('fr-FR')} {selectedProduct.uniteBase})</option>
                      ))}
                      <option value="">Unité de base ({selectedProduct.uniteBase})</option>
                    </select>
                  </div>
                )}
                {/* Qty + Price row */}
                <div className="stk-modal-row">
                  <div className="stk-field">
                    <label>
                      <FiHash size={14} />
                      Quantité <span className="stk-req">*</span>
                    </label>
                    <input
                      type="number"
                      value={form.quantite}
                      onChange={(e) => setForm({ ...form, quantite: e.target.value })}
                      required
                      min="0.01"
                      step="0.01"
                      placeholder="0"
                    />
                  </div>
                  <div className="stk-field">
                    <label>
                      <FiDollarSign size={14} />
                      Prix d'achat unitaire
                    </label>
                    <div className="stk-input-suffix-wrap">
                      <input
                        type="number"
                        value={form.prixAchat}
                        onChange={(e) => setForm({ ...form, prixAchat: e.target.value })}
                        min="0"
                        placeholder="0"
                      />
                      <span className="stk-input-suffix">FCFA</span>
                    </div>
                  </div>
                </div>

                {/* Total cost indicator */}
                {totalCost > 0 && (
                  <div className="stk-cost-indicator">
                    <FiBarChart2 size={15} />
                    <span>Coût total : <strong>{formatCFA(totalCost)}</strong></span>
                  </div>
                )}

                {/* Fournisseur */}
                <div className="stk-field">
                  <label>
                    <FiTruck size={14} />
                    Fournisseur
                  </label>
                  <select
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

              <div className="stk-modal-footer">
                <button type="button" className="stk-btn-cancel" onClick={() => setShowModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="stk-btn-save" disabled={submitting}>
                  {submitting ? <span className="stk-spinner" /> : <FiCheckCircle size={16} />}
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

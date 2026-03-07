import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  FiPlus, FiEdit, FiTrash2, FiAlertTriangle, FiSearch, FiPackage,
  FiGrid, FiDollarSign, FiBox, FiTag, FiLayers, FiCheckCircle,
  FiFilter, FiBarChart2
} from 'react-icons/fi';
import { PlanLimitBanner } from '../components/UpgradeBanner';
import toast from 'react-hot-toast';
import './Produits.css';

export default function Produits() {
  const { isAdmin, planLimits } = useAuth();
  const [produits, setProduits] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterAlerte, setFilterAlerte] = useState(false);

  useEffect(() => { loadProduits(); }, []);

  const loadProduits = async () => {
    try {
      const res = await api.get('/produits', { params: { search: search || undefined } });
      setProduits(res.data.data);
    } catch (error) {
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
      toast.success('Produit désactivé');
      loadProduits();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const formatCFA = (n) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';

  const alertCount = produits.filter(p => p.stock <= p.stockAlerte).length;
  const totalValue = produits.reduce((s, p) => s + (p.prixAchat * p.stock), 0);
  const displayed = filterAlerte ? produits.filter(p => p.stock <= p.stockAlerte) : produits;

  if (loading) {
    return (
      <div className="prd-page">
        <div className="prd-loading"><div className="prd-loading-spinner" /><p>Chargement des produits...</p></div>
      </div>
    );
  }

  return (
    <div className="prd-page">
      {/* Header */}
      <div className="prd-header">
        <div className="prd-header-bg" />
        <div className="prd-header-content">
          <div className="prd-header-left">
            <div className="prd-header-icon"><FiPackage size={24} /></div>
            <div>
              <h1>Produits</h1>
              <p>Catalogue complet de vos articles</p>
            </div>
          </div>
          {isAdmin && (
            <Link to="/app/produits/nouveau" className="prd-btn-add">
              <FiPlus size={18} /> Nouveau Produit
            </Link>
          )}
        </div>
      </div>

      {/* Plan Limit Banner */}
      <PlanLimitBanner label="produits" current={produits.length} limit={planLimits.produits} icon={<FiPackage size={14} />} />

      {/* Stats */}
      <div className="prd-stats">
        <div className="prd-stat-card">
          <div className="prd-stat-icon blue"><FiPackage size={20} /></div>
          <div className="prd-stat-info">
            <span className="prd-stat-value">{produits.length}</span>
            <span className="prd-stat-label">Produits</span>
          </div>
        </div>
        <div className="prd-stat-card">
          <div className="prd-stat-icon green"><FiBarChart2 size={20} /></div>
          <div className="prd-stat-info">
            <span className="prd-stat-value">{formatCFA(totalValue)}</span>
            <span className="prd-stat-label">Valeur du stock</span>
          </div>
        </div>
        <div className="prd-stat-card" onClick={() => setFilterAlerte(!filterAlerte)} style={{ cursor: 'pointer' }}>
          <div className="prd-stat-icon amber"><FiAlertTriangle size={20} /></div>
          <div className="prd-stat-info">
            <span className="prd-stat-value prd-alert-val">{alertCount}</span>
            <span className="prd-stat-label">En alerte stock</span>
          </div>
          {filterAlerte && <span className="prd-filter-active"><FiFilter size={12} /> Filtré</span>}
        </div>
        <div className="prd-stat-card">
          <div className="prd-stat-icon purple"><FiGrid size={20} /></div>
          <div className="prd-stat-info">
            <span className="prd-stat-value">{[...new Set(produits.map(p => p.categorie?.nom).filter(Boolean))].length}</span>
            <span className="prd-stat-label">Catégories</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="prd-toolbar">
        <form className="prd-search" onSubmit={handleSearch}>
          <FiSearch size={16} />
          <input
            type="text"
            placeholder="Rechercher par nom, catégorie..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="prd-search-btn">Chercher</button>
        </form>
        <span className="prd-result-count">{displayed.length} produit{displayed.length > 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="prd-content">
        <div className="prd-table-card">
          <table className="prd-table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Catégorie</th>
                <th>Prix Vente</th>
                {isAdmin && <th>Prix Achat</th>}
                <th>Stock</th>
                <th>Unités de vente</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {displayed.map(p => (
                <tr key={p.id} className={p.stock <= p.stockAlerte ? 'prd-row-alert' : ''}>
                  <td>
                    <div className="prd-product-cell">
                      <div className={`prd-product-avatar ${!p.actif ? 'inactive' : ''}`}>
                        <FiBox size={16} />
                      </div>
                      <div>
                        <strong>{p.nom}</strong>
                        {!p.actif && <span className="prd-inactive-badge">Inactif</span>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="prd-cat-badge">{p.categorie?.nom || '—'}</span>
                  </td>
                  <td>
                    {(() => {
                      const defU = p.unitesVente?.find(u => u.estDefaut) || p.unitesVente?.[0];
                      if (defU) return <><span className="prd-price-main">{formatCFA(defU.prix)}</span><span className="prd-price-unit">/ {defU.nom}</span></>;
                      return <span className="prd-price-main">{formatCFA(p.prixVente)}</span>;
                    })()}
                  </td>
                  {isAdmin && (
                    <td>
                      {(() => {
                        const defU = p.unitesVente?.find(u => u.estDefaut) || p.unitesVente?.[0];
                        if (defU?.prixAchat) return <><span className="prd-price-achat">{formatCFA(defU.prixAchat)}</span><span className="prd-price-unit">/ {defU.nom}</span></>;
                        return <span className="prd-price-achat">{formatCFA(p.prixAchat)}</span>;
                      })()}
                    </td>
                  )}
                  <td>
                    <div className="prd-stock-cell">
                      {(() => {
                        const defU = p.unitesVente?.find(u => u.estDefaut) || p.unitesVente?.[0];
                        if (defU && defU.facteurConversion > 0) {
                          const qty = p.stock / defU.facteurConversion;
                          return (
                            <span className={`prd-stock-val ${p.stock <= p.stockAlerte ? 'alert' : ''}`}>
                              {qty % 1 === 0 ? qty : qty.toFixed(2)} {defU.nom}
                            </span>
                          );
                        }
                        return (
                          <span className={`prd-stock-val ${p.stock <= p.stockAlerte ? 'alert' : ''}`}>
                            {p.stock} {p.uniteBase}
                          </span>
                        );
                      })()}
                      {p.stock <= p.stockAlerte && (
                        <span className="prd-stock-alert-icon"><FiAlertTriangle size={13} /></span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="prd-fractions">
                      {p.unitesVente?.map(u => (
                        <span key={u.id} className="prd-fraction-tag">
                          <FiLayers size={11} /> {u.nom} ({u.facteurConversion} {p.uniteBase}) = {formatCFA(u.prix)}
                        </span>
                      ))}
                      {(!p.unitesVente || p.unitesVente.length === 0) && <span className="prd-muted">—</span>}
                    </div>
                  </td>
                  {isAdmin && (
                    <td>
                      <div className="prd-actions">
                        <Link to={`/app/produits/${p.id}/edit`} className="prd-action-btn edit" title="Modifier">
                          <FiEdit size={15} />
                        </Link>
                        <button className="prd-action-btn delete" onClick={() => handleDelete(p.id, p.nom)} title="Désactiver">
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
            <div className="prd-empty">
              <FiPackage size={40} />
              <p>Aucun produit trouvé</p>
              <span>{filterAlerte ? 'Aucun produit en alerte stock' : 'Ajoutez votre premier produit'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

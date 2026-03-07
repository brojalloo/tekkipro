import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  FiFileText, FiX, FiFilter, FiDollarSign, FiSmartphone, FiCreditCard,
  FiShoppingCart, FiTrendingUp, FiAlertCircle, FiCheckCircle, FiCalendar,
  FiUser, FiPackage, FiClock, FiSearch, FiRefreshCw, FiLock
} from 'react-icons/fi';
import { PlanLimitBanner } from '../components/UpgradeBanner';
import './Ventes.css';

export default function Ventes() {
  const { isAdmin, isPro, planLimits } = useAuth();
  const [ventes, setVentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ dateDebut: '', dateFin: '', statut: '' });
  const [search, setSearch] = useState('');

  useEffect(() => { loadVentes(); }, []);

  const loadVentes = async () => {
    try {
      const params = {};
      if (filters.dateDebut) params.dateDebut = filters.dateDebut;
      if (filters.dateFin) params.dateFin = filters.dateFin;
      if (filters.statut) params.statut = filters.statut;
      const res = await api.get('/ventes', { params });
      setVentes(res.data.data);
    } catch (e) {
      toast.error('Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  const annulerVente = async (id) => {
    if (!window.confirm('Annuler cette vente ? Le stock sera restauré.')) return;
    try {
      await api.patch(`/ventes/${id}/annuler`);
      toast.success('Vente annulée');
      loadVentes();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur');
    }
  };

  const voirFacture = (id) => {
    if (!isPro) {
      toast.error('Export PDF réservé au plan Pro. Passez à un plan supérieur.');
      return;
    }
    const token = localStorage.getItem('tekkipro_token');
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    window.open(`${baseUrl}/factures/${id}/pdf?token=${token}`, '_blank');
  };

  const formatCFA = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

  // Computed stats
  const stats = useMemo(() => {
    const completees = ventes.filter(v => v.statut === 'COMPLETEE');
    const enCredit = ventes.filter(v => v.statut === 'EN_CREDIT');
    const actives = ventes.filter(v => v.statut !== 'ANNULEE');
    const totalCA = actives.reduce((s, v) => s + (v.montantTotal || 0), 0);
    const totalCredit = enCredit.reduce((s, v) => s + (v.montantTotal || 0), 0);
    return { total: ventes.length, completees: completees.length, enCredit: enCredit.length, totalCA, totalCredit };
  }, [ventes]);

  // Filtered display
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
    <div className="vnt-loading">
      <div className="vnt-loading-spinner" />
      <p>Chargement des ventes...</p>
    </div>
  );

  return (
    <div className="vnt-page">
      {/* Header */}
      <div className="vnt-header">
        <div className="vnt-header-bg" />
        <div className="vnt-header-content">
          <div className="vnt-header-left">
            <div className="vnt-header-icon"><FiShoppingCart size={24} /></div>
            <div>
              <h1>Ventes</h1>
              <p>Historique et gestion des ventes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Limit: ventes/mois */}
      <PlanLimitBanner label="ventes ce mois" current={ventes.filter(v => v.statut !== 'ANNULEE').length} limit={planLimits.ventesParMois} icon={<FiShoppingCart size={14} />} />

      {/* Stats */}
      <div className="vnt-stats">
        <div className="vnt-stat-card">
          <div className="vnt-stat-icon blue"><FiShoppingCart size={22} /></div>
          <div className="vnt-stat-info">
            <span className="vnt-stat-value">{stats.total}</span>
            <span className="vnt-stat-label">Total ventes</span>
          </div>
        </div>
        <div className="vnt-stat-card">
          <div className="vnt-stat-icon green"><FiTrendingUp size={22} /></div>
          <div className="vnt-stat-info">
            <span className="vnt-stat-value">{formatCFA(stats.totalCA)}</span>
            <span className="vnt-stat-label">Chiffre d'affaires</span>
          </div>
        </div>
        <div className="vnt-stat-card">
          <div className="vnt-stat-icon purple"><FiCheckCircle size={22} /></div>
          <div className="vnt-stat-info">
            <span className="vnt-stat-value">{stats.completees}</span>
            <span className="vnt-stat-label">Complétées</span>
          </div>
        </div>
        <div className="vnt-stat-card">
          <div className="vnt-stat-icon amber"><FiAlertCircle size={22} /></div>
          <div className="vnt-stat-info">
            <span className="vnt-stat-value vnt-credit-val">{stats.enCredit}</span>
            <span className="vnt-stat-label">En crédit ({formatCFA(stats.totalCredit)})</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="vnt-toolbar">
        <div className="vnt-filters">
          <div className="vnt-filter-field">
            <FiCalendar size={14} />
            <input type="date" value={filters.dateDebut}
              onChange={(e) => setFilters({ ...filters, dateDebut: e.target.value })} />
          </div>
          <div className="vnt-filter-field">
            <FiCalendar size={14} />
            <input type="date" value={filters.dateFin}
              onChange={(e) => setFilters({ ...filters, dateFin: e.target.value })} />
          </div>
          <div className="vnt-filter-field">
            <FiFilter size={14} />
            <select value={filters.statut}
              onChange={(e) => setFilters({ ...filters, statut: e.target.value })}>
              <option value="">Tous statuts</option>
              <option value="COMPLETEE">Complétée</option>
              <option value="EN_CREDIT">En crédit</option>
              <option value="ANNULEE">Annulée</option>
            </select>
          </div>
          <button className="vnt-filter-btn" onClick={loadVentes}>
            <FiRefreshCw size={14} /> Filtrer
          </button>
        </div>
        <div className="vnt-search-group">
          <div className="vnt-search">
            <FiSearch size={15} />
            <input type="text" placeholder="Rechercher (n°, client, vendeur)..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <span className="vnt-result-count">{displayed.length} résultat{displayed.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Table */}
      <div className="vnt-content">
        <div className="vnt-table-card">
          {displayed.length > 0 ? (
            <table className="vnt-table">
              <thead>
                <tr>
                  <th>N° Vente</th>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Vendeur</th>
                  <th>Produits</th>
                  <th>Total</th>
                  <th>Paiement</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map(v => (
                  <tr key={v.id} className={v.statut === 'ANNULEE' ? 'vnt-row-cancelled' : v.statut === 'EN_CREDIT' ? 'vnt-row-credit' : ''}>
                    <td>
                      <span className="vnt-numero">{v.numero}</span>
                    </td>
                    <td>
                      <div className="vnt-date-cell">
                        <FiClock size={13} />
                        <span>{new Date(v.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </div>
                    </td>
                    <td>
                      {v.client ? (
                        <div className="vnt-client-cell">
                          <div className="vnt-avatar">{(v.client.prenom || v.client.nom || '?')[0].toUpperCase()}</div>
                          <span>{v.client.prenom || ''} {v.client.nom}</span>
                        </div>
                      ) : <span className="vnt-muted">—</span>}
                    </td>
                    <td>
                      <div className="vnt-vendeur-cell">
                        <FiUser size={13} />
                        <span>{v.user?.prenom} {v.user?.nom}</span>
                      </div>
                    </td>
                    <td>
                      <div className="vnt-produits-cell">
                        {v.details?.map((d, i) => (
                          <div key={i} className="vnt-produit-line">
                            <FiPackage size={12} />
                            <span>{d.produit?.nom} {d.uniteNom ? <em className="vnt-fraction">({d.uniteNom})</em> : ''} <strong>×{d.quantite}</strong></span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td><strong className="vnt-montant">{formatCFA(v.montantTotal)}</strong></td>
                    <td>
                      <span className={`vnt-badge ${v.modePaiement === 'CASH' ? 'success' : v.modePaiement === 'CREDIT' ? 'danger' : 'blue'}`}>
                        {v.modePaiement === 'CASH' ? <><FiDollarSign size={12} /> Cash</> : v.modePaiement === 'MOBILE_MONEY' ? <><FiSmartphone size={12} /> MoMo</> : <><FiCreditCard size={12} /> Crédit</>}
                      </span>
                    </td>
                    <td>
                      <span className={`vnt-status ${v.statut === 'COMPLETEE' ? 'completed' : v.statut === 'EN_CREDIT' ? 'credit' : 'cancelled'}`}>
                        {v.statut === 'COMPLETEE' ? <><FiCheckCircle size={12} /> Complétée</> : v.statut === 'EN_CREDIT' ? <><FiAlertCircle size={12} /> En crédit</> : <><FiX size={12} /> Annulée</>}
                      </span>
                    </td>
                    <td>
                      <div className="vnt-actions">
                        <button className={`vnt-action-btn pdf ${!isPro ? 'locked' : ''}`} onClick={() => voirFacture(v.id)} title={isPro ? 'Voir facture PDF' : 'PDF réservé au plan Pro'}>
                          {isPro ? <FiFileText size={15} /> : <FiLock size={15} />}
                        </button>
                        {isAdmin && v.statut !== 'ANNULEE' && (
                          <button className="vnt-action-btn cancel" onClick={() => annulerVente(v.id)} title="Annuler la vente">
                            <FiX size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="vnt-empty">
              <FiShoppingCart size={40} />
              <p>Aucune vente trouvée</p>
              <span>Modifiez vos filtres ou effectuez une nouvelle vente</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

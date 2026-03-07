import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  FiGrid, FiPlus, FiTrash2, FiMapPin, FiPhone, FiMail,
  FiPackage, FiUsers, FiShoppingCart, FiUserCheck, FiX,
  FiCheck, FiAlertTriangle, FiArrowRight, FiStar, FiRefreshCw,
  FiZap, FiActivity, FiTrendingUp, FiGlobe, FiEdit3, FiExternalLink
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import './Boutiques.css';

export default function Boutiques() {
  const navigate = useNavigate();
  const { boutique, isAdmin, isBusiness, loadMesBoutiques, switchBoutique, activeBoutique } = useAuth();
  const [boutiques, setBoutiques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const currentBoutiqueId = activeBoutique || boutique?.id;
  const mainBoutiqueId = boutiques.find(b => !b.parentBoutiqueId)?.id || boutique?.id;
  const totalProduits = boutiques.reduce((a, b) => a + (b._count?.produits || 0), 0);
  const totalVentes = boutiques.reduce((a, b) => a + (b._count?.ventes || 0), 0);
  const totalClients = boutiques.reduce((a, b) => a + (b._count?.clients || 0), 0);
  const totalUsers = boutiques.reduce((a, b) => a + (b._count?.users || 0), 0);

  useEffect(() => { loadBoutiques(); }, []);

  const loadBoutiques = async () => {
    try {
      setLoading(true);
      const res = await api.get('/boutique/mes-boutiques');
      setBoutiques(res.data.data || []);
    } catch {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setSubmitting(true);
      const res = await api.delete(`/boutique/${id}`);
      toast.success(res.data.message);
      setShowDeleteModal(null);
      loadBoutiques();
      loadMesBoutiques();
      if (id === currentBoutiqueId) {
        switchBoutique(mainBoutiqueId);
        window.location.reload();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSwitch = (id) => {
    switchBoutique(id);
    window.location.reload();
  };

  if (!isAdmin || !isBusiness) {
    return (
      <div className="mbq-page">
        <div className="mbq-upgrade-container">
          <div className="mbq-upgrade-glow" />
          <div className="mbq-upgrade-card">
            <div className="mbq-upgrade-visual">
              <div className="mbq-upgrade-circles">
                <div className="mbq-circle c1" /><div className="mbq-circle c2" /><div className="mbq-circle c3" />
              </div>
              <FiGrid size={48} />
            </div>
            <h2>Multi-Boutiques</h2>
            <p>Gérez plusieurs points de vente depuis un seul tableau de bord.<br />Disponible exclusivement avec le plan <strong>Business</strong>.</p>
            <a href="/app/abonnement" className="mbq-upgrade-cta">
              <FiZap size={16} />
              Passer au plan Business
              <FiArrowRight size={16} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mbq-page">

      {/* ===== HERO ===== */}
      <div className="mbq-hero">
        <div className="mbq-hero-bg">
          <div className="mbq-hero-orb mbq-orb-1" />
          <div className="mbq-hero-orb mbq-orb-2" />
          <div className="mbq-hero-orb mbq-orb-3" />
        </div>
        <div className="mbq-hero-content">
          <div className="mbq-hero-left">
            <div className="mbq-hero-badge">
              <FiActivity size={13} />
              <span>Gestion Multi-Sites</span>
            </div>
            <h1>Mes Boutiques</h1>
            <p>Pilotez tous vos points de vente depuis un centre de commande unifié</p>
          </div>
          <button className="mbq-hero-cta" onClick={() => navigate('/app/boutiques/nouvelle')}>
            <div className="mbq-cta-icon"><FiPlus size={20} /></div>
            <div className="mbq-cta-text">
              <span className="mbq-cta-main">Nouvelle Boutique</span>
              <span className="mbq-cta-sub">Ajouter un point de vente</span>
            </div>
          </button>
        </div>
      </div>

      {/* ===== STATS OVERVIEW ===== */}
      <div className="mbq-stats-row">
        <div className="mbq-stat-tile">
          <div className="mbq-stat-icon si-blue"><FiGlobe size={20} /></div>
          <div className="mbq-stat-data">
            <span className="mbq-stat-num">{boutiques.length}</span>
            <span className="mbq-stat-lbl">Points de vente</span>
          </div>
        </div>
        <div className="mbq-stat-tile">
          <div className="mbq-stat-icon si-emerald"><FiPackage size={20} /></div>
          <div className="mbq-stat-data">
            <span className="mbq-stat-num">{totalProduits}</span>
            <span className="mbq-stat-lbl">Produits au total</span>
          </div>
        </div>
        <div className="mbq-stat-tile">
          <div className="mbq-stat-icon si-amber"><FiTrendingUp size={20} /></div>
          <div className="mbq-stat-data">
            <span className="mbq-stat-num">{totalVentes}</span>
            <span className="mbq-stat-lbl">Ventes réalisées</span>
          </div>
        </div>
        <div className="mbq-stat-tile">
          <div className="mbq-stat-icon si-purple"><FiUsers size={20} /></div>
          <div className="mbq-stat-data">
            <span className="mbq-stat-num">{totalClients}</span>
            <span className="mbq-stat-lbl">Clients enregistrés</span>
          </div>
        </div>
      </div>

      {/* ===== BOUTIQUE CARDS ===== */}
      {loading ? (
        <div className="mbq-loader">
          <div className="mbq-loader-ring" />
          <span>Chargement de vos boutiques...</span>
        </div>
      ) : (
        <div className="mbq-grid">
          {boutiques.map(b => {
            const isActive = b.id === currentBoutiqueId;
            const isMain = !b.parentBoutiqueId;
            return (
              <div key={b.id} className={`mbq-card ${isActive ? 'mbq-card-active' : ''} ${isMain ? 'mbq-card-main' : ''}`}>
                {/* Card glow */}
                {isActive && <div className="mbq-card-glow" />}

                {/* Badges */}
                <div className="mbq-card-badges">
                  {isMain && (
                    <span className="mbq-badge mbq-badge-main"><FiStar size={11} /> Siège</span>
                  )}
                  {isActive && (
                    <span className="mbq-badge mbq-badge-active"><FiCheck size={11} /> Active</span>
                  )}
                </div>

                {/* Top section */}
                <div className="mbq-card-top">
                  <div className="mbq-card-avatar" style={{ background: isMain ? 'linear-gradient(135deg, #34d399, #059669)' : 'linear-gradient(135deg, #818cf8, #6366f1)' }}>
                    {b.nom.charAt(0).toUpperCase()}
                  </div>
                  <div className="mbq-card-identity">
                    <h3>{b.nom}</h3>
                    <span className="mbq-slug-tag">/{b.slug}</span>
                  </div>
                </div>

                {/* Info rows */}
                <div className="mbq-card-infos">
                  {b.adresse && (
                    <div className="mbq-info-row"><FiMapPin size={13} /><span>{b.adresse}</span></div>
                  )}
                  {b.telephone && (
                    <div className="mbq-info-row"><FiPhone size={13} /><span>{b.telephone}</span></div>
                  )}
                  {b.email && (
                    <div className="mbq-info-row"><FiMail size={13} /><span>{b.email}</span></div>
                  )}
                  {!b.adresse && !b.telephone && !b.email && (
                    <div className="mbq-info-empty">Aucune info de contact</div>
                  )}
                </div>

                {/* Metrics */}
                <div className="mbq-card-metrics">
                  <div className="mbq-metric">
                    <div className="mbq-metric-val">{b._count?.produits || 0}</div>
                    <div className="mbq-metric-lbl">Produits</div>
                  </div>
                  <div className="mbq-metric-sep" />
                  <div className="mbq-metric">
                    <div className="mbq-metric-val">{b._count?.ventes || 0}</div>
                    <div className="mbq-metric-lbl">Ventes</div>
                  </div>
                  <div className="mbq-metric-sep" />
                  <div className="mbq-metric">
                    <div className="mbq-metric-val">{b._count?.clients || 0}</div>
                    <div className="mbq-metric-lbl">Clients</div>
                  </div>
                  <div className="mbq-metric-sep" />
                  <div className="mbq-metric">
                    <div className="mbq-metric-val">{b._count?.users || 0}</div>
                    <div className="mbq-metric-lbl">Équipe</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mbq-card-actions">
                  {isActive ? (
                    <div className="mbq-action-active">
                      <FiCheck size={14} /> Boutique en cours d'utilisation
                    </div>
                  ) : (
                    <button className="mbq-btn-switch" onClick={() => handleSwitch(b.id)}>
                      <FiExternalLink size={14} />
                      <span>Basculer vers cette boutique</span>
                    </button>
                  )}
                  {!isMain && (
                    <button className="mbq-btn-delete" onClick={() => setShowDeleteModal(b)} title="Supprimer">
                      <FiTrash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add New Card */}
          <div className="mbq-card mbq-card-add" onClick={() => navigate('/app/boutiques/nouvelle')}>
            <div className="mbq-add-content">
              <div className="mbq-add-icon"><FiPlus size={28} /></div>
              <h4>Nouveau point de vente</h4>
              <p>Créer une nouvelle boutique rattachée à votre réseau</p>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL SUPPRIMER ===== */}
      {showDeleteModal && (
        <div className="mbq-overlay" onClick={() => setShowDeleteModal(null)}>
          <div className="mbq-modal mbq-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="mbq-modal-top danger">
              <div className="mbq-modal-icon-wrap danger"><FiAlertTriangle size={22} /></div>
              <div>
                <h3>Supprimer la boutique</h3>
                <p>Cette action est irréversible</p>
              </div>
              <button className="mbq-modal-x" onClick={() => setShowDeleteModal(null)}><FiX size={18} /></button>
            </div>

            <div className="mbq-delete-body">
              <div className="mbq-delete-alert">
                <FiAlertTriangle size={20} />
                <div>
                  <strong>Attention !</strong>
                  <p>
                    La boutique <strong>"{showDeleteModal.nom}"</strong> et toutes ses données seront supprimées :
                    produits, ventes, clients, employés...
                  </p>
                </div>
              </div>
            </div>

            <div className="mbq-modal-actions">
              <button className="mbq-btn-cancel" onClick={() => setShowDeleteModal(null)}>Annuler</button>
              <button className="mbq-btn-danger" onClick={() => handleDelete(showDeleteModal.id)} disabled={submitting}>
                {submitting ? <><FiRefreshCw className="mbq-spin" size={14} /> Suppression...</> : <><FiTrash2 size={14} /> Supprimer définitivement</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

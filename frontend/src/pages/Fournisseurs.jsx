import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  FiPlus, FiEdit, FiTrash2, FiTruck, FiPhone, FiMail,
  FiMapPin, FiSearch, FiPackage, FiArrowDownCircle,
  FiX, FiCheckCircle, FiUser, FiHash
} from 'react-icons/fi';
import UpgradeBanner from '../components/UpgradeBanner';
import './Fournisseurs.css';

export default function Fournisseurs() {
  const { isPro, plan } = useAuth();
  const [fournisseurs, setFournisseurs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nom: '', telephone: '', adresse: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await api.get('/fournisseurs');
      setFournisseurs(res.data.data);
    } catch (e) { toast.error('Erreur de chargement des fournisseurs'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/fournisseurs/${editing.id}`, form);
        toast.success('Fournisseur mis à jour');
      } else {
        await api.post('/fournisseurs', form);
        toast.success('Fournisseur ajouté avec succès');
      }
      setShowModal(false);
      setEditing(null);
      setForm({ nom: '', telephone: '', adresse: '', email: '' });
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Erreur lors de l\'enregistrement'); } finally { setSubmitting(false); }
  };

  const startEdit = (f) => {
    setEditing(f);
    setForm({ nom: f.nom, telephone: f.telephone || '', adresse: f.adresse || '', email: f.email || '' });
    setShowModal(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ nom: '', telephone: '', adresse: '', email: '' });
    setShowModal(true);
  };

  const remove = async (id) => {
    if (!window.confirm('Supprimer ce fournisseur ?')) return;
    try {
      await api.delete(`/fournisseurs/${id}`);
      toast.success('Fournisseur supprimé');
      load();
    } catch (e) { toast.error('Erreur'); }
  };

  const filtered = fournisseurs.filter(f =>
    f.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.telephone || '').includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="frn-page">
        <div className="frn-loading"><div className="frn-loading-spinner" /><p>Chargement...</p></div>
      </div>
    );
  }

  // Bloquer l'accès pour le plan Gratuit
  if (!isPro) {
    return (
      <div className="frn-page">
        <UpgradeBanner
          fullPage
          feature="Gestion des fournisseurs"
          requiredPlan="PRO"
          currentPlan={plan}
        />
      </div>
    );
  }

  return (
    <div className="frn-page">
      {/* Header */}
      <div className="frn-header">
        <div className="frn-header-bg" />
        <div className="frn-header-content">
          <div className="frn-header-left">
            <div className="frn-header-icon"><FiTruck size={24} /></div>
            <div>
              <h1>Fournisseurs</h1>
              <p>Gérez vos fournisseurs et leurs informations</p>
            </div>
          </div>
          <button className="frn-btn-add" onClick={openNew}>
            <FiPlus size={18} /> Nouveau Fournisseur
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="frn-stats">
        <div className="frn-stat-card">
          <div className="frn-stat-icon blue"><FiTruck size={20} /></div>
          <div className="frn-stat-info">
            <span className="frn-stat-value">{fournisseurs.length}</span>
            <span className="frn-stat-label">Fournisseurs</span>
          </div>
        </div>
        <div className="frn-stat-card">
          <div className="frn-stat-icon green"><FiPackage size={20} /></div>
          <div className="frn-stat-info">
            <span className="frn-stat-value">{fournisseurs.reduce((s, f) => s + (f._count?.produits || 0), 0)}</span>
            <span className="frn-stat-label">Produits liés</span>
          </div>
        </div>
        <div className="frn-stat-card">
          <div className="frn-stat-icon purple"><FiArrowDownCircle size={20} /></div>
          <div className="frn-stat-info">
            <span className="frn-stat-value">{fournisseurs.reduce((s, f) => s + (f._count?.entreeStocks || 0), 0)}</span>
            <span className="frn-stat-label">Entrées stock</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="frn-toolbar">
        <div className="frn-search">
          <FiSearch size={16} />
          <input
            type="text"
            placeholder="Rechercher un fournisseur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <span className="frn-result-count">{filtered.length} fournisseur{filtered.length > 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="frn-content">
        <div className="frn-table-card">
          <table className="frn-table">
            <thead>
              <tr>
                <th>Fournisseur</th>
                <th>Contact</th>
                <th>Adresse</th>
                <th>Produits</th>
                <th>Entrées</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id}>
                  <td>
                    <div className="frn-name-cell">
                      <div className="frn-avatar"><FiTruck size={16} /></div>
                      <strong>{f.nom}</strong>
                    </div>
                  </td>
                  <td>
                    <div className="frn-contact-cell">
                      {f.telephone && (
                        <span className="frn-contact-item"><FiPhone size={12} /> {f.telephone}</span>
                      )}
                      {f.email && (
                        <span className="frn-contact-item"><FiMail size={12} /> {f.email}</span>
                      )}
                      {!f.telephone && !f.email && <span className="frn-muted">—</span>}
                    </div>
                  </td>
                  <td>
                    {f.adresse ? (
                      <span className="frn-address"><FiMapPin size={12} /> {f.adresse}</span>
                    ) : (
                      <span className="frn-muted">—</span>
                    )}
                  </td>
                  <td><span className="frn-count-badge blue">{f._count?.produits || 0}</span></td>
                  <td><span className="frn-count-badge green">{f._count?.entreeStocks || 0}</span></td>
                  <td>
                    <div className="frn-actions">
                      <button className="frn-action-btn edit" onClick={() => startEdit(f)} title="Modifier">
                        <FiEdit size={15} />
                      </button>
                      <button className="frn-action-btn delete" onClick={() => remove(f.id)} title="Supprimer">
                        <FiTrash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="frn-empty">
              <FiTruck size={40} />
              <p>Aucun fournisseur trouvé</p>
              <span>Ajoutez votre premier fournisseur</span>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="frn-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="frn-modal" onClick={(e) => e.stopPropagation()}>
            <div className="frn-modal-header">
              <div className="frn-modal-icon">
                {editing ? <FiEdit size={22} /> : <FiPlus size={22} />}
              </div>
              <div>
                <h3>{editing ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}</h3>
                <p>{editing ? 'Modifiez les informations' : 'Ajoutez un nouveau partenaire'}</p>
              </div>
              <button className="frn-modal-close" onClick={() => setShowModal(false)}><FiX size={20} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="frn-modal-body">
                <div className="frn-field">
                  <label><FiUser size={14} /> Nom <span className="frn-req">*</span></label>
                  <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required placeholder="Nom du fournisseur" />
                </div>
                <div className="frn-modal-row">
                  <div className="frn-field">
                    <label><FiPhone size={14} /> Téléphone</label>
                    <input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} placeholder="+221 77 000 0000" />
                  </div>
                  <div className="frn-field">
                    <label><FiMail size={14} /> Email</label>
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemple.com" />
                  </div>
                </div>
                <div className="frn-field">
                  <label><FiMapPin size={14} /> Adresse</label>
                  <input value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} placeholder="Adresse complète" />
                </div>
              </div>
              <div className="frn-modal-footer">
                <button type="button" className="frn-btn-cancel" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="frn-btn-save" disabled={submitting}>
                  {submitting ? <span className="frn-spinner" /> : <FiCheckCircle size={16} />}
                  {submitting ? 'Enregistrement...' : (editing ? 'Modifier' : 'Ajouter')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

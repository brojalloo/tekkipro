import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  FiPlus, FiEdit, FiTrash2, FiSearch, FiPhone, FiDollarSign,
  FiUsers, FiMapPin, FiUser, FiShoppingCart, FiAlertCircle,
  FiCheckCircle, FiX, FiMail
} from 'react-icons/fi';
import { PlanLimitBanner } from '../components/UpgradeBanner';
import './Clients.css';

export default function Clients() {
  const { planLimits } = useAuth();
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState({ nom: '', prenom: '', telephone: '', adresse: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadClients(); }, []);

  const loadClients = async () => {
    try {
      const res = await api.get('/clients', { params: { search: search || undefined } });
      setClients(res.data.data);
    } catch (e) { toast.error('Erreur de chargement des clients'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingClient) {
        await api.put(`/clients/${editingClient.id}`, form);
        toast.success('Client mis à jour');
      } else {
        await api.post('/clients', form);
        toast.success('Client ajouté avec succès');
      }
      setShowModal(false);
      setForm({ nom: '', prenom: '', telephone: '', adresse: '' });
      setEditingClient(null);
      loadClients();
    } catch (e) { toast.error(e.response?.data?.message || 'Erreur lors de l\'enregistrement'); } finally { setSubmitting(false); }
  };

  const startEdit = (client) => {
    setEditingClient(client);
    setForm({ nom: client.nom, prenom: client.prenom || '', telephone: client.telephone || '', adresse: client.adresse || '' });
    setShowModal(true);
  };

  const openNew = () => {
    setEditingClient(null);
    setForm({ nom: '', prenom: '', telephone: '', adresse: '' });
    setShowModal(true);
  };

  const deleteClient = async (id) => {
    if (!window.confirm('Supprimer ce client ?')) return;
    try {
      await api.delete(`/clients/${id}`);
      toast.success('Client supprimé');
      loadClients();
    } catch (e) { toast.error('Impossible: le client a des ventes'); }
  };

  const formatCFA = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0)) + ' FCFA';

  const totalDettes = clients.reduce((s, c) => s + (c.totalDettes || 0), 0);
  const totalVentes = clients.reduce((s, c) => s + (c.nombreVentes || 0), 0);
  const clientsAvecDettes = clients.filter(c => c.totalDettes > 0).length;

  const filtered = clients.filter(c => {
    const term = search.toLowerCase();
    return (c.nom || '').toLowerCase().includes(term) ||
           (c.prenom || '').toLowerCase().includes(term) ||
           (c.telephone || '').includes(term);
  });

  if (loading) {
    return (
      <div className="clt-page">
        <div className="clt-loading"><div className="clt-loading-spinner" /><p>Chargement...</p></div>
      </div>
    );
  }

  return (
    <div className="clt-page">
      {/* Header */}
      <div className="clt-header">
        <div className="clt-header-bg" />
        <div className="clt-header-content">
          <div className="clt-header-left">
            <div className="clt-header-icon"><FiUsers size={24} /></div>
            <div>
              <h1>Clients</h1>
              <p>Gérez votre base de clients et suivez leurs transactions</p>
            </div>
          </div>
          <button className="clt-btn-add" onClick={openNew}>
            <FiPlus size={18} /> Nouveau Client
          </button>
        </div>
      </div>

      {/* Plan Limit Banner */}
      <PlanLimitBanner label="clients" current={clients.length} limit={planLimits.clients} icon={<FiUsers size={14} />} />

      {/* Stats */}
      <div className="clt-stats">
        <div className="clt-stat-card">
          <div className="clt-stat-icon blue"><FiUsers size={20} /></div>
          <div className="clt-stat-info">
            <span className="clt-stat-value">{clients.length}</span>
            <span className="clt-stat-label">Clients</span>
          </div>
        </div>
        <div className="clt-stat-card">
          <div className="clt-stat-icon green"><FiShoppingCart size={20} /></div>
          <div className="clt-stat-info">
            <span className="clt-stat-value">{totalVentes}</span>
            <span className="clt-stat-label">Ventes totales</span>
          </div>
        </div>
        <div className="clt-stat-card">
          <div className="clt-stat-icon red"><FiAlertCircle size={20} /></div>
          <div className="clt-stat-info">
            <span className="clt-stat-value clt-debt-val">{formatCFA(totalDettes)}</span>
            <span className="clt-stat-label">Dettes en cours</span>
          </div>
        </div>
        <div className="clt-stat-card">
          <div className="clt-stat-icon amber"><FiDollarSign size={20} /></div>
          <div className="clt-stat-info">
            <span className="clt-stat-value">{clientsAvecDettes}</span>
            <span className="clt-stat-label">Clients avec dettes</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="clt-toolbar">
        <form className="clt-search" onSubmit={(e) => { e.preventDefault(); loadClients(); }}>
          <FiSearch size={16} />
          <input
            type="text"
            placeholder="Rechercher par nom, prénom, téléphone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="clt-search-btn">Chercher</button>
        </form>
        <span className="clt-result-count">{filtered.length} client{filtered.length > 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="clt-content">
        <div className="clt-table-card">
          <table className="clt-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Téléphone</th>
                <th>Adresse</th>
                <th>Ventes</th>
                <th>Dettes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className={c.totalDettes > 0 ? 'clt-row-debt' : ''}>
                  <td>
                    <div className="clt-name-cell">
                      <div className="clt-avatar">
                        {(c.prenom || c.nom || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <strong>{c.prenom} {c.nom}</strong>
                      </div>
                    </div>
                  </td>
                  <td>
                    {c.telephone ? (
                      <span className="clt-phone"><FiPhone size={13} /> {c.telephone}</span>
                    ) : (
                      <span className="clt-muted">—</span>
                    )}
                  </td>
                  <td>
                    {c.adresse ? (
                      <span className="clt-address"><FiMapPin size={12} /> {c.adresse}</span>
                    ) : (
                      <span className="clt-muted">—</span>
                    )}
                  </td>
                  <td><span className="clt-ventes-badge">{c.nombreVentes || 0}</span></td>
                  <td>
                    {c.totalDettes > 0 ? (
                      <span className="clt-badge danger">
                        <FiDollarSign size={12} /> {formatCFA(c.totalDettes)}
                      </span>
                    ) : (
                      <span className="clt-badge success">
                        <FiCheckCircle size={12} /> Aucune dette
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="clt-actions">
                      <button className="clt-action-btn edit" onClick={() => startEdit(c)} title="Modifier">
                        <FiEdit size={15} />
                      </button>
                      <button className="clt-action-btn delete" onClick={() => deleteClient(c.id)} title="Supprimer">
                        <FiTrash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="clt-empty">
              <FiUsers size={40} />
              <p>Aucun client trouvé</p>
              <span>Ajoutez votre premier client</span>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="clt-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="clt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="clt-modal-header">
              <div className="clt-modal-icon">
                {editingClient ? <FiEdit size={22} /> : <FiPlus size={22} />}
              </div>
              <div>
                <h3>{editingClient ? 'Modifier le client' : 'Nouveau client'}</h3>
                <p>{editingClient ? 'Modifiez les informations' : 'Ajoutez un nouveau client'}</p>
              </div>
              <button className="clt-modal-close" onClick={() => setShowModal(false)}><FiX size={20} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="clt-modal-body">
                <div className="clt-modal-row">
                  <div className="clt-field">
                    <label><FiUser size={14} /> Prénom</label>
                    <input value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} placeholder="Prénom" />
                  </div>
                  <div className="clt-field">
                    <label><FiUser size={14} /> Nom <span className="clt-req">*</span></label>
                    <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required placeholder="Nom de famille" />
                  </div>
                </div>
                <div className="clt-field">
                  <label><FiPhone size={14} /> Téléphone</label>
                  <input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} placeholder="+221 77 000 0000" />
                </div>
                <div className="clt-field">
                  <label><FiMapPin size={14} /> Adresse</label>
                  <input value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} placeholder="Adresse complète" />
                </div>
              </div>
              <div className="clt-modal-footer">
                <button type="button" className="clt-btn-cancel" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="clt-btn-save" disabled={submitting}>
                  {submitting ? <span className="clt-spinner" /> : <FiCheckCircle size={16} />}
                  {submitting ? 'Enregistrement...' : (editingClient ? 'Modifier' : 'Ajouter')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

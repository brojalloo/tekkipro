import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { FiPlus, FiUserCheck, FiUserX, FiShield, FiUser } from 'react-icons/fi';
import UpgradeBanner from '../components/UpgradeBanner';

export default function Employes() {
  const { isPro, plan } = useAuth();
  const [employes, setEmployes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', password: '', telephone: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await api.get('/auth/employees');
      setEmployes(res.data.data);
    } catch (e) {} finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/employees', form);
      toast.success('Employé ajouté');
      setShowModal(false);
      setForm({ nom: '', prenom: '', email: '', password: '', telephone: '' });
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const toggleActif = async (id) => {
    try {
      const res = await api.patch(`/auth/employees/${id}/toggle`);
      toast.success(res.data.message);
      load();
    } catch (e) { toast.error('Erreur'); }
  };

  if (loading) return <div className="loading">Chargement...</div>;

  // Bloquer l'accès pour le plan Gratuit
  if (!isPro) {
    return (
      <UpgradeBanner
        fullPage
        feature="Gestion des employés"
        requiredPlan="PRO"
        currentPlan={plan}
      />
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>Gestion des Employés</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <FiPlus /> Ajouter un employé
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr><th>Nom</th><th>Email</th><th>Téléphone</th><th>Rôle</th><th>Statut</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {employes.map(e => (
              <tr key={e.id}>
                <td><strong>{e.prenom} {e.nom}</strong></td>
                <td>{e.email}</td>
                <td>{e.telephone || '-'}</td>
                <td>
                  <span className={`badge ${e.role === 'ADMIN' ? 'badge-blue' : 'badge-gray'}`}>
                    {e.role === 'ADMIN' ? <><FiShield size={12} /> Admin</> : <><FiUser size={12} /> Employé</>}
                  </span>
                </td>
                <td>
                  <span className={`badge ${e.actif ? 'badge-success' : 'badge-danger'}`}>
                    {e.actif ? 'Actif' : 'Désactivé'}
                  </span>
                </td>
                <td>
                  <button className={`btn btn-sm ${e.actif ? 'btn-danger' : 'btn-secondary'}`}
                    onClick={() => toggleActif(e.id)}>
                    {e.actif ? <><FiUserX /> Désactiver</> : <><FiUserCheck /> Activer</>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Ajouter un employé</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Prénom *</label>
                  <input className="form-control" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Nom *</label>
                  <input className="form-control" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Mot de passe *</label>
                <input type="password" className="form-control" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
              </div>
              <div className="form-group">
                <label>Téléphone</label>
                <input className="form-control" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Ajouter</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

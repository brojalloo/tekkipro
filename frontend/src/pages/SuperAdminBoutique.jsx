import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiShield } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';
import AuditLogTable from '../components/AuditLogTable';

const PLAN_COLORS = {
  GRATUIT:  { bg: '#E8F5E9', text: '#2E7D32' },
  PRO:      { bg: '#E3F2FD', text: '#1565C0' },
  BUSINESS: { bg: '#FFF8E1', text: '#F57F17' },
};

export default function SuperAdminBoutique() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [boutique, setBoutique] = useState(null);
  const [loading, setLoading] = useState(true);

  // Formulaire changement plan
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planForm, setPlanForm] = useState({ plan: '', dateFin: '', montant: '' });
  const [planLoading, setPlanLoading] = useState(false);

  // Confirm suppression
  const [deleteInput, setDeleteInput] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchBoutique = useCallback(async () => {
    try {
      const res = await api.get(`/superadmin/boutiques/${id}`);
      setBoutique(res.data.data);
      setPlanForm(f => ({ ...f, plan: res.data.data.plan }));
    } catch {
      toast.error('Boutique introuvable');
      navigate('/app/superadmin');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchBoutique(); }, [fetchBoutique]);

  const handleChangePlan = async (e) => {
    e.preventDefault();
    setPlanLoading(true);
    try {
      await api.post(`/superadmin/boutiques/${id}/plan`, {
        plan: planForm.plan,
        dateFin: planForm.dateFin || undefined,
        montant: planForm.montant ? parseFloat(planForm.montant) : undefined,
      });
      toast.success('Plan mis à jour');
      setShowPlanForm(false);
      fetchBoutique();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors du changement de plan');
    } finally {
      setPlanLoading(false);
    }
  };

  const handleToggleStatut = async () => {
    const action = boutique.statut === 'ACTIVE' ? 'suspendre' : 'réactiver';
    if (!window.confirm(`Voulez-vous ${action} cette boutique ?`)) return;
    try {
      const res = await api.patch(`/superadmin/boutiques/${id}/statut`);
      toast.success(res.data.message);
      fetchBoutique();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const handleDelete = async () => {
    if (deleteInput !== boutique.nom) {
      toast.error('Le nom saisi ne correspond pas');
      return;
    }
    setDeleteLoading(true);
    try {
      await api.delete(`/superadmin/boutiques/${id}`);
      toast.success('Boutique supprimée');
      navigate('/app/superadmin');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) return <div className="p-4 text-center text-gray-400">Chargement...</div>;
  if (!boutique) return null;

  const planColor = PLAN_COLORS[boutique.plan] || {};
  const abonnementActif = boutique.abonnements?.find(a => a.statut === 'ACTIF');

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <button onClick={() => navigate('/app/superadmin')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <FiArrowLeft size={14} /> Retour
      </button>

      <div className="flex items-center gap-2 mb-6">
        <FiShield size={22} className="text-gray-600" />
        <h1 className="text-xl font-semibold text-gray-800">{boutique.nom}</h1>
      </div>

      {/* Section 1 — Infos */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-600 mb-3">Informations</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-gray-500">Email</span><span className="text-gray-800">{boutique.email || '—'}</span>
          <span className="text-gray-500">Téléphone</span><span className="text-gray-800">{boutique.telephone || '—'}</span>
          <span className="text-gray-500">Slug</span><span className="text-gray-800">{boutique.slug}</span>
          <span className="text-gray-500">Créée le</span><span className="text-gray-800">{new Date(boutique.createdAt).toLocaleDateString('fr-FR')}</span>
          <span className="text-gray-500">Utilisateurs</span><span className="text-gray-800">{boutique.nbUsers}</span>
          <span className="text-gray-500">Ventes</span><span className="text-gray-800">{boutique.nbVentes}</span>
        </div>
      </div>

      {/* Section 2 — Plan & Abonnement */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-600">Plan & Abonnement</h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: planColor.bg, color: planColor.text }}>
            {boutique.plan}
          </span>
        </div>

        {abonnementActif ? (
          <div className="text-sm text-gray-600 mb-3">
            <p>Du <strong>{new Date(abonnementActif.dateDebut).toLocaleDateString('fr-FR')}</strong> au <strong>{new Date(abonnementActif.dateFin).toLocaleDateString('fr-FR')}</strong></p>
            <p>Montant : <strong>{abonnementActif.montant.toLocaleString()} FCFA</strong></p>
          </div>
        ) : (
          <p className="text-sm text-gray-400 mb-3">Aucun abonnement actif</p>
        )}

        {!showPlanForm ? (
          <button
            onClick={() => setShowPlanForm(true)}
            className="px-3 py-1.5 text-sm bg-green-800 text-white rounded hover:bg-green-900"
          >
            Changer le plan
          </button>
        ) : (
          <form onSubmit={handleChangePlan} className="space-y-3 mt-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nouveau plan</label>
              <select
                value={planForm.plan}
                onChange={e => setPlanForm(f => ({ ...f, plan: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-green-600"
                required
              >
                <option value="GRATUIT">Starter (Gratuit)</option>
                <option value="PRO">Pro</option>
                <option value="BUSINESS">Business</option>
              </select>
            </div>
            {planForm.plan !== 'GRATUIT' && (
              <>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date de fin</label>
                  <input
                    type="date"
                    value={planForm.dateFin}
                    onChange={e => setPlanForm(f => ({ ...f, dateFin: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-green-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Montant (FCFA)</label>
                  <input
                    type="number"
                    value={planForm.montant}
                    onChange={e => setPlanForm(f => ({ ...f, montant: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-green-600"
                    placeholder="ex: 5000"
                  />
                </div>
              </>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={planLoading}
                className="px-3 py-1.5 text-sm bg-green-800 text-white rounded hover:bg-green-900 disabled:opacity-50"
              >
                {planLoading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              <button
                type="button"
                onClick={() => setShowPlanForm(false)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Section 3 — Statut */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-600 mb-3">Statut</h2>
        <p className="text-sm text-gray-600 mb-3">
          Statut actuel : <span className={`font-medium ${boutique.statut === 'ACTIVE' ? 'text-green-700' : 'text-red-700'}`}>{boutique.statut}</span>
        </p>
        {boutique.statut === 'ACTIVE' ? (
          <button
            onClick={handleToggleStatut}
            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
          >
            Suspendre la boutique
          </button>
        ) : (
          <button
            onClick={handleToggleStatut}
            className="px-3 py-1.5 text-sm bg-green-700 text-white rounded hover:bg-green-800"
          >
            Réactiver la boutique
          </button>
        )}
      </div>

      {/* Section 4 — Danger zone */}
      <div className="bg-white border border-red-200 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-red-600 mb-3">Zone dangereuse</h2>
        {!showDeleteModal ? (
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-3 py-1.5 text-sm border border-red-400 text-red-600 rounded hover:bg-red-50"
          >
            Supprimer la boutique
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">Pour confirmer, saisir le nom exact : <strong>{boutique.nom}</strong></p>
            <input
              type="text"
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              placeholder="Nom de la boutique"
              className="w-full px-3 py-2 text-sm border border-red-300 rounded focus:outline-none focus:border-red-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleteLoading || deleteInput !== boutique.nom}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-40"
              >
                {deleteLoading ? 'Suppression...' : 'Confirmer la suppression'}
              </button>
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteInput(''); }}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Section 5 — Historique des actions */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mt-4">
        <h2 className="text-sm font-semibold text-gray-600 mb-4">Historique des actions</h2>
        <AuditLogTable boutiqueId={parseInt(id)} />
      </div>
    </div>
  );
}

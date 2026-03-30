import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiShield, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';

const PLAN_COLORS = {
  GRATUIT:  { bg: '#E8F5E9', text: '#2E7D32' },
  PRO:      { bg: '#E3F2FD', text: '#1565C0' },
  BUSINESS: { bg: '#FFF8E1', text: '#F57F17' },
};

const STATUT_COLORS = {
  ACTIVE:   { bg: '#E8F5E9', text: '#2E7D32' },
  SUSPENDUE: { bg: '#FFEBEE', text: '#C62828' },
};

export default function SuperAdminBoutiques() {
  const navigate = useNavigate();
  const [boutiques, setBoutiques] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [stats, setStats] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ prenom: '', nom: '', email: '', password: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const fetchBoutiques = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 20 };
      if (q) params.q = q;
      if (filterPlan) params.plan = filterPlan;
      if (filterStatut) params.statut = filterStatut;
      const res = await api.get('/superadmin/boutiques', { params });
      setBoutiques(res.data.data || []);
      setPagination(res.data.pagination || { page: p, limit: 20, total: 0 });
    } catch {
      setBoutiques([]);
    } finally {
      setLoading(false);
    }
  }, [q, filterPlan, filterStatut]);

  useEffect(() => {
    setPage(1);
    fetchBoutiques(1);
  }, [fetchBoutiques]);

  useEffect(() => {
    api.get('/superadmin/stats')
      .then(res => setStats(res.data.data))
      .catch(() => {});
  }, []);

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      await api.post('/superadmin/admins', createForm);
      setShowCreateModal(false);
      setCreateForm({ prenom: '', nom: '', email: '', password: '' });
      toast.success('Compte SUPERADMIN créé');
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = {};
      if (q) params.q = q;
      if (filterPlan) params.plan = filterPlan;
      if (filterStatut) params.statut = filterStatut;

      const res = await api.get('/superadmin/boutiques/export', { params, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `boutiques-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Erreur lors de l\'export');
    }
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <FiShield size={22} className="text-gray-600" />
        <h1 className="text-xl font-semibold text-gray-800">Super-Admin — Boutiques</h1>
        <span className="text-sm text-gray-500">{pagination.total} boutique{pagination.total !== 1 ? 's' : ''}</span>
        <button
          onClick={() => navigate('/app/superadmin/logs')}
          className="ml-auto px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
        >
          Logs d&apos;audit
        </button>
        <button
          onClick={() => { setCreateError(''); setShowCreateModal(true); }}
          className="ml-2 px-3 py-1.5 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-700"
        >
          + Nouveau SUPERADMIN
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total boutiques', value: stats?.total, color: 'text-gray-800' },
          { label: 'Actives', value: stats?.actives, color: 'text-green-700' },
          { label: 'Suspendues', value: stats?.suspendues, color: 'text-red-600' },
          { label: 'Nouveaux ce mois', value: stats?.nouveauxCeMois, color: 'text-green-800' },
          { label: 'Starter', value: stats?.parPlan?.GRATUIT, color: 'text-gray-600' },
          { label: 'Pro', value: stats?.parPlan?.PRO, color: 'text-blue-700' },
          { label: 'Business', value: stats?.parPlan?.BUSINESS, color: 'text-yellow-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-lg p-3">
            <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input
            type="text"
            placeholder="Rechercher..."
            value={q}
            onChange={e => setQ(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-sm border rounded-lg border-gray-300 focus:outline-none focus:border-green-600"
          />
        </div>
        <select
          value={filterPlan}
          onChange={e => setFilterPlan(e.target.value)}
          className="px-3 py-1.5 text-sm border rounded-lg border-gray-300 focus:outline-none focus:border-green-600"
        >
          <option value="">Tous les plans</option>
          <option value="GRATUIT">Starter</option>
          <option value="PRO">Pro</option>
          <option value="BUSINESS">Business</option>
        </select>
        <select
          value={filterStatut}
          onChange={e => setFilterStatut(e.target.value)}
          className="px-3 py-1.5 text-sm border rounded-lg border-gray-300 focus:outline-none focus:border-green-600"
        >
          <option value="">Tous les statuts</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDUE">Suspendue</option>
        </select>
        <button
          onClick={handleExport}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
        >
          Exporter CSV
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Chargement...</div>
      ) : boutiques.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Aucune boutique trouvée</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Boutique</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Plan</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Users</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Ventes</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Création</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {boutiques.map(b => {
                const planColor = PLAN_COLORS[b.plan] || {};
                const statutColor = STATUT_COLORS[b.statut] || {};
                return (
                  <tr
                    key={b.id}
                    onClick={() => navigate(`/app/superadmin/${b.id}`)}
                    className="bg-white hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{b.nom}</p>
                      <p className="text-xs text-gray-400">{b.email || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: planColor.bg, color: planColor.text }}>
                        {b.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: statutColor.bg, color: statutColor.text }}>
                        {b.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{b.nbUsers}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{b.nbVentes}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(b.createdAt).toLocaleDateString('fr-FR')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            disabled={page <= 1}
            onClick={() => { const prev = page - 1; setPage(prev); fetchBoutiques(prev); }}
            className="px-3 py-1.5 text-sm border rounded disabled:opacity-40"
          >
            Précédent
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-600">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => { const next = page + 1; setPage(next); fetchBoutiques(next); }}
            className="px-3 py-1.5 text-sm border rounded disabled:opacity-40"
          >
            Suivant
          </button>
        </div>
      )}

      {/* Modal créer SUPERADMIN */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Nouveau compte SUPERADMIN</h2>
            <form onSubmit={handleCreateAdmin} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Prénom</label>
                  <input
                    type="text"
                    value={createForm.prenom}
                    onChange={e => setCreateForm(f => ({ ...f, prenom: e.target.value }))}
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nom</label>
                  <input
                    type="text"
                    value={createForm.nom}
                    onChange={e => setCreateForm(f => ({ ...f, nom: e.target.value }))}
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mot de passe</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500"
                />
                <p className="text-xs text-gray-400 mt-1">Min. 8 caractères, majuscule, chiffre, caractère spécial</p>
              </div>
              {createError && <p className="text-sm text-red-600">{createError}</p>}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  {creating ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiShield, FiSearch } from 'react-icons/fi';
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

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <FiShield size={22} className="text-gray-600" />
        <h1 className="text-xl font-semibold text-gray-800">Super-Admin — Boutiques</h1>
        <span className="ml-auto text-sm text-gray-500">{pagination.total} boutique{pagination.total !== 1 ? 's' : ''}</span>
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
    </div>
  );
}

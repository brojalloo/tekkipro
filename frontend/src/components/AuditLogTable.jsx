import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const ACTION_COLORS = {
  CREATE:       { bg: '#E8F5E9', text: '#2E7D32' },
  UPDATE:       { bg: '#E3F2FD', text: '#1565C0' },
  DELETE:       { bg: '#FFEBEE', text: '#C62828' },
  CANCEL:       { bg: '#FFF3E0', text: '#E65100' },
  STOCK_ADJUST: { bg: '#F3E5F5', text: '#6A1B9A' },
};

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'CANCEL', 'STOCK_ADJUST'];
const ENTITES = ['boutique', 'user', 'produit', 'vente', 'client', 'fournisseur', 'entreeStock'];

export default function AuditLogTable({ boutiqueId }) {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 30, total: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [filterAction, setFilterAction] = useState('');
  const [filterEntite, setFilterEntite] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterBoutique, setFilterBoutique] = useState('');
  const [boutiques, setBoutiques] = useState([]);

  useEffect(() => {
    if (boutiqueId) return;
    api.get('/superadmin/boutiques', { params: { limit: 200 } })
      .then(res => setBoutiques(res.data.data || []))
      .catch(() => {});
  }, [boutiqueId]);

  const fetchLogs = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 30 };
      if (boutiqueId) params.boutiqueId = boutiqueId;
      else if (filterBoutique) params.boutiqueId = filterBoutique;
      if (filterAction) params.action = filterAction;
      if (filterEntite) params.entite = filterEntite;
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;

      const res = await api.get('/superadmin/audit-logs', { params });
      setLogs(res.data.data || []);
      setPagination(res.data.pagination || { page: p, limit: 30, total: 0, totalPages: 0 });
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [boutiqueId, filterBoutique, filterAction, filterEntite, filterFrom, filterTo]);

  useEffect(() => {
    setPage(1);
    fetchLogs(1);
  }, [fetchLogs]);

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={filterAction}
          onChange={e => setFilterAction(e.target.value)}
          className="px-3 py-1.5 text-sm border rounded-lg border-gray-300 focus:outline-none focus:border-green-600"
        >
          <option value="">Toutes actions</option>
          {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select
          value={filterEntite}
          onChange={e => setFilterEntite(e.target.value)}
          className="px-3 py-1.5 text-sm border rounded-lg border-gray-300 focus:outline-none focus:border-green-600"
        >
          <option value="">Toutes entites</option>
          {ENTITES.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        {!boutiqueId && (
          <select
            value={filterBoutique}
            onChange={e => setFilterBoutique(e.target.value)}
            className="px-3 py-1.5 text-sm border rounded-lg border-gray-300 focus:outline-none focus:border-green-600"
          >
            <option value="">Toutes boutiques</option>
            {boutiques.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
          </select>
        )}
        <input
          type="date"
          value={filterFrom}
          onChange={e => setFilterFrom(e.target.value)}
          className="px-3 py-1.5 text-sm border rounded-lg border-gray-300 focus:outline-none focus:border-green-600"
        />
        <input
          type="date"
          value={filterTo}
          onChange={e => setFilterTo(e.target.value)}
          className="px-3 py-1.5 text-sm border rounded-lg border-gray-300 focus:outline-none focus:border-green-600"
        />
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Chargement...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-gray-400">Aucun log trouve</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Entite</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Message</th>
                {!boutiqueId && <th className="text-left px-4 py-3 font-medium text-gray-600">Boutique</th>}
                <th className="text-left px-4 py-3 font-medium text-gray-600">Utilisateur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map(log => {
                const actionColor = ACTION_COLORS[log.action] || { bg: '#F5F5F5', text: '#616161' };
                return (
                  <tr key={log.id} className="bg-white hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: actionColor.bg, color: actionColor.text }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {log.entite}{log.entiteId ? ` #${log.entiteId}` : ''}
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{log.message || '—'}</td>
                    {!boutiqueId && (
                      <td className="px-4 py-3 text-gray-600 text-xs">{log.boutique?.nom || '—'}</td>
                    )}
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {log.user ? `${log.user.prenom} ${log.user.nom}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            disabled={page <= 1}
            onClick={() => { const prev = page - 1; setPage(prev); fetchLogs(prev); }}
            className="px-3 py-1.5 text-sm border rounded disabled:opacity-40"
          >
            Precedent
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-600">{page} / {pagination.totalPages}</span>
          <button
            disabled={page >= pagination.totalPages}
            onClick={() => { const next = page + 1; setPage(next); fetchLogs(next); }}
            className="px-3 py-1.5 text-sm border rounded disabled:opacity-40"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}

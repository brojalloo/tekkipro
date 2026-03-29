import { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiXCircle, FiPackage, FiLogIn, FiLogOut, FiClock } from 'react-icons/fi';
import api from '../services/api';

const ACTION_CONFIG = {
  CREATE:       { icon: <FiPlus />,     color: '#1B5E20' },
  UPDATE:       { icon: <FiEdit2 />,    color: '#1565C0' },
  DELETE:       { icon: <FiTrash2 />,   color: '#D32F2F' },
  CANCEL:       { icon: <FiXCircle />,  color: '#E65100' },
  STOCK_ADJUST: { icon: <FiPackage />,  color: '#F9A825' },
};

function getActionConfig(action, entite) {
  if (entite === 'connexion') {
    return action === 'CANCEL'
      ? { icon: <FiLogOut />, color: '#546E7A' }
      : { icon: <FiLogIn />,  color: '#546E7A' };
  }
  return ACTION_CONFIG[action] || { icon: <FiClock />, color: '#888' };
}

function formatRelative(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "a l'instant";
  if (mins < 60) return `il y a ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `il y a ${days}j`;
}

const PERIODS = [
  { label: "Aujourd'hui", value: 'today' },
  { label: '7 derniers jours', value: '7d' },
  { label: '30 derniers jours', value: '30d' },
];

function getPeriodDates(period) {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  if (period === 'today') {
    return { startDate: end, endDate: end };
  }
  const days = period === '7d' ? 7 : 30;
  const start = new Date(now);
  start.setDate(start.getDate() - days + 1);
  return { startDate: start.toISOString().slice(0, 10), endDate: end };
}

export default function Activite() {
  const [period, setPeriod] = useState('7d');
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const { startDate, endDate } = getPeriodDates(period);
      const res = await api.get('/audit', {
        params: { startDate, endDate, page: p, limit: 20 },
      });
      setLogs(res.data.data || []);
      setPagination(res.data.pagination || { page: p, limit: 20, total: 0 });
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    setPage(1);
    fetchLogs(1);
  }, [period, fetchLogs]);

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <FiClock size={22} className="text-gray-600" />
        <h1 className="text-xl font-semibold text-gray-800">Activite</h1>
      </div>

      {/* Filtre periode */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              period === p.value
                ? 'bg-green-800 text-white border-green-800'
                : 'bg-white text-gray-600 border-gray-300 hover:border-green-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Chargement...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FiClock size={40} className="mx-auto mb-3 opacity-40" />
          <p>Aucune activite sur cette periode</p>
        </div>
      ) : (
        <div className="space-y-1">
          {logs.map(log => {
            const { icon, color } = getActionConfig(log.action, log.entite);
            return (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-white border border-gray-100 hover:border-gray-200"
              >
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                  style={{ backgroundColor: color }}
                >
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">{log.message}</p>
                  {log.utilisateur && (
                    <p className="text-xs text-gray-500 mt-0.5">{log.utilisateur.nom}</p>
                  )}
                </div>
                <span className="flex-shrink-0 text-xs text-gray-400 mt-0.5 whitespace-nowrap">
                  {formatRelative(log.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            disabled={page <= 1}
            onClick={() => { const prev = page - 1; setPage(prev); fetchLogs(prev); }}
            className="px-3 py-1.5 text-sm border rounded disabled:opacity-40"
          >
            Precedent
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-600">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
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

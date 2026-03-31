import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiShield } from 'react-icons/fi';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import api from '../services/api';

function formatFCFA(n) {
  return Number(n).toLocaleString('fr-FR') + ' FCFA';
}

function buildMonthSeries(parMois) {
  const now = new Date();
  const result = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const found = parMois.find(m => m.mois === key);
    result.push({
      mois: new Date(key + '-01').toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
      montant: found ? found.montant : 0,
    });
  }
  return result;
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-xl font-bold text-gray-800">{value}</div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/superadmin/dashboard')
      .then(res => setData(res.data.data))
      .catch((err) => console.error('[SuperAdminDashboard]', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <FiShield size={22} className="text-gray-600" />
        <h1 className="text-xl font-semibold text-gray-800">Super-Admin — Tableau de bord</h1>
      </div>
      <div className="text-gray-500">Chargement...</div>
    </div>
  );
  if (!data) return <div className="p-4 text-red-600">Erreur de chargement des donnees.</div>;

  const chartData = buildMonthSeries(data.revenus.parMois);

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <FiShield size={22} className="text-gray-600" />
        <h1 className="text-xl font-semibold text-gray-800">Super-Admin — Tableau de bord</h1>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => navigate('/app/superadmin')}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Boutiques
          </button>
          <button
            onClick={() => navigate('/app/superadmin/logs')}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            {"Logs d'audit"}
          </button>
        </div>
      </div>

      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Boutiques</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <StatCard label="Total" value={data.boutiques.total} />
        <StatCard label="Actives" value={data.boutiques.actives} />
        <StatCard label="Suspendues" value={data.boutiques.suspendues} />
        <StatCard label="Nouveaux ce mois" value={data.boutiques.nouveauxCeMois} />
      </div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Starter (Gratuit)" value={data.boutiques.parPlan.GRATUIT} />
        <StatCard label="Pro" value={data.boutiques.parPlan.PRO} />
        <StatCard label="Business" value={data.boutiques.parPlan.BUSINESS} />
      </div>

      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Utilisateurs</p>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard
          label="Total / Actifs"
          value={`${data.utilisateurs.total} / ${data.utilisateurs.actifs}`}
        />
        <StatCard
          label="Admins / Employes"
          value={`${data.utilisateurs.parRole.ADMIN} / ${data.utilisateurs.parRole.EMPLOYE}`}
        />
      </div>

      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Revenus</p>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="MRR theorique" value={formatFCFA(data.revenus.mrr)} />
        <StatCard label="Total encaisse" value={formatFCFA(data.revenus.totalEncaisse)} />
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Encaisse par plan</div>
          <div className="text-sm font-semibold text-blue-700">Pro : {formatFCFA(data.revenus.parPlan.PRO)}</div>
          <div className="text-sm font-semibold text-yellow-700">Business : {formatFCFA(data.revenus.parPlan.BUSINESS)}</div>
        </div>
      </div>

      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
        Revenus encaisses — 12 derniers mois
      </p>
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v.toLocaleString('fr-FR')} />
            <Tooltip formatter={(v) => [formatFCFA(v), 'Encaisse']} />
            <Bar dataKey="montant" fill="#1565C0" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

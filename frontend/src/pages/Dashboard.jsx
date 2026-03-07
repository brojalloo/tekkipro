import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  FiShoppingCart, FiDollarSign, FiTrendingUp, FiAlertTriangle,
  FiUsers, FiPackage, FiArrowRight, FiBarChart2, FiAward,
  FiSun, FiMoon, FiSunrise, FiCalendar, FiActivity,
  FiStar, FiShield, FiZap, FiArrowUpRight
} from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatLimit } from '../config/planConfig';
import './Dashboard.css';

export default function Dashboard() {
  const { user, boutique, isAdmin, plan, planLimits } = useAuth();
  const [stats, setStats] = useState(null);
  const [topProduits, setTopProduits] = useState([]);
  const [ventesGraph, setVentesGraph] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [dashRes, topRes, graphRes] = await Promise.all([
        api.get('/statistiques/dashboard'),
        api.get('/statistiques/top-produits?periode=mois'),
        api.get('/statistiques/ventes-par-jour?jours=14'),
      ]);
      setStats(dashRes.data.data);
      setTopProduits(topRes.data.data);
      setVentesGraph(graphRes.data.data);
    } catch (error) {
      console.error('Erreur dashboard:', error);
      toast.error('Erreur de chargement du tableau de bord');
    } finally { setLoading(false); }
  };

  const formatCFA = (amount) => new Intl.NumberFormat('fr-FR').format(Math.round(amount || 0)) + ' FCFA';

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return { text: 'Bonjour', icon: <FiSunrise size={22} /> };
    if (h < 18) return { text: 'Bon après-midi', icon: <FiSun size={22} /> };
    return { text: 'Bonsoir', icon: <FiMoon size={22} /> };
  };

  const g = greeting();

  if (loading) return (
    <div className="db-loading">
      <div className="db-loading-spinner" />
      <p>Chargement du tableau de bord…</p>
    </div>
  );

  return (
    <div className="db-page">
      {/* Header */}
      <div className="db-header">
        <div className="db-header-bg" />
        <div className="db-header-content">
          <div className="db-header-left">
            <div className="db-header-icon">{g.icon}</div>
            <div>
              <h1>{g.text}, {user?.prenom}</h1>
              <p>
                <FiCalendar size={13} />
                {boutique?.nom} — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <Link to="/app/ventes/nouvelle" className="db-btn-vente">
            <FiShoppingCart size={17} /> Nouvelle Vente
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      <div className="db-stats">
        <div className="db-stat-card">
          <div className="db-stat-icon blue"><FiShoppingCart size={22} /></div>
          <div className="db-stat-info">
            <span className="db-stat-value">{formatCFA(stats?.ventesJour?.total)}</span>
            <span className="db-stat-label">Ventes du jour ({stats?.ventesJour?.nombre || 0})</span>
          </div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-icon green"><FiDollarSign size={22} /></div>
          <div className="db-stat-info">
            <span className="db-stat-value">{formatCFA(stats?.ventesMois?.total)}</span>
            <span className="db-stat-label">Ventes du mois ({stats?.ventesMois?.nombre || 0})</span>
          </div>
        </div>
        {isAdmin && (
          <div className="db-stat-card">
            <div className="db-stat-icon emerald"><FiTrendingUp size={22} /></div>
            <div className="db-stat-info">
              <span className="db-stat-value db-profit">{formatCFA(stats?.beneficeJour)}</span>
              <span className="db-stat-label">Bénéfice du jour</span>
            </div>
          </div>
        )}
        {isAdmin && (
          <div className="db-stat-card">
            <div className="db-stat-icon emerald"><FiTrendingUp size={22} /></div>
            <div className="db-stat-info">
              <span className="db-stat-value db-profit">{formatCFA(stats?.beneficeMois)}</span>
              <span className="db-stat-label">Bénéfice du mois</span>
            </div>
          </div>
        )}
        <div className="db-stat-card">
          <div className="db-stat-icon red"><FiDollarSign size={22} /></div>
          <div className="db-stat-info">
            <span className="db-stat-value db-debt">{formatCFA(stats?.dettes?.total)}</span>
            <span className="db-stat-label">Dettes ({stats?.dettes?.nombre || 0})</span>
          </div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-icon amber"><FiAlertTriangle size={22} /></div>
          <div className="db-stat-info">
            <span className="db-stat-value">{stats?.alertesStock || 0}</span>
            <span className="db-stat-label">Alertes stock</span>
          </div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-icon indigo"><FiPackage size={22} /></div>
          <div className="db-stat-info">
            <span className="db-stat-value">{stats?.totalProduits || 0}</span>
            <span className="db-stat-label">Produits actifs</span>
          </div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-icon teal"><FiUsers size={22} /></div>
          <div className="db-stat-info">
            <span className="db-stat-value">{stats?.totalClients || 0}</span>
            <span className="db-stat-label">Clients</span>
          </div>
        </div>
      </div>

      {/* Plan Info Widget */}
      {isAdmin && (
        <div className="db-plan-widget">
          <div className="db-plan-widget-left">
            <div className={`db-plan-icon plan-${plan.toLowerCase()}`}>
              {plan === 'GRATUIT' ? <FiZap size={18} /> : plan === 'PRO' ? <FiStar size={18} /> : <FiShield size={18} />}
            </div>
            <div className="db-plan-info">
              <span className="db-plan-label">Plan actuel</span>
              <strong className="db-plan-name">{planLimits.nom}</strong>
            </div>
          </div>
          <div className="db-plan-limits">
            <span><FiPackage size={12} /> {formatLimit(planLimits.produits)} produits</span>
            <span><FiUsers size={12} /> {formatLimit(planLimits.utilisateurs)} utilisateurs</span>
            <span><FiShoppingCart size={12} /> {formatLimit(planLimits.ventesParMois)} ventes/mois</span>
          </div>
          {plan === 'GRATUIT' && (
            <Link to="/app/abonnement" className="db-plan-upgrade-btn">
              <FiArrowUpRight size={14} /> Upgrade
            </Link>
          )}
        </div>
      )}

      {/* Chart + Top Produits */}
      <div className="db-bottom">
        <div className="db-chart-card">
          <div className="db-card-header">
            <div className="db-card-title">
              <FiBarChart2 size={18} />
              <h3>Ventes des 14 derniers jours</h3>
            </div>
            <Link to="/app/ventes" className="db-card-link">
              Voir tout <FiArrowRight size={14} />
            </Link>
          </div>
          <div className="db-chart-wrap">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ventesGraph}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip
                  formatter={(v) => formatCFA(v)}
                  labelFormatter={(v) => new Date(v).toLocaleDateString('fr-FR')}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontSize: '0.82rem', fontWeight: 600 }}
                />
                <Bar dataKey="total" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="db-top-card">
          <div className="db-card-header">
            <div className="db-card-title">
              <FiAward size={18} />
              <h3>Top Produits</h3>
            </div>
            <span className="db-card-period">Ce mois-ci</span>
          </div>
          {topProduits.length === 0 ? (
            <div className="db-empty-top">
              <FiActivity size={32} />
              <p>Aucune vente ce mois</p>
            </div>
          ) : (
            <div className="db-top-list">
              {topProduits.slice(0, 7).map((p, i) => (
                <div key={i} className="db-top-item">
                  <div className="db-top-left">
                    <span className={`db-rank ${i < 3 ? 'top' : ''}`}>{i + 1}</span>
                    <div className="db-top-info">
                      <strong>{p.produit}</strong>
                      <span>{p.quantiteVendue} {p.unite} vendus</span>
                    </div>
                  </div>
                  <div className="db-top-ca">{formatCFA(p.chiffreAffaires)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

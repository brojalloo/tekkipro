import { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
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
import UsageMeter from '../components/UsageMeter';

export default function Dashboard() {
  const { user, boutique, isAdmin, plan, planLimits, planUsage } = useAuth();
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
      if (import.meta.env.DEV) console.error('Erreur dashboard:', error);
      toast.error('Erreur de chargement du tableau de bord');
    } finally { setLoading(false); }
  };

  const formatCFA = (amount) => new Intl.NumberFormat('fr-FR').format(Math.round(amount || 0)) + ' FCFA';
  const formatQuantity = (quantity) => new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(quantity || 0);

  const normalizeUnitLabel = (label) => {
    const normalizedLabels = {
      kilogramme: '1 kg',
      '500 grammes': '500 g',
      '250 grammes': '250 g',
      '100 grammes': '100 g',
      litre: '1 L',
      '1/2 litre': '1/2 L',
      '1/4 litre': '1/4 L',
      '1/8 litre': '1/8 L',
    };

    return normalizedLabels[label?.trim().toLowerCase()] || label?.trim() || '';
  };

  const formatBaseUnitName = (unit, quantity) => {
    if (unit === 'piece') return quantity > 1 ? 'pieces' : 'piece';
    return unit;
  };

  const pluralizeCommercialLabel = (label, quantity) => {
    if (quantity <= 1) return label;

    const [firstWord, ...rest] = label.split(' ');
    const plurals = {
      Bidon: 'Bidons',
      Sac: 'Sacs',
      Carton: 'Cartons',
      Bouteille: 'Bouteilles',
      Paquet: 'Paquets',
      Lot: 'Lots',
    };

    return [plurals[firstWord] || `${firstWord}s`, ...rest].join(' ');
  };

  const isSizedUnitLabel = (label) => /^(?:[0-9]+\/[0-9]+|[0-9]+(?:[.,][0-9]+)?)\s*/.test(label);

  const formatUnitBreakdown = (item, baseUnit) => {
    const quantity = Number(item?.quantite || 0);
    const label = normalizeUnitLabel(item?.unite);
    const lowerLabel = label.toLowerCase();
    const isBaseLike = lowerLabel === baseUnit.toLowerCase() || lowerLabel === 'unité' || lowerLabel === 'unite';

    if (isBaseLike) {
      return `${formatQuantity(quantity)} ${formatBaseUnitName(baseUnit, quantity)}`;
    }

    if (quantity === 1 && isSizedUnitLabel(label)) {
      return label;
    }

    if (isSizedUnitLabel(label)) {
      return `${formatQuantity(quantity)} × ${label}`;
    }

    return `${formatQuantity(quantity)} ${pluralizeCommercialLabel(label, quantity)}`;
  };

  const formatTopProduitQuantities = (produit) => {
    const quantitesParUnite = [...(produit.quantitesParUnite || [])].sort((a, b) => {
      if ((b.quantiteBase || 0) !== (a.quantiteBase || 0)) return (b.quantiteBase || 0) - (a.quantiteBase || 0);
      return (b.quantite || 0) - (a.quantite || 0);
    });

    if (quantitesParUnite.length === 0) {
      return `${formatQuantity(produit.quantiteVendue)} ${formatBaseUnitName(produit.unite, produit.quantiteVendue)} vendus`;
    }

    const breakdown = quantitesParUnite
      .slice(0, 4)
      .map((item) => formatUnitBreakdown(item, produit.unite))
      .join(' + ');

    const moreUnits = quantitesParUnite.length > 4 ? ` + ${quantitesParUnite.length - 4} autres` : '';

    return `${breakdown}${moreUnits} vendus`;
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return { text: 'Bonjour', icon: <FiSunrise size={22} /> };
    if (h < 18) return { text: 'Bon après-midi', icon: <FiSun size={22} /> };
    return { text: 'Bonsoir', icon: <FiMoon size={22} /> };
  };

  const g = greeting();

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin" />
      <p>Chargement du tableau de bord…</p>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-64px)] bg-transparent flex flex-col gap-5 p-4 md:p-6 lg:p-8 font-sans">
      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-[#FFD600] to-[#F9A825] text-[#071C08] rounded-2xl shadow-md shadow-[#FFD600]/20 shrink-0 text-xl">
            {g.icon}
          </div>
          <div>
            <h1 className="text-[1.5rem] font-extrabold text-foreground tracking-tight m-0 leading-tight" style={{fontFamily:'Sora,sans-serif'}}>
              {g.text}, {user?.prenom}
            </h1>
            <p className="flex items-center gap-1.5 text-[0.78rem] font-medium text-muted-foreground mt-1 mb-0">
              <FiCalendar size={11} />
              {boutique?.nom} — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        <Link to="/app/ventes/nouvelle" className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#1B5E20] text-white rounded-[14px] text-[0.88rem] font-bold shadow-md shadow-[#1B5E20]/20 hover:bg-[#155230] hover:-translate-y-0.5 hover:shadow-lg transition-all" style={{fontFamily:'Sora,sans-serif'}}>
          <FiShoppingCart size={16} /> Nouvelle Vente
        </Link>
      </div>
      <div className="h-px bg-gradient-to-r from-[#1B5E20]/15 via-[#FFD600]/10 to-transparent" />

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Ventes du jour */}
        <div className="relative flex flex-col gap-3 p-5 bg-gradient-to-br from-[#1B5E20] to-[#0D3B14] border border-[#1B5E20]/50 rounded-[22px] shadow-lg shadow-[#1B5E20]/20 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#1B5E20]/30 transition-all overflow-hidden group">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,214,0,0.12),transparent_60%)] pointer-events-none" />
          <div className="flex items-center justify-between">
            <div className="w-[42px] h-[42px] flex items-center justify-center rounded-xl shrink-0 bg-white/15 text-white"><FiShoppingCart size={20} /></div>
            <span className="text-[0.72rem] font-bold text-white/50 uppercase tracking-widest">{stats?.ventesJour?.nombre || 0} ventes</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[1.35rem] font-extrabold text-white tracking-tight truncate" style={{fontFamily:'Sora,sans-serif'}}>{formatCFA(stats?.ventesJour?.total)}</span>
            <span className="text-[0.78rem] font-semibold text-white/60 truncate">Ventes du jour</span>
          </div>
        </div>

        {/* Ventes du mois */}
        <div className="relative flex flex-col gap-3 p-5 bg-gradient-to-br from-white to-slate-50 border border-[#1B5E20]/15 rounded-[22px] shadow-lg shadow-slate-200/40 hover:-translate-y-1 hover:shadow-xl transition-all overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(27,94,32,0.05),transparent_60%)] pointer-events-none" />
          <div className="flex items-center justify-between">
            <div className="w-[42px] h-[42px] flex items-center justify-center rounded-xl shrink-0 bg-[#1B5E20]/10 text-[#1B5E20]"><FiDollarSign size={20} /></div>
            <span className="text-[0.72rem] font-bold text-muted-foreground uppercase tracking-widest">{stats?.ventesMois?.nombre || 0} ventes</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[1.35rem] font-extrabold text-foreground tracking-tight truncate" style={{fontFamily:'Sora,sans-serif'}}>{formatCFA(stats?.ventesMois?.total)}</span>
            <span className="text-[0.78rem] font-semibold text-muted-foreground truncate">Ventes du mois</span>
          </div>
        </div>

        {isAdmin && (
          <div className="relative flex flex-col gap-3 p-5 bg-gradient-to-br from-[#FFD600] to-[#F9A825] border border-[#FFD600]/50 rounded-[22px] shadow-lg shadow-[#FFD600]/20 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#FFD600]/30 transition-all overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.3),transparent_60%)] pointer-events-none" />
            <div className="flex items-center justify-between">
              <div className="w-[42px] h-[42px] flex items-center justify-center rounded-xl shrink-0 bg-black/10 text-[#1B5E20]"><FiTrendingUp size={20} /></div>
              <span className="text-[0.72rem] font-bold text-[#5D4037]/60 uppercase tracking-widest">Aujourd&apos;hui</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[1.35rem] font-extrabold text-[#1B3300] tracking-tight truncate" style={{fontFamily:'Sora,sans-serif'}}>{formatCFA(stats?.beneficeJour)}</span>
              <span className="text-[0.78rem] font-semibold text-[#5D4037]/70 truncate">Bénéfice du jour</span>
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="relative flex flex-col gap-3 p-5 bg-gradient-to-br from-white to-slate-50 border border-[#1B5E20]/15 rounded-[22px] shadow-lg shadow-slate-200/40 hover:-translate-y-1 hover:shadow-xl transition-all overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="w-[42px] h-[42px] flex items-center justify-center rounded-xl shrink-0 bg-[#1B5E20]/10 text-[#1B5E20]"><FiTrendingUp size={20} /></div>
              <span className="text-[0.72rem] font-bold text-muted-foreground uppercase tracking-widest">Ce mois</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[1.35rem] font-extrabold text-[#155230] tracking-tight truncate" style={{fontFamily:'Sora,sans-serif'}}>{formatCFA(stats?.beneficeMois)}</span>
              <span className="text-[0.78rem] font-semibold text-muted-foreground truncate">Bénéfice du mois</span>
            </div>
          </div>
        )}

        {/* Dettes */}
        <div className="relative flex flex-col gap-3 p-5 bg-gradient-to-br from-[#D32F2F] to-[#B71C1C] border border-[#D32F2F]/40 rounded-[22px] shadow-lg shadow-[#D32F2F]/20 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#D32F2F]/30 transition-all overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_60%)] pointer-events-none" />
          <div className="flex items-center justify-between">
            <div className="w-[42px] h-[42px] flex items-center justify-center rounded-xl shrink-0 bg-white/15 text-white"><FiDollarSign size={20} /></div>
            <span className="text-[0.72rem] font-bold text-white/50 uppercase tracking-widest">{stats?.dettes?.nombre || 0} clients</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[1.35rem] font-extrabold text-white tracking-tight truncate" style={{fontFamily:'Sora,sans-serif'}}>{formatCFA(stats?.dettes?.total)}</span>
            <span className="text-[0.78rem] font-semibold text-white/60 truncate">Crédits / Dettes</span>
          </div>
        </div>

        {/* Alertes stock */}
        <div className="relative flex flex-col gap-3 p-5 bg-gradient-to-br from-white to-amber-50/50 border border-amber-200/60 rounded-[22px] shadow-lg shadow-slate-200/40 hover:-translate-y-1 hover:shadow-xl transition-all overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-[42px] h-[42px] flex items-center justify-center rounded-xl shrink-0 bg-amber-400/15 text-amber-600"><FiAlertTriangle size={20} /></div>
            <span className="text-[0.72rem] font-bold text-muted-foreground uppercase tracking-widest">Stock</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[1.35rem] font-extrabold text-amber-700 tracking-tight truncate" style={{fontFamily:'Sora,sans-serif'}}>{stats?.alertesStock || 0}</span>
            <span className="text-[0.78rem] font-semibold text-muted-foreground truncate">Alertes stock</span>
          </div>
        </div>

      </div>

      {planUsage && plan === 'GRATUIT' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-white border border-border/60 rounded-2xl">
          <UsageMeter
            label="Ventes ce mois"
            used={planUsage.ventesParMois?.used ?? 0}
            limit={planUsage.ventesParMois?.limit ?? null}
          />
          <UsageMeter
            label="Produits actifs"
            used={planUsage.produits?.used ?? 0}
            limit={planUsage.produits?.limit ?? null}
          />
          <UsageMeter
            label="Clients"
            used={planUsage.clients?.used ?? 0}
            limit={planUsage.clients?.limit ?? null}
          />
        </div>
      )}

      {/* Plan Info Widget */}
      {isAdmin && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 md:px-6 bg-gradient-to-b from-white to-blue-50/30 border border-border/80 rounded-[20px] shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center ${plan === 'GRATUIT' ? 'bg-muted text-muted-foreground' : plan === 'PRO' ? 'bg-primary/10 text-primary' : 'bg-[#d4af37]/10 text-[#d4af37]'} shrink-0`} >
              {plan === 'GRATUIT' ? <FiZap size={18} /> : plan === 'PRO' ? <FiStar size={18} /> : <FiShield size={18} />}
            </div>
            <div className="flex flex-col">
              <span className="text-[0.65rem] font-extrabold text-muted-foreground uppercase tracking-widest">Plan actuel</span>
              <strong className="text-base font-extrabold text-foreground leading-none">{planLimits.nom}</strong>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 flex-1 md:justify-center">
            <span className="inline-flex items-center gap-1.5 text-[0.8rem] font-bold text-muted-foreground"><FiPackage size={12} /> {formatLimit(planLimits.produits)} produits</span>
            <span className="inline-flex items-center gap-1.5 text-[0.8rem] font-bold text-muted-foreground"><FiUsers size={12} /> {formatLimit(planLimits.utilisateurs)} utilisateurs</span>
            <span className="inline-flex items-center gap-1.5 text-[0.8rem] font-bold text-muted-foreground"><FiShoppingCart size={12} /> {formatLimit(planLimits.ventesParMois)} ventes/mois</span>
          </div>
          {plan === 'GRATUIT' && (
            <Link to="/app/abonnement" className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-br from-accent to-secondary text-white text-[0.8rem] font-bold shadow-md shadow-accent/20 hover:-translate-y-0.5 hover:shadow-lg transition-all">
              <FiArrowUpRight size={14} /> Upgrade
            </Link>
          )}
        </div>
      )}

      {/* Chart + Top Produits */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
        <div className="relative p-6 bg-gradient-to-br from-white to-slate-50/80 border border-border/70 rounded-[28px] shadow-lg shadow-slate-200/40 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#1B5E20] to-transparent opacity-50" />
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#1B5E20]/10 text-[#1B5E20]"><FiBarChart2 size={16} /></div>
              <h3 className="text-base font-extrabold text-foreground m-0" style={{fontFamily:'Sora,sans-serif'}}>Ventes — 14 derniers jours</h3>
            </div>
            <Link to="/app/ventes" className="flex items-center gap-1.5 text-[0.82rem] font-bold text-[#1B5E20] bg-[#1B5E20]/8 px-3 py-1.5 rounded-xl hover:bg-[#1B5E20]/15 transition-all">
              Voir tout <FiArrowRight size={13} />
            </Link>
          </div>
          <div className="-mx-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ventesGraph}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(130,126,119,0.15)" />
                <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} tick={{ fontSize: 11, fill: '#a8a49c', fontFamily: 'DM Sans' }} />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#a8a49c', fontFamily: 'DM Sans' }} />
                <Tooltip
                  formatter={(v) => [formatCFA(v), 'Ventes']}
                  labelFormatter={(v) => new Date(v).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                  contentStyle={{ borderRadius: '14px', border: '1px solid rgba(27,94,32,0.15)', boxShadow: '0 12px 32px rgba(0,0,0,0.1)', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'DM Sans' }}
                  cursor={{ fill: 'rgba(27,94,32,0.06)', radius: 8 }}
                />
                <Bar dataKey="total" fill="url(#barGradientGreen)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="barGradientGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1B5E20" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#2E7D32" stopOpacity={0.5} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="relative p-6 bg-gradient-to-br from-white to-slate-50/80 border border-border/70 rounded-[28px] shadow-lg shadow-slate-200/40 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#FFD600] to-transparent opacity-70" />
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#FFD600]/15 text-[#B8860B]"><FiAward size={16} /></div>
              <h3 className="text-[1rem] font-extrabold text-foreground m-0" style={{fontFamily:'Sora,sans-serif'}}>Top Produits</h3>
            </div>
            <span className="text-[0.72rem] font-bold text-muted-foreground bg-muted/80 px-3 py-1 rounded-lg border border-border/50">Ce mois-ci</span>
          </div>
          {topProduits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/40">
              <FiActivity size={32} />
              <p className="text-[0.9rem] font-semibold text-muted-foreground mt-3">Aucune vente ce mois</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {topProduits.slice(0, 7).map((p, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-muted/40 last:border-0 hover:bg-[#1B5E20]/4 hover:translate-x-1 transition-all rounded-2xl px-2 group">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className={`w-[26px] h-[26px] flex items-center justify-center rounded-lg text-[0.7rem] font-extrabold shrink-0 ${
                      i === 0 ? 'bg-[#FFD600] text-[#071C08] shadow-sm shadow-[#FFD600]/30' :
                      i === 1 ? 'bg-[#1B5E20] text-white shadow-sm shadow-[#1B5E20]/30' :
                      i === 2 ? 'bg-[#D32F2F] text-white shadow-sm shadow-[#D32F2F]/20' :
                      'bg-muted text-muted-foreground'
                    }`} style={{fontFamily:'Sora,sans-serif'}}>{i + 1}</span>
                    <div className="flex flex-col min-w-0">
                      <strong className="text-[0.88rem] font-semibold text-foreground truncate block">{p.produit}</strong>
                      <span className="text-[0.73rem] font-medium text-muted-foreground truncate block pt-0.5">
                        {formatTopProduitQuantities(p)} · {p.nombreVentes} vente{p.nombreVentes > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="text-[0.88rem] font-extrabold font-mono text-[#1B5E20] ml-3 shrink-0">{formatCFA(p.chiffreAffaires)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

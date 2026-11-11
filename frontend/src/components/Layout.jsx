import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useState, useEffect, Fragment } from 'react';
import ProBadge from './ProBadge';
import {
  FiHome, FiPackage, FiShoppingCart, FiUsers, FiTruck,
  FiDatabase, FiDollarSign, FiUserCheck, FiSettings, FiLogOut, FiShield, FiUser, FiCreditCard,
  FiGrid, FiChevronDown, FiCheck, FiLock, FiMenu, FiChevronsLeft, FiChevronsRight, FiX,
  FiBarChart2, FiAlertTriangle, FiClock
} from 'react-icons/fi';

export default function Layout() {
  const { user, boutique, logout, isAdmin, isPro, isBusiness, plan, mesBoutiques, activeBoutique, switchBoutique, getActiveBoutiqueName } = useAuth();
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const normalizedPlan = (plan || 'GRATUIT').toLowerCase();
  const planLabel = plan === 'GRATUIT' ? 'Starter' : plan === 'PRO' ? 'Pro' : 'Business';
  const showExpandedSidebarContent = !collapsed || mobileOpen;

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', collapsed);
  }, [collapsed]);

  useEffect(() => {
    if (!mobileOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
        setShowSwitcher(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleCollapse = () => {
    setCollapsed(prev => !prev);
  };

  const toggleMobile = () => {
    setMobileOpen(prev => !prev);
  };

  const currentBoutiqueId = activeBoutique || boutique?.id;

  const navItems = user?.role === 'SUPERADMIN' ? [
    { to: '/app/superadmin', icon: <FiShield />, label: 'Super-Admin' },
  ] : [
    { to: '/app', icon: <FiHome />, label: 'Tableau de bord', end: true },
    { to: '/app/ventes/nouvelle', icon: <FiShoppingCart />, label: 'Nouvelle Vente', sectionBefore: 'Ventes' },
    { to: '/app/ventes', icon: <FiBarChart2 />, label: 'Ventes' },
    { to: '/app/produits', icon: <FiPackage />, label: 'Produits', sectionBefore: 'Catalogue' },
    { to: '/app/stock', icon: <FiDatabase />, label: 'Stock' },
    { to: '/app/clients', icon: <FiUsers />, label: 'Clients', sectionBefore: 'Clients' },
    { to: '/app/dettes', icon: <FiAlertTriangle />, label: 'Crédits / Dettes' },
    ...(isAdmin ? [
      ...(isPro ? [{ to: '/app/fournisseurs', icon: <FiTruck />, label: 'Fournisseurs', sectionBefore: 'Administration' }] : [{ to: '/app/fournisseurs', icon: <FiTruck />, label: 'Fournisseurs', locked: true, sectionBefore: 'Administration' }]),
      ...(isPro ? [{ to: '/app/employes', icon: <FiUserCheck />, label: 'Employés' }] : [{ to: '/app/employes', icon: <FiUserCheck />, label: 'Employés', locked: true }]),
      { to: '/app/activite', icon: <FiClock />, label: 'Activité' },
      { to: '/app/parametres', icon: <FiSettings />, label: 'Paramètres' },
      { to: '/app/abonnement', icon: <FiCreditCard />, label: 'Abonnement' },
      ...(isBusiness ? [{ to: '/app/boutiques', icon: <FiGrid />, label: 'Mes Boutiques' }] : [{ to: '/app/boutiques', icon: <FiGrid />, label: 'Mes Boutiques', locked: true, requiredPlan: 'BUSINESS' }]),
    ] : []),
  ];

  const handleSwitchBoutique = (id) => {
    switchBoutique(id);
    setShowSwitcher(false);
    window.location.reload(); // Recharger pour actualiser toutes les données
  };

  return (
    <div className={`app-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <a href="#main-content" className="skip-link">Aller au contenu principal</a>

      {/* Mobile overlay */}
      {mobileOpen && <div className="sidebar-overlay" aria-hidden="true" onClick={() => { setMobileOpen(false); setShowSwitcher(false); }} />}
      
      {/* Mobile hamburger */}
      <button className={`mobile-menu-btn ${mobileOpen ? 'menu-open' : ''}`} onClick={toggleMobile} aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={mobileOpen} aria-controls="app-sidebar">
        {mobileOpen ? <FiX size={22} /> : <FiMenu size={22} />}
      </button>

      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`} id="app-sidebar" aria-label="Menu latéral principal">
        {/* Collapse toggle button (desktop) */}
        <button className="sidebar-toggle" onClick={toggleCollapse} title={collapsed ? 'Ouvrir le menu' : 'Réduire le menu'} aria-label={collapsed ? 'Ouvrir le menu' : 'Réduire le menu'}>
          {collapsed ? <FiChevronsRight size={16} /> : <FiChevronsLeft size={16} />}
        </button>

        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-mark">T</div>
            {showExpandedSidebarContent && (
              <div className="sidebar-brand-copy">
                <h1>TekkiPro</h1>
              </div>
            )}
          </div>

          {showExpandedSidebarContent && user?.role !== 'SUPERADMIN' && (
            <div className={`sidebar-plan-badge plan-${normalizedPlan}`}>
              {planLabel}
            </div>
          )}

          {showExpandedSidebarContent && (
            <div className="sidebar-context-card">
              <span className="sidebar-context-label">Espace actif</span>
              {isAdmin && isBusiness && mesBoutiques.length > 1 ? (
                <div className="boutique-switcher">
                  <button className="boutique-switcher-btn" onClick={() => setShowSwitcher(!showSwitcher)} aria-label="Changer de boutique" aria-expanded={showSwitcher} aria-controls="boutique-switcher-dropdown">
                    <span>{getActiveBoutiqueName()}</span>
                    <FiChevronDown className={showSwitcher ? 'rotated' : ''} />
                  </button>
                  {showSwitcher && (
                    <div className="boutique-switcher-dropdown" id="boutique-switcher-dropdown" role="listbox" aria-label="Sélection de boutique">
                      {mesBoutiques.map(b => (
                        <button
                          key={b.id}
                          className={`boutique-switcher-item ${b.id === currentBoutiqueId ? 'active' : ''}`}
                          onClick={() => handleSwitchBoutique(b.id)}
                          role="option"
                          aria-selected={b.id === currentBoutiqueId}
                        >
                          <span>{b.nom}</span>
                          {b.id === currentBoutiqueId && <FiCheck />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p>{boutique?.nom || 'Ma Boutique'}</p>
              )}
            </div>
          )}
        </div>

        <nav className="sidebar-nav" aria-label="Navigation principale">
          {navItems.map(item => (
            <Fragment key={item.to}>
              {item.sectionBefore && showExpandedSidebarContent && (
                <span className="sidebar-section-label">{item.sectionBefore}</span>
              )}
              {item.locked ? (
                <Link
                  to="/app/abonnement"
                  className="nav-locked"
                  title={`${item.label} · forfait ${item.requiredPlan || 'PRO'}`}
                  aria-label={`${item.label}, disponible avec le forfait ${item.requiredPlan || 'PRO'}`}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.icon}
                  <span className="nav-label">{item.label}</span>
                  <ProBadge
                    variant={showExpandedSidebarContent ? 'label' : 'icon-only'}
                    requiredPlan={item.requiredPlan}
                    className={showExpandedSidebarContent ? 'ml-auto' : undefined}
                    asLink={false}
                  />
                </Link>
              ) : (
                <NavLink to={item.to} end={item.end}
                  className={({ isActive }) => isActive ? 'active' : ''}
                  title={!showExpandedSidebarContent ? item.label : undefined}
                  onClick={() => setMobileOpen(false)}>
                  {item.icon}
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              )}
            </Fragment>
          ))}
        </nav>

        <div className="sidebar-footer">
          {showExpandedSidebarContent && (
            <div className="user-info">
              <div className="user-avatar">{user?.prenom?.[0] || user?.nom?.[0] || 'T'}</div>
              <div className="user-meta">
                <div className="name">{user?.prenom} {user?.nom}</div>
                <div className="role">{user?.role === 'SUPERADMIN' ? <><FiShield size={12} /> Super-Admin</> : user?.role === 'ADMIN' ? <><FiShield size={12} /> Administrateur</> : <><FiUser size={12} /> Employé</>}</div>
              </div>
            </div>
          )}
          <button className="btn-logout" onClick={logout} title="Déconnexion" aria-label="Se déconnecter">
            <FiLogOut aria-hidden="true" />
          </button>
        </div>
      </aside>

      <main className="main-content" id="main-content" tabIndex="-1">
        <div className="main-shell">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

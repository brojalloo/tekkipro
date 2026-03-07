import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import {
  FiHome, FiPackage, FiShoppingCart, FiUsers, FiTruck,
  FiDatabase, FiDollarSign, FiUserCheck, FiSettings, FiLogOut, FiShield, FiUser, FiCreditCard,
  FiGrid, FiChevronDown, FiCheck, FiLock, FiMenu, FiChevronsLeft, FiChevronsRight, FiX
} from 'react-icons/fi';

export default function Layout() {
  const { user, boutique, logout, isAdmin, isPro, isBusiness, plan, mesBoutiques, activeBoutique, switchBoutique, getActiveBoutiqueName } = useAuth();
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', collapsed);
  }, [collapsed]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, []);

  const toggleCollapse = () => {
    setCollapsed(prev => !prev);
  };

  const toggleMobile = () => {
    setMobileOpen(prev => !prev);
  };

  const currentBoutiqueId = activeBoutique || boutique?.id;

  const navItems = [
    { to: '/app', icon: <FiHome />, label: 'Tableau de bord', end: true },
    { to: '/app/ventes/nouvelle', icon: <FiShoppingCart />, label: 'Nouvelle Vente' },
    { to: '/app/ventes', icon: <FiDollarSign />, label: 'Ventes' },
    { to: '/app/produits', icon: <FiPackage />, label: 'Produits' },
    { to: '/app/stock', icon: <FiDatabase />, label: 'Stock' },
    { to: '/app/clients', icon: <FiUsers />, label: 'Clients' },
    { to: '/app/dettes', icon: <FiDollarSign />, label: 'Crédits / Dettes' },
    ...(isAdmin ? [
      ...(isPro ? [{ to: '/app/fournisseurs', icon: <FiTruck />, label: 'Fournisseurs' }] : [{ to: '/app/fournisseurs', icon: <FiTruck />, label: 'Fournisseurs', locked: true }]),
      ...(isPro ? [{ to: '/app/employes', icon: <FiUserCheck />, label: 'Employés' }] : [{ to: '/app/employes', icon: <FiUserCheck />, label: 'Employés', locked: true }]),
      { to: '/app/parametres', icon: <FiSettings />, label: 'Paramètres' },
      { to: '/app/abonnement', icon: <FiCreditCard />, label: 'Abonnement' },
      ...(isBusiness ? [{ to: '/app/boutiques', icon: <FiGrid />, label: 'Mes Boutiques' }] : [{ to: '/app/boutiques', icon: <FiGrid />, label: 'Mes Boutiques', locked: true }]),
    ] : []),
  ];

  const handleSwitchBoutique = (id) => {
    switchBoutique(id);
    setShowSwitcher(false);
    window.location.reload(); // Recharger pour actualiser toutes les données
  };

  return (
    <div className={`app-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Mobile overlay */}
      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}
      
      {/* Mobile hamburger */}
      <button className="mobile-menu-btn" onClick={toggleMobile}>
        {mobileOpen ? <FiX size={22} /> : <FiMenu size={22} />}
      </button>

      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        {/* Collapse toggle button (desktop) */}
        <button className="sidebar-toggle" onClick={toggleCollapse} title={collapsed ? 'Ouvrir le menu' : 'Réduire le menu'}>
          {collapsed ? <FiChevronsRight size={16} /> : <FiChevronsLeft size={16} />}
        </button>

        <div className="sidebar-header">
          <h1>{collapsed ? 'TP' : 'TekkiPro'}</h1>
          {!collapsed && (
            <div className={`sidebar-plan-badge plan-${plan.toLowerCase()}`}>
              {plan === 'GRATUIT' ? 'Starter' : plan === 'PRO' ? 'Pro' : 'Business'}
            </div>
          )}
          {!collapsed && (
            isAdmin && isBusiness && mesBoutiques.length > 1 ? (
              <div className="boutique-switcher">
                <button className="boutique-switcher-btn" onClick={() => setShowSwitcher(!showSwitcher)}>
                  <span>{getActiveBoutiqueName()}</span>
                  <FiChevronDown className={showSwitcher ? 'rotated' : ''} />
                </button>
                {showSwitcher && (
                  <div className="boutique-switcher-dropdown">
                    {mesBoutiques.map(b => (
                      <button
                        key={b.id}
                        className={`boutique-switcher-item ${b.id === currentBoutiqueId ? 'active' : ''}`}
                        onClick={() => handleSwitchBoutique(b.id)}
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
            )
          )}
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => item.locked ? (
            <NavLink key={item.to} to={item.to} end={item.end}
              className="nav-locked"
              title={collapsed ? item.label : undefined}
              onClick={() => setMobileOpen(false)}>
              {item.icon}
              <span className="nav-label">{item.label}</span>
              {!collapsed && <FiLock size={12} className="nav-lock-icon" />}
            </NavLink>
          ) : (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({ isActive }) => isActive ? 'active' : ''}
              title={collapsed ? item.label : undefined}
              onClick={() => setMobileOpen(false)}>
              {item.icon}
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {!collapsed && (
            <div className="user-info">
              <div className="name">{user?.prenom} {user?.nom}</div>
              <div className="role">{user?.role === 'ADMIN' ? <><FiShield size={12} style={{marginRight: '0.25rem'}} /> Administrateur</> : <><FiUser size={12} style={{marginRight: '0.25rem'}} /> Employé</>}</div>
            </div>
          )}
          <button className="btn-logout" onClick={logout} title={collapsed ? 'Déconnexion' : undefined}>
            <FiLogOut /> {!collapsed && 'Déconnexion'}
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

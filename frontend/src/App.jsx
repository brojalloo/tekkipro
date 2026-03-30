import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from './components/ErrorBoundary';
import './App.css';

const Layout = lazy(() => import('./components/Layout'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Produits = lazy(() => import('./pages/Produits'));
const ProduitForm = lazy(() => import('./pages/ProduitForm'));
const Ventes = lazy(() => import('./pages/Ventes'));
const NouvelleVente = lazy(() => import('./pages/NouvelleVente'));
const Clients = lazy(() => import('./pages/Clients'));
const Fournisseurs = lazy(() => import('./pages/Fournisseurs'));
const Stock = lazy(() => import('./pages/Stock'));
const Dettes = lazy(() => import('./pages/Dettes'));
const Employes = lazy(() => import('./pages/Employes'));
const Parametres = lazy(() => import('./pages/Parametres'));
const Landing = lazy(() => import('./pages/Landing'));
const MobileLanding = lazy(() => import('./pages/MobileLanding'));
const Abonnement = lazy(() => import('./pages/Abonnement'));
const Boutiques = lazy(() => import('./pages/Boutiques'));
const NouvelleBoutique = lazy(() => import('./pages/NouvelleBoutique'));
const Activite = lazy(() => import('./pages/Activite'));
const SuperAdminBoutiques = lazy(() => import('./pages/SuperAdminBoutiques'));
const SuperAdminBoutique = lazy(() => import('./pages/SuperAdminBoutique'));
const SuperAdminLogs = lazy(() => import('./pages/SuperAdminLogs'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

function RouteLoader() {
  return <div className="loading" role="status" aria-live="polite"><Button disabled>Chargement Shadcn...</Button></div>;
}

function PrivateRoute({ children, adminOnly = false, superAdminOnly = false }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) return <div className="loading">Chargement...</div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && !isAdmin) return <Navigate to="/app" />;
  if (superAdminOnly && user.role !== 'SUPERADMIN') return <Navigate to="/app" />;

  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route path="/landing" element={user ? <Navigate to="/app" /> : <Landing />} />
        <Route path="/mobile" element={<MobileLanding />} />
        <Route path="/login" element={user ? <Navigate to="/app" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/app" /> : <Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/" element={user ? <Navigate to="/app" /> : <Navigate to="/landing" />} />
        <Route path="*" element={<Navigate to={user ? '/app' : '/landing'} replace />} />
        
        <Route path="/app" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={user?.role === 'SUPERADMIN' ? <Navigate to="/app/superadmin" replace /> : <Dashboard />} />
          <Route path="produits" element={<Produits />} />
          <Route path="produits/nouveau" element={<PrivateRoute adminOnly><ProduitForm /></PrivateRoute>} />
          <Route path="produits/:id/edit" element={<PrivateRoute adminOnly><ProduitForm /></PrivateRoute>} />
          <Route path="ventes" element={<Ventes />} />
          <Route path="ventes/nouvelle" element={<NouvelleVente />} />
          <Route path="clients" element={<Clients />} />
          <Route path="fournisseurs" element={<PrivateRoute adminOnly><Fournisseurs /></PrivateRoute>} />
          <Route path="stock" element={<Stock />} />
          <Route path="dettes" element={<Dettes />} />
          <Route path="employes" element={<PrivateRoute adminOnly><Employes /></PrivateRoute>} />
          <Route path="parametres" element={<PrivateRoute adminOnly><Parametres /></PrivateRoute>} />
          <Route path="abonnement" element={<PrivateRoute adminOnly><Abonnement /></PrivateRoute>} />
          <Route path="boutiques" element={<PrivateRoute adminOnly><Boutiques /></PrivateRoute>} />
          <Route path="boutiques/nouvelle" element={<PrivateRoute adminOnly><NouvelleBoutique /></PrivateRoute>} />
          <Route path="activite" element={<PrivateRoute adminOnly><Activite /></PrivateRoute>} />
          <Route path="superadmin" element={<PrivateRoute superAdminOnly><SuperAdminBoutiques /></PrivateRoute>} />
          <Route path="superadmin/logs" element={<PrivateRoute superAdminOnly><SuperAdminLogs /></PrivateRoute>} />
          <Route path="superadmin/:id" element={<PrivateRoute superAdminOnly><SuperAdminBoutique /></PrivateRoute>} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

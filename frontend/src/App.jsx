import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Produits from './pages/Produits';
import ProduitForm from './pages/ProduitForm';
import Ventes from './pages/Ventes';
import NouvelleVente from './pages/NouvelleVente';
import Clients from './pages/Clients';
import Fournisseurs from './pages/Fournisseurs';
import Stock from './pages/Stock';
import Dettes from './pages/Dettes';
import Employes from './pages/Employes';
import Parametres from './pages/Parametres';
import Landing from './pages/Landing';
import Abonnement from './pages/Abonnement';
import Boutiques from './pages/Boutiques';
import NouvelleBoutique from './pages/NouvelleBoutique';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import './App.css';

function PrivateRoute({ children, adminOnly = false }) {
  const { user, isAdmin, loading } = useAuth();
  
  if (loading) return <div className="loading">Chargement...</div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && !isAdmin) return <Navigate to="/app" />;
  
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/landing" element={user ? <Navigate to="/app" /> : <Landing />} />
      <Route path="/login" element={user ? <Navigate to="/app" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/app" /> : <Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={user ? <Navigate to="/app" /> : <Navigate to="/landing" />} />
      
      <Route path="/app" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
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
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

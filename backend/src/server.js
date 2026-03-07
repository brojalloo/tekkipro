// Tekkipro - Serveur principal
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/auth.routes');
const produitRoutes = require('./routes/produit.routes');
const venteRoutes = require('./routes/vente.routes');
const clientRoutes = require('./routes/client.routes');
const fournisseurRoutes = require('./routes/fournisseur.routes');
const stockRoutes = require('./routes/stock.routes');
const detteRoutes = require('./routes/dette.routes');
const statistiqueRoutes = require('./routes/statistique.routes');
const factureRoutes = require('./routes/facture.routes');
const categorieRoutes = require('./routes/categorie.routes');
const boutiqueRoutes = require('./routes/boutique.routes');
const abonnementRoutes = require('./routes/abonnement.routes');
const publicStatsRoutes = require('./routes/publicStats.routes');
const paymentRoutes = require('./routes/payment.routes');
const { stripeWebhook } = require('./controllers/payment.controller');
const { startSubscriptionCron } = require('./services/cron.service');

const app = express();

// Stripe webhook — doit être AVANT express.json() car il a besoin du raw body
app.post('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/produits', produitRoutes);
app.use('/api/ventes', venteRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/fournisseurs', fournisseurRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/dettes', detteRoutes);
app.use('/api/statistiques', statistiqueRoutes);
app.use('/api/factures', factureRoutes);
app.use('/api/categories', categorieRoutes);
app.use('/api/boutique', boutiqueRoutes);
app.use('/api/abonnements', abonnementRoutes);
app.use('/api/public-stats', publicStatsRoutes);
app.use('/api/payments', paymentRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', app: 'Tekkipro API', version: '1.0.0' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur interne du serveur',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Tekkipro API démarrée sur le port ${PORT}`);
  // Démarrer les tâches cron
  startSubscriptionCron();
});

module.exports = app;

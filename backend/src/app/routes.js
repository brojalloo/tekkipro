// Tekkipro — Point d'entrée centralisé des routes
// Chaque module expose ses propres routes

const authRoutes        = require('../modules/auth');
const boutiqueRoutes    = require('../modules/boutiques');
const catalogRoutes     = require('../modules/catalog');
const inventoryRoutes   = require('../modules/inventory');
const salesRoutes       = require('../modules/sales');
const customerRoutes    = require('../modules/customers');
const supplierRoutes    = require('../modules/suppliers');
const reportsRoutes     = require('../modules/reports');
const abonnementRoutes  = require('../modules/abonnements');
const paymentRoutes     = require('../modules/payments');
const barcodeRoutes     = require('../modules/barcodes');
const auditRoutes       = require('../modules/audit');

function registerRoutes(app) {
  // Auth
  app.use('/api/auth', authRoutes);

  // Boutique
  app.use('/api/boutique', boutiqueRoutes);

  // Catalog (produits + categories)
  app.use('/api', catalogRoutes);

  // Inventory (stock)
  app.use('/api/stock', inventoryRoutes);

  // Sales (ventes + factures + dettes)
  app.use('/api', salesRoutes);

  // Customers
  app.use('/api/clients', customerRoutes);

  // Suppliers
  app.use('/api/fournisseurs', supplierRoutes);

  // Reports (statistiques + public-stats)
  app.use('/api', reportsRoutes);

  // Abonnements
  app.use('/api/abonnements', abonnementRoutes);

  // Payments
  app.use('/api/payments', paymentRoutes);

  // Barcodes (nouveau module)
  app.use('/api/barcodes', barcodeRoutes);

  // Audit logs
  app.use('/api/audit', auditRoutes);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', app: 'Tekkipro API', version: '2.0.0' });
  });
}

module.exports = { registerRoutes };


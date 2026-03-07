// Seed - Données de démonstration complètes pour TekkiPro
// Boutique sénégalaise réaliste avec produits, ventes, dettes, stock
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Helper : générer un numéro de vente
const genNumero = (i) => {
  const d = new Date(2026, 1, 20 + Math.floor(i / 5));
  const ds = d.toISOString().slice(0, 10).replace(/-/g, '');
  return `VNT-${ds}-${String(100000 + i).slice(1)}`;
};

async function main() {
  console.log('🌱 Seeding Tekkipro — Données complètes...');

  // Nettoyage complet dans l'ordre des dépendances
  console.log('🧹 Nettoyage des données existantes...');
  await prisma.paiementAbonnement.deleteMany();
  await prisma.abonnement.deleteMany();
  await prisma.remboursement.deleteMany();
  await prisma.dette.deleteMany();
  await prisma.venteDetail.deleteMany();
  await prisma.vente.deleteMany();
  await prisma.entreeStock.deleteMany();
  await prisma.uniteVente.deleteMany();
  await prisma.produit.deleteMany();
  await prisma.categorie.deleteMany();
  await prisma.client.deleteMany();
  await prisma.fournisseur.deleteMany();
  await prisma.user.deleteMany();
  await prisma.boutique.deleteMany();
  console.log('✅ Base nettoyée');

  // ═══════════════════════════════════════════════════════
  //  BOUTIQUE
  // ═══════════════════════════════════════════════════════
  const boutique = await prisma.boutique.create({
    data: {
      nom: 'Boutique Téranga',
      slug: 'boutique-teranga',
      adresse: 'Marché Sandaga, Rue 10, Dakar',
      telephone: '+221 77 123 45 67',
      email: 'demo@tekkipro.com',
      plan: 'PRO',
    },
  });
  const B = boutique.id;

  // ═══════════════════════════════════════════════════════
  //  UTILISATEURS
  // ═══════════════════════════════════════════════════════
  const adminPwd = await bcrypt.hash('admin123', 10);
  const empPwd = await bcrypt.hash('employe123', 10);

  const admin = await prisma.user.create({
    data: {
      nom: 'Diop', prenom: 'Moussa', email: 'admin@tekkipro.com',
      password: adminPwd, telephone: '+221 77 123 45 67', role: 'ADMIN', boutiqueId: B,
    },
  });

  const employe = await prisma.user.create({
    data: {
      nom: 'Fall', prenom: 'Aminata', email: 'employe@tekkipro.com',
      password: empPwd, telephone: '+221 76 987 65 43', role: 'EMPLOYE', boutiqueId: B,
    },
  });

  // ═══════════════════════════════════════════════════════
  //  CATÉGORIES
  // ═══════════════════════════════════════════════════════
  const [catAlim, catBoiss, catCosm, catQuinc, catEntretien, catDivers] = await Promise.all([
    prisma.categorie.create({ data: { nom: 'Alimentation', boutiqueId: B } }),
    prisma.categorie.create({ data: { nom: 'Boissons', boutiqueId: B } }),
    prisma.categorie.create({ data: { nom: 'Cosmétiques', boutiqueId: B } }),
    prisma.categorie.create({ data: { nom: 'Quincaillerie', boutiqueId: B } }),
    prisma.categorie.create({ data: { nom: 'Entretien', boutiqueId: B } }),
    prisma.categorie.create({ data: { nom: 'Divers', boutiqueId: B } }),
  ]);

  // ═══════════════════════════════════════════════════════
  //  FOURNISSEURS
  // ═══════════════════════════════════════════════════════
  const fGrossiste = await prisma.fournisseur.create({
    data: { nom: 'Grossiste Touba', telephone: '+221 78 111 22 33', adresse: 'Touba, Sénégal', boutiqueId: B },
  });
  const fImport = await prisma.fournisseur.create({
    data: { nom: 'Import Dakar', telephone: '+221 77 444 55 66', adresse: 'Port de Dakar', email: 'import@dakar.sn', boutiqueId: B },
  });
  const fSoboa = await prisma.fournisseur.create({
    data: { nom: 'SOBOA Distribution', telephone: '+221 33 849 10 00', adresse: 'Zone Industrielle, Dakar', boutiqueId: B },
  });
  const fPatisen = await prisma.fournisseur.create({
    data: { nom: 'Patisen SA', telephone: '+221 33 832 50 50', adresse: 'Thiaroye, Dakar', boutiqueId: B },
  });

  // ═══════════════════════════════════════════════════════
  //  PRODUITS (15 produits variés — boutique sénégalaise)
  //  Stock TOUJOURS en unité de base (g, ml, piece, paquet)
  //  Chaque unité de vente a SON PROPRE prix
  // ═══════════════════════════════════════════════════════

  // 1. 🍚 Riz Brisé — base=g, 20 sacs de 50kg
  const riz = await prisma.produit.create({
    data: {
      nom: 'Riz Brisé', prixVente: 15000, prixAchat: 12500,
      stock: 1000000, stockAlerte: 100000, uniteBase: 'g',
      categorieId: catAlim.id, fournisseurId: fGrossiste.id, boutiqueId: B,
      unitesVente: { create: [
        { nom: 'Sac 50kg', facteurConversion: 50000, prix: 15000, prixAchat: 12500, estDefaut: true },
        { nom: 'Sac 25kg', facteurConversion: 25000, prix: 8000, prixAchat: 6500 },
        { nom: 'Kilogramme', facteurConversion: 1000, prix: 350, prixAchat: 260 },
        { nom: '500 grammes', facteurConversion: 500, prix: 200 },
        { nom: '250 grammes', facteurConversion: 250, prix: 125 },
      ]},
    },
  });

  // 2. 🛢️ Huile Végétale — base=ml, 20 bidons de 20L
  const huile = await prisma.produit.create({
    data: {
      nom: 'Huile Végétale', prixVente: 25000, prixAchat: 20000,
      stock: 400000, stockAlerte: 20000, uniteBase: 'ml',
      categorieId: catAlim.id, fournisseurId: fGrossiste.id, boutiqueId: B,
      unitesVente: { create: [
        { nom: 'Bidon 20L', facteurConversion: 20000, prix: 25000, prixAchat: 20000, estDefaut: true },
        { nom: 'Bidon 5L', facteurConversion: 5000, prix: 6500, prixAchat: 5200 },
        { nom: 'Litre', facteurConversion: 1000, prix: 1300, prixAchat: 1050 },
        { nom: '1/2 Litre', facteurConversion: 500, prix: 650 },
        { nom: '1/4 Litre', facteurConversion: 250, prix: 350 },
        { nom: '1/8 Litre', facteurConversion: 125, prix: 180 },
      ]},
    },
  });

  // 3. 🍬 Sucre en Poudre — base=g, 10 sacs
  const sucre = await prisma.produit.create({
    data: {
      nom: 'Sucre en Poudre', prixVente: 14000, prixAchat: 11000,
      stock: 500000, stockAlerte: 50000, uniteBase: 'g',
      categorieId: catAlim.id, fournisseurId: fGrossiste.id, boutiqueId: B,
      unitesVente: { create: [
        { nom: 'Sac 50kg', facteurConversion: 50000, prix: 14000, prixAchat: 11000, estDefaut: true },
        { nom: 'Sac 25kg', facteurConversion: 25000, prix: 7500, prixAchat: 5800 },
        { nom: 'Kilogramme', facteurConversion: 1000, prix: 350, prixAchat: 240 },
        { nom: '500 grammes', facteurConversion: 500, prix: 200 },
        { nom: '250 grammes', facteurConversion: 250, prix: 125 },
        { nom: '100 grammes', facteurConversion: 100, prix: 75 },
      ]},
    },
  });

  // 4. 🍝 Spaghetti 500g — base=paquet, 10 cartons
  const spag = await prisma.produit.create({
    data: {
      nom: 'Spaghetti 500g', prixVente: 250, prixAchat: 200,
      stock: 400, stockAlerte: 40, uniteBase: 'paquet',
      categorieId: catAlim.id, fournisseurId: fPatisen.id, boutiqueId: B,
      unitesVente: { create: [
        { nom: 'Paquet', facteurConversion: 1, prix: 250, prixAchat: 200, estDefaut: true },
        { nom: 'Carton (40)', facteurConversion: 40, prix: 9000, prixAchat: 7500 },
      ]},
    },
  });

  // 5. ☕ Café Touba — base=g
  const cafe = await prisma.produit.create({
    data: {
      nom: 'Café Touba', prixVente: 1500, prixAchat: 1100,
      stock: 50000, stockAlerte: 5000, uniteBase: 'g',
      categorieId: catAlim.id, fournisseurId: fGrossiste.id, boutiqueId: B,
      unitesVente: { create: [
        { nom: 'Kilogramme', facteurConversion: 1000, prix: 1500, prixAchat: 1100, estDefaut: true },
        { nom: '500 grammes', facteurConversion: 500, prix: 800 },
        { nom: '250 grammes', facteurConversion: 250, prix: 450 },
        { nom: '100 grammes', facteurConversion: 100, prix: 200 },
      ]},
    },
  });

  // 6. 🥛 Lait en Poudre Nido — base=g
  const lait = await prisma.produit.create({
    data: {
      nom: 'Lait en Poudre Nido', prixVente: 2500, prixAchat: 1800,
      stock: 30000, stockAlerte: 5000, uniteBase: 'g',
      categorieId: catAlim.id, fournisseurId: fImport.id, boutiqueId: B,
      unitesVente: { create: [
        { nom: 'Boîte 2.5kg', facteurConversion: 2500, prix: 6500, prixAchat: 4800, estDefaut: true },
        { nom: 'Kilogramme', facteurConversion: 1000, prix: 2500, prixAchat: 1800 },
        { nom: '500 grammes', facteurConversion: 500, prix: 1300 },
        { nom: '250 grammes', facteurConversion: 250, prix: 700 },
        { nom: '100 grammes', facteurConversion: 100, prix: 300 },
        { nom: 'Sachet 22g', facteurConversion: 22, prix: 100 },
      ]},
    },
  });

  // 7. 🫖 Thé Lipton — base=piece (sachets)
  const the = await prisma.produit.create({
    data: {
      nom: 'Thé Lipton', prixVente: 25, prixAchat: 15,
      stock: 1000, stockAlerte: 100, uniteBase: 'piece',
      categorieId: catBoiss.id, fournisseurId: fImport.id, boutiqueId: B,
      unitesVente: { create: [
        { nom: 'Sachet', facteurConversion: 1, prix: 25, prixAchat: 15, estDefaut: true },
        { nom: 'Boîte (100)', facteurConversion: 100, prix: 2200, prixAchat: 1400 },
      ]},
    },
  });

  // 8. 🥤 Bissap Concentré — base=ml
  const bissap = await prisma.produit.create({
    data: {
      nom: 'Bissap Concentré', prixVente: 500, prixAchat: 350,
      stock: 50000, stockAlerte: 5000, uniteBase: 'ml',
      categorieId: catBoiss.id, fournisseurId: fPatisen.id, boutiqueId: B,
      unitesVente: { create: [
        { nom: 'Bouteille 1L', facteurConversion: 1000, prix: 500, prixAchat: 350, estDefaut: true },
        { nom: 'Bouteille 33cl', facteurConversion: 330, prix: 200 },
        { nom: 'Carton (12×1L)', facteurConversion: 12000, prix: 5500, prixAchat: 4000 },
      ]},
    },
  });

  // 9. 🍬 Bonbons Menthe — base=piece
  const bonbons = await prisma.produit.create({
    data: {
      nom: 'Bonbons Menthe', prixVente: 25, prixAchat: 10,
      stock: 500, stockAlerte: 50, uniteBase: 'piece',
      categorieId: catAlim.id, boutiqueId: B,
      unitesVente: { create: [
        { nom: 'Pièce', facteurConversion: 1, prix: 25, prixAchat: 10, estDefaut: true },
        { nom: 'Sachet (10)', facteurConversion: 10, prix: 200 },
        { nom: 'Boîte (50)', facteurConversion: 50, prix: 900 },
      ]},
    },
  });

  // 10. 🧱 Ciment Portland — base=paquet
  const ciment = await prisma.produit.create({
    data: {
      nom: 'Ciment Portland', prixVente: 5000, prixAchat: 4200,
      stock: 50, stockAlerte: 10, uniteBase: 'paquet',
      categorieId: catQuinc.id, fournisseurId: fImport.id, boutiqueId: B,
      unitesVente: { create: [
        { nom: 'Sac 50kg', facteurConversion: 1, prix: 5000, prixAchat: 4200, estDefaut: true },
        { nom: 'Demi-sac', facteurConversion: 0.5, prix: 2700 },
      ]},
    },
  });

  // 11. 🧼 Savon de Marseille — base=piece
  const savon = await prisma.produit.create({
    data: {
      nom: 'Savon de Marseille', prixVente: 300, prixAchat: 200,
      stock: 120, stockAlerte: 20, uniteBase: 'piece',
      categorieId: catEntretien.id, fournisseurId: fPatisen.id, boutiqueId: B,
      unitesVente: { create: [
        { nom: 'Pièce', facteurConversion: 1, prix: 300, prixAchat: 200, estDefaut: true },
        { nom: 'Carton (24)', facteurConversion: 24, prix: 6500, prixAchat: 4500 },
      ]},
    },
  });

  // 12. 🧴 Javel Lacroix — base=ml
  const javel = await prisma.produit.create({
    data: {
      nom: 'Eau de Javel Lacroix', prixVente: 750, prixAchat: 500,
      stock: 24000, stockAlerte: 3000, uniteBase: 'ml',
      categorieId: catEntretien.id, fournisseurId: fImport.id, boutiqueId: B,
      unitesVente: { create: [
        { nom: 'Bouteille 1L', facteurConversion: 1000, prix: 750, prixAchat: 500, estDefaut: true },
        { nom: 'Bidon 5L', facteurConversion: 5000, prix: 3200, prixAchat: 2200 },
      ]},
    },
  });

  // 13. 🧴 Crème Nivea — base=piece
  const nivea = await prisma.produit.create({
    data: {
      nom: 'Crème Nivea', prixVente: 1500, prixAchat: 1000,
      stock: 48, stockAlerte: 10, uniteBase: 'piece',
      categorieId: catCosm.id, fournisseurId: fImport.id, boutiqueId: B,
      unitesVente: { create: [
        { nom: 'Pot 200ml', facteurConversion: 1, prix: 1500, prixAchat: 1000, estDefaut: true },
        { nom: 'Carton (12)', facteurConversion: 12, prix: 16000, prixAchat: 11000 },
      ]},
    },
  });

  // 14. 🔩 Clous 6cm — base=g (vendus au kg)
  const clous = await prisma.produit.create({
    data: {
      nom: 'Clous 6cm', prixVente: 800, prixAchat: 550,
      stock: 25000, stockAlerte: 5000, uniteBase: 'g',
      categorieId: catQuinc.id, fournisseurId: fImport.id, boutiqueId: B,
      unitesVente: { create: [
        { nom: 'Kilogramme', facteurConversion: 1000, prix: 800, prixAchat: 550, estDefaut: true },
        { nom: '500 grammes', facteurConversion: 500, prix: 450 },
        { nom: 'Sac 25kg', facteurConversion: 25000, prix: 18000, prixAchat: 13000 },
      ]},
    },
  });

  // 15. 🔋 Piles AA — base=piece
  const piles = await prisma.produit.create({
    data: {
      nom: 'Piles AA Tiger', prixVente: 150, prixAchat: 75,
      stock: 200, stockAlerte: 30, uniteBase: 'piece',
      categorieId: catDivers.id, fournisseurId: fImport.id, boutiqueId: B,
      unitesVente: { create: [
        { nom: 'Pièce', facteurConversion: 1, prix: 150, prixAchat: 75, estDefaut: true },
        { nom: 'Paire', facteurConversion: 2, prix: 250 },
        { nom: 'Boîte (20)', facteurConversion: 20, prix: 2500, prixAchat: 1400 },
      ]},
    },
  });

  console.log('   ✅ 15 produits créés');

  // ═══════════════════════════════════════════════════════
  //  CLIENTS (6 clients réguliers)
  // ═══════════════════════════════════════════════════════
  const cFatou = await prisma.client.create({
    data: { nom: 'Ndiaye', prenom: 'Fatou', telephone: '+221 77 555 11 22', adresse: 'Médina, Dakar', boutiqueId: B },
  });
  const cIbra = await prisma.client.create({
    data: { nom: 'Ba', prenom: 'Ibrahima', telephone: '+221 76 333 44 55', adresse: 'Parcelles Assainies', boutiqueId: B },
  });
  const cAwa = await prisma.client.create({
    data: { nom: 'Sow', prenom: 'Awa', telephone: '+221 77 888 99 00', adresse: 'Grand Yoff, Dakar', boutiqueId: B },
  });
  const cOusmane = await prisma.client.create({
    data: { nom: 'Diallo', prenom: 'Ousmane', telephone: '+221 78 222 33 44', adresse: 'Pikine', boutiqueId: B },
  });
  const cMariama = await prisma.client.create({
    data: { nom: 'Sy', prenom: 'Mariama', telephone: '+221 76 111 77 88', adresse: 'Guédiawaye', boutiqueId: B },
  });
  const cMamadou = await prisma.client.create({
    data: { nom: 'Gueye', prenom: 'Mamadou', telephone: '+221 77 666 00 11', adresse: 'Rufisque', boutiqueId: B },
  });
  console.log('   ✅ 6 clients créés');

  // ═══════════════════════════════════════════════════════
  //  ENTRÉES DE STOCK (historique réaliste)
  // ═══════════════════════════════════════════════════════

  // Récup des unités pour ref
  const allProduits = await prisma.produit.findMany({
    where: { boutiqueId: B },
    include: { unitesVente: true },
  });
  const getUnite = (prodId, unitNom) => {
    const p = allProduits.find(x => x.id === prodId);
    return p?.unitesVente.find(u => u.nom === unitNom);
  };

  // Entrées stock simulées
  const entreesData = [
    { produitId: riz.id, quantite: 10, uniteNom: 'Sac 50kg', prixAchat: 12500, fournisseurId: fGrossiste.id },
    { produitId: riz.id, quantite: 10, uniteNom: 'Sac 50kg', prixAchat: 12500, fournisseurId: fGrossiste.id },
    { produitId: huile.id, quantite: 10, uniteNom: 'Bidon 20L', prixAchat: 20000, fournisseurId: fGrossiste.id },
    { produitId: huile.id, quantite: 10, uniteNom: 'Bidon 20L', prixAchat: 20000, fournisseurId: fGrossiste.id },
    { produitId: sucre.id, quantite: 10, uniteNom: 'Sac 50kg', prixAchat: 11000, fournisseurId: fGrossiste.id },
    { produitId: spag.id, quantite: 10, uniteNom: 'Carton (40)', prixAchat: 7500, fournisseurId: fPatisen.id },
    { produitId: cafe.id, quantite: 50, uniteNom: 'Kilogramme', prixAchat: 1100, fournisseurId: fGrossiste.id },
    { produitId: lait.id, quantite: 12, uniteNom: 'Boîte 2.5kg', prixAchat: 4800, fournisseurId: fImport.id },
    { produitId: savon.id, quantite: 5, uniteNom: 'Carton (24)', prixAchat: 4500, fournisseurId: fPatisen.id },
    { produitId: ciment.id, quantite: 50, uniteNom: 'Sac 50kg', prixAchat: 4200, fournisseurId: fImport.id },
    { produitId: javel.id, quantite: 24, uniteNom: 'Bouteille 1L', prixAchat: 500, fournisseurId: fImport.id },
    { produitId: clous.id, quantite: 1, uniteNom: 'Sac 25kg', prixAchat: 13000, fournisseurId: fImport.id },
    { produitId: piles.id, quantite: 10, uniteNom: 'Boîte (20)', prixAchat: 1400, fournisseurId: fImport.id },
  ];

  for (const e of entreesData) {
    const unite = getUnite(e.produitId, e.uniteNom);
    const quantiteBase = unite ? e.quantite * unite.facteurConversion : e.quantite;
    await prisma.entreeStock.create({
      data: {
        quantite: e.quantite,
        quantiteBase,
        prixAchat: e.prixAchat,
        uniteNom: e.uniteNom,
        produitId: e.produitId,
        fournisseurId: e.fournisseurId,
        boutiqueId: B,
      },
    });
  }
  console.log('   ✅ 13 entrées de stock créées');

  // ═══════════════════════════════════════════════════════
  //  VENTES de démonstration (12 ventes variées)
  //  Mix : cash, mobile money, crédit / avec ou sans client
  // ═══════════════════════════════════════════════════════

  // On ne modifie plus le stock ici car le stock initial est déjà correct
  // Ces ventes sont juste pour l'historique / dashboard

  const ventesConfig = [
    // Vente 1 — Fatou : 2 kg riz + 1L huile — cash
    { client: cFatou.id, user: admin.id, mode: 'CASH', items: [
      { pId: riz.id, qty: 2, uNom: 'Kilogramme', px: 350, fc: 1000 },
      { pId: huile.id, qty: 1, uNom: 'Litre', px: 1300, fc: 1000 },
    ]},
    // Vente 2 — Ibrahima : 1 sac riz 50kg — cash
    { client: cIbra.id, user: admin.id, mode: 'CASH', items: [
      { pId: riz.id, qty: 1, uNom: 'Sac 50kg', px: 15000, fc: 50000 },
    ]},
    // Vente 3 — Awa : 3 paquets spaghetti + 1 kg sucre — Mobile Money
    { client: cAwa.id, user: employe.id, mode: 'MOBILE_MONEY', items: [
      { pId: spag.id, qty: 3, uNom: 'Paquet', px: 250, fc: 1 },
      { pId: sucre.id, qty: 1, uNom: 'Kilogramme', px: 350, fc: 1000 },
    ]},
    // Vente 4 — Client de passage : bonbons + piles — cash
    { client: null, user: employe.id, mode: 'CASH', items: [
      { pId: bonbons.id, qty: 5, uNom: 'Pièce', px: 25, fc: 1 },
      { pId: piles.id, qty: 2, uNom: 'Paire', px: 250, fc: 2 },
    ]},
    // Vente 5 — Ousmane : 10 sacs ciment — CREDIT (gros achat chantier)
    { client: cOusmane.id, user: admin.id, mode: 'CREDIT', montantPaye: 25000, items: [
      { pId: ciment.id, qty: 10, uNom: 'Sac 50kg', px: 5000, fc: 1 },
    ]},
    // Vente 6 — Mariama : savon + javel — cash
    { client: cMariama.id, user: employe.id, mode: 'CASH', items: [
      { pId: savon.id, qty: 3, uNom: 'Pièce', px: 300, fc: 1 },
      { pId: javel.id, qty: 2, uNom: 'Bouteille 1L', px: 750, fc: 1000 },
    ]},
    // Vente 7 — Mamadou : café + lait — cash
    { client: cMamadou.id, user: admin.id, mode: 'CASH', items: [
      { pId: cafe.id, qty: 1, uNom: '500 grammes', px: 800, fc: 500 },
      { pId: lait.id, qty: 2, uNom: '250 grammes', px: 700, fc: 250 },
    ]},
    // Vente 8 — Client passage : thé 1 boîte — cash
    { client: null, user: employe.id, mode: 'CASH', items: [
      { pId: the.id, qty: 1, uNom: 'Boîte (100)', px: 2200, fc: 100 },
    ]},
    // Vente 9 — Fatou : 1 bidon 5L huile + 1 nivea — CREDIT
    { client: cFatou.id, user: admin.id, mode: 'CREDIT', montantPaye: 3000, items: [
      { pId: huile.id, qty: 1, uNom: 'Bidon 5L', px: 6500, fc: 5000 },
      { pId: nivea.id, qty: 1, uNom: 'Pot 200ml', px: 1500, fc: 1 },
    ]},
    // Vente 10 — Awa : 1 carton spaghetti — Mobile Money
    { client: cAwa.id, user: employe.id, mode: 'MOBILE_MONEY', items: [
      { pId: spag.id, qty: 1, uNom: 'Carton (40)', px: 9000, fc: 40 },
    ]},
    // Vente 11 — Ibrahima : 2 kg clous — cash
    { client: cIbra.id, user: admin.id, mode: 'CASH', items: [
      { pId: clous.id, qty: 2, uNom: 'Kilogramme', px: 800, fc: 1000 },
    ]},
    // Vente 12 — Mamadou : 12 bouteilles bissap — CREDIT
    { client: cMamadou.id, user: employe.id, mode: 'CREDIT', montantPaye: 2000, items: [
      { pId: bissap.id, qty: 12, uNom: 'Bouteille 1L', px: 500, fc: 1000 },
    ]},
  ];

  let venteIdx = 0;
  for (const v of ventesConfig) {
    venteIdx++;
    const montantTotal = v.items.reduce((s, it) => s + it.px * it.qty, 0);
    const isCredit = v.mode === 'CREDIT';
    const montantPaye = isCredit ? (v.montantPaye || 0) : montantTotal;
    const statut = isCredit ? 'EN_CREDIT' : 'COMPLETEE';

    const vente = await prisma.vente.create({
      data: {
        numero: genNumero(venteIdx),
        montantTotal,
        montantPaye,
        modePaiement: v.mode,
        statut,
        clientId: v.client,
        userId: v.user,
        boutiqueId: B,
        details: {
          create: v.items.map(it => ({
            produitId: it.pId,
            quantite: it.qty,
            quantiteBase: it.qty * it.fc,
            prixUnitaire: it.px,
            sousTotal: it.px * it.qty,
            uniteNom: it.uNom,
          })),
        },
      },
    });

    // Déduire le stock pour chaque item
    for (const it of v.items) {
      await prisma.produit.update({
        where: { id: it.pId },
        data: { stock: { decrement: it.qty * it.fc } },
      });
    }

    // Créer la dette si crédit
    if (isCredit && v.client) {
      await prisma.dette.create({
        data: {
          montantTotal,
          montantPaye,
          montantRestant: montantTotal - montantPaye,
          statut: 'EN_COURS',
          clientId: v.client,
          venteId: vente.id,
        },
      });
    }
  }
  console.log('   ✅ 12 ventes créées (6 cash, 3 mobile, 3 crédit)');

  // ═══════════════════════════════════════════════════════
  //  REMBOURSEMENT partiel (dette Ousmane)
  // ═══════════════════════════════════════════════════════
  const detteOusmane = await prisma.dette.findFirst({
    where: { clientId: cOusmane.id, statut: 'EN_COURS' },
  });
  if (detteOusmane) {
    await prisma.remboursement.create({
      data: { montant: 10000, detteId: detteOusmane.id },
    });
    await prisma.dette.update({
      where: { id: detteOusmane.id },
      data: { montantPaye: { increment: 10000 }, montantRestant: { decrement: 10000 } },
    });
    console.log('   ✅ 1 remboursement créé (Ousmane: 10 000 FCFA)');
  }

  // ═══════════════════════════════════════════════════════
  //  ABONNEMENT
  // ═══════════════════════════════════════════════════════
  await prisma.abonnement.create({
    data: {
      plan: 'PRO',
      statut: 'ACTIF',
      dateDebut: new Date('2026-01-01'),
      dateFin: new Date('2026-12-31'),
      montant: 120000,
      boutiqueId: B,
      paiements: {
        create: [
          { montant: 60000, modePaiement: 'WAVE', reference: 'WAV-20260101-001', telephone: '+221 77 123 45 67' },
          { montant: 60000, modePaiement: 'ORANGE_MONEY', reference: 'OM-20260401-002', telephone: '+221 77 123 45 67' },
        ],
      },
    },
  });
  console.log('   ✅ Abonnement PRO créé');

  console.log('');
  console.log('══════════════════════════════════════════');
  console.log('  🎉 Seed terminé avec succès !');
  console.log('══════════════════════════════════════════');
  console.log('');
  console.log('📊 Résumé :');
  console.log('   • 1 boutique (Boutique Téranga)');
  console.log('   • 2 utilisateurs (admin + employé)');
  console.log('   • 6 catégories');
  console.log('   • 4 fournisseurs');
  console.log('   • 15 produits avec unités de vente');
  console.log('   • 6 clients');
  console.log('   • 13 entrées de stock');
  console.log('   • 12 ventes (cash, mobile, crédit)');
  console.log('   • 3 dettes en cours');
  console.log('   • 1 remboursement');
  console.log('   • 1 abonnement PRO');
  console.log('');
  console.log('📧 Connexion :');
  console.log('   Admin  : admin@tekkipro.com / admin123');
  console.log('   Employé: employe@tekkipro.com / employe123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

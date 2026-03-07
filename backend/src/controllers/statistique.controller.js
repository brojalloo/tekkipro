// Contrôleur Statistiques / Dashboard
const prisma = require('../config/database');

// Dashboard principal
const getDashboard = async (req, res) => {
  try {
    const boutiqueId = req.boutiqueId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const firstDayMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Ventes du jour
    const ventesJour = await prisma.vente.aggregate({
      where: {
        boutiqueId,
        statut: { not: 'ANNULEE' },
        createdAt: { gte: today, lt: tomorrow },
      },
      _sum: { montantTotal: true, montantPaye: true },
      _count: true,
    });

    // Ventes du mois
    const ventesMois = await prisma.vente.aggregate({
      where: {
        boutiqueId,
        statut: { not: 'ANNULEE' },
        createdAt: { gte: firstDayMonth },
      },
      _sum: { montantTotal: true, montantPaye: true },
      _count: true,
    });

    // Bénéfice du jour (seulement pour admin)
    let beneficeJour = 0;
    let beneficeMois = 0;

    if (req.user.role === 'ADMIN') {
      const ventesDetailJour = await prisma.venteDetail.findMany({
        where: {
          vente: {
            boutiqueId,
            statut: { not: 'ANNULEE' },
            createdAt: { gte: today, lt: tomorrow },
          },
        },
        include: { produit: { select: { prixAchat: true } } },
      });

      beneficeJour = ventesDetailJour.reduce((sum, d) => {
        return sum + (d.prixUnitaire - d.produit.prixAchat) * d.quantite;
      }, 0);

      const ventesDetailMois = await prisma.venteDetail.findMany({
        where: {
          vente: {
            boutiqueId,
            statut: { not: 'ANNULEE' },
            createdAt: { gte: firstDayMonth },
          },
        },
        include: { produit: { select: { prixAchat: true } } },
      });

      beneficeMois = ventesDetailMois.reduce((sum, d) => {
        return sum + (d.prixUnitaire - d.produit.prixAchat) * d.quantite;
      }, 0);
    }

    // Dettes en cours
    const totalDettes = await prisma.dette.aggregate({
      where: {
        statut: 'EN_COURS',
        vente: { boutiqueId },
      },
      _sum: { montantRestant: true },
      _count: true,
    });

    // Produits en alerte stock
    const allProduits = await prisma.produit.findMany({
      where: { boutiqueId, actif: true },
      select: { stock: true, stockAlerte: true },
    });
    const alertesStockCount = allProduits.filter(p => p.stock <= p.stockAlerte).length;

    // Nombre de produits
    const totalProduits = await prisma.produit.count({
      where: { boutiqueId, actif: true },
    });

    // Nombre de clients
    const totalClients = await prisma.client.count({
      where: { boutiqueId },
    });

    res.json({
      success: true,
      data: {
        ventesJour: {
          total: ventesJour._sum.montantTotal || 0,
          paye: ventesJour._sum.montantPaye || 0,
          nombre: ventesJour._count,
        },
        ventesMois: {
          total: ventesMois._sum.montantTotal || 0,
          paye: ventesMois._sum.montantPaye || 0,
          nombre: ventesMois._count,
        },
        beneficeJour,
        beneficeMois,
        dettes: {
          total: totalDettes._sum.montantRestant || 0,
          nombre: totalDettes._count,
        },
        alertesStock: alertesStockCount,
        totalProduits,
        totalClients,
      },
    });
  } catch (error) {
    console.error('Erreur getDashboard:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Produits les plus vendus
const getTopProduits = async (req, res) => {
  try {
    const { periode } = req.query; // jour, semaine, mois
    const boutiqueId = req.boutiqueId;

    let dateDebut = new Date();
    if (periode === 'jour') {
      dateDebut.setHours(0, 0, 0, 0);
    } else if (periode === 'semaine') {
      dateDebut.setDate(dateDebut.getDate() - 7);
    } else {
      dateDebut.setMonth(dateDebut.getMonth() - 1);
    }

    const topProduits = await prisma.venteDetail.groupBy({
      by: ['produitId'],
      where: {
        vente: {
          boutiqueId,
          statut: { not: 'ANNULEE' },
          createdAt: { gte: dateDebut },
        },
      },
      _sum: { quantite: true, sousTotal: true },
      _count: true,
      orderBy: { _sum: { sousTotal: 'desc' } },
      take: 10,
    });

    // Récupérer les noms
    const produitIds = topProduits.map(t => t.produitId);
    const produits = await prisma.produit.findMany({
      where: { id: { in: produitIds } },
      select: { id: true, nom: true, uniteBase: true },
    });

    const data = topProduits.map(t => {
      const produit = produits.find(p => p.id === t.produitId);
      return {
        produit: produit?.nom || 'Inconnu',
        unite: produit?.uniteBase,
        quantiteVendue: t._sum.quantite,
        chiffreAffaires: t._sum.sousTotal,
        nombreVentes: t._count,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('Erreur getTopProduits:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Performance des employés
const getPerformanceEmployes = async (req, res) => {
  try {
    const boutiqueId = req.boutiqueId;
    const firstDayMonth = new Date();
    firstDayMonth.setDate(1);
    firstDayMonth.setHours(0, 0, 0, 0);

    const performances = await prisma.vente.groupBy({
      by: ['userId'],
      where: {
        boutiqueId,
        statut: { not: 'ANNULEE' },
        createdAt: { gte: firstDayMonth },
      },
      _sum: { montantTotal: true },
      _count: true,
    });

    const userIds = performances.map(p => p.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, nom: true, prenom: true },
    });

    const data = performances.map(p => {
      const user = users.find(u => u.id === p.userId);
      return {
        employe: user ? `${user.prenom} ${user.nom}` : 'Inconnu',
        nombreVentes: p._count,
        chiffreAffaires: p._sum.montantTotal,
      };
    }).sort((a, b) => b.chiffreAffaires - a.chiffreAffaires);

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Ventes par jour (graphique)
const getVentesParJour = async (req, res) => {
  try {
    const { jours = 30 } = req.query;
    const boutiqueId = req.boutiqueId;
    const dateDebut = new Date();
    dateDebut.setDate(dateDebut.getDate() - parseInt(jours));

    const ventesRaw = await prisma.vente.findMany({
      where: {
        boutiqueId,
        statut: { not: 'ANNULEE' },
        createdAt: { gte: dateDebut },
      },
      select: { createdAt: true, montantTotal: true },
    });
    // Group by date
    const ventesMap = {};
    ventesRaw.forEach(v => {
      const date = v.createdAt.toISOString().split('T')[0];
      if (!ventesMap[date]) ventesMap[date] = { date, nombre_ventes: 0, total: 0 };
      ventesMap[date].nombre_ventes++;
      ventesMap[date].total += v.montantTotal;
    });
    const ventes = Object.values(ventesMap).sort((a, b) => a.date.localeCompare(b.date));

    res.json({ success: true, data: ventes });
  } catch (error) {
    console.error('Erreur getVentesParJour:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

module.exports = { getDashboard, getTopProduits, getPerformanceEmployes, getVentesParJour };

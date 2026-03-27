// Contrôleur Statistiques / Dashboard
const prisma = require('../../config/database');
const { error: sendError } = require('../../common/utils/response');
const logger = require('../../common/utils/logger');

const roundValue = (value, digits = 2) => Number((value || 0).toFixed(digits));

const getDateDebutForPeriode = (periode) => {
  const now = new Date();

  if (periode === 'jour') {
    now.setHours(0, 0, 0, 0);
    return now;
  }

  if (periode === 'semaine') {
    now.setDate(now.getDate() - 7);
    return now;
  }

  return new Date(now.getFullYear(), now.getMonth(), 1);
};

const getReliableQuantiteBase = (detail) => {
  if (detail.quantiteBase !== null && detail.quantiteBase !== undefined) {
    return detail.quantiteBase;
  }

  if (!detail.uniteNom || detail.uniteNom === detail.produit.uniteBase) {
    return detail.quantite;
  }

  const uniteVente = detail.produit.unitesVente.find((unite) => unite.nom === detail.uniteNom);

  if (uniteVente?.facteurConversion) {
    return detail.quantite * uniteVente.facteurConversion;
  }

  return detail.quantite;
};

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
      const detailSelect = {
        include: {
          produit: {
            select: {
              prixAchat: true,
              uniteBase: true,
              unitesVente: { select: { nom: true, facteurConversion: true } },
            },
          },
        },
      };

      const ventesDetailJour = await prisma.venteDetail.findMany({
        where: {
          vente: {
            boutiqueId,
            statut: { not: 'ANNULEE' },
            createdAt: { gte: today, lt: tomorrow },
          },
        },
        ...detailSelect,
      });

      beneficeJour = ventesDetailJour.reduce((sum, d) => {
        const facteur = d.produit.unitesVente?.find(u => u.nom === d.uniteNom)?.facteurConversion ?? 1;
        return sum + (d.prixUnitaire - d.produit.prixAchat * facteur) * d.quantite;
      }, 0);

      const ventesDetailMois = await prisma.venteDetail.findMany({
        where: {
          vente: {
            boutiqueId,
            statut: { not: 'ANNULEE' },
            createdAt: { gte: firstDayMonth },
          },
        },
        ...detailSelect,
      });

      beneficeMois = ventesDetailMois.reduce((sum, d) => {
        const facteur = d.produit.unitesVente?.find(u => u.nom === d.uniteNom)?.facteurConversion ?? 1;
        return sum + (d.prixUnitaire - d.produit.prixAchat * facteur) * d.quantite;
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

    // Produits en alerte stock — agrégat SQL via groupBy n'est pas possible sur comparaison de colonnes
    // On utilise une requête count avec filtre raw pour éviter de charger tous les produits
    const alertesStockCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM produits
      WHERE "boutiqueId" = ${boutiqueId} AND actif = true AND stock <= "stockAlerte"
    `.then(rows => Number(rows[0]?.count ?? 0));

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
    logger.error('Erreur getDashboard', error);
    return sendError(res, 'Erreur serveur', 500, { code: 'DASHBOARD_FETCH_FAILED' });
  }
};

// Produits les plus vendus
const getTopProduits = async (req, res) => {
  try {
    const { periode } = req.query; // jour, semaine, mois
    const boutiqueId = req.boutiqueId;

    const dateDebut = getDateDebutForPeriode(periode);

    const venteDetails = await prisma.venteDetail.findMany({
      where: {
        vente: {
          boutiqueId,
          statut: { not: 'ANNULEE' },
          createdAt: { gte: dateDebut },
        },
      },
      include: {
        produit: {
          select: {
            id: true,
            nom: true,
            uniteBase: true,
            unitesVente: {
              select: { nom: true, facteurConversion: true },
            },
          },
        },
      },
    });

    const aggregation = new Map();

    for (const detail of venteDetails) {
      if (!detail.produit) continue;

      const current = aggregation.get(detail.produitId) || {
        produit: detail.produit.nom || 'Inconnu',
        unite: detail.produit.uniteBase,
        quantiteVendue: 0,
        chiffreAffaires: 0,
        nombreVentes: 0,
        quantitesParUnite: {},
        quantitesBaseParUnite: {},
        venteIds: new Set(),
      };

      const uniteVendue = detail.uniteNom || detail.produit.uniteBase;
      const quantiteBase = getReliableQuantiteBase(detail);

      current.quantiteVendue += quantiteBase;
      current.chiffreAffaires += detail.sousTotal || 0;
      current.quantitesParUnite[uniteVendue] = (current.quantitesParUnite[uniteVendue] || 0) + (detail.quantite || 0);
      current.quantitesBaseParUnite[uniteVendue] = (current.quantitesBaseParUnite[uniteVendue] || 0) + quantiteBase;
      current.venteIds.add(detail.venteId);

      aggregation.set(detail.produitId, current);
    }

    const data = Array.from(aggregation.values())
      .map((item) => ({
        produit: item.produit,
        unite: item.unite,
        quantiteVendue: roundValue(item.quantiteVendue, 4),
        chiffreAffaires: roundValue(item.chiffreAffaires, 2),
        nombreVentes: item.venteIds.size,
        quantitesParUnite: Object.entries(item.quantitesParUnite)
          .map(([unite, quantite]) => ({
            unite,
            quantite: roundValue(quantite, 4),
            quantiteBase: roundValue(item.quantitesBaseParUnite[unite] || 0, 4),
          }))
          .sort((a, b) => {
            if (b.quantiteBase !== a.quantiteBase) return b.quantiteBase - a.quantiteBase;
            return b.quantite - a.quantite;
          }),
      }))
      .sort((a, b) => {
        if (b.chiffreAffaires !== a.chiffreAffaires) return b.chiffreAffaires - a.chiffreAffaires;
        if (b.quantiteVendue !== a.quantiteVendue) return b.quantiteVendue - a.quantiteVendue;
        return b.nombreVentes - a.nombreVentes;
      })
      .slice(0, 10);

    res.json({ success: true, data });
  } catch (error) {
    logger.error('Erreur getTopProduits', error);
    return sendError(res, 'Erreur serveur', 500, { code: 'TOP_PRODUCTS_FETCH_FAILED' });
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
    logger.error('Erreur getPerformanceEmployes', error);
    return sendError(res, 'Erreur serveur', 500, { code: 'PERF_EMPLOYES_FETCH_FAILED' });
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
    logger.error('Erreur getVentesParJour', error);
    return sendError(res, 'Erreur serveur', 500, { code: 'VENTES_PAR_JOUR_FETCH_FAILED' });
  }
};

module.exports = { getDashboard, getTopProduits, getPerformanceEmployes, getVentesParJour };

'use strict';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Format: name{labels} value
const gauge = (name, labels, value, help) => {
  const lb = Object.entries(labels).map(([k,v]) => `${k}="${v}"`).join(',');
  return `# HELP ${name} ${help}\n# TYPE ${name} gauge\n${name}{${lb}} ${value}`;
};

async function collectMetrics() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    boutiquesActives,
    boutiquesSuspendues,
    usersTotal,
    clientsTotal,
    produitsTotal,
    produitsRuptureStock,
    produitsAlerte,
    // Ventes aujourd'hui
    ventesAujourdhui,
    ventesCompletees,
    ventesCredit,
    ventesAnnulees,
    // CA
    caAujourdhui,
    caMois,
    // Dettes
    dettesEnCours,
    montantDettesEnCours,
    // Abonnements
    aboActifs,
    aboExpires,
    // Plans
    boutiquesGratuit,
    boutiquesPro,
    boutiquesBusiness,
  ] = await Promise.all([
    prisma.boutique.count({ where: { statut: 'ACTIVE', deletedAt: null } }),
    prisma.boutique.count({ where: { statut: 'SUSPENDUE', deletedAt: null } }),
    prisma.user.count({ where: { actif: true } }),
    prisma.client.count(),
    prisma.produit.count({ where: { actif: true } }),
    prisma.produit.count({ where: { actif: true, stock: { lte: 0 } } }),
    prisma.produit.count({ where: { actif: true, stock: { gt: 0 } } }), // produits avec stock > 0
    // Ventes aujourd'hui
    prisma.vente.count({ where: { createdAt: { gte: startOfDay }, statut: 'COMPLETEE' } }),
    prisma.vente.count({ where: { statut: 'COMPLETEE' } }),
    prisma.vente.count({ where: { statut: 'EN_CREDIT' } }),
    prisma.vente.count({ where: { statut: 'ANNULEE' } }),
    // CA aujourd'hui (ventes completees)
    prisma.vente.aggregate({ where: { createdAt: { gte: startOfDay }, statut: 'COMPLETEE' }, _sum: { montantPaye: true } }),
    prisma.vente.aggregate({ where: { createdAt: { gte: startOfMonth }, statut: 'COMPLETEE' }, _sum: { montantPaye: true } }),
    // Dettes
    prisma.dette.count({ where: { statut: 'EN_COURS' } }),
    prisma.dette.aggregate({ where: { statut: 'EN_COURS' }, _sum: { montantRestant: true } }),
    // Abonnements
    prisma.abonnement.count({ where: { statut: 'ACTIF' } }),
    prisma.abonnement.count({ where: { statut: 'EXPIRE' } }),
    // Plans
    prisma.boutique.count({ where: { plan: 'GRATUIT', statut: 'ACTIVE', deletedAt: null } }),
    prisma.boutique.count({ where: { plan: 'PRO', statut: 'ACTIVE', deletedAt: null } }),
    prisma.boutique.count({ where: { plan: 'BUSINESS', statut: 'ACTIVE', deletedAt: null } }),
  ]);

  const lines = [
    gauge('tekkipro_boutiques', { statut: 'ACTIVE' },  boutiquesActives,   'Boutiques actives'),
    gauge('tekkipro_boutiques', { statut: 'SUSPENDUE' }, boutiquesSuspendues, 'Boutiques suspendues'),
    gauge('tekkipro_boutiques_plan', { plan: 'GRATUIT' }, boutiquesGratuit, 'Boutiques par plan'),
    gauge('tekkipro_boutiques_plan', { plan: 'PRO' },     boutiquesPro,     'Boutiques par plan'),
    gauge('tekkipro_boutiques_plan', { plan: 'BUSINESS' },boutiquesBusiness,'Boutiques par plan'),
    gauge('tekkipro_users_total',    {}, usersTotal,    'Utilisateurs actifs'),
    gauge('tekkipro_clients_total',  {}, clientsTotal,  'Clients total'),
    gauge('tekkipro_produits_total', {}, produitsTotal, 'Produits actifs'),
    gauge('tekkipro_produits_rupture_stock', {}, produitsRuptureStock, 'Produits en rupture'),
    gauge('tekkipro_ventes_total',   { statut: 'COMPLETEE' }, ventesCompletees, 'Ventes par statut'),
    gauge('tekkipro_ventes_total',   { statut: 'EN_CREDIT' }, ventesCredit,     'Ventes par statut'),
    gauge('tekkipro_ventes_total',   { statut: 'ANNULEE' },   ventesAnnulees,   'Ventes par statut'),
    gauge('tekkipro_ventes_aujourd_hui', {}, ventesAujourdhui, 'Ventes completees aujourd_hui'),
    gauge('tekkipro_ca_aujourd_hui_fcfa', {}, caAujourdhui._sum.montantPaye || 0, 'Chiffre affaires aujourd_hui FCFA'),
    gauge('tekkipro_ca_mois_fcfa',        {}, caMois._sum.montantPaye || 0,        'Chiffre affaires mois courant FCFA'),
    gauge('tekkipro_dettes_en_cours',     {}, dettesEnCours,  'Nombre dettes en cours'),
    gauge('tekkipro_dettes_montant_fcfa', {}, montantDettesEnCours._sum.montantRestant || 0, 'Montant dettes restant FCFA'),
    gauge('tekkipro_abonnements', { statut: 'ACTIF' },  aboActifs,  'Abonnements par statut'),
    gauge('tekkipro_abonnements', { statut: 'EXPIRE' }, aboExpires, 'Abonnements par statut'),
  ];

  return lines.join('\n') + '\n';
}

module.exports = { collectMetrics };

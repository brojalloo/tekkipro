// Contrôleur Factures - Génération PDF professionnelle (compatible N&B)
const PDFDocument = require('pdfkit');
const prisma = require('../config/database');

// Palette compatible impression noir & blanc — texte toujours foncé, fonds très légers
const C = {
  black: '#000000',
  dark: '#1a1a1a',       // texte principal
  medium: '#444444',     // texte secondaire
  light: '#888888',      // texte léger
  faintBg: '#f5f5f5',    // fond très léger (quasi blanc en N&B)
  border: '#999999',     // bordures visibles en N&B
  borderLight: '#cccccc', // bordures légères
};

const formatCFA = (n) => {
  const num = Math.round(Number(n));
  const str = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return str + ' F';
};

const drawLine = (doc, y, x1 = 50, x2 = 545, color = C.borderLight, width = 0.5) => {
  doc.strokeColor(color).lineWidth(width).moveTo(x1, y).lineTo(x2, y).stroke();
};

// Dessiner un rectangle avec bordure (pas de fond plein foncé)
const drawRect = (doc, x, y, w, h, opts = {}) => {
  const { fill, stroke, radius, lineWidth } = { fill: null, stroke: C.border, radius: 0, lineWidth: 1, ...opts };
  if (radius > 0) {
    if (fill) doc.roundedRect(x, y, w, h, radius).fill(fill);
    if (stroke) doc.roundedRect(x, y, w, h, radius).lineWidth(lineWidth).strokeColor(stroke).stroke();
  } else {
    if (fill) doc.rect(x, y, w, h).fill(fill);
    if (stroke) doc.rect(x, y, w, h).lineWidth(lineWidth).strokeColor(stroke).stroke();
  }
};

// Générer une facture PDF pour une vente
const genererFacture = async (req, res) => {
  try {
    const { id } = req.params;

    const vente = await prisma.vente.findFirst({
      where: { id: parseInt(id), boutiqueId: req.boutiqueId },
      include: {
        details: { include: { produit: { select: { nom: true, uniteBase: true } } } },
        client: true,
        user: { select: { nom: true, prenom: true } },
        boutique: true,
      },
    });

    if (!vente) {
      return res.status(404).json({ success: false, message: 'Vente non trouvée' });
    }

    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=facture-${vente.numero}.pdf`);
    doc.pipe(res);

    const pageWidth = 595.28;
    const mL = 50;   // margin left
    const mR = 545;  // margin right
    const contentW = mR - mL;
    const boutique = vente.boutique;

    // =============================================================
    // BANDE SUPÉRIEURE FINE (trait décoratif — reste fin en N&B)
    // =============================================================
    drawLine(doc, 12, 0, pageWidth, C.dark, 2);

    // =============================================================
    // EN-TÊTE : Boutique à gauche, FACTURE à droite
    // =============================================================
    const hStart = 28;

    // — Nom boutique (gras, noir)
    doc.fillColor(C.black).font('Helvetica-Bold').fontSize(20)
       .text(boutique.nom.toUpperCase(), mL, hStart);

    let iy = hStart + 26;
    doc.font('Helvetica').fontSize(9).fillColor(C.medium);
    if (boutique.adresse) { doc.text(boutique.adresse, mL, iy); iy += 13; }
    if (boutique.telephone) { doc.text(`Tél : ${boutique.telephone}`, mL, iy); iy += 13; }
    if (boutique.email) { doc.text(boutique.email, mL, iy); iy += 13; }
    if (boutique.ninea) {
      doc.font('Helvetica-Bold').fillColor(C.dark)
         .text(`NINEA : ${boutique.ninea}`, mL, iy);
      iy += 13;
    }

    // — Badge FACTURE (bordure + texte foncé, pas de fond plein)
    const badgeW = 160;
    const badgeH = 38;
    const badgeX = mR - badgeW;
    const badgeY = hStart;
    drawRect(doc, badgeX, badgeY, badgeW, badgeH, { stroke: C.dark, radius: 4, lineWidth: 1.5 });
    doc.fillColor(C.black).font('Helvetica-Bold').fontSize(18)
       .text('FACTURE', badgeX, badgeY + 10, { width: badgeW, align: 'center' });

    // — Détails facture sous le badge
    let fy = badgeY + badgeH + 10;
    doc.font('Helvetica').fontSize(9).fillColor(C.dark);
    doc.text(`N° ${vente.numero}`, badgeX, fy, { width: badgeW, align: 'right' });
    fy += 14;
    doc.text(`Date : ${new Date(vente.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`, badgeX, fy, { width: badgeW, align: 'right' });
    fy += 14;
    doc.text(`Vendeur : ${vente.user.prenom} ${vente.user.nom}`, badgeX, fy, { width: badgeW, align: 'right' });

    // =============================================================
    // SECTION CLIENT
    // =============================================================
    let cY = Math.max(iy, fy) + 25;

    if (vente.client) {
      const cBoxH = vente.client.telephone ? 58 : 46;
      // Fond très léger + bordure fine
      drawRect(doc, mL, cY, contentW, cBoxH, { fill: C.faintBg, stroke: C.borderLight, radius: 3, lineWidth: 0.5 });

      cY += 10;
      doc.font('Helvetica-Bold').fontSize(9).fillColor(C.medium)
         .text('FACTURÉ À :', mL + 15, cY);
      cY += 14;
      doc.font('Helvetica-Bold').fontSize(10).fillColor(C.dark)
         .text(`${vente.client.prenom || ''} ${vente.client.nom}`.trim(), mL + 15, cY);
      if (vente.client.telephone) {
        cY += 14;
        doc.font('Helvetica').fontSize(9).fillColor(C.medium)
           .text(`Tél : ${vente.client.telephone}`, mL + 15, cY);
      }
      cY += 25;
    }

    cY += 10;

    // =============================================================
    // TABLEAU PRODUITS
    // =============================================================
    const col = {
      x: { prod: mL, qty: 230, pu: 300, frac: 390, tot: 460 },
      w: { prod: 170, qty: 65, pu: 85, frac: 65, tot: 85 },
    };

    // En-tête tableau — fond très clair + bordures + texte noir gras
    const thH = 26;
    drawRect(doc, mL, cY, contentW, thH, { fill: C.faintBg, stroke: C.border, lineWidth: 0.8 });
    drawLine(doc, cY + thH, mL, mR, C.border, 0.8);

    const thY = cY + 7;
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.dark);
    doc.text('DÉSIGNATION', col.x.prod + 10, thY, { width: col.w.prod });
    doc.text('QTÉ', col.x.qty, thY, { width: col.w.qty, align: 'center' });
    doc.text('P. UNIT.', col.x.pu, thY, { width: col.w.pu, align: 'right' });
    doc.text('UNITÉ', col.x.frac, thY, { width: col.w.frac, align: 'center' });
    doc.text('TOTAL', col.x.tot, thY, { width: col.w.tot, align: 'right' });

    cY += thH;

    // Lignes produits — alternance de fond très léger
    doc.font('Helvetica').fontSize(9);
    vente.details.forEach((detail, i) => {
      const rH = 24;
      if (i % 2 === 0) {
        doc.rect(mL, cY, contentW, rH).fill(C.faintBg);
      }
      // Bordure latérale légère
      doc.strokeColor(C.borderLight).lineWidth(0.3)
         .moveTo(mL, cY).lineTo(mL, cY + rH).stroke()
         .moveTo(mR, cY).lineTo(mR, cY + rH).stroke();

      const rY = cY + 7;
      doc.fillColor(C.dark);
      doc.font('Helvetica').text(detail.produit.nom, col.x.prod + 10, rY, { width: col.w.prod });
      doc.text(`${Number(detail.quantite)}`, col.x.qty, rY, { width: col.w.qty, align: 'center' });
      doc.text(formatCFA(detail.prixUnitaire), col.x.pu, rY, { width: col.w.pu, align: 'right' });
      doc.text(detail.uniteNom || detail.produit.uniteBase || '—', col.x.frac, rY, { width: col.w.frac, align: 'center' });
      doc.font('Helvetica-Bold').text(formatCFA(detail.sousTotal), col.x.tot, rY, { width: col.w.tot, align: 'right' });
      doc.font('Helvetica');

      cY += rH;
    });

    // Fermeture tableau
    drawLine(doc, cY, mL, mR, C.border, 0.8);
    cY += 18;

    // =============================================================
    // TOTAUX (à droite)
    // =============================================================
    const tW = 220;
    const tX = mR - tW;
    const total = Number(vente.montantTotal);
    const paye = Number(vente.montantPaye);
    const reste = total - paye;

    doc.font('Helvetica').fontSize(9).fillColor(C.medium);
    doc.text('Sous-total :', tX, cY, { width: tW - 5, align: 'left' });
    doc.text(formatCFA(total), tX, cY, { width: tW - 5, align: 'right' });
    cY += 18;

    const modeLabel = vente.modePaiement === 'CASH' ? 'Espèces' : vente.modePaiement === 'MOBILE_MONEY' ? 'Mobile Money' : 'Crédit';
    doc.text('Mode de paiement :', tX, cY, { width: tW - 5, align: 'left' });
    doc.text(modeLabel, tX, cY, { width: tW - 5, align: 'right' });
    cY += 18;

    drawLine(doc, cY, tX, mR, C.borderLight);
    cY += 8;

    // Montant payé
    doc.font('Helvetica').fillColor(C.dark);
    doc.text('Montant payé :', tX, cY, { width: tW - 5, align: 'left' });
    doc.text(formatCFA(paye), tX, cY, { width: tW - 5, align: 'right' });
    cY += 18;

    // Reste à payer
    if (reste > 0) {
      doc.font('Helvetica-Bold').fillColor(C.dark);
      doc.text('Reste à payer :', tX, cY, { width: tW - 5, align: 'left' });
      doc.text(formatCFA(reste), tX, cY, { width: tW - 5, align: 'right' });
      cY += 18;
    }

    drawLine(doc, cY, tX, mR, C.border, 1);
    cY += 8;

    // TOTAL TTC — bordure épaisse + texte noir gras (pas de fond plein)
    const ttcH = 30;
    drawRect(doc, tX, cY, tW, ttcH, { stroke: C.dark, radius: 3, lineWidth: 1.5 });
    doc.fillColor(C.black).font('Helvetica-Bold').fontSize(11);
    doc.text('TOTAL TTC', tX + 10, cY + 8);
    doc.text(formatCFA(total), tX, cY + 8, { width: tW - 10, align: 'right' });
    cY += ttcH + 30;

    // =============================================================
    // PIED DE PAGE
    // =============================================================
    drawLine(doc, 760, mL, mR, C.borderLight);

    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.dark)
       .text('Merci pour votre confiance !', mL, 770, { width: contentW, align: 'center' });

    doc.font('Helvetica').fontSize(8).fillColor(C.light)
       .text(`${boutique.nom} — ${boutique.adresse || ''} — ${boutique.telephone || ''}`, mL, 785, { width: contentW, align: 'center' });

    if (boutique.ninea) {
      doc.text(`NINEA : ${boutique.ninea}`, mL, 797, { width: contentW, align: 'center' });
    }

    // Bande inférieure fine
    drawLine(doc, 830, 0, pageWidth, C.dark, 2);

    doc.end();
  } catch (error) {
    console.error('Erreur genererFacture:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la génération de la facture' });
  }
};

module.exports = { genererFacture };

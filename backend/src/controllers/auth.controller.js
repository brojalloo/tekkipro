// Contrôleur d'authentification
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../config/database');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/email.service');

// Inscription d'une nouvelle boutique + admin
const register = async (req, res) => {
  try {
    const { nomBoutique, slug, nom, prenom, email, password, telephone } = req.body;

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Cet email est déjà utilisé' });
    }

    // Vérifier si le slug existe déjà
    const existingBoutique = await prisma.boutique.findUnique({ where: { slug } });
    if (existingBoutique) {
      return res.status(400).json({ success: false, message: 'Ce nom de boutique est déjà pris' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer boutique + admin en transaction
    const result = await prisma.$transaction(async (tx) => {
      const boutique = await tx.boutique.create({
        data: {
          nom: nomBoutique,
          slug,
          email,
          telephone,
        },
      });

      const user = await tx.user.create({
        data: {
          nom,
          prenom,
          email,
          password: hashedPassword,
          telephone,
          role: 'ADMIN',
          boutiqueId: boutique.id,
          emailVerifie: false,
          tokenVerification: crypto.randomBytes(32).toString('hex'),
          tokenVerificationExp: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h
        },
      });

      // Créer les catégories par défaut
      const categoriesDefaut = ['Alimentation', 'Boissons', 'Cosmétiques', 'Quincaillerie', 'Divers'];
      for (const cat of categoriesDefaut) {
        await tx.categorie.create({
          data: { nom: cat, boutiqueId: boutique.id },
        });
      }

      return { boutique, user };
    });

    const token = jwt.sign(
      { id: result.user.id, role: result.user.role, boutiqueId: result.boutique.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Envoyer l'email de vérification (async, ne bloque pas la réponse)
    sendVerificationEmail(result.user, result.user.tokenVerification).catch(err => {
      console.error('Erreur envoi email vérification:', err.message);
    });

    res.status(201).json({
      success: true,
      message: 'Boutique créée avec succès. Vérifiez votre email pour activer votre compte.',
      data: {
        token,
        user: {
          id: result.user.id,
          nom: result.user.nom,
          prenom: result.user.prenom,
          email: result.user.email,
          telephone: result.user.telephone,
          role: result.user.role,
          boutiqueId: result.boutique.id,
        },
        boutique: {
          id: result.boutique.id,
          nom: result.boutique.nom,
          slug: result.boutique.slug,
        },
      },
    });
  } catch (error) {
    console.error('Erreur register:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'inscription' });
  }
};

// Connexion
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { boutique: true },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
    }

    if (!user.actif) {
      return res.status(401).json({ success: false, message: 'Votre compte est désactivé' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, boutiqueId: user.boutiqueId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          nom: user.nom,
          prenom: user.prenom,
          email: user.email,
          role: user.role,
          telephone: user.telephone,
        },
        boutique: {
          id: user.boutique.id,
          nom: user.boutique.nom,
          slug: user.boutique.slug,
          plan: user.boutique.plan,
        },
      },
    });
  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la connexion' });
  }
};

// Profil utilisateur courant
const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        role: true,
        actif: true,
        boutiqueId: true,
        createdAt: true,
        boutique: true,
      },
    });
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Erreur getMe:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Ajouter un employé (admin seulement)
const addEmployee = async (req, res) => {
  try {
    const { nom, prenom, email, password, telephone } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Cet email est déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        nom,
        prenom,
        email,
        password: hashedPassword,
        telephone,
        role: 'EMPLOYE',
        boutiqueId: req.boutiqueId,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Employé ajouté avec succès',
      data: { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Erreur addEmployee:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'ajout de l\'employé' });
  }
};

// Lister les employés
const getEmployees = async (req, res) => {
  try {
    const employees = await prisma.user.findMany({
      where: { boutiqueId: req.boutiqueId },
      select: { id: true, nom: true, prenom: true, email: true, role: true, telephone: true, actif: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Activer / Désactiver un employé
const toggleEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findFirst({
      where: { id: parseInt(id), boutiqueId: req.boutiqueId },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Employé non trouvé' });
    }

    const updated = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { actif: !user.actif },
    });

    res.json({ success: true, message: `Employé ${updated.actif ? 'activé' : 'désactivé'}`, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Vérifier l'email via token
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token manquant' });
    }

    const user = await prisma.user.findFirst({
      where: {
        tokenVerification: token,
        tokenVerificationExp: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Token invalide ou expiré' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifie: true,
        tokenVerification: null,
        tokenVerificationExp: null,
      },
    });

    res.json({ success: true, message: 'Email vérifié avec succès. Vous pouvez maintenant vous connecter.' });
  } catch (error) {
    console.error('Erreur verifyEmail:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la vérification' });
  }
};

// Renvoyer l'email de vérification
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email requis' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Ne pas révéler si l'email existe
      return res.json({ success: true, message: 'Si cet email existe, un lien de vérification a été envoyé.' });
    }

    if (user.emailVerifie) {
      return res.status(400).json({ success: false, message: 'Cet email est déjà vérifié' });
    }

    const newToken = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: {
        tokenVerification: newToken,
        tokenVerificationExp: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });

    sendVerificationEmail(user, newToken).catch(err => {
      console.error('Erreur renvoi email vérification:', err.message);
    });

    res.json({ success: true, message: 'Si cet email existe, un lien de vérification a été envoyé.' });
  } catch (error) {
    console.error('Erreur resendVerification:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Mot de passe oublié — envoi du lien de réinitialisation
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email requis' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Ne pas révéler si l'email existe
      return res.json({ success: true, message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: {
        tokenResetPassword: resetToken,
        tokenResetPasswordExp: new Date(Date.now() + 60 * 60 * 1000), // 1h
      },
    });

    sendPasswordResetEmail(user, resetToken).catch(err => {
      console.error('Erreur envoi email reset:', err.message);
    });

    res.json({ success: true, message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' });
  } catch (error) {
    console.error('Erreur forgotPassword:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Réinitialiser le mot de passe avec le token
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token et nouveau mot de passe requis' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    const user = await prisma.user.findFirst({
      where: {
        tokenResetPassword: token,
        tokenResetPasswordExp: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Token invalide ou expiré' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        tokenResetPassword: null,
        tokenResetPasswordExp: null,
      },
    });

    res.json({ success: true, message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    console.error('Erreur resetPassword:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

module.exports = { register, login, getMe, addEmployee, getEmployees, toggleEmployee, verifyEmail, resendVerification, forgotPassword, resetPassword };

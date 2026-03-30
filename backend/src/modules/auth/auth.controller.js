// Contrôleur d'authentification
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../../config/database');
const logger = require('../../common/utils/logger');
const { logAudit } = require('../../common/utils/auditLog');
const {
  badRequest,
  conflict,
  created,
  error: sendError,
  forbidden,
  notFound,
  unauthorized,
} = require('../../common/utils/response');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../../services/email.service');
const { PLAN_LIMITS } = require('../../middleware/auth.middleware');
const { isStrongPassword, getPasswordValidationMessage } = require('../../common/utils/password');

const isEmailVerificationEnforced = () => process.env.NODE_ENV === 'production' || Boolean(process.env.SMTP_HOST);

const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

const countOtherActiveAdmins = (boutiqueId, excludedUserId) => prisma.user.count({
  where: {
    boutiqueId,
    role: 'ADMIN',
    actif: true,
    id: { not: excludedUserId },
  },
});

// Inscription d'une nouvelle boutique + admin
const register = async (req, res) => {
  try {
    const { nomBoutique, slug, nom, prenom, email, password, telephone } = req.body;
    if (!isStrongPassword(password)) {
      return badRequest(res, getPasswordValidationMessage(), { code: 'WEAK_PASSWORD' });
    }

    const enforceEmailVerification = isEmailVerificationEnforced();
    const verificationToken = enforceEmailVerification ? crypto.randomBytes(32).toString('hex') : null;
    const verificationTokenHash = verificationToken ? hashToken(verificationToken) : null;

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return conflict(res, 'Cet email est déjà utilisé', { code: 'EMAIL_ALREADY_USED' });
    }

    // Vérifier si le slug existe déjà
    const existingBoutique = await prisma.boutique.findUnique({ where: { slug } });
    if (existingBoutique) {
      return conflict(res, 'Ce nom de boutique est déjà pris', { code: 'BOUTIQUE_SLUG_TAKEN' });
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
          emailVerifie: !enforceEmailVerification,
          tokenVerification: verificationTokenHash,
          tokenVerificationExp: verificationToken ? new Date(Date.now() + 48 * 60 * 60 * 1000) : null, // 48h
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

    const token = verificationToken
      ? null
      : jwt.sign(
          { id: result.user.id, role: result.user.role, boutiqueId: result.boutique.id },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
        );

    if (verificationToken) {
      // Envoyer l'email de vérification (async, ne bloque pas la réponse)
      sendVerificationEmail(result.user, verificationToken).catch(err => {
        logger.warn('Erreur envoi email vérification', { err: err.message });
      });
    }

    return created(res, {
      requiresEmailVerification: Boolean(verificationToken),
      emailVerificationSentTo: verificationToken ? result.user.email : null,
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
      ...(token ? { token } : {}),
    }, verificationToken
      ? 'Boutique créée avec succès. Vérifiez votre email pour activer votre compte.'
      : 'Boutique créée avec succès.');
  } catch (error) {
    logger.error('Erreur register', error);
    return sendError(res, 'Erreur lors de l\'inscription', 500, { code: 'REGISTER_FAILED' });
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
      return unauthorized(res, 'Email ou mot de passe incorrect', { code: 'INVALID_CREDENTIALS' });
    }

    if (!user.actif) {
      return unauthorized(res, 'Votre compte est désactivé', { code: 'ACCOUNT_DISABLED' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return unauthorized(res, 'Email ou mot de passe incorrect', { code: 'INVALID_CREDENTIALS' });
    }

    const requiresEmailVerification = user.role === 'ADMIN' || Boolean(user.tokenVerification);
    if (isEmailVerificationEnforced() && requiresEmailVerification && !user.emailVerifie) {
      return forbidden(res, 'Veuillez vérifier votre email avant de vous connecter.', { code: 'EMAIL_NOT_VERIFIED' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, boutiqueId: user.boutiqueId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
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
        boutique: user.boutique ? {
          id: user.boutique.id,
          nom: user.boutique.nom,
          slug: user.boutique.slug,
          plan: user.boutique.plan,
        } : null,
      },
    });
    if (user.boutiqueId) {
      logAudit(prisma, {
        action: 'CREATE',
        entite: 'connexion',
        entiteId: user.id,
        message: 'Connexion reussie (' + user.email + ')',
        userId: user.id,
        boutiqueId: user.boutiqueId,
      });
    }
  } catch (error) {
    logger.error('Erreur login', error);
    return sendError(res, 'Erreur lors de la connexion', 500, { code: 'LOGIN_FAILED' });
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
        boutique: {
          select: { id: true, nom: true, slug: true, plan: true, devise: true, telephone: true, adresse: true, email: true },
        },
      },
    });

    const boutiqueId = user.boutiqueId;

    // SUPERADMIN n'a pas de boutique — pas de planUsage
    if (!boutiqueId) {
      return res.json({ success: true, data: { ...user, planUsage: null } });
    }

    const plan = user.boutique?.plan || 'GRATUIT';
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.GRATUIT;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [ventesCount, produitsCount, clientsCount] = await Promise.all([
      prisma.vente.count({ where: { boutiqueId, createdAt: { gte: startOfMonth }, statut: { not: 'ANNULEE' } } }),
      prisma.produit.count({ where: { boutiqueId, actif: true } }),
      prisma.client.count({ where: { boutiqueId } }),
    ]);

    const planUsage = {
      ventesParMois: { used: ventesCount,    limit: limits.ventesParMois },
      produits:      { used: produitsCount,  limit: limits.produits },
      clients:       { used: clientsCount,   limit: limits.clients },
    };

    res.json({ success: true, data: { ...user, planUsage } });
  } catch (error) {
    logger.error('Erreur getMe', error);
    return sendError(res, 'Erreur serveur', 500, { code: 'PROFILE_FETCH_FAILED' });
  }
};

// Ajouter un employé (admin seulement)
const addEmployee = async (req, res) => {
  try {
    const { nom, prenom, email, password, telephone } = req.body;

    if (!isStrongPassword(password)) {
      return badRequest(res, getPasswordValidationMessage(), { code: 'WEAK_PASSWORD' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return conflict(res, 'Cet email est déjà utilisé', { code: 'EMAIL_ALREADY_USED' });
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
        emailVerifie: true,
        boutiqueId: req.boutiqueId,
      },
    });

    return created(res, { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, role: user.role }, 'Employé ajouté avec succès');
  } catch (error) {
    logger.error('Erreur addEmployee', error);
    return sendError(res, 'Erreur lors de l\'ajout de l\'employé', 500, { code: 'EMPLOYEE_CREATE_FAILED' });
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
    return sendError(res, 'Erreur serveur', 500, { code: 'EMPLOYEES_FETCH_FAILED' });
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
      return notFound(res, 'Employé non trouvé', { code: 'EMPLOYEE_NOT_FOUND' });
    }

    // Protéger le dernier admin actif : la boutique deviendrait inaccessible
    if (user.actif && user.role === 'ADMIN') {
      const otherAdmins = await countOtherActiveAdmins(req.boutiqueId, user.id);
      if (otherAdmins === 0) {
        return badRequest(res, 'Impossible de désactiver le seul administrateur actif de la boutique.', {
          code: 'LAST_ADMIN_PROTECTION',
        });
      }
    }

    const updated = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { actif: !user.actif },
      select: { id: true, nom: true, prenom: true, email: true, role: true, actif: true },
    });

    res.json({ success: true, message: `Employé ${updated.actif ? 'activé' : 'désactivé'}`, data: updated });
  } catch (error) {
    return sendError(res, 'Erreur serveur', 500, { code: 'EMPLOYEE_TOGGLE_FAILED' });
  }
};

// Vérifier l'email via token
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return badRequest(res, 'Token manquant', { code: 'VERIFICATION_TOKEN_REQUIRED' });
    }

    const tokenHash = hashToken(token);

    const user = await prisma.user.findFirst({
      where: {
        tokenVerification: tokenHash,
        tokenVerificationExp: { gt: new Date() },
      },
    });

    if (!user) {
      return badRequest(res, 'Token invalide ou expiré', { code: 'INVALID_VERIFICATION_TOKEN' });
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
    logger.error('Erreur verifyEmail', error);
    return sendError(res, 'Erreur lors de la vérification', 500, { code: 'EMAIL_VERIFICATION_FAILED' });
  }
};

// Renvoyer l'email de vérification
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return badRequest(res, 'Email requis', { code: 'EMAIL_REQUIRED' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      await new Promise(r => setTimeout(r, 200 + Math.random() * 100));
      return res.json({ success: true, message: 'Si cet email existe, un lien de vérification a été envoyé.' });
    }

    if (user.emailVerifie) {
      return res.json({ success: true, message: 'Si cet email existe et n\'est pas encore vérifié, un lien a été envoyé.' });
    }

    const newToken = crypto.randomBytes(32).toString('hex');
    const newTokenHash = hashToken(newToken);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        tokenVerification: newTokenHash,
        tokenVerificationExp: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });

    sendVerificationEmail(user, newToken).catch(err => {
      logger.warn('Erreur renvoi email vérification', { err: err.message });
    });

    res.json({ success: true, message: 'Si cet email existe, un lien de vérification a été envoyé.' });
  } catch (error) {
    logger.error('Erreur resendVerification', error);
    return sendError(res, 'Erreur serveur', 500, { code: 'RESEND_VERIFICATION_FAILED' });
  }
};

// Mot de passe oublié — envoi du lien de réinitialisation
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return badRequest(res, 'Email requis', { code: 'EMAIL_REQUIRED' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Délai constant pour éviter les timing attacks (énumération email)
      await new Promise(r => setTimeout(r, 200 + Math.random() * 100));
      return res.json({ success: true, message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = hashToken(resetToken);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        tokenResetPassword: resetTokenHash,
        tokenResetPasswordExp: new Date(Date.now() + 60 * 60 * 1000), // 1h
      },
    });

    sendPasswordResetEmail(user, resetToken).catch(err => {
      logger.warn('Erreur envoi email reset', { err: err.message });
    });

    res.json({ success: true, message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' });
  } catch (error) {
    logger.error('Erreur forgotPassword', error);
    return sendError(res, 'Erreur serveur', 500, { code: 'FORGOT_PASSWORD_FAILED' });
  }
};

// Réinitialiser le mot de passe avec le token
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return badRequest(res, 'Token et nouveau mot de passe requis', { code: 'RESET_PASSWORD_FIELDS_REQUIRED' });
    }

    if (!isStrongPassword(password)) {
      return badRequest(res, getPasswordValidationMessage(), { code: 'WEAK_PASSWORD' });
    }

    const tokenHash = hashToken(token);

    const user = await prisma.user.findFirst({
      where: {
        tokenResetPassword: tokenHash,
        tokenResetPasswordExp: { gt: new Date() },
      },
    });

    if (!user) {
      return badRequest(res, 'Token invalide ou expiré', { code: 'INVALID_RESET_TOKEN' });
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
    logger.error('Erreur resetPassword', error);
    return sendError(res, 'Erreur serveur', 500, { code: 'RESET_PASSWORD_FAILED' });
  }
};

// Déconnexion — trace l'événement
const logout = async (req, res) => {
  res.json({ success: true });
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { email: true },
    });
    logAudit(prisma, {
      action: 'CANCEL',
      entite: 'connexion',
      entiteId: req.user.id,
      message: "Deconnexion (" + (user?.email || req.user.id) + ")",
      userId: req.user.id,
      boutiqueId: req.user.boutiqueId,
    });
  } catch {}
};

module.exports = { register, login, logout, getMe, addEmployee, getEmployees, toggleEmployee, verifyEmail, resendVerification, forgotPassword, resetPassword };

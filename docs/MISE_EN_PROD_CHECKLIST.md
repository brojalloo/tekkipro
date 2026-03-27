# Checklist de mise en production TekkiPro

## 1. Préparation
- [ ] Copier `infra/.env.production.template` vers `infra/.env`
- [ ] Remplacer tous les placeholders `__...__`
- [ ] Définir un vrai `JWT_SECRET` long et aléatoire
- [ ] Définir un vrai `POSTGRES_PASSWORD`
- [ ] Définir `FRONTEND_URL` et `APP_URL` sur le domaine final en `https://`

## 2. Sécurité
- [ ] Vérifier que `NODE_ENV=production`
- [ ] Vérifier que le backend démarre sans erreur de validation d'environnement
- [ ] Vérifier que `CORS_ORIGINS` contient uniquement les domaines autorisés
- [ ] Vérifier que Stripe a aussi `STRIPE_WEBHOOK_SECRET`
- [ ] Vérifier que les providers démo ne sont pas utilisés comme paiements réels

## 3. Infra Docker
- [ ] Se placer dans `OneDrive/Bureau/Mysaas/infra`
- [ ] Lancer `docker compose config`
- [ ] Lancer `docker compose up --build -d`
- [ ] Vérifier que `postgres`, `backend` et `frontend` sont `healthy`
- [ ] Vérifier que seuls le frontend est exposé publiquement

## 4. Base de données
- [ ] Vérifier la connexion PostgreSQL
- [ ] Vérifier l'exécution de `prisma migrate deploy`
- [ ] Vérifier qu'aucune migration critique n'est en attente
- [ ] Prévoir une sauvegarde initiale avant ouverture publique

## 5. Backend
- [ ] Vérifier `GET /api/health`
- [ ] Vérifier le login admin
- [ ] Vérifier le blocage d'un email non vérifié
- [ ] Vérifier le rate limiting auth après plusieurs tentatives
- [ ] Vérifier l'envoi d'email si SMTP est configuré

## 6. Frontend
- [ ] Vérifier que le frontend appelle l'API via `/api`
- [ ] Vérifier login, dashboard, produits, ventes, stock, abonnement
- [ ] Vérifier que le changement de boutique fonctionne
- [ ] Vérifier le rendu mobile du dashboard et de la page abonnement

## 7. Paiements
- [ ] Vérifier Stripe souscription de bout en bout
- [ ] Vérifier Stripe webhook en environnement public
- [ ] Vérifier l'historique des paiements après confirmation
- [ ] Ne pas activer Wave/Orange/Free en prod sans validation complète
- [ ] Vérifier les renouvellements avant ouverture publique

## 8. Mobile
- [ ] Vérifier que l'URL API mobile pointe vers la bonne API
- [ ] Vérifier le login mobile
- [ ] Vérifier scan code-barres et création produit

## 9. Monitoring minimal
- [ ] Conserver les logs backend au démarrage
- [ ] Vérifier les erreurs Nginx / frontend
- [ ] Vérifier les erreurs de paiement et emails
- [ ] Prévoir une rotation / collecte de logs

## 10. Smoke tests après mise en ligne
- [ ] Ouvrir le site public
- [ ] Créer un compte test
- [ ] Vérifier l'email de confirmation
- [ ] Se connecter au web
- [ ] Créer un produit
- [ ] Créer une vente
- [ ] Vérifier le stock
- [ ] Tester un paiement réel ou sandbox selon provider

## 11. Go / No-Go
### Go si
- [ ] healthcheck OK
- [ ] login OK
- [ ] SMTP OK ou stratégie email assumée
- [ ] paiement principal validé
- [ ] sauvegarde DB prête

### No-Go si
- [ ] secrets placeholder encore présents
- [ ] renouvellement paiement non validé
- [ ] providers démo exposés comme moyens réels
- [ ] erreurs backend au démarrage
# Guide de déploiement sur Vercel

Ce guide vous explique comment déployer l'application Constructor sur Vercel.

## 📋 Prérequis

- Un compte GitHub avec le repository `https://github.com/eddiedriss-blip/Constructor.git`
- Un compte Vercel (gratuit)
- Les variables d'environnement nécessaires

## 🚀 Déploiement rapide

1. **Connectez votre repository GitHub à Vercel**
   - Allez sur [vercel.com](https://vercel.com)
   - Cliquez sur "Add New Project"
   - Importez le repository `eddiedriss-blip/Constructor`

2. **Configurez les variables d'environnement**

   Dans les paramètres du projet Vercel, ajoutez ces variables d'environnement :

   ```
   DATABASE_URL=votre_url_supabase
   OPENAI_API_KEY=votre_clé_openai
   NODE_ENV=production
   ```

   **Où trouver ces variables :**
   - `DATABASE_URL` : Voir `SUPABASE_SETUP.md
   - `OPENAI_API_KEY` : Voir `OPENAI_SETUP.md`

3. **Configuration automatique**

   Vercel détectera automatiquement :
   - **Framework Preset** : Other
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist/public`
   - **Install Command** : `npm install`

4. **Déployez**

   Cliquez sur "Deploy" et Vercel construira et déploiera automatiquement votre application.

## 🔧 Configuration technique

### Structure du projet

```
Constructor/
├── api/
│   └── index.ts          # Handler serverless Vercel pour les routes API
├── client/               # Application React frontend
├── server/               # Routes Express backend
├── vercel.json          # Configuration Vercel
└── package.json
```

### Architecture

- **Frontend** : Application React servie comme site statique depuis `dist/public`
- **Backend** : Routes Express converties en serverless functions Vercel via `api/index.ts`
- **API Routes** : Toutes les routes `/api/*` sont gérées par la fonction serverless

### Variables d'environnement requises

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DATABASE_URL` | URL de connexion PostgreSQL Supabase | `postgresql://postgres:password@db.xxx.supabase.co:5432/postgres` |
| `OPENAI_API_KEY` | Clé API OpenAI pour les fonctionnalités IA | `sk-proj-...` |
| `NODE_ENV` | Environnement (production) | `production` |

## 📝 Notes importantes

1. **Fichier `.env`** : Le fichier `.env` local n'est **PAS** déployé (protégé par `.gitignore`)
2. **Variables d'environnement** : Configurez-les dans les paramètres Vercel
3. **Build** : Le build génère uniquement le frontend React
4. **API Routes** : Les routes API sont automatiquement converties en serverless functions

## 🐛 Dépannage

### Erreur de build
- Vérifiez que toutes les dépendances sont dans `package.json`
- Vérifiez les logs de build dans Vercel pour plus de détails

### Erreur API
- Vérifiez que les variables d'environnement sont bien configurées
- Vérifiez les logs de fonction dans Vercel

### Base de données non accessible
- Vérifiez que `DATABASE_URL` est correct
- Assurez-vous que Supabase autorise les connexions depuis Vercel (pas de restrictions IP)

## 📚 Ressources

- [Documentation Vercel](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
- [Supabase Setup](./SUPABASE_SETUP.md)
- [OpenAI Setup](./OPENAI_SETUP.md)

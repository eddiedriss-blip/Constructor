# PLANCHAIS App

Application professionnelle pour la gestion de chantiers et devis avec design glassmorphism et fond MeshGradient animé.

## 🚀 Déploiement sur Vercel

### Prérequis
- Compte GitHub
- Compte Vercel
- Node.js 20.x ou supérieur

### Étapes de déploiement

1. **Connecter le dépôt GitHub à Vercel**
   - Allez sur [vercel.com](https://vercel.com)
   - Cliquez sur "New Project"
   - Importez le dépôt `MorganGIT3/PLANCHAIS-app`

2. **Configuration automatique**
   - Vercel détectera automatiquement la configuration depuis `vercel.json`
   - Build Command: `npm run build`
   - Output Directory: `dist/public`
   - Install Command: `npm install`

3. **Variables d'environnement (si nécessaire)**
   - Ajoutez vos variables d'environnement dans les paramètres du projet Vercel
   - Exemple: `PORT`, `NODE_ENV`, `OPENAI_API_KEY`, etc.
   - **Important** : Pour utiliser les fonctionnalités IA, vous devez configurer `OPENAI_API_KEY`
   - Voir `OPENAI_SETUP.md` pour plus de détails

4. **Déploiement**
   - Cliquez sur "Deploy"
   - Vercel construira et déploiera automatiquement votre application

### Commandes locales

```bash
# Installation des dépendances
npm install

# Développement
npm run dev

# Build pour production
npm run build

# Démarrer en production
npm start
```

## 📦 Technologies utilisées

- React 18
- Vite
- TypeScript
- Express
- Tailwind CSS
- Framer Motion
- @paper-design/shaders-react (MeshGradient)
- Wouter (routing)

## 🎨 Fonctionnalités

- Design glassmorphism avec transparence
- Fond MeshGradient animé
- Dashboard complet avec gestion de devis
- CRM Pipeline avec drag & drop
- **Estimation IA** : Analyse automatique d'images de chantier avec GPT-4 Vision
- **Visualisation IA** : Génération de rendus professionnels avec DALL-E 3
- Planning de chantiers
- Gestion des paiements
- Portfolio avant/après
- Analytics

## 🤖 Configuration OpenAI

Pour utiliser les fonctionnalités IA (estimation et visualisation), vous devez :

1. Obtenir une clé API OpenAI sur https://platform.openai.com/api-keys
2. Créer un fichier `.env` à la racine du projet :
   ```
   OPENAI_API_KEY=sk-votre-cle-api-openai-ici
   ```
3. Redémarrer le serveur

Voir `OPENAI_SETUP.md` pour plus de détails.

## 📝 Notes

- Le projet utilise un serveur Express pour servir l'application
- Le build génère les fichiers statiques dans `dist/public`
- Le serveur Express est configuré pour servir les fichiers statiques en production


# Configuration Supabase

Ce guide vous explique comment connecter votre application à Supabase.

## 📋 Prérequis

- Un compte Supabase (gratuit) : [https://app.supabase.com](https://app.supabase.com)
- Node.js installé sur votre machine

## Étape 1 : Créer un projet Supabase

1. Allez sur [https://app.supabase.com](https://app.supabase.com)
2. Créez un compte ou connectez-vous
3. Cliquez sur **"New Project"**
4. Remplissez les informations :
   - **Name** : Nom de votre projet (ex: "Constructo")
   - **Database Password** : Choisissez un mot de passe fort (⚠️ **SAVEZ-LE**, vous en aurez besoin)
   - **Region** : Choisissez la région la plus proche de vous (ex: "West EU (Paris)")
5. Cliquez sur **"Create new project"**
6. Attendez que le projet soit créé (2-3 minutes)

## Étape 2 : Obtenir la connection string (DATABASE_URL)

1. Une fois le projet créé, allez dans **Settings** (icône d'engrenage en bas à gauche)
2. Cliquez sur **Database**
3. Dans la section **Connection string**, sélectionnez **URI**
4. Copiez la connection string qui ressemble à :
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
   ou
   ```
   postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres
   ```
5. **Important** : Remplacez `[PASSWORD]` par le mot de passe que vous avez créé à l'étape 1

## Étape 3 : Configurer votre fichier .env

1. À la racine du projet, créez ou modifiez le fichier `.env`
2. Ajoutez votre connection string :
   ```env
   DATABASE_URL=postgresql://postgres:VOTRE_MOT_DE_PASSE@VOTRE_PROJECT_REF.supabase.co:5432/postgres
   ```
3. Si vous avez déjà d'autres variables (comme `OPENAI_API_KEY`), gardez-les dans le fichier

**Exemple de fichier .env complet :**
```env
# Supabase
DATABASE_URL=postgresql://postgres:monMotDePasse123@abcdefghijklmnop.supabase.co:5432/postgres

# OpenAI (optionnel)
OPENAI_API_KEY=sk-votre-cle-api-openai-ici

# Serveur
PORT=5000
NODE_ENV=development
```

## Étape 4 : Créer les tables dans Supabase

Une fois la configuration terminée, vous pouvez créer les tables en exécutant :

```bash
npm run db:push
```

Cette commande va créer les tables définies dans `shared/schema.ts` dans votre base de données Supabase.

**Note** : Si vous obtenez une erreur, vérifiez que :
- Votre `DATABASE_URL` est correcte
- Votre mot de passe est bien remplacé dans l'URL
- Vous avez bien sauvegardé le fichier `.env`

## Étape 5 : Vérification

Pour vérifier que tout fonctionne :

1. Démarrez votre application : `npm run dev`
2. Vous devriez voir dans les logs : `✅ Connexion à Supabase établie`
3. Si vous voyez un avertissement, vérifiez votre fichier `.env`

## 🔐 Sécurité

- ⚠️ **Ne commitez JAMAIS votre fichier `.env`** (il est déjà dans `.gitignore`)
- 🔒 Gardez votre mot de passe Supabase en sécurité
- 📝 La connection string contient votre mot de passe, traitez-la comme une information sensible
- 🚫 Ne partagez jamais votre `DATABASE_URL` publiquement

## 📚 Aide supplémentaire

- Documentation Supabase : https://supabase.com/docs
- Documentation Drizzle ORM : https://orm.drizzle.team/docs/overview
- Guide de connexion Supabase : https://supabase.com/docs/guides/database/connecting-to-postgres

## 🆘 Dépannage

### Erreur "DATABASE_URL n'est pas défini"
- Vérifiez que votre fichier `.env` existe à la racine du projet
- Vérifiez que `DATABASE_URL` est bien écrit (sans espaces)
- Redémarrez le serveur après avoir modifié `.env`

### Erreur de connexion
- Vérifiez que votre mot de passe est correct dans l'URL
- Vérifiez que votre projet Supabase est actif
- Vérifiez que vous avez bien remplacé `[PASSWORD]` par votre vrai mot de passe

### Tables non créées
- Vérifiez que `npm run db:push` s'est exécuté sans erreur
- Vérifiez dans l'interface Supabase (Table Editor) que les tables existent

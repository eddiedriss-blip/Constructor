# Configuration OpenAI

Pour utiliser les fonctionnalités IA de l'application (estimation et visualisation), vous devez configurer votre clé API OpenAI.

## Étapes de configuration

1. **Obtenir une clé API OpenAI**
   - Rendez-vous sur https://platform.openai.com/api-keys
   - Créez un compte ou connectez-vous
   - Générez une nouvelle clé API

2. **Configurer la clé API**
   
   Créez un fichier `.env` à la racine du projet avec le contenu suivant :
   
   ```
   OPENAI_API_KEY=sk-votre-cle-api-openai-ici
   ```
   
   Remplacez `sk-votre-cle-api-openai-ici` par votre vraie clé API.

3. **Installer les dépendances**
   
   Les dépendances nécessaires sont déjà installées :
   - `openai` : SDK OpenAI
   - `multer` : Gestion de l'upload de fichiers

4. **Redémarrer le serveur**
   
   Après avoir créé le fichier `.env`, redémarrez le serveur pour que les variables d'environnement soient chargées.

## Fonctionnalités disponibles

### Estimation IA
- Analyse d'images de chantier avec GPT-4 Vision
- Génération automatique d'estimations détaillées
- Calcul des coûts, matériaux et délais

### Visualisation IA
- Génération de rendus professionnels avec DALL-E 3
- Personnalisation par type de projet et style
- Téléchargement des visualisations générées

## Modèles utilisés

- **GPT-4o** : Pour l'analyse d'images et la génération d'estimations
- **DALL-E 3** : Pour la génération de visualisations

## Notes importantes

- Les appels API OpenAI sont facturés selon leur tarification
- Assurez-vous d'avoir des crédits suffisants sur votre compte OpenAI
- La clé API doit rester secrète et ne jamais être commitée dans le dépôt Git

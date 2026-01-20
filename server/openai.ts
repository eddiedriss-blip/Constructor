import OpenAI from 'openai';

// Initialiser le client OpenAI
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

/**
 * Analyse une image de chantier et génère une estimation détaillée
 */
export async function analyzeConstructionImage(
  imageBase64: string,
  context: {
    surface?: string;
    materiaux?: string;
    localisation?: string;
    delai?: string;
    metier?: string;
  }
) {
  try {
    const prompt = `Tu es un expert en estimation de chantiers de construction. Analyse cette image de chantier et génère une estimation détaillée en JSON avec la structure suivante:
{
  "tempsRealisation": "durée estimée (ex: '3 semaines')",
  "materiaux": [
    {"nom": "nom du matériau", "quantite": "quantité", "prix": nombre}
  ],
  "nombreOuvriers": nombre,
  "coutTotal": nombre,
  "marge": nombre,
  "benefice": nombre,
  "repartitionCouts": {
    "transport": nombre,
    "mainOeuvre": nombre,
    "materiaux": nombre,
    "autres": nombre
  },
  "recommandations": ["recommandation 1", "recommandation 2", ...]
}

Informations du chantier:
- Surface: ${context.surface || 'Non spécifiée'}
- Matériaux: ${context.materiaux || 'Non spécifiés'}
- Localisation: ${context.localisation || 'Non spécifiée'}
- Délai souhaité: ${context.delai || 'Non spécifié'}
- Métier: ${context.metier || 'Non spécifié'}

Génère une estimation réaliste basée sur l'image et les informations fournies. Les prix doivent être en euros.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Aucune réponse de l\'IA');
    }

    const analysis = JSON.parse(content);
    return analysis;
  } catch (error: any) {
    console.error('Erreur lors de l\'analyse OpenAI:', error);
    throw new Error(`Erreur d'analyse IA: ${error.message || 'Erreur inconnue'}`);
  }
}

/**
 * Génère une visualisation IA d'un projet d'aménagement
 */
export async function generateVisualization(
  imageBase64: string,
  projectType: string,
  style: string
) {
  try {
    // Générer une image avec DALL-E 3
    const projectTypeNames: Record<string, string> = {
      piscine: 'piscine ou spa',
      paysage: 'aménagement paysager avec jardin et végétation',
      menuiserie: 'menuiserie extérieure (pergola, clôture, abri)',
      terrasse: 'terrasse ou patio',
    };

    const styleNames: Record<string, string> = {
      moderne: 'style moderne avec lignes épurées et matériaux contemporains',
      traditionnel: 'style traditionnel avec matériaux naturels',
      tropical: 'style tropical avec végétation luxuriante et ambiance exotique',
      mediterraneen: 'style méditerranéen avec pierre, olivier et couleurs chaudes',
    };

    const dallePrompt = `Une visualisation professionnelle et réaliste d'un ${projectTypeNames[projectType] || projectType} en ${styleNames[style] || style}, intégré dans le terrain existant. Rendu photoréaliste, éclairage naturel, haute qualité architecturale, vue aérienne ou perspective professionnelle.`;

    const imageResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: dallePrompt,
      size: '1024x1024',
      quality: 'standard',
      n: 1,
    });

    const generatedImageUrl = imageResponse.data[0]?.url;
    if (!generatedImageUrl) {
      throw new Error('Impossible de générer l\'image');
    }

    // Télécharger l'image et la convertir en base64 pour la renvoyer
    const imageResponse2 = await fetch(generatedImageUrl);
    const imageBuffer = await imageResponse2.arrayBuffer();
    const imageBase64Result = Buffer.from(imageBuffer).toString('base64');

    return {
      imageUrl: generatedImageUrl,
      imageBase64: imageBase64Result,
    };
  } catch (error: any) {
    console.error('Erreur lors de la génération de visualisation:', error);
    throw new Error(`Erreur de génération IA: ${error.message || 'Erreur inconnue'}`);
  }
}

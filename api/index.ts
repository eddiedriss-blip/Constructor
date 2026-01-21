import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';

// Créer une instance Express pour Vercel serverless
const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

let routesInitialized = false;

// Initialiser les routes une seule fois (cache global)
async function initializeRoutes() {
  if (routesInitialized) return;
  
  // Importer dynamiquement pour éviter les problèmes de modules
  // Utiliser l'extension .js car Vercel compile TypeScript en JavaScript
  const { registerRoutes } = await import('../server/routes.js');
  
  // Pour Vercel, on n'a pas besoin du serveur HTTP
  // On enregistre juste les routes
  await registerRoutes(app);
  
  routesInitialized = true;
}

// Handler principal pour Vercel
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Initialiser les routes si pas déjà fait
    await initializeRoutes();
    
    // Convertir les requêtes Vercel en requêtes Express et traiter
    return new Promise<void>((resolve) => {
      // Marquer la réponse comme complète après qu'Express ait terminé
      const originalEnd = res.end.bind(res);
      const originalSend = res.send.bind(res);
      
      res.end = function(...args: any[]) {
        resolve();
        return originalEnd(...args);
      };
      
      res.send = function(...args: any[]) {
        resolve();
        return originalSend(...args);
      };
      
      // Traiter la requête avec Express
      app(req as any, res as any);
    });
  } catch (error: any) {
    console.error('Erreur dans le handler Vercel:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
}

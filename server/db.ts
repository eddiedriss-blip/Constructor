import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from "@shared/schema";

// Configuration Supabase
// DATABASE_URL doit être la connection string de Supabase
// Format: postgresql://postgres:[PASSWORD]@[PROJECT_REF].supabase.co:5432/postgres
// Obtenez cette URL dans Settings > Database > Connection string (URI)

let sql: ReturnType<typeof postgres> | undefined;
let db: ReturnType<typeof drizzle> | undefined;

if (process.env.DATABASE_URL) {
  try {
    // Utiliser le pooler Supabase si disponible (port 6543), sinon connexion directe (port 5432)
    const dbUrl = process.env.DATABASE_URL;
    const usePooler = dbUrl.includes(':6543/') || dbUrl.includes('pooler.supabase.com');
    
    // Créer la connexion PostgreSQL avec Supabase
    sql = postgres(dbUrl, {
      max: usePooler ? 10 : 1, // Plus de connexions avec le pooler
      idle_timeout: 20,
      connect_timeout: 20, // Timeout de connexion réduit
      max_lifetime: 60 * 30, // 30 minutes
      prepare: false, // Désactiver le prepared statements pour éviter les timeouts
      connection: {
        application_name: 'constructor-app',
      },
    });
    
    // Initialiser Drizzle avec le client postgres
    db = drizzle(sql, { schema });
    
    console.log(`✅ Connexion à Supabase établie (${usePooler ? 'pooler' : 'directe'})`);
  } catch (error) {
    console.error("❌ Erreur lors de la connexion à Supabase:", error);
    console.error("   Vérifiez que DATABASE_URL est correct dans votre fichier .env");
  }
} else {
  console.warn("⚠️  DATABASE_URL n'est pas défini. L'application fonctionne en mode développement sans base de données.");
  console.warn("   Pour connecter Supabase, définissez DATABASE_URL dans votre fichier .env");
  console.warn("   Voir SUPABASE_SETUP.md pour les instructions détaillées");
}

export { sql, db };

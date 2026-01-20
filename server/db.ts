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
    // Créer la connexion PostgreSQL avec Supabase
    sql = postgres(process.env.DATABASE_URL, {
      max: 1, // Limiter les connexions pour Supabase (mode serverless)
      idle_timeout: 20,
      connect_timeout: 10,
    });
    
    // Initialiser Drizzle avec le client postgres
    db = drizzle(sql, { schema });
    
    console.log("✅ Connexion à Supabase établie");
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

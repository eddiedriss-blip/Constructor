import type { Express } from "express";
import { createServer, type Server } from "http";
import { analyzeConstructionImage, generateVisualization } from "./openai";
import multer from "multer";
import { log } from "./vite";
import { db } from "./db";
import { clients, chantiers, teamMembers, chantierTeamMembers, insertClientSchema, insertChantierSchema, insertTeamMemberSchema, insertChantierTeamMemberSchema } from "@shared/schema";
import { eq, and } from "drizzle-orm";

// Configuration multer pour l'upload de fichiers
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

export async function registerRoutes(app: Express): Promise<Server> {

  // Route pour l'estimation IA
  app.post("/api/estimation/analyze", upload.array("images", 10), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "Aucune image fournie" });
      }

      const context = {
        surface: req.body.surface,
        materiaux: req.body.materiaux,
        localisation: req.body.localisation,
        delai: req.body.delai,
        metier: req.body.metier,
      };

      // Prendre la première image pour l'analyse
      const firstImage = files[0];
      const imageBase64 = firstImage.buffer.toString("base64");

      log(`Analyse IA d'une image de chantier (${firstImage.size} bytes)`, "api");

      const analysis = await analyzeConstructionImage(imageBase64, context);

      res.json(analysis);
    } catch (error: any) {
      log(`Erreur estimation IA: ${error.message}`, "api");
      res.status(500).json({ error: error.message || "Erreur lors de l'analyse" });
    }
  });

  // Route pour la visualisation IA
  app.post("/api/visualization/generate", upload.single("image"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "Aucune image fournie" });
      }

      const { projectType, style } = req.body;
      if (!projectType || !style) {
        return res.status(400).json({ error: "projectType et style sont requis" });
      }

      const imageBase64 = file.buffer.toString("base64");

      log(`Génération visualisation IA: ${projectType} - ${style}`, "api");

      const result = await generateVisualization(imageBase64, projectType, style);

      res.json(result);
    } catch (error: any) {
      log(`Erreur visualisation IA: ${error.message}`, "api");
      res.status(500).json({ error: error.message || "Erreur lors de la génération" });
    }
  });

  // Routes pour les clients
  app.get("/api/clients", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ error: "Base de données non disponible" });
      }
      const allClients = await db.select().from(clients);
      res.json(allClients);
    } catch (error: any) {
      log(`Erreur récupération clients: ${error.message}`, "api");
      res.status(500).json({ error: error.message || "Erreur lors de la récupération" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ error: "Base de données non disponible" });
      }
      
      // Normaliser les données (trim)
      const emailValue = req.body.email?.trim();
      const data = {
        name: req.body.name?.trim(),
        email: emailValue && emailValue.length > 0 ? emailValue : null,
        phone: req.body.phone?.trim(),
        address: req.body.address?.trim() || null,
      };
      
      // Validation avec gestion d'erreurs détaillée
      let validatedData;
      try {
        // Valider sans l'email si vide, puis l'ajouter comme null
        const dataToValidate = {
          name: data.name,
          phone: data.phone,
          address: data.address,
        };
        
        // Valider d'abord les champs requis
        if (!dataToValidate.name || !dataToValidate.phone) {
          return res.status(400).json({ error: "Les champs nom et téléphone sont requis" });
        }
        
        // Si email fourni, valider son format
        if (data.email && data.email.length > 0) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(data.email)) {
            return res.status(400).json({ error: "Format d'email invalide" });
          }
        }
        
        validatedData = {
          name: dataToValidate.name,
          email: data.email,
          phone: dataToValidate.phone,
          address: dataToValidate.address,
        };
      } catch (validationError: any) {
        if (validationError.name === 'ZodError') {
          const errorMessages = validationError.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
          log(`Erreur validation client: ${errorMessages}`, "api");
          return res.status(400).json({ error: `Données invalides: ${errorMessages}` });
        }
        throw validationError;
      }
      
      const [newClient] = await db.insert(clients).values(validatedData).returning();
      log(`Client créé: ${newClient.name}`, "api");
      res.status(201).json(newClient);
    } catch (error: any) {
      log(`Erreur création client: ${error.message}`, "api");
      res.status(500).json({ error: error.message || "Erreur lors de la création" });
    }
  });

  app.put("/api/clients/:id", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ error: "Base de données non disponible" });
      }
      const { id } = req.params;
      const validatedData = insertClientSchema.partial().parse(req.body);
      const [updatedClient] = await db
        .update(clients)
        .set({ ...validatedData, updatedAt: new Date() })
        .where(eq(clients.id, id))
        .returning();
      if (!updatedClient) {
        return res.status(404).json({ error: "Client non trouvé" });
      }
      log(`Client mis à jour: ${updatedClient.name}`, "api");
      res.json(updatedClient);
    } catch (error: any) {
      log(`Erreur mise à jour client: ${error.message}`, "api");
      res.status(500).json({ error: error.message || "Erreur lors de la mise à jour" });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ error: "Base de données non disponible" });
      }
      const { id } = req.params;
      
      // Vérifier si le client existe avant de le supprimer
      const existingClient = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
      if (existingClient.length === 0) {
        log(`Tentative de suppression d'un client inexistant: ${id}`, "api");
        return res.status(404).json({ error: "Client non trouvé" });
      }
      
      // Supprimer le client (les chantiers seront supprimés automatiquement grâce à onDelete: "cascade")
      const result = await db.delete(clients).where(eq(clients.id, id));
      log(`Client supprimé: ${existingClient[0].name} (${id})`, "api");
      res.status(204).send();
    } catch (error: any) {
      log(`Erreur suppression client: ${error.message}`, "api");
      res.status(500).json({ error: error.message || "Erreur lors de la suppression" });
    }
  });

  // Routes pour les chantiers
  app.get("/api/chantiers", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ error: "Base de données non disponible" });
      }
      const allChantiers = await db.select().from(chantiers);
      // Parser les images JSON
      const chantiersWithParsedImages = allChantiers.map(c => ({
        ...c,
        images: c.images ? JSON.parse(c.images) : []
      }));
      res.json(chantiersWithParsedImages);
    } catch (error: any) {
      log(`Erreur récupération chantiers: ${error.message}`, "api");
      res.status(500).json({ error: error.message || "Erreur lors de la récupération" });
    }
  });

  app.post("/api/chantiers", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ error: "Base de données non disponible" });
      }
      const data = {
        ...req.body,
        images: Array.isArray(req.body.images) ? JSON.stringify(req.body.images) : (req.body.images || "[]")
      };
      
      // Validation avec gestion d'erreurs détaillée
      let validatedData;
      try {
        validatedData = insertChantierSchema.parse(data);
      } catch (validationError: any) {
        if (validationError.name === 'ZodError') {
          const errorMessages = validationError.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
          log(`Erreur validation chantier: ${errorMessages}`, "api");
          return res.status(400).json({ error: `Données invalides: ${errorMessages}` });
        }
        throw validationError;
      }
      
      const [newChantier] = await db.insert(chantiers).values(validatedData).returning();
      log(`Chantier créé: ${newChantier.nom}`, "api");
      res.status(201).json({
        ...newChantier,
        images: newChantier.images ? JSON.parse(newChantier.images) : []
      });
    } catch (error: any) {
      log(`Erreur création chantier: ${error.message}`, "api");
      res.status(500).json({ error: error.message || "Erreur lors de la création" });
    }
  });

  app.put("/api/chantiers/:id", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ error: "Base de données non disponible" });
      }
      const { id } = req.params;
      const data = {
        ...req.body,
        images: Array.isArray(req.body.images) ? JSON.stringify(req.body.images) : req.body.images
      };
      const validatedData = insertChantierSchema.partial().parse(data);
      const [updatedChantier] = await db
        .update(chantiers)
        .set({ ...validatedData, updatedAt: new Date() })
        .where(eq(chantiers.id, id))
        .returning();
      if (!updatedChantier) {
        return res.status(404).json({ error: "Chantier non trouvé" });
      }
      log(`Chantier mis à jour: ${updatedChantier.nom}`, "api");
      res.json({
        ...updatedChantier,
        images: updatedChantier.images ? JSON.parse(updatedChantier.images) : []
      });
    } catch (error: any) {
      log(`Erreur mise à jour chantier: ${error.message}`, "api");
      res.status(500).json({ error: error.message || "Erreur lors de la mise à jour" });
    }
  });

  // Routes pour les membres d'équipe
  app.get("/api/team-members", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ error: "Base de données non disponible" });
      }
      const allMembers = await db.select().from(teamMembers);
      // Normaliser les données pour le frontend (loginCode -> login_code, etc.)
      const normalizedMembers = allMembers.map(member => ({
        ...member,
        login_code: member.loginCode,
        user_id: member.userId,
        created_at: member.createdAt,
        updated_at: member.updatedAt,
      }));
      res.json(normalizedMembers);
    } catch (error: any) {
      log(`Erreur récupération membres équipe: ${error.message}`, "api");
      res.status(500).json({ error: error.message || "Erreur lors de la récupération" });
    }
  });

  app.post("/api/team-members", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ error: "Base de données non disponible" });
      }
      
      // Normaliser les données : loginCode peut venir comme login_code ou loginCode
      const normalizedData = {
        name: req.body.name,
        role: req.body.role,
        email: req.body.email,
        phone: req.body.phone || null,
        status: req.body.status || 'actif',
        loginCode: req.body.login_code || req.body.loginCode,
      };
      
      const validatedData = insertTeamMemberSchema.parse(normalizedData);
      const [newMember] = await db.insert(teamMembers).values(validatedData).returning();
      log(`Membre d'équipe créé: ${newMember.name}`, "api");
      
      // Normaliser la réponse pour le frontend
      const response = {
        ...newMember,
        login_code: newMember.loginCode,
        user_id: newMember.userId,
        created_at: newMember.createdAt,
        updated_at: newMember.updatedAt,
      };
      res.status(201).json(response);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        const errorMessages = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
        log(`Erreur validation membre équipe: ${errorMessages}`, "api");
        return res.status(400).json({ error: `Données invalides: ${errorMessages}` });
      }
      log(`Erreur création membre équipe: ${error.message}`, "api");
      res.status(500).json({ error: error.message || "Erreur lors de la création" });
    }
  });

  app.put("/api/team-members/:id", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ error: "Base de données non disponible" });
      }
      const { id } = req.params;
      const normalizedData = {
        ...req.body,
        loginCode: req.body.login_code || req.body.loginCode,
      };
      const validatedData = insertTeamMemberSchema.partial().parse(normalizedData);
      const [updatedMember] = await db
        .update(teamMembers)
        .set({ ...validatedData, updatedAt: new Date() })
        .where(eq(teamMembers.id, id))
        .returning();
      if (!updatedMember) {
        return res.status(404).json({ error: "Membre d'équipe non trouvé" });
      }
      log(`Membre d'équipe mis à jour: ${updatedMember.name}`, "api");
      
      // Normaliser la réponse pour le frontend
      const response = {
        ...updatedMember,
        login_code: updatedMember.loginCode,
        user_id: updatedMember.userId,
        created_at: updatedMember.createdAt,
        updated_at: updatedMember.updatedAt,
      };
      res.json(response);
    } catch (error: any) {
      log(`Erreur mise à jour membre équipe: ${error.message}`, "api");
      res.status(500).json({ error: error.message || "Erreur lors de la mise à jour" });
    }
  });

  app.delete("/api/team-members/:id", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ error: "Base de données non disponible" });
      }
      const { id } = req.params;
      
      const existingMember = await db.select().from(teamMembers).where(eq(teamMembers.id, id)).limit(1);
      if (existingMember.length === 0) {
        log(`Tentative de suppression d'un membre inexistant: ${id}`, "api");
        return res.status(404).json({ error: "Membre d'équipe non trouvé" });
      }
      
      await db.delete(teamMembers).where(eq(teamMembers.id, id));
      log(`Membre d'équipe supprimé: ${existingMember[0].name} (${id})`, "api");
      res.status(204).send();
    } catch (error: any) {
      log(`Erreur suppression membre équipe: ${error.message}`, "api");
      res.status(500).json({ error: error.message || "Erreur lors de la suppression" });
    }
  });

  // Routes pour les affectations chantiers - membres d'équipe
  app.get("/api/chantiers/:chantierId/team-members", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ error: "Base de données non disponible" });
      }
      const { chantierId } = req.params;
      
      // Récupérer les affectations avec les détails des membres
      const assignments = await db
        .select({
          id: chantierTeamMembers.id,
          chantierId: chantierTeamMembers.chantierId,
          teamMemberId: chantierTeamMembers.teamMemberId,
          createdAt: chantierTeamMembers.createdAt,
          teamMember: {
            id: teamMembers.id,
            name: teamMembers.name,
            role: teamMembers.role,
            email: teamMembers.email,
            phone: teamMembers.phone,
            status: teamMembers.status,
            loginCode: teamMembers.loginCode,
          }
        })
        .from(chantierTeamMembers)
        .innerJoin(teamMembers, eq(chantierTeamMembers.teamMemberId, teamMembers.id))
        .where(eq(chantierTeamMembers.chantierId, chantierId));
      
      res.json(assignments);
    } catch (error: any) {
      log(`Erreur récupération affectations: ${error.message}`, "api");
      res.status(500).json({ error: error.message || "Erreur lors de la récupération" });
    }
  });

  app.post("/api/chantiers/:chantierId/team-members", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ error: "Base de données non disponible" });
      }
      const { chantierId } = req.params;
      const { teamMemberId } = req.body;
      
      if (!teamMemberId) {
        return res.status(400).json({ error: "teamMemberId est requis" });
      }
      
      // Vérifier si l'affectation existe déjà
      const existing = await db
        .select()
        .from(chantierTeamMembers)
        .where(and(
          eq(chantierTeamMembers.chantierId, chantierId),
          eq(chantierTeamMembers.teamMemberId, teamMemberId)
        ))
        .limit(1);
      
      if (existing.length > 0) {
        return res.status(409).json({ error: "Ce membre est déjà affecté à ce chantier" });
      }
      
      const validatedData = insertChantierTeamMemberSchema.parse({
        chantierId,
        teamMemberId,
      });
      
      const [newAssignment] = await db.insert(chantierTeamMembers).values(validatedData).returning();
      
      // Récupérer les détails du membre
      const [member] = await db.select().from(teamMembers).where(eq(teamMembers.id, teamMemberId)).limit(1);
      
      log(`Membre ${member?.name} affecté au chantier ${chantierId}`, "api");
      res.status(201).json({
        ...newAssignment,
        teamMember: member ? {
          ...member,
          login_code: member.loginCode,
          user_id: member.userId,
          created_at: member.createdAt,
          updated_at: member.updatedAt,
        } : null,
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        const errorMessages = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
        log(`Erreur validation affectation: ${errorMessages}`, "api");
        return res.status(400).json({ error: `Données invalides: ${errorMessages}` });
      }
      log(`Erreur création affectation: ${error.message}`, "api");
      res.status(500).json({ error: error.message || "Erreur lors de la création" });
    }
  });

  app.delete("/api/chantiers/:chantierId/team-members/:assignmentId", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ error: "Base de données non disponible" });
      }
      const { assignmentId } = req.params;
      
      const existing = await db.select().from(chantierTeamMembers).where(eq(chantierTeamMembers.id, assignmentId)).limit(1);
      if (existing.length === 0) {
        return res.status(404).json({ error: "Affectation non trouvée" });
      }
      
      await db.delete(chantierTeamMembers).where(eq(chantierTeamMembers.id, assignmentId));
      log(`Affectation supprimée: ${assignmentId}`, "api");
      res.status(204).send();
    } catch (error: any) {
      log(`Erreur suppression affectation: ${error.message}`, "api");
      res.status(500).json({ error: error.message || "Erreur lors de la suppression" });
    }
  });

  // Route pour envoyer le devis par email
  app.post("/api/quotes/send-email", upload.single('pdf'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Fichier PDF requis" });
      }

      const { email, clientName, subject } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Adresse email requise" });
      }

      // TODO: Implémenter l'envoi d'email avec le PDF en pièce jointe
      // Pour l'instant, on simule l'envoi
      log(`Envoi du devis par email à ${email} pour ${clientName}`, "api");
      
      // Ici, vous devriez utiliser un service d'email comme:
      // - Nodemailer avec SMTP
      // - SendGrid
      // - AWS SES
      // - Resend
      // etc.
      
      res.status(200).json({ 
        message: "Devis envoyé avec succès",
        email: email 
      });
    } catch (error: any) {
      log(`Erreur envoi email devis: ${error.message}`, "api");
      res.status(500).json({ error: error.message || "Erreur lors de l'envoi de l'email" });
    }
  });

  // Pour Vercel serverless, on ne crée pas de serveur HTTP
  // Le serveur n'est nécessaire que pour le mode standalone
  if (process.env.VERCEL) {
    return; // Pas de serveur HTTP dans l'environnement Vercel
  }

  const httpServer = createServer(app);
  return httpServer;
}

import express, { type Express, type Request as ExpressRequest } from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import { analyzeConstructionImage, generateVisualization } from "./openai";
import multer from "multer";
import { log } from "./vite";
import { db } from "./db";
import { clients, chantiers, teamMembers, chantierTeamMembers, depenses, factures, chaudieres, interventionsChaudieres, insertClientSchema, insertChantierSchema, insertTeamMemberSchema, insertChantierTeamMemberSchema, insertDepenseSchema, insertFactureSchema, insertChaudiereSchema, insertInterventionChaudiereSchema } from "@shared/schema";
import { eq, and, desc, asc, gte, lte, sql } from "drizzle-orm";

// Dossier uploads pour justificatifs (créé au démarrage si besoin)
const uploadsDir = path.join(process.cwd(), "uploads", "justificatifs");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuration multer pour l'upload de fichiers (mémoire, estimation/visualisation)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Multer pour justificatifs dépenses : stockage disque, max 5MB, JPG/PNG/PDF
const justificatifStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || path.extname(file.mimetype === "application/pdf" ? ".pdf" : ".jpg");
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    cb(null, safeName);
  },
});
const ALLOWED_MIMES = ["image/jpeg", "image/png", "application/pdf"];
const uploadJustificatif = multer({
  storage: justificatifStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Format accepté : JPG, PNG ou PDF uniquement."));
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Servir les justificatifs uploadés
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Helper : récupérer userId (header X-User-Id pour compatibilité auth mock)
  const getUserId = (req: ExpressRequest): string => {
    const v = req.headers["x-user-id"];
    return (Array.isArray(v) ? v[0] : v) || "default-user";
  };

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
      
      // Timeout de 10 secondes pour éviter les blocages
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout: la requête a pris trop de temps")), 10000)
      );
      
      const queryPromise = db.select().from(clients);
      const allClients = await Promise.race([queryPromise, timeoutPromise]) as any[];
      
      res.json(allClients);
    } catch (error: any) {
      log(`Erreur récupération clients: ${error.message}`, "api");
      // Retourner un tableau vide au lieu d'une erreur pour permettre à l'interface de fonctionner
      if (error.message?.includes("timeout") || error.message?.includes("Timeout")) {
        log("Timeout détecté, retour d'un tableau vide", "api");
        return res.json([]);
      }
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
      
      // Validation simple
      if (!data.name || !data.phone) {
        return res.status(400).json({ error: "Les champs nom et téléphone sont requis" });
      }
      
      // Si email fourni, valider son format
      if (data.email && data.email.length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
          return res.status(400).json({ error: "Format d'email invalide" });
        }
      }
      
      const validatedData = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
      };
      
      // Timeout de 15 secondes pour l'insertion
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout: la création a pris trop de temps")), 15000)
      );
      
      const insertPromise = db.insert(clients).values(validatedData).returning();
      const result = await Promise.race([insertPromise, timeoutPromise]) as any[];
      
      const [newClient] = result;
      log(`Client créé: ${newClient.name}`, "api");
      res.status(201).json(newClient);
    } catch (error: any) {
      log(`Erreur création client: ${error.message}`, "api");
      const errorMessage = error.message || "Erreur lors de la création";
      res.status(500).json({ error: errorMessage });
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

  app.delete("/api/chantiers/:id", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ error: "Base de données non disponible" });
      }
      const { id } = req.params;
      
      // Vérifier si le chantier existe
      const [existingChantier] = await db.select().from(chantiers).where(eq(chantiers.id, id)).limit(1);
      if (!existingChantier) {
        return res.status(404).json({ error: "Chantier non trouvé" });
      }
      
      // Supprimer le chantier (les affectations seront supprimées automatiquement grâce à onDelete: "cascade")
      await db.delete(chantiers).where(eq(chantiers.id, id));
      
      log(`Chantier supprimé: ${existingChantier.nom}`, "api");
      res.status(204).send();
    } catch (error: any) {
      log(`Erreur suppression chantier: ${error.message}`, "api");
      res.status(500).json({ error: error.message || "Erreur lors de la suppression" });
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

  // --- Comptabilité : upload justificatif
  app.post("/api/depenses/upload-justificatif", uploadJustificatif.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Aucun fichier fourni. Formats acceptés : JPG, PNG, PDF (max 5 Mo)." });
      }
      const url = `/uploads/justificatifs/${req.file.filename}`;
      res.json({ url, nom: req.file.originalname });
    } catch (err: any) {
      log(`Erreur upload justificatif: ${err?.message}`, "api");
      res.status(500).json({ error: err?.message || "Erreur lors de l'upload du justificatif." });
    }
  });

  // --- Comptabilité : CRUD dépenses
  app.get("/api/depenses", async (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: "Base de données non disponible" });
      const userId = getUserId(req);
      const list = await db.select().from(depenses).where(eq(depenses.userId, userId)).orderBy(desc(depenses.date));
      res.json(list);
    } catch (err: any) {
      log(`Erreur GET depenses: ${err?.message}`, "api");
      res.status(500).json({ error: err?.message || "Erreur lors de la récupération des dépenses." });
    }
  });

  app.post("/api/depenses", async (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: "Base de données non disponible" });
      const userId = getUserId(req);
      const body = req.body;
      if (!body.date || !body.fournisseur || body.montantTtc == null || !body.categorie || !body.justificatifUrl || !body.justificatifNom) {
        return res.status(400).json({ error: "Champs obligatoires : date, fournisseur, montantTtc, categorie, justificatifUrl, justificatifNom." });
      }
      const data = {
        userId,
        date: body.date,
        fournisseur: String(body.fournisseur).trim(),
        montantTtc: String(body.montantTtc),
        categorie: String(body.categorie).trim(),
        chantierId: body.chantierId && body.chantierId !== "" ? body.chantierId : null,
        description: body.description ? String(body.description).trim() : null,
        justificatifUrl: String(body.justificatifUrl),
        justificatifNom: String(body.justificatifNom),
        tauxTva: body.tauxTva != null ? String(body.tauxTva) : null,
      };
      const validated = insertDepenseSchema.parse({ ...data, userId: undefined } as any);
      const [row] = await db.insert(depenses).values({ ...validated, userId }).returning();
      log(`Dépense créée: ${row?.id}`, "api");
      res.status(201).json(row);
    } catch (err: any) {
      if (err?.name === "ZodError") {
        const msg = err.errors?.map((e: any) => `${e.path?.join?.(".")}: ${e.message}`).join(", ") || "Données invalides";
        return res.status(400).json({ error: msg });
      }
      log(`Erreur POST depenses: ${err?.message}`, "api");
      res.status(500).json({ error: err?.message || "Erreur lors de l'enregistrement de la dépense." });
    }
  });

  app.put("/api/depenses/:id", async (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: "Base de données non disponible" });
      const userId = getUserId(req);
      const { id } = req.params;
      const [existing] = await db.select().from(depenses).where(eq(depenses.id, id)).limit(1);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ error: "Dépense non trouvée." });
      }
      const body = req.body;
      const updates: Record<string, any> = { updatedAt: new Date() };
      if (body.date != null) updates.date = body.date;
      if (body.fournisseur != null) updates.fournisseur = String(body.fournisseur).trim();
      if (body.montantTtc != null) updates.montantTtc = String(body.montantTtc);
      if (body.categorie != null) updates.categorie = String(body.categorie).trim();
      if (body.chantierId !== undefined) updates.chantierId = body.chantierId && body.chantierId !== "" ? body.chantierId : null;
      if (body.description !== undefined) updates.description = body.description ? String(body.description).trim() : null;
      if (body.justificatifUrl != null) updates.justificatifUrl = body.justificatifUrl;
      if (body.justificatifNom != null) updates.justificatifNom = body.justificatifNom;
      if (body.tauxTva !== undefined) updates.tauxTva = body.tauxTva != null ? String(body.tauxTva) : null;
      const [updated] = await db.update(depenses).set(updates).where(eq(depenses.id, id)).returning();
      res.json(updated);
    } catch (err: any) {
      log(`Erreur PUT depenses: ${err?.message}`, "api");
      res.status(500).json({ error: err?.message || "Erreur lors de la mise à jour." });
    }
  });

  app.delete("/api/depenses/:id", async (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: "Base de données non disponible" });
      const userId = getUserId(req);
      const { id } = req.params;
      const [existing] = await db.select().from(depenses).where(eq(depenses.id, id)).limit(1);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ error: "Dépense non trouvée." });
      }
      await db.delete(depenses).where(eq(depenses.id, id));
      log(`Dépense supprimée: ${id}`, "api");
      res.status(204).send();
    } catch (err: any) {
      log(`Erreur DELETE depenses: ${err?.message}`, "api");
      res.status(500).json({ error: err?.message || "Erreur lors de la suppression." });
    }
  });

  // --- Comptabilité : factures (pour export)
  app.get("/api/factures", async (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: "Base de données non disponible" });
      const userId = getUserId(req);
      const dateDebut = req.query.dateDebut as string | undefined;
      const dateFin = req.query.dateFin as string | undefined;
      const conditions = [eq(factures.userId, userId)];
      if (dateDebut) conditions.push(gte(factures.date, dateDebut));
      if (dateFin) conditions.push(lte(factures.date, dateFin));
      const list = await db.select().from(factures).where(and(...conditions)).orderBy(desc(factures.date));
      res.json(list);
    } catch (err: any) {
      log(`Erreur GET factures: ${err?.message}`, "api");
      res.status(500).json({ error: err?.message || "Erreur lors de la récupération des factures." });
    }
  });

  app.post("/api/factures", async (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: "Base de données non disponible" });
      const userId = getUserId(req);
      const body = req.body;
      if (!body.date || !body.numero || !body.tiers || body.montantTtc == null) {
        return res.status(400).json({ error: "Champs obligatoires : date, numero, tiers, montantTtc." });
      }
      const data = {
        userId,
        date: body.date,
        numero: String(body.numero).trim(),
        tiers: String(body.tiers).trim(),
        description: body.description ? String(body.description).trim() : null,
        montantTtc: String(body.montantTtc),
        montantHt: body.montantHt != null ? String(body.montantHt) : null,
        tva: body.tva != null ? String(body.tva) : null,
        chantierId: body.chantierId && body.chantierId !== "" ? body.chantierId : null,
      };
      const [row] = await db.insert(factures).values({
        userId,
        date: data.date,
        numero: data.numero,
        tiers: data.tiers,
        description: data.description,
        montantTtc: data.montantTtc,
        montantHt: data.montantHt,
        tva: data.tva,
        chantierId: data.chantierId,
      }).returning();
      log(`Facture créée: ${row?.id}`, "api");
      res.status(201).json(row);
    } catch (err: any) {
      log(`Erreur POST factures: ${err?.message}`, "api");
      res.status(500).json({ error: err?.message || "Erreur lors de la création de la facture." });
    }
  });

  // --- Comptabilité : export CSV
  app.get("/api/comptabilite/export-csv", async (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: "Base de données non disponible" });
      const userId = getUserId(req);
      const dateDebut = (req.query.dateDebut as string) || "";
      const dateFin = (req.query.dateFin as string) || "";
      if (!dateDebut || !dateFin) {
        return res.status(400).json({ error: "Paramètres dateDebut et dateFin requis (YYYY-MM-DD)." });
      }
      const depensesList = await db
        .select()
        .from(depenses)
        .where(and(eq(depenses.userId, userId), gte(depenses.date, dateDebut), lte(depenses.date, dateFin)))
        .orderBy(depenses.date);
      const facturesList = await db
        .select()
        .from(factures)
        .where(and(eq(factures.userId, userId), gte(factures.date, dateDebut), lte(factures.date, dateFin)))
        .orderBy(factures.date);

      const formatDate = (d: string) => {
        const [y, m, day] = String(d).split("-");
        return `${day}/${m}/${y}`;
      };
      const defaultTva = 20;
      const computeHtTva = (ttc: number, taux?: string | null) => {
        const rate = taux != null ? parseFloat(String(taux)) : defaultTva;
        const ht = ttc / (1 + rate / 100);
        const tva = ttc - ht;
        return { ht, tva };
      };

      const rows: string[] = [];
      const header = "Date;Type;Numero;Tiers;Description;MontantHT;TVA;MontantTTC;Categorie;Chantier;Justificatif";
      rows.push(header);

      for (const f of facturesList) {
        const ttc = parseFloat(String(f.montantTtc ?? 0));
        const { ht, tva } = f.montantHt != null && f.tva != null
          ? { ht: parseFloat(String(f.montantHt)), tva: parseFloat(String(f.tva)) }
          : computeHtTva(ttc, null);
        rows.push([
          formatDate(String(f.date)),
          "Facture client",
          f.numero ?? "",
          f.tiers ?? "",
          (f.description ?? "").replace(/;/g, ","),
          ht.toFixed(2),
          tva.toFixed(2),
          ttc.toFixed(2),
          "Prestation",
          "", // chantier nom peut être joint plus tard
          "",
        ].join(";"));
      }
      for (const d of depensesList) {
        const ttc = parseFloat(String(d.montantTtc ?? 0));
        const { ht, tva } = computeHtTva(ttc, d.tauxTva);
        const chantierNom = ""; // on pourrait joindre chantiers pour avoir le nom
        rows.push([
          formatDate(String(d.date)),
          "Dépense",
          `DEP-${d.id.slice(0, 8)}`,
          d.fournisseur ?? "",
          (d.description ?? "").replace(/;/g, ","),
          ht.toFixed(2),
          tva.toFixed(2),
          ttc.toFixed(2),
          d.categorie ?? "",
          chantierNom,
          d.justificatifUrl ?? "",
        ].join(";"));
      }

      if (rows.length <= 1) {
        return res.status(200).json({ empty: true, message: "Aucune donnée à exporter sur cette période." });
      }

      const csv = rows.join("\r\n");
      const filename = `Export_Comptable_${dateDebut}_${dateFin}.csv`;
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send("\uFEFF" + csv); // BOM pour Excel
    } catch (err: any) {
      log(`Erreur export CSV: ${err?.message}`, "api");
      res.status(500).json({ error: err?.message || "Erreur lors de la génération de l'export." });
    }
  });

  // --- Chaudières : CRUD
  app.get("/api/chaudieres", async (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: "Base de données non disponible" });
      const userId = getUserId(req);
      const list = await db.select().from(chaudieres).where(eq(chaudieres.userId, userId)).orderBy(asc(chaudieres.dateProchainEntretien));
      res.json(list);
    } catch (err: any) {
      log(`Erreur GET chaudieres: ${err?.message}`, "api");
      res.status(500).json({ error: err?.message || "Erreur lors de la récupération des chaudières." });
    }
  });

  app.get("/api/chaudieres/counts", async (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: "Base de données non disponible" });
      const userId = getUserId(req);
      const list = await db.select({ dateProchainEntretien: chaudieres.dateProchainEntretien, typeContrat: chaudieres.typeContrat }).from(chaudieres).where(eq(chaudieres.userId, userId));
      const today = new Date().toISOString().slice(0, 10);
      let urgent = 0;
      let echu = 0;
      for (const ch of list) {
        if (ch.typeContrat === "Pas de contrat") continue;
        const d = String(ch.dateProchainEntretien).split("T")[0];
        const diff = Math.floor((new Date(d).getTime() - new Date(today).getTime()) / (24 * 60 * 60 * 1000));
        if (diff < 0) echu++;
        else if (diff < 90) urgent++;
      }
      res.json({ total: list.length, urgent, echu });
    } catch (err: any) {
      log(`Erreur GET chaudieres/counts: ${err?.message}`, "api");
      res.status(500).json({ error: err?.message || "Erreur." });
    }
  });

  app.get("/api/chaudieres/:id", async (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: "Base de données non disponible" });
      const userId = getUserId(req);
      const { id } = req.params;
      const [row] = await db.select().from(chaudieres).where(and(eq(chaudieres.id, id), eq(chaudieres.userId, userId))).limit(1);
      if (!row) return res.status(404).json({ error: "Chaudière non trouvée." });
      res.json(row);
    } catch (err: any) {
      log(`Erreur GET chaudiere: ${err?.message}`, "api");
      res.status(500).json({ error: err?.message || "Erreur." });
    }
  });

  app.post("/api/chaudieres", async (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: "Base de données non disponible" });
      const userId = getUserId(req);
      const body = req.body;
      if (!body.clientId || !body.typeChaudiere || !body.marque || !body.dateDernierEntretien || !body.dateProchainEntretien || !body.typeContrat) {
        return res.status(400).json({ error: "Champs obligatoires : clientId, typeChaudiere, marque, dateDernierEntretien, dateProchainEntretien, typeContrat." });
      }
      const data = {
        userId,
        clientId: body.clientId,
        typeChaudiere: String(body.typeChaudiere).trim(),
        marque: String(body.marque).trim(),
        modele: body.modele ? String(body.modele).trim() : null,
        puissanceKw: body.puissanceKw != null ? String(body.puissanceKw) : null,
        anneeInstallation: body.anneeInstallation != null ? parseInt(body.anneeInstallation, 10) : null,
        numeroSerie: body.numeroSerie ? String(body.numeroSerie).trim() : null,
        localisation: body.localisation ? String(body.localisation).trim() : null,
        dateDernierEntretien: body.dateDernierEntretien,
        dateProchainEntretien: body.dateProchainEntretien,
        typeContrat: String(body.typeContrat).trim(),
        montantAnnuelContrat: body.montantAnnuelContrat != null ? String(body.montantAnnuelContrat) : null,
        remarques: body.remarques ? String(body.remarques).trim() : null,
      };
      const [row] = await db.insert(chaudieres).values(data as any).returning();
      log(`Chaudière créée: ${row?.id}`, "api");
      res.status(201).json(row);
    } catch (err: any) {
      log(`Erreur POST chaudieres: ${err?.message}`, "api");
      res.status(500).json({ error: err?.message || "Erreur lors de l'ajout de la chaudière." });
    }
  });

  app.put("/api/chaudieres/:id", async (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: "Base de données non disponible" });
      const userId = getUserId(req);
      const { id } = req.params;
      const [existing] = await db.select().from(chaudieres).where(eq(chaudieres.id, id)).limit(1);
      if (!existing || existing.userId !== userId) return res.status(404).json({ error: "Chaudière non trouvée." });
      const body = req.body;
      const updates: Record<string, any> = { updatedAt: new Date() };
      if (body.clientId != null) updates.clientId = body.clientId;
      if (body.typeChaudiere != null) updates.typeChaudiere = String(body.typeChaudiere).trim();
      if (body.marque != null) updates.marque = String(body.marque).trim();
      if (body.modele !== undefined) updates.modele = body.modele ? String(body.modele).trim() : null;
      if (body.puissanceKw !== undefined) updates.puissanceKw = body.puissanceKw != null ? String(body.puissanceKw) : null;
      if (body.anneeInstallation !== undefined) updates.anneeInstallation = body.anneeInstallation != null ? parseInt(body.anneeInstallation, 10) : null;
      if (body.numeroSerie !== undefined) updates.numeroSerie = body.numeroSerie ? String(body.numeroSerie).trim() : null;
      if (body.localisation !== undefined) updates.localisation = body.localisation ? String(body.localisation).trim() : null;
      if (body.dateDernierEntretien != null) updates.dateDernierEntretien = body.dateDernierEntretien;
      if (body.dateProchainEntretien != null) updates.dateProchainEntretien = body.dateProchainEntretien;
      if (body.typeContrat != null) updates.typeContrat = String(body.typeContrat).trim();
      if (body.montantAnnuelContrat !== undefined) updates.montantAnnuelContrat = body.montantAnnuelContrat != null ? String(body.montantAnnuelContrat) : null;
      if (body.remarques !== undefined) updates.remarques = body.remarques ? String(body.remarques).trim() : null;
      if (body.dateDerniereRelance !== undefined) updates.dateDerniereRelance = body.dateDerniereRelance || null;
      const [updated] = await db.update(chaudieres).set(updates).where(eq(chaudieres.id, id)).returning();
      res.json(updated);
    } catch (err: any) {
      log(`Erreur PUT chaudieres: ${err?.message}`, "api");
      res.status(500).json({ error: err?.message || "Erreur." });
    }
  });

  app.delete("/api/chaudieres/:id", async (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: "Base de données non disponible" });
      const userId = getUserId(req);
      const { id } = req.params;
      const [existing] = await db.select().from(chaudieres).where(eq(chaudieres.id, id)).limit(1);
      if (!existing || existing.userId !== userId) return res.status(404).json({ error: "Chaudière non trouvée." });
      await db.delete(chaudieres).where(eq(chaudieres.id, id));
      log(`Chaudière supprimée: ${id}`, "api");
      res.status(204).send();
    } catch (err: any) {
      log(`Erreur DELETE chaudieres: ${err?.message}`, "api");
      res.status(500).json({ error: err?.message || "Erreur." });
    }
  });

  // --- Chaudières : interventions (historique)
  app.get("/api/chaudieres/:id/interventions", async (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: "Base de données non disponible" });
      const userId = getUserId(req);
      const { id } = req.params;
      const [ch] = await db.select().from(chaudieres).where(and(eq(chaudieres.id, id), eq(chaudieres.userId, userId))).limit(1);
      if (!ch) return res.status(404).json({ error: "Chaudière non trouvée." });
      const list = await db.select().from(interventionsChaudieres).where(eq(interventionsChaudieres.chaudiereId, id)).orderBy(desc(interventionsChaudieres.dateIntervention));
      res.json(list);
    } catch (err: any) {
      log(`Erreur GET interventions: ${err?.message}`, "api");
      res.status(500).json({ error: err?.message || "Erreur." });
    }
  });

  app.post("/api/chaudieres/:id/interventions", async (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: "Base de données non disponible" });
      const userId = getUserId(req);
      const { id } = req.params;
      const [ch] = await db.select().from(chaudieres).where(and(eq(chaudieres.id, id), eq(chaudieres.userId, userId))).limit(1);
      if (!ch) return res.status(404).json({ error: "Chaudière non trouvée." });
      const body = req.body;
      if (!body.dateIntervention || !body.typeIntervention) {
        return res.status(400).json({ error: "dateIntervention et typeIntervention sont requis." });
      }
      const data = {
        chaudiereId: id,
        dateIntervention: body.dateIntervention,
        typeIntervention: String(body.typeIntervention).trim(),
        description: body.description ? String(body.description).trim() : null,
        piecesChangees: body.piecesChangees ? String(body.piecesChangees).trim() : null,
        tempsPasseHeures: body.tempsPasseHeures != null ? String(body.tempsPasseHeures) : null,
        montantFacture: body.montantFacture != null ? String(body.montantFacture) : null,
        factureId: body.factureId || null,
        rapportUrl: body.rapportUrl || null,
      };
      const [row] = await db.insert(interventionsChaudieres).values(data as any).returning();
      res.status(201).json(row);
    } catch (err: any) {
      log(`Erreur POST intervention: ${err?.message}`, "api");
      res.status(500).json({ error: err?.message || "Erreur." });
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
    return undefined as unknown as Server;
  }

  const httpServer = createServer(app);
  return httpServer;
}

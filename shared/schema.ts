import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, numeric, date, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Table des clients
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertClientSchema = createInsertSchema(clients, {
  email: z.string().email().optional().or(z.literal('')).or(z.null()).nullable(),
}).pick({
  name: true,
  email: true,
  phone: true,
  address: true,
});

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// Table des chantiers
export const chantiers = pgTable("chantiers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nom: text("nom").notNull(),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  dateDebut: text("date_debut").notNull(),
  duree: text("duree").notNull(),
  images: text("images").default("[]"), // JSON array as string
  statut: varchar("statut", { length: 20 }).notNull().default("planifié"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertChantierSchema = createInsertSchema(chantiers).pick({
  nom: true,
  clientId: true,
  dateDebut: true,
  duree: true,
  images: true,
  statut: true,
});

export type InsertChantier = z.infer<typeof insertChantierSchema>;
export type Chantier = typeof chantiers.$inferSelect;

// Table des membres d'équipe
export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  role: text("role").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  status: varchar("status", { length: 20 }).notNull().default("actif"),
  loginCode: text("login_code").notNull().unique(),
  userId: varchar("user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).pick({
  name: true,
  role: true,
  email: true,
  phone: true,
  status: true,
  loginCode: true,
});

export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;

// Table de liaison chantiers - membres d'équipe
export const chantierTeamMembers = pgTable("chantier_team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chantierId: varchar("chantier_id").notNull().references(() => chantiers.id, { onDelete: "cascade" }),
  teamMemberId: varchar("team_member_id").notNull().references(() => teamMembers.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChantierTeamMemberSchema = createInsertSchema(chantierTeamMembers, {
  chantierId: z.string().min(1),
  teamMemberId: z.string().min(1),
}).pick({
  chantierId: true,
  teamMemberId: true,
});

export type InsertChantierTeamMember = z.infer<typeof insertChantierTeamMemberSchema>;
export type ChantierTeamMember = typeof chantierTeamMembers.$inferSelect;

// Table des dépenses (comptabilité)
export const depenses = pgTable("depenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  date: date("date").notNull(),
  fournisseur: text("fournisseur").notNull(),
  montantTtc: numeric("montant_ttc", { precision: 12, scale: 2 }).notNull(),
  categorie: text("categorie").notNull(),
  chantierId: varchar("chantier_id").references(() => chantiers.id, { onDelete: "set null" }),
  description: text("description"),
  justificatifUrl: text("justificatif_url").notNull(),
  justificatifNom: text("justificatif_nom").notNull(),
  tauxTva: numeric("taux_tva", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDepenseSchema = createInsertSchema(depenses).pick({
  date: true,
  fournisseur: true,
  montantTtc: true,
  categorie: true,
  chantierId: true,
  description: true,
  justificatifUrl: true,
  justificatifNom: true,
  tauxTva: true,
});

export type InsertDepense = z.infer<typeof insertDepenseSchema>;
export type Depense = typeof depenses.$inferSelect;

// Table des factures (pour export comptable)
export const factures = pgTable("factures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  date: date("date").notNull(),
  numero: text("numero").notNull(),
  tiers: text("tiers").notNull(),
  description: text("description"),
  montantTtc: numeric("montant_ttc", { precision: 12, scale: 2 }).notNull(),
  montantHt: numeric("montant_ht", { precision: 12, scale: 2 }),
  tva: numeric("tva", { precision: 12, scale: 2 }),
  chantierId: varchar("chantier_id").references(() => chantiers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFactureSchema = createInsertSchema(factures).pick({
  date: true,
  numero: true,
  tiers: true,
  description: true,
  montantTtc: true,
  montantHt: true,
  tva: true,
  chantierId: true,
});

export type InsertFacture = z.infer<typeof insertFactureSchema>;
export type Facture = typeof factures.$inferSelect;

// Table des chaudières (contrats d'entretien)
export const chaudieres = pgTable("chaudieres", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  typeChaudiere: text("type_chaudiere").notNull(),
  marque: text("marque").notNull(),
  modele: text("modele"),
  puissanceKw: numeric("puissance_kw", { precision: 8, scale: 2 }),
  anneeInstallation: integer("annee_installation"),
  numeroSerie: text("numero_serie"),
  localisation: text("localisation"),
  dateDernierEntretien: date("date_dernier_entretien").notNull(),
  dateProchainEntretien: date("date_prochain_entretien").notNull(),
  typeContrat: text("type_contrat").notNull(),
  montantAnnuelContrat: numeric("montant_annuel_contrat", { precision: 10, scale: 2 }),
  remarques: text("remarques"),
  dateDerniereRelance: date("date_derniere_relance"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertChaudiereSchema = createInsertSchema(chaudieres).pick({
  clientId: true,
  typeChaudiere: true,
  marque: true,
  modele: true,
  puissanceKw: true,
  anneeInstallation: true,
  numeroSerie: true,
  localisation: true,
  dateDernierEntretien: true,
  dateProchainEntretien: true,
  typeContrat: true,
  montantAnnuelContrat: true,
  remarques: true,
  dateDerniereRelance: true,
});

export type InsertChaudiere = z.infer<typeof insertChaudiereSchema>;
export type Chaudiere = typeof chaudieres.$inferSelect;

// Table des interventions sur chaudières (historique)
export const interventionsChaudieres = pgTable("interventions_chaudieres", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chaudiereId: varchar("chaudiere_id").notNull().references(() => chaudieres.id, { onDelete: "cascade" }),
  dateIntervention: date("date_intervention").notNull(),
  typeIntervention: text("type_intervention").notNull(),
  description: text("description"),
  piecesChangees: text("pieces_changees"),
  tempsPasseHeures: numeric("temps_passe_heures", { precision: 6, scale: 2 }),
  montantFacture: numeric("montant_facture", { precision: 10, scale: 2 }),
  factureId: varchar("facture_id").references(() => factures.id, { onDelete: "set null" }),
  rapportUrl: text("rapport_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInterventionChaudiereSchema = createInsertSchema(interventionsChaudieres).pick({
  chaudiereId: true,
  dateIntervention: true,
  typeIntervention: true,
  description: true,
  piecesChangees: true,
  tempsPasseHeures: true,
  montantFacture: true,
  factureId: true,
  rapportUrl: true,
});

export type InsertInterventionChaudiere = z.infer<typeof insertInterventionChaudiereSchema>;
export type InterventionChaudiere = typeof interventionsChaudieres.$inferSelect;

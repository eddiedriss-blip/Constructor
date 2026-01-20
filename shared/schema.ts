import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
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

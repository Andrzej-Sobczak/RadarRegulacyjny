import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export enum ImpactLevel {
  CRITICAL = "krytyczny",
  HIGH = "wysoki",
  MEDIUM = "średni",
  LOW = "niski",
  NONE = "brak"
}

export enum RequirementCategory {
  DATA_PROCESSING = "Przetwarzanie i przechowywanie danych",
  USER_RIGHTS = "Prawa użytkowników i zarządzanie zgodami",
  SECURITY = "Bezpieczeństwo i kontrola dostępu",
  REPORTING = "Raportowanie i dokumentacja",
  SYSTEM_FUNCTIONALITY = "Funkcjonalność systemu",
  DATA_RETENTION = "Przechowywanie i usuwanie danych",
  INTEGRATION = "Wymagania integracyjne",
  AUTHENTICATION = "Uwierzytelnianie i autoryzacja",
  USER_INTERFACE = "Interfejs użytkownika",
  OTHER = "Inne"
}

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Schema for regulatory requirements
export const requirements = pgTable("requirements", {
  id: serial("id").primaryKey(),
  identifier: text("identifier").notNull(),
  requirementText: text("requirement_text").notNull(),
  category: text("category").notNull(),
  subjectMatter: text("subject_matter").notNull(),
  complianceObjective: text("compliance_objective").notNull(),
  technicalImplications: text("technical_implications").notNull(),
  implementationTimeline: text("implementation_timeline"),
  crossReferences: text("cross_references"),
  keyTerms: text("key_terms"),
  source: text("source").notNull(),
  createdAt: text("created_at").notNull()
});

export const insertRequirementSchema = createInsertSchema(requirements).omit({
  id: true,
  createdAt: true
});

// Schema for IT systems architecture
export const systems = pgTable("systems", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  function: text("function").notNull(),
  capabilities: text("capabilities").notNull(),
  dependencies: text("dependencies")
});

export const insertSystemSchema = createInsertSchema(systems).omit({
  id: true
});

// Schema for impact analysis
export const impacts = pgTable("impacts", {
  id: serial("id").primaryKey(),
  systemId: integer("system_id").notNull(),
  requirementId: integer("requirement_id").notNull(),
  impactLevel: text("impact_level").notNull(),
  impactType: text("impact_type").notNull(),
  gapAnalysis: text("gap_analysis").notNull(),
  requiredModifications: jsonb("required_modifications").notNull(),
  dependencies: jsonb("dependencies"),
  complexity: text("complexity").notNull(),
  challenges: text("challenges"),
  expertise: text("expertise"),
  priority: text("priority"),
  createdAt: text("created_at").notNull()
});

export const insertImpactSchema = createInsertSchema(impacts).omit({
  id: true,
  createdAt: true
});

// API settings schema
export const apiSettings = pgTable("api_settings", {
  id: serial("id").primaryKey(),
  openaiApiKey: text("openai_api_key"),
  geminiApiKey: text("gemini_api_key"),
  lastTested: text("last_tested"),
  isWorking: boolean("is_working")
});

export const insertApiSettingsSchema = createInsertSchema(apiSettings).omit({
  id: true
});

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Requirement = typeof requirements.$inferSelect;
export type InsertRequirement = z.infer<typeof insertRequirementSchema>;

export type System = typeof systems.$inferSelect;
export type InsertSystem = z.infer<typeof insertSystemSchema>;

export type Impact = typeof impacts.$inferSelect;
export type InsertImpact = z.infer<typeof insertImpactSchema>;

export type ApiSettings = typeof apiSettings.$inferSelect;
export type InsertApiSettings = z.infer<typeof insertApiSettingsSchema>;

// Extended schema for file uploads
export const fileUploadSchema = z.object({
  file: z.instanceof(File),
  fileType: z.enum(["PDF", "JSON"]),
  purpose: z.enum(["regulations", "requirements", "systems"]),
});

export type FileUpload = z.infer<typeof fileUploadSchema>;

// Schema for requirement extraction request
export const extractionRequestSchema = z.object({
  documentIds: z.array(z.string()),
});

export type ExtractionRequest = z.infer<typeof extractionRequestSchema>;

// Schema for impact analysis request
export const analysisRequestSchema = z.object({
  requirementIds: z.array(z.string()),
  systemIds: z.array(z.string()),
});

export type AnalysisRequest = z.infer<typeof analysisRequestSchema>;

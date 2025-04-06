import {
  users,
  type User,
  type InsertUser,
  type Requirement,
  type InsertRequirement,
  type System,
  type InsertSystem,
  type Impact,
  type InsertImpact,
  type ApiSettings,
  type InsertApiSettings
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Requirement operations
  getRequirement(id: number): Promise<Requirement | undefined>;
  getAllRequirements(): Promise<Requirement[]>;
  createRequirement(requirement: InsertRequirement): Promise<Requirement>;
  updateRequirement(requirement: Requirement): Promise<Requirement>;
  deleteRequirement(id: number): Promise<void>;
  
  // System operations
  getSystem(id: number): Promise<System | undefined>;
  getAllSystems(): Promise<System[]>;
  createSystem(system: InsertSystem): Promise<System>;
  
  // Impact operations
  getImpact(id: number): Promise<Impact | undefined>;
  getAllImpacts(): Promise<Impact[]>;
  createImpact(impact: InsertImpact): Promise<Impact>;
  
  // API settings operations
  getApiSettings(): Promise<ApiSettings>;
  updateApiSettings(settings: InsertApiSettings): Promise<ApiSettings>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private requirements: Map<number, Requirement>;
  private systems: Map<number, System>;
  private impacts: Map<number, Impact>;
  private apiSettings: ApiSettings;
  
  private userIdCounter: number;
  private requirementIdCounter: number;
  private systemIdCounter: number;
  private impactIdCounter: number;

  constructor() {
    this.users = new Map();
    this.requirements = new Map();
    this.systems = new Map();
    this.impacts = new Map();
    
    this.userIdCounter = 1;
    this.requirementIdCounter = 1;
    this.systemIdCounter = 1;
    this.impactIdCounter = 1;
    
    // Initialize API settings
    this.apiSettings = {
      id: 1,
      openaiApiKey: "",
      geminiApiKey: "",
      lastTested: null,
      isWorking: false
    };
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Requirement operations
  async getRequirement(id: number): Promise<Requirement | undefined> {
    return this.requirements.get(id);
  }
  
  async getAllRequirements(): Promise<Requirement[]> {
    return Array.from(this.requirements.values());
  }
  
  async createRequirement(insertRequirement: InsertRequirement): Promise<Requirement> {
    const id = this.requirementIdCounter++;
    const createdAt = new Date().toISOString();
    const requirement: Requirement = { ...insertRequirement, id, createdAt };
    this.requirements.set(id, requirement);
    return requirement;
  }
  
  async updateRequirement(requirement: Requirement): Promise<Requirement> {
    if (!this.requirements.has(requirement.id)) {
      throw new Error(`Requirement with ID ${requirement.id} not found`);
    }
    
    this.requirements.set(requirement.id, requirement);
    return requirement;
  }
  
  async deleteRequirement(id: number): Promise<void> {
    if (!this.requirements.has(id)) {
      throw new Error(`Requirement with ID ${id} not found`);
    }
    
    this.requirements.delete(id);
  }
  
  // System operations
  async getSystem(id: number): Promise<System | undefined> {
    return this.systems.get(id);
  }
  
  async getAllSystems(): Promise<System[]> {
    return Array.from(this.systems.values());
  }
  
  async createSystem(insertSystem: InsertSystem): Promise<System> {
    const id = this.systemIdCounter++;
    const system: System = { ...insertSystem, id };
    this.systems.set(id, system);
    return system;
  }
  
  // Impact operations
  async getImpact(id: number): Promise<Impact | undefined> {
    return this.impacts.get(id);
  }
  
  async getAllImpacts(): Promise<Impact[]> {
    return Array.from(this.impacts.values());
  }
  
  async createImpact(insertImpact: InsertImpact): Promise<Impact> {
    const id = this.impactIdCounter++;
    const createdAt = new Date().toISOString();
    const impact: Impact = { ...insertImpact, id, createdAt };
    this.impacts.set(id, impact);
    return impact;
  }
  
  // API settings operations
  async getApiSettings(): Promise<ApiSettings> {
    return this.apiSettings;
  }
  
  async updateApiSettings(settings: InsertApiSettings): Promise<ApiSettings> {
    this.apiSettings = { ...this.apiSettings, ...settings };
    return this.apiSettings;
  }
}

export const storage = new MemStorage();

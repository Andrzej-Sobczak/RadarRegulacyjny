import { apiRequest } from "./queryClient";
import type { 
  Requirement, 
  InsertRequirement, 
  System, 
  Impact, 
  ApiSettings,
  InsertApiSettings
} from "@shared/schema";

// File upload functions
export async function uploadRegulationFile(file: File): Promise<{ id: string, name: string }> {
  const formData = new FormData();
  formData.append("file", file);
  
  const response = await fetch("/api/uploads/regulations", {
    method: "POST",
    body: formData,
    credentials: "include"
  });
  
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }
  
  return await response.json();
}

export async function uploadSystemFile(file: File): Promise<{ id: string, name: string }> {
  const formData = new FormData();
  formData.append("file", file);
  
  const response = await fetch("/api/uploads/systems", {
    method: "POST",
    body: formData,
    credentials: "include"
  });
  
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }
  
  return await response.json();
}

export async function uploadRequirementsFile(file: File): Promise<{ id: string, name: string }> {
  const formData = new FormData();
  formData.append("file", file);
  
  const response = await fetch("/api/uploads/requirements", {
    method: "POST",
    body: formData,
    credentials: "include"
  });
  
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }
  
  return await response.json();
}

// Requirements functions
export async function extractRequirements(documentIds: string[]): Promise<Requirement[]> {
  const response = await apiRequest("POST", "/api/requirements/extract", { documentIds });
  return await response.json();
}

export async function getRequirements(): Promise<Requirement[]> {
  const response = await apiRequest("GET", "/api/requirements");
  return await response.json();
}

export async function updateRequirement(requirement: Requirement): Promise<Requirement> {
  const response = await apiRequest("PUT", `/api/requirements/${requirement.id}`, requirement);
  return await response.json();
}

export async function deleteRequirement(id: number): Promise<void> {
  await apiRequest("DELETE", `/api/requirements/${id}`);
}

export async function exportRequirements(): Promise<{ url: string }> {
  const response = await apiRequest("GET", "/api/requirements/export");
  return await response.json();
}

// Systems functions
export async function getSystems(): Promise<System[]> {
  const response = await apiRequest("GET", "/api/systems");
  return await response.json();
}

// Impact analysis functions
export async function analyzeImpact(requirementIds: number[], systemIds: number[]): Promise<Impact[]> {
  console.log("Wysyłam zapytanie o analizę wpływu z parametrami:", { requirementIds, systemIds });
  
  const response = await apiRequest("POST", "/api/impact/analyze", { requirementIds, systemIds });
  const result = await response.json();
  
  console.log("Otrzymano wyniki analizy:", result.length);
  return result;
}

export async function getImpacts(): Promise<Impact[]> {
  const response = await apiRequest("GET", "/api/impact");
  return await response.json();
}

export async function exportImpactAnalysis(): Promise<{ url: string }> {
  const response = await apiRequest("GET", "/api/impact/export");
  return await response.json();
}

// API settings functions
export async function getApiSettings(): Promise<ApiSettings> {
  const response = await apiRequest("GET", "/api/settings");
  return await response.json();
}

export async function updateApiSettings(settings: InsertApiSettings): Promise<ApiSettings> {
  const response = await apiRequest("PUT", "/api/settings", settings);
  return await response.json();
}

export async function testApiConnection(): Promise<{ success: boolean, message: string }> {
  const response = await apiRequest("POST", "/api/settings/test");
  return await response.json();
}

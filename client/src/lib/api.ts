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
  console.log("Wysyłam zapytanie o ekstrakcję wymagań z dokumentów:", documentIds);
  
  // Dodatkowe sprawdzenie parametrów
  if (!documentIds || documentIds.length === 0) {
    console.error("Błąd: brak ID dokumentów w zapytaniu");
    throw new Error("Nie podano żadnych dokumentów do ekstrakcji");
  }
  
  try {
    const response = await apiRequest({
      url: "/api/requirements/extract",
      method: "POST",
      body: { documentIds }
    });
    
    const result = await response.json();
    console.log("Otrzymano wyniki ekstrakcji wymagań:", result.length);
    
    // Dodatkowa weryfikacja wyników
    if (!result || !Array.isArray(result)) {
      console.error("Błąd: nieprawidłowa odpowiedź serwera:", result);
      throw new Error("Nieprawidłowe dane otrzymane z serwera");
    }
    
    return result;
  } catch (error) {
    console.error("Błąd podczas ekstrakcji wymagań:", error);
    throw error;
  }
}

export async function getRequirements(): Promise<Requirement[]> {
  const response = await apiRequest({
    url: "/api/requirements",
    method: "GET"
  });
  return await response.json();
}

export async function updateRequirement(requirement: Requirement): Promise<Requirement> {
  const response = await apiRequest({
    url: `/api/requirements/${requirement.id}`,
    method: "PUT",
    body: requirement
  });
  return await response.json();
}

export async function deleteRequirement(id: number): Promise<void> {
  await apiRequest({
    url: `/api/requirements/${id}`,
    method: "DELETE"
  });
}

export async function exportRequirements(): Promise<{ url: string }> {
  const response = await apiRequest({
    url: "/api/requirements/export",
    method: "GET"
  });
  return await response.json();
}

// Systems functions
export async function getSystems(): Promise<System[]> {
  const response = await apiRequest({
    url: "/api/systems",
    method: "GET"
  });
  return await response.json();
}

// Impact analysis functions
export async function analyzeImpact(requirementIds: number[], systemIds: number[]): Promise<Impact[]> {
  console.log("Wysyłam zapytanie o analizę wpływu z parametrami:", { requirementIds, systemIds });
  
  // Dodatkowe sprawdzenie parametrów
  if (!requirementIds || requirementIds.length === 0) {
    console.error("Błąd: brak ID wymagań w zapytaniu");
    throw new Error("Nie podano żadnych wymagań do analizy");
  }
  
  if (!systemIds || systemIds.length === 0) {
    console.error("Błąd: brak ID systemów w zapytaniu");
    throw new Error("Nie podano żadnych systemów do analizy");
  }
  
  try {
    const response = await apiRequest({
      url: "/api/impact/analyze",
      method: "POST",
      body: { requirementIds, systemIds }
    });
    
    const result = await response.json();
    console.log("Otrzymano wyniki analizy:", result.length);
    
    // Dodatkowa weryfikacja wyników
    if (!result || !Array.isArray(result)) {
      console.error("Błąd: nieprawidłowa odpowiedź serwera:", result);
      throw new Error("Nieprawidłowe dane otrzymane z serwera");
    }
    
    return result;
  } catch (error) {
    console.error("Błąd podczas analizy wpływu:", error);
    throw error;
  }
}

export async function getImpacts(): Promise<Impact[]> {
  const response = await apiRequest({
    url: "/api/impact",
    method: "GET"
  });
  return await response.json();
}

export async function exportImpactAnalysis(): Promise<{ url: string }> {
  const response = await apiRequest({
    url: "/api/impact/export",
    method: "GET"
  });
  return await response.json();
}

// API settings functions
export async function getApiSettings(): Promise<ApiSettings> {
  const response = await apiRequest({
    url: "/api/settings",
    method: "GET"
  });
  return await response.json();
}

export async function updateApiSettings(settings: InsertApiSettings): Promise<ApiSettings> {
  const response = await apiRequest({
    url: "/api/settings",
    method: "PUT",
    body: settings
  });
  return await response.json();
}

export async function testApiConnection(): Promise<{ success: boolean, message: string }> {
  const response = await apiRequest({
    url: "/api/settings/test",
    method: "POST"
  });
  return await response.json();
}

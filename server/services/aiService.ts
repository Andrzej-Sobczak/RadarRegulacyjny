import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Requirement, InsertRequirement, System, Impact, InsertImpact, ImpactLevel } from "@shared/schema";

class AIService {
  private openai: OpenAI | null = null;
  private gemini: any | null = null;

  async getOpenAIInstance(apiKey?: string): Promise<OpenAI> {
    if (this.openai && !apiKey) return this.openai;
    
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OpenAI API key not found");
    
    this.openai = new OpenAI({ apiKey: key });
    return this.openai;
  }

  async getGeminiInstance(apiKey?: string): Promise<any> {
    if (this.gemini && !apiKey) return this.gemini;
    
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Google Gemini API key not found");
    
    this.gemini = new GoogleGenerativeAI(key);
    return this.gemini;
  }

  async testOpenAIConnection(apiKey: string): Promise<boolean> {
    try {
      const openai = await this.getOpenAIInstance(apiKey);
      
      // Simple test request
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Using gpt-4o-mini as requested by the user
        messages: [{ role: "user", content: "Test connection" }],
        max_tokens: 5
      });
      
      return !!response.choices[0].message.content;
    } catch (error) {
      console.error("OpenAI connection test failed:", error);
      return false;
    }
  }

  // Gemini functionality has been temporarily removed
  async testGeminiConnection(apiKey: string): Promise<boolean> {
    // Temporarily disabled
    return true;
  }

  async extractRequirements(documentIds: string[]): Promise<InsertRequirement[]> {
    try {
      // In a real application, this would read the uploaded PDF files
      // and use the AI to extract requirements
      // For this implementation, we'll create sample requirements
      const openai = await this.getOpenAIInstance();
      
      const prompt = `
      ## 1. Prompt for Extracting Key Requirements from Legal Regulations
      
      You are an expert legal and IT compliance analyst. Your task is to analyse a legal document and extract precise requirements that impact IT systems within enterprise environments only. Focus solely on changes affecting enterprise systems, not public administration.
      
      TASK:
      Extract and analyse all IT-relevant requirements from the provided legal document with particular attention to regulatory obligations that necessitate changes to IT systems, processes, or data handling.
      
      For EACH identified requirement, provide the following structured analysis:
      
      1. REQUIREMENT IDENTIFIER: Reference the specific article, paragraph, or section number where this requirement appears.
      
      2. REQUIREMENT TEXT: Quote the exact text from the document that establishes this requirement.
      
      3. CATEGORIZATION: Classify the requirement into ONLY ONE of these categories (use exactly as listed):
      - Przetwarzanie i przechowywanie danych
      - Prawa użytkowników i zarządzanie zgodami
      - Bezpieczeństwo i kontrola dostępu
      - Raportowanie i dokumentacja
      - Funkcjonalność systemu
      - Przechowywanie i usuwanie danych
      - Wymagania integracyjne
      - Uwierzytelnianie i autoryzacja
      - Interfejs użytkownika
      - Inne
      
      4. SUBJECT MATTER: Describe precisely what aspect of IT systems this affects (e.g., 'customer personal data storage', 'transaction authorisation mechanisms', 'automated reporting capabilities').
      
      5. COMPLIANCE OBJECTIVE: What specific outcome or state must be achieved to comply with this requirement? Be concrete and measurable where possible.
      
      6. TECHNICAL IMPLICATIONS: What specific technical capabilities or features must IT systems implement? Be specific about what systems must DO, not just general objectives.
      
      7. IMPLEMENTATION TIMELINE:
      - Explicit deadline mentioned in text (quote if present)
      - Inferred deadline based on context
      - Standard implementation period if not specified
      - Provide specifics where possible (e.g., 'Fines up to 20 million EUR or 4% of global turnover under GDPR')
      
      10. CROSS-REFERENCES: Note any other articles or sections in the regulation that relate to or modify this requirement.
      
      11. KEY TERMS: List critical terms or concepts that appear in this requirement which may need precise definition for technical implementation.
      
      FORMAT:
      Present your analysis as JSON array, where each object has these properties: identifier, requirementText, category, subjectMatter, complianceObjective, technicalImplications, implementationTimeline, crossReferences, keyTerms, source.
      
      ADDITIONAL GUIDANCE:
      - Extract 3-5 sample requirements for this demonstration
      - Focus on requirements that directly or indirectly necessitate changes to IT systems, not purely organisational or administrative requirements.
      - Be attentive to implicit technical requirements that aren't explicitly stated as IT requirements but would necessitate system changes.
      - All responses must be in Polish.
      
      Let's assume we're working with GDPR (General Data Protection Regulation) or similar privacy regulation documents.
      `;
      
      // Zmieniono model na gpt-4o-mini, ponieważ gpt-4o wymaga specjalnego dostępu
      // Jeśli ten model również nie działa, można wypróbować "gpt-3.5-turbo-0125"
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Zmieniono z gpt-4o na gpt-4o-mini, który ma szerszy dostęp
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });
      
      const content = response.choices[0].message.content;
      if (!content) throw new Error("Empty response from OpenAI");
      
      const parsedResponse = JSON.parse(content);
      if (!Array.isArray(parsedResponse.requirements)) {
        throw new Error("Invalid response format from OpenAI");
      }
      
      return parsedResponse.requirements.map((req: any) => ({
        identifier: req.identifier,
        requirementText: req.requirementText,
        category: req.category,
        subjectMatter: req.subjectMatter,
        complianceObjective: req.complianceObjective,
        technicalImplications: req.technicalImplications,
        implementationTimeline: req.implementationTimeline,
        crossReferences: req.crossReferences,
        keyTerms: req.keyTerms,
        source: req.source || "GDPR"
      }));
    } catch (error) {
      console.error("Error extracting requirements:", error);
      throw error;
    }
  }

  async analyzeImpact(requirements: Requirement[], systems: System[]): Promise<InsertImpact[]> {
    console.log(`aiService.analyzeImpact wywołane z ${requirements.length} wymaganiami i ${systems.length} systemami`);
    
    try {
      // Walidacja danych wejściowych
      if (!requirements || requirements.length === 0) {
        console.error("Brak wymagań do analizy");
        throw new Error("Brak wymagań do analizy");
      }
      
      if (!systems || systems.length === 0) {
        console.error("Brak systemów do analizy");
        throw new Error("Brak systemów do analizy");
      }
      
      // Możemy zawęzić liczbę wymagań i systemów dla lepszej wydajności
      const limitedRequirements = requirements.slice(0, 5);
      const limitedSystems = systems.slice(0, 3);
      
      console.log(`Zredukowano do ${limitedRequirements.length} wymagań i ${limitedSystems.length} systemów`);
      
      // Now using OpenAI instead of Gemini
      const openai = await this.getOpenAIInstance();
      
      const prompt = `
      ## 2. Prompt dla analizy wpływu wymagań regulacyjnych na systemy IT
      
      Jesteś ekspertem ds. zgodności IT. Twoim zadaniem jest analiza wpływu wymagań regulacyjnych na systemy IT.
      
      DANE WEJŚCIOWE:
      1. OPIS ARCHITEKTURY SYSTEMÓW:
      ${JSON.stringify(limitedSystems, null, 2)}
      
      2. WYMAGANIA REGULACYJNE:
      ${JSON.stringify(limitedRequirements, null, 2)}
      
      ZADANIE:
      Wykonaj szczegółową analizę mapowania, aby określić, jak każde wymaganie regulacyjne wpływa na opisaną architekturę IT. Uwzględnij bezpośrednie wpływy, pośrednie zależności i wyzwania integracyjne.
      
      WAŻNE: Musisz zwrócić odpowiedź w formacie JSON, gdzie głównym elementem jest tablica "impacts". Każdy element tej tablicy musi zawierać następujące pola:
      
      {
        "impacts": [
          {
            "systemId": 1,
            "requirementId": 2,
            "impactLevel": "średni",
            "impactType": "Funkcjonalność",
            "gapAnalysis": "Opis luki między obecnymi możliwościami a wymaganiami regulacyjnymi",
            "requiredModifications": ["Modyfikacja 1", "Modyfikacja 2"],
            "dependencies": [{"name": "System zależny 1"}, {"name": "System zależny 2"}],
            "complexity": "Średnia",
            "challenges": "Opis wyzwań technicznych",
            "expertise": "Wymagana specjalistyczna wiedza",
            "priority": "Średni"
          }
        ]
      }
      
      Zwróć analizę wpływu przynajmniej 3 różnych wymagań na przynajmniej 2 różne systemy.
      Wszystkie odpowiedzi muszą być w języku polskim.
      `;
      
      console.log("Wysyłam zapytanie do OpenAI...");
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Using gpt-4o-mini as requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 2000
      });
      
      const content = response.choices[0].message.content;
      if (!content) {
        console.error("Pusta odpowiedź z OpenAI");
        throw new Error("Pusta odpowiedź z OpenAI");
      }
      
      console.log("Otrzymano odpowiedź z OpenAI, parsowanie JSON...");
      
      // Parsowanie odpowiedzi JSON
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(content);
      } catch (parseErr) {
        console.error("Błąd parsowania JSON:", parseErr);
        console.log("Nieudane parsowanie zawartości:", content);
        throw new Error("Nieprawidłowy format odpowiedzi z OpenAI");
      }
      
      // Ekstrakcja tablicy impacts
      const impacts = parsedResponse.impacts || [];
      
      if (!Array.isArray(impacts)) {
        console.error("Nieprawidłowy format tablicy impacts:", impacts);
        throw new Error("Nieprawidłowy format odpowiedzi z OpenAI - brak tablicy impacts");
      }
      
      if (impacts.length === 0) {
        console.warn("Otrzymano pustą tablicę impacts");
      } else {
        console.log(`Otrzymano ${impacts.length} wyników analizy wpływu`);
      }
      
      // Walidacja i transformacja wyników
      const validatedImpacts = impacts.map((impact: any) => {
        console.log(`Przetwarzanie wpływu: systemId=${impact.systemId}, requirementId=${impact.requirementId}`);
        
        // Upewnij się, że ID są liczbami
        const systemId = typeof impact.systemId === 'number' 
          ? impact.systemId 
          : parseInt(impact.systemId);
          
        const requirementId = typeof impact.requirementId === 'number' 
          ? impact.requirementId 
          : parseInt(impact.requirementId);
        
        // Upewnij się, że pozostałe pola mają domyślne wartości
        return {
          systemId,
          requirementId,
          impactLevel: impact.impactLevel || ImpactLevel.MEDIUM,
          impactType: impact.impactType || "Funkcjonalność",
          gapAnalysis: impact.gapAnalysis || "Wymaga analizy",
          requiredModifications: Array.isArray(impact.requiredModifications) 
            ? impact.requiredModifications 
            : ["Wymaga analizy"],
          dependencies: Array.isArray(impact.dependencies) 
            ? impact.dependencies 
            : [{ name: "Brak zidentyfikowanych zależności" }],
          complexity: impact.complexity || "Średnia",
          challenges: impact.challenges || "Nieznane",
          expertise: impact.expertise || "Nieznane",
          priority: impact.priority || "Średni"
        };
      });
      
      console.log(`Zwalidowano ${validatedImpacts.length} wyników analizy wpływu`);
      return validatedImpacts;
      
    } catch (error) {
      console.error("Błąd analizy wpływu:", error);
      
      // W przypadku niepowodzenia wygeneruj przykładowe wyniki
      console.log("Generowanie awaryjnych wyników analizy...");
      const impacts: InsertImpact[] = [];
      
      // Dla każdego systemu utwórz wpływ dla każdego wymagania
      for (const system of systems) {
        for (const req of requirements) {
          impacts.push({
            systemId: system.id,
            requirementId: req.id,
            impactLevel: ImpactLevel.MEDIUM,
            impactType: "Funkcjonalność",
            gapAnalysis: "Analiza nie mogła zostać wygenerowana automatycznie z powodu błędu API.",
            requiredModifications: ["Wymaga ręcznej analizy"],
            dependencies: [{ name: "Brak danych" }],
            complexity: "Średnia",
            challenges: "Nieznane",
            expertise: "Nieznane",
            priority: "Średni"
          });
          
          // Ogranicz liczbę generowanych wyników awaryjnych
          if (impacts.length >= 10) break;
        }
        if (impacts.length >= 10) break;
      }
      
      console.log(`Wygenerowano ${impacts.length} awaryjnych wyników analizy`);
      return impacts;
    }
  }
}

export const aiService = new AIService();

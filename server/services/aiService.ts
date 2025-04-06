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
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: "Test connection" }],
        max_tokens: 5
      });
      
      return !!response.choices[0].message.content;
    } catch (error) {
      console.error("OpenAI connection test failed:", error);
      return false;
    }
  }

  async testGeminiConnection(apiKey: string): Promise<boolean> {
    try {
      const genAI = await this.getGeminiInstance(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      // Simple test request
      const result = await model.generateContent("Test connection");
      const response = await result.response;
      
      return !!response.text();
    } catch (error) {
      console.error("Gemini connection test failed:", error);
      return false;
    }
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
      
      3. CATEGORIZATION: Classify the requirement into one or more of these categories:
      - Data processing and storage
      - User rights and consent management
      - Security and access control
      - Reporting and documentation
      - System functionality
      - Data retention and deletion
      - Integration requirements
      - Authentication and authorisation
      - User interface
      - Other (specify)
      
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
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
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
    try {
      // In a real application, this would analyze the impact of requirements on systems
      // using AI to generate a detailed analysis
      const gemini = await this.getGeminiInstance();
      const model = gemini.getGenerativeModel({ model: "gemini-pro" });
      
      const prompt = `
      ## 2. Prompt for Mapping Impact on IT Systems Architecture
      
      You are an expert IT compliance analyst. Your task is to analyze the impact of regulatory requirements on IT systems.
      
      INPUT:
      1. SYSTEMS ARCHITECTURE DESCRIPTION:
      ${JSON.stringify(systems, null, 2)}
      
      2. EXTRACTED REGULATORY REQUIREMENTS:
      ${JSON.stringify(requirements, null, 2)}
      
      TASK:
      Perform a detailed mapping analysis to determine how each regulatory requirement impacts the described IT architecture. Consider direct impacts, indirect dependencies, and integration challenges.
      
      For each system, analyze the impact of all requirements and return a JSON array of impact assessments with these properties:
      - systemId: ID of the system being analyzed (number)
      - requirementId: ID of the requirement causing the impact (number)
      - impactLevel: One of "krytyczny", "wysoki", "średni", "niski", "brak"
      - impactType: Type of impact (e.g., "Data structure", "Functionality", "Security")
      - gapAnalysis: Description of the gap between current capabilities and regulatory requirements
      - requiredModifications: Array of strings describing needed modifications
      - dependencies: Array of objects with a "name" property for dependent systems
      - complexity: Assessment of implementation complexity ("Bardzo wysoka", "Wysoka", "Średnia", "Niska")
      - challenges: Technical challenges anticipated
      - expertise: Specialized expertise needed
      - priority: Implementation priority ("Wysoki", "Średni", "Niski")
      
      All responses must be in Polish.
      
      Analyze 3-5 sample impacts for this demonstration.
      `;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract the JSON part from the response
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || 
                        text.match(/```\n([\s\S]*?)\n```/) ||
                        text.match(/\[([\s\S]*?)\]/);
      
      if (!jsonMatch) {
        throw new Error("Could not parse JSON from Gemini response");
      }
      
      let jsonText = jsonMatch[1] || jsonMatch[0];
      
      // Ensure we have a valid JSON array
      if (!jsonText.startsWith('[')) {
        jsonText = '[' + jsonText;
      }
      if (!jsonText.endsWith(']')) {
        jsonText = jsonText + ']';
      }
      
      // Parse the JSON
      const impacts = JSON.parse(jsonText);
      
      // Validate and transform the results
      return impacts.map((impact: any) => ({
        systemId: parseInt(impact.systemId),
        requirementId: parseInt(impact.requirementId),
        impactLevel: impact.impactLevel || ImpactLevel.MEDIUM,
        impactType: impact.impactType || "Funkcjonalność",
        gapAnalysis: impact.gapAnalysis || "Wymaga analizy",
        requiredModifications: impact.requiredModifications || [],
        dependencies: impact.dependencies || [],
        complexity: impact.complexity || "Średnia",
        challenges: impact.challenges || "",
        expertise: impact.expertise || "",
        priority: impact.priority || "Średni"
      }));
    } catch (error) {
      console.error("Error analyzing impact:", error);
      
      // Fallback: Generate some sample impacts if AI fails
      const impacts: InsertImpact[] = [];
      
      // For each system, create impact for each requirement
      for (const system of systems) {
        for (const req of requirements) {
          impacts.push({
            systemId: system.id,
            requirementId: req.id,
            impactLevel: ImpactLevel.MEDIUM,
            impactType: "Funkcjonalność",
            gapAnalysis: "Analiza nie mogła zostać wygenerowana automatycznie.",
            requiredModifications: ["Wymaga ręcznej analizy"],
            dependencies: [{ name: "Brak danych" }],
            complexity: "Średnia",
            challenges: "Nieznane",
            expertise: "Nieznane",
            priority: "Średni"
          });
        }
      }
      
      return impacts;
    }
  }
}

export const aiService = new AIService();

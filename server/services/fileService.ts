import fs from "fs/promises";
import { storage } from "../storage";
import path from "path";
import { InsertSystem } from "@shared/schema";

class FileService {
  // Process uploaded regulation file (PDF)
  async processRegulationFile(filePath: string): Promise<string> {
    try {
      // In a real application, we would extract text from PDF
      // and potentially preprocess it for the AI
      
      // For now, we'll just store the file ID
      const fileId = path.basename(filePath);
      
      return fileId;
    } catch (error) {
      console.error("Error processing regulation file:", error);
      throw error;
    }
  }
  
  // Process uploaded system description file (PDF)
  async processSystemFile(filePath: string): Promise<string> {
    try {
      // Weryfikacja, czy plik istnieje
      await fs.access(filePath).catch((err) => {
        console.error(`File access error: ${err.message}`);
        console.error(`File path: ${filePath}`);
        console.error(`Current directory: ${process.cwd()}`);
        throw new Error(`Plik nie jest dostępny: ${err.message}`);
      });
      
      // For this implementation, we'll create a sample system
      const fileId = path.basename(filePath);
      
      // Create a sample system based on the filename
      // Obsługa różnych rozszerzeń plików
      let fileName = path.basename(filePath);
      const extPattern = /\.(pdf|PDF)$/;
      if (extPattern.test(fileName)) {
        fileName = fileName.replace(extPattern, "");
      }
      
      // Generowanie unikatowego ID systemu
      const randomId = Math.floor(Math.random() * 1000);
      
      // Tworzenie systemu z bardziej opisową nazwą
      // Tworzenie drugiego przykładowego systemu dla pewności, że mamy więcej niż jeden system
      // W prawdziwej aplikacji te dane pochodziłyby z analizy pliku PDF
      let sampleSystem: InsertSystem;
      
      if (await storage.getAllSystems().then(systems => systems.length > 0)) {
        // Jeśli istnieje już jakiś system, stwórz inny typ systemu
        sampleSystem = {
          name: `System Obsługi Klienta`,
          description: "System informatyczny do zarządzania relacjami z klientami i zamówieniami",
          function: "Obsługa klientów, zarządzanie zamówieniami, zarządzanie reklamacjami",
          capabilities: "Baza danych klientów, rejestracja zamówień, śledzenie statusu zamówień, obsługa zgłoszeń",
          dependencies: "System ERP, System Magazynowy, Bramka Płatności"
        };
      } else {
        // Pierwszy system w bazie
        sampleSystem = {
          name: `System Zarządzania Dokumentacją`,
          description: "System informatyczny do zarządzania dokumentacją i procesami przedsiębiorstwa",
          function: "Zarządzanie danymi i procesami biznesowymi, archiwizacja dokumentów, zarządzanie obiegiem informacji",
          capabilities: "Przechowywanie danych, raportowanie, integracja, dostęp do historii dokumentów",
          dependencies: "System CRM, System ERP, System Księgowy"
        };
      }
      
      // Zapis systemu do bazy danych
      const createdSystem = await storage.createSystem(sampleSystem);
      console.log(`Created system with ID: ${createdSystem.id}`);
      
      return fileId;
    } catch (error) {
      console.error("Error processing system file:", error);
      throw error;
    }
  }
  
  // Process uploaded requirements file (JSON)
  async processRequirementsFile(filePath: string): Promise<string> {
    try {
      // Read the JSON file
      const fileContents = await fs.readFile(filePath, "utf-8");
      const requirements = JSON.parse(fileContents);
      
      // Store each requirement
      if (Array.isArray(requirements)) {
        for (const req of requirements) {
          // Ensure all required fields are present
          if (req.identifier && req.requirementText && req.category) {
            await storage.createRequirement({
              identifier: req.identifier,
              requirementText: req.requirementText,
              category: req.category,
              subjectMatter: req.subjectMatter || "",
              complianceObjective: req.complianceObjective || "",
              technicalImplications: req.technicalImplications || "",
              implementationTimeline: req.implementationTimeline || "",
              crossReferences: req.crossReferences || "",
              keyTerms: req.keyTerms || "",
              source: req.source || "JSON Import"
            });
          }
        }
      }
      
      const fileId = path.basename(filePath);
      return fileId;
    } catch (error) {
      console.error("Error processing requirements file:", error);
      throw error;
    }
  }
}

export const fileService = new FileService();

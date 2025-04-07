import fs from "fs/promises";
import { storage } from "../storage";
import path from "path";
import { InsertSystem } from "@shared/schema";
import { TextUtils } from "./textUtils";

class FileService {
  // Process uploaded regulation file (TXT)
  async processRegulationFile(filePath: string): Promise<string> {
    try {
      // Weryfikacja, czy plik istnieje
      await fs.access(filePath).catch((err) => {
        console.error(`File access error: ${err.message}`);
        console.error(`File path: ${filePath}`);
        console.error(`Current directory: ${process.cwd()}`);
        throw new Error(`Plik nie jest dostępny: ${err.message}`);
      });
      
      console.log(`Przetwarzanie pliku tekstowego: ${filePath}`);
      
      try {
        // Używamy naszego narzędzia do odczytu tekstu z pliku
        const text = await TextUtils.readTextFromFile(filePath);
        console.log(`Odczytano ${text.length} znaków tekstu z pliku ${filePath}`);
        
        // Zapisujemy metadane pliku (opcjonalnie)
        const metadataFilePath = `${filePath}.json`;
        const metadata = await TextUtils.getFileMetadata(filePath);
        await fs.writeFile(metadataFilePath, JSON.stringify(metadata, null, 2));
        
        // Zwróć ID pliku
        const fileId = path.basename(filePath);
        return fileId;
      } catch (textError: unknown) {
        const errorMessage = textError instanceof Error ? textError.message : String(textError);
        console.error(`Błąd podczas odczytu pliku tekstowego: ${errorMessage}`);
        
        // Zwróć ID pliku
        const fileId = path.basename(filePath);
        return fileId;
      }
    } catch (error) {
      console.error("Error processing regulation file:", error);
      throw error;
    }
  }
  
  // Process uploaded system description file (TXT)
  async processSystemFile(filePath: string): Promise<string> {
    try {
      // Weryfikacja, czy plik istnieje
      await fs.access(filePath).catch((err) => {
        console.error(`File access error: ${err.message}`);
        console.error(`File path: ${filePath}`);
        console.error(`Current directory: ${process.cwd()}`);
        throw new Error(`Plik nie jest dostępny: ${err.message}`);
      });
      
      console.log(`Przetwarzanie pliku systemu TXT: ${filePath}`);
      
      try {
        // Używamy naszego narzędzia do odczytu tekstu z pliku
        const text = await TextUtils.readTextFromFile(filePath);
        console.log(`Odczytano ${text.length} znaków tekstu z pliku systemu ${filePath}`);
        
        // Wyodrębnij nazwę systemu i inne informacje z tekstu
        const systemName = this.extractSystemNameFromText(text, path.basename(filePath, '.txt'));
        const systemDescription = this.extractSystemDescriptionFromText(text);
        const systemFunction = this.extractSystemFunctionFromText(text);
        const systemCapabilities = this.extractSystemCapabilitiesFromText(text);
        const systemDependencies = this.extractSystemDependenciesFromText(text);
        
        // Pobierz oryginalną nazwę pliku bez znaczników czasowych
        const originalFileName = path.basename(filePath);
        
        // Pozyskaj nazwę systemu - z treści lub z nazwy pliku
        let systemNameValue = systemName || originalFileName.replace(/\.txt$/i, '');
        
        // Zamień podkreślniki na spacje w nazwie systemu dla lepszej czytelności
        systemNameValue = systemNameValue.replace(/_/g, ' ');
        
        // Tworzenie nowego systemu bazując na zawartości pliku
        const newSystem: InsertSystem = {
          name: systemNameValue,
          description: systemDescription,
          function: systemFunction,
          capabilities: systemCapabilities,
          dependencies: systemDependencies
        };
        
        // Zapis systemu do bazy danych
        const createdSystem = await storage.createSystem(newSystem);
        console.log(`Created system with ID: ${createdSystem.id} from TXT content`);
        
        // Zapisujemy metadane pliku (opcjonalnie)
        const metadataFilePath = `${filePath}.json`;
        const metadata = await TextUtils.getFileMetadata(filePath);
        await fs.writeFile(metadataFilePath, JSON.stringify(metadata, null, 2));
        
        // Zwróć ID pliku
        const fileId = path.basename(filePath);
        return fileId;
      } catch (textError: unknown) {
        const errorMessage = textError instanceof Error ? textError.message : String(textError);
        console.error(`Błąd podczas odczytu pliku tekstowego systemu: ${errorMessage}`);
        
        // Jeśli nie można odczytać pliku, tworzymy system bazując na oryginalnej nazwie pliku
        let fileName = path.basename(filePath);
        const extPattern = /\.(txt|TXT)$/;
        if (extPattern.test(fileName)) {
          fileName = fileName.replace(extPattern, "");
        }
        
        // Usuwamy timestampy i inne prefiksy, aby uzyskać czystą nazwę
        // Wzorzec: 1744012776903-724632174-NazwaSystemu
        const cleanNamePattern = /^\d+-\d+-(.+)$/;
        let cleanName = fileName;
        
        if (cleanNamePattern.test(fileName)) {
          const match = fileName.match(cleanNamePattern);
          if (match && match[1]) {
            cleanName = match[1];
          }
        }
        
        // Zamień podkreślniki na spacje w nazwie systemu
        let displayName = cleanName.replace(/_/g, ' ');
        
        // Tworzenie systemu z oczyszczoną nazwą pliku
        const sampleSystem: InsertSystem = {
          name: displayName,
          description: "System informatyczny wspierający procesy biznesowe",
          function: "Zarządzanie danymi i procesami biznesowymi",
          capabilities: "Przechowywanie danych, raportowanie, integracja",
          dependencies: "Inne systemy w organizacji, bazy danych"
        };
        
        // Zapis systemu do bazy danych
        const createdSystem = await storage.createSystem(sampleSystem);
        console.log(`Created fallback system with ID: ${createdSystem.id}`);
        
        // Zwróć ID pliku
        const fileId = path.basename(filePath);
        return fileId;
      }
    } catch (error) {
      console.error("Error processing system file:", error);
      throw error;
    }
  }
  
  // Metody pomocnicze do ekstrakcji informacji z tekstu
  private extractSystemNameFromText(text: string, defaultName: string): string {
    // Szukamy typowych wzorców nazwy systemu w tekście
    const namePatterns = [
      /nazwa\s+systemu[:\s]+([^\n\.]+)/i,
      /system[:\s]+([^\n\.]+)/i,
      /nazwa\s+aplikacji[:\s]+([^\n\.]+)/i,
      /aplikacja[:\s]+([^\n\.]+)/i,
      /nazwa[:\s]+([^\n\.]+)/i
    ];
    
    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].trim().length > 0) {
        const name = match[1].trim();
        if (name.length > 5 && name.length < 100) {
          // Wyczyść nazwę z timestampów i innych niepożądanych prefiksów, jeśli istnieją
          const cleanNamePattern = /^\d+-\d+-(.+)$/;
          if (cleanNamePattern.test(name)) {
            const cleanMatch = name.match(cleanNamePattern);
            if (cleanMatch && cleanMatch[1]) {
              return cleanMatch[1].trim().substring(0, 100);
            }
          }
          
          return name.substring(0, 100); // Ogranicz do 100 znaków
        }
      }
    }
    
    // Wyczyść nazwę pliku z timestampów i innych prefiksów
    const cleanNamePattern = /^\d+-\d+-(.+)$/;
    if (cleanNamePattern.test(defaultName)) {
      const match = defaultName.match(cleanNamePattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    // Jeśli nie znaleziono nazwy, użyj nazwy pliku bez prefiksu "System"
    return defaultName;
  }
  
  private extractSystemDescriptionFromText(text: string): string {
    // Szukamy typowych wzorców opisu systemu w tekście
    const descPatterns = [
      /opis\s+systemu[:\s]+([^\n]+(\n[^\n]+){0,3})/i,
      /charakterystyka\s+systemu[:\s]+([^\n]+(\n[^\n]+){0,3})/i,
      /przeznaczenie\s+systemu[:\s]+([^\n]+(\n[^\n]+){0,3})/i,
      /cel\s+systemu[:\s]+([^\n]+(\n[^\n]+){0,3})/i
    ];
    
    for (const pattern of descPatterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].trim().length > 0) {
        return match[1].trim().substring(0, 500); // Ogranicz do 500 znaków
      }
    }
    
    // Jeśli nie znaleziono opisu, użyj fragmentu tekstu
    const firstParagraphs = text.split('\n').filter(p => p.trim().length > 0).slice(0, 3).join(' ');
    if (firstParagraphs.length > 0) {
      return firstParagraphs.substring(0, 500);
    }
    
    return "System informatyczny wspierający procesy biznesowe organizacji";
  }
  
  private extractSystemFunctionFromText(text: string): string {
    // Szukamy typowych wzorców funkcji systemu w tekście
    const funcPatterns = [
      /funkcje\s+systemu[:\s]+([^\n]+(\n[^\n]+){0,3})/i,
      /funkcjonalności[:\s]+([^\n]+(\n[^\n]+){0,3})/i,
      /główne\s+funkcje[:\s]+([^\n]+(\n[^\n]+){0,3})/i,
      /możliwości\s+systemu[:\s]+([^\n]+(\n[^\n]+){0,3})/i
    ];
    
    for (const pattern of funcPatterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].trim().length > 0) {
        return match[1].trim().substring(0, 500);
      }
    }
    
    return "Zarządzanie procesami biznesowymi, przechowywanie danych, raportowanie";
  }
  
  private extractSystemCapabilitiesFromText(text: string): string {
    // Szukamy typowych wzorców możliwości systemu w tekście
    const capPatterns = [
      /możliwości\s+systemu[:\s]+([^\n]+(\n[^\n]+){0,3})/i,
      /funkcjonalności\s+systemu[:\s]+([^\n]+(\n[^\n]+){0,3})/i,
      /zakres\s+funkcjonalny[:\s]+([^\n]+(\n[^\n]+){0,3})/i,
      /moduły\s+systemu[:\s]+([^\n]+(\n[^\n]+){0,3})/i
    ];
    
    for (const pattern of capPatterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].trim().length > 0) {
        return match[1].trim().substring(0, 500);
      }
    }
    
    return "Przechowywanie i przetwarzanie danych, generowanie raportów, integracja z innymi systemami";
  }
  
  private extractSystemDependenciesFromText(text: string): string {
    // Szukamy typowych wzorców zależności systemu w tekście
    const depPatterns = [
      /zależności\s+systemowe[:\s]+([^\n]+(\n[^\n]+){0,3})/i,
      /powiązania\s+z\s+innymi\s+systemami[:\s]+([^\n]+(\n[^\n]+){0,3})/i,
      /integracje[:\s]+([^\n]+(\n[^\n]+){0,3})/i,
      /systemy\s+zewnętrzne[:\s]+([^\n]+(\n[^\n]+){0,3})/i
    ];
    
    for (const pattern of depPatterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].trim().length > 0) {
        return match[1].trim().substring(0, 500);
      }
    }
    
    return "Inne systemy w organizacji, bazy danych, usługi zewnętrzne";
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

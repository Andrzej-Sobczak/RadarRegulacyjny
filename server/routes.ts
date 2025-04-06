import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { aiService } from "./services/aiService";
import { fileService } from "./services/fileService";

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(process.cwd(), "uploads");
      // Ensure directory exists
      fs.mkdir(dir, { recursive: true })
        .then(() => cb(null, dir))
        .catch((err) => cb(err, dir));
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + "-" + file.originalname);
    },
  }),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // API Routes
  
  // Upload routes
  app.post("/api/uploads/regulations", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const fileId = await fileService.processRegulationFile(req.file.path);
      
      res.json({ 
        id: fileId, 
        name: req.file.originalname
      });
    } catch (err) {
      console.error("Error uploading regulation file:", err);
      res.status(500).json({ message: "Error processing file" });
    }
  });
  
  app.post("/api/uploads/systems", upload.single("file"), async (req, res) => {
    try {
      console.log("Processing system file upload...");
      console.log("Request body:", req.body);
      console.log("Request file:", req.file);
      
      if (!req.file) {
        console.error("No file uploaded");
        return res.status(400).json({ message: "Nie przesłano pliku" });
      }
      
      console.log(`File uploaded at: ${req.file.path}`);
      
      const fileId = await fileService.processSystemFile(req.file.path);
      console.log(`System file processed with ID: ${fileId}`);
      
      // Pobierz wszystkie systemy, aby sprawdzić, czy zostały dodane
      const systems = await storage.getAllSystems();
      console.log(`Total systems in storage: ${systems.length}`);
      
      res.json({ 
        id: fileId, 
        name: req.file.originalname 
      });
    } catch (err) {
      console.error("Error uploading system file:", err);
      res.status(500).json({ 
        message: "Błąd podczas przetwarzania pliku", 
        error: err instanceof Error ? err.message : String(err) 
      });
    }
  });
  
  app.post("/api/uploads/requirements", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const fileId = await fileService.processRequirementsFile(req.file.path);
      
      res.json({ 
        id: fileId, 
        name: req.file.originalname 
      });
    } catch (err) {
      console.error("Error uploading requirements file:", err);
      res.status(500).json({ message: "Error processing file" });
    }
  });
  
  // Requirements routes
  app.post("/api/requirements/extract", async (req, res) => {
    try {
      const { documentIds } = req.body;
      
      if (!documentIds || !Array.isArray(documentIds)) {
        return res.status(400).json({ message: "Invalid document IDs" });
      }
      
      const requirements = await aiService.extractRequirements(documentIds);
      
      // Store the extracted requirements
      for (const req of requirements) {
        await storage.createRequirement(req);
      }
      
      res.json(requirements);
    } catch (err) {
      console.error("Error extracting requirements:", err);
      res.status(500).json({ message: "Error extracting requirements" });
    }
  });
  
  app.get("/api/requirements", async (req, res) => {
    try {
      const requirements = await storage.getAllRequirements();
      res.json(requirements);
    } catch (err) {
      console.error("Error getting requirements:", err);
      res.status(500).json({ message: "Error getting requirements" });
    }
  });
  
  app.put("/api/requirements/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const requirement = req.body;
      
      if (id !== requirement.id) {
        return res.status(400).json({ message: "ID mismatch" });
      }
      
      const updated = await storage.updateRequirement(requirement);
      res.json(updated);
    } catch (err) {
      console.error("Error updating requirement:", err);
      res.status(500).json({ message: "Error updating requirement" });
    }
  });
  
  app.delete("/api/requirements/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteRequirement(id);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting requirement:", err);
      res.status(500).json({ message: "Error deleting requirement" });
    }
  });
  
  app.get("/api/requirements/export", async (req, res) => {
    try {
      const requirements = await storage.getAllRequirements();
      
      // Generate a unique filename
      const filename = `requirements_${Date.now()}.json`;
      const filePath = path.join(process.cwd(), "uploads", filename);
      
      // Write to file
      await fs.writeFile(filePath, JSON.stringify(requirements, null, 2));
      
      // Return download URL
      res.json({ url: `/api/download/${filename}` });
    } catch (err) {
      console.error("Error exporting requirements:", err);
      res.status(500).json({ message: "Error exporting requirements" });
    }
  });
  
  // Systems routes
  app.get("/api/systems", async (req, res) => {
    try {
      const systems = await storage.getAllSystems();
      res.json(systems);
    } catch (err) {
      console.error("Error getting systems:", err);
      res.status(500).json({ message: "Error getting systems" });
    }
  });
  
  // Impact analysis routes
  app.post("/api/impact/analyze", async (req, res) => {
    try {
      const { requirementIds, systemIds } = req.body;
      
      if (!requirementIds || !Array.isArray(requirementIds)) {
        return res.status(400).json({ message: "Invalid requirement IDs" });
      }
      
      if (!systemIds || !Array.isArray(systemIds)) {
        return res.status(400).json({ message: "Invalid system IDs" });
      }
      
      const requirements = await Promise.all(
        requirementIds.map(id => storage.getRequirement(id))
      );
      
      const systems = await Promise.all(
        systemIds.map(id => storage.getSystem(id))
      );
      
      // Filter out nulls
      const validRequirements = requirements.filter(Boolean);
      const validSystems = systems.filter(Boolean);
      
      const impacts = await aiService.analyzeImpact(validRequirements, validSystems);
      
      // Store the impacts
      for (const impact of impacts) {
        await storage.createImpact(impact);
      }
      
      res.json(impacts);
    } catch (err) {
      console.error("Error analyzing impact:", err);
      res.status(500).json({ message: "Error analyzing impact" });
    }
  });
  
  app.get("/api/impact", async (req, res) => {
    try {
      const impacts = await storage.getAllImpacts();
      res.json(impacts);
    } catch (err) {
      console.error("Error getting impacts:", err);
      res.status(500).json({ message: "Error getting impacts" });
    }
  });
  
  app.get("/api/impact/export", async (req, res) => {
    try {
      const impacts = await storage.getAllImpacts();
      
      // Generate a unique filename
      const filename = `impact_analysis_${Date.now()}.json`;
      const filePath = path.join(process.cwd(), "uploads", filename);
      
      // Write to file
      await fs.writeFile(filePath, JSON.stringify(impacts, null, 2));
      
      // Return download URL
      res.json({ url: `/api/download/${filename}` });
    } catch (err) {
      console.error("Error exporting impact analysis:", err);
      res.status(500).json({ message: "Error exporting impact analysis" });
    }
  });
  
  // API settings routes
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getApiSettings();
      res.json(settings);
    } catch (err) {
      console.error("Error getting API settings:", err);
      res.status(500).json({ message: "Error getting API settings" });
    }
  });
  
  app.put("/api/settings", async (req, res) => {
    try {
      const settings = req.body;
      const updated = await storage.updateApiSettings(settings);
      res.json(updated);
    } catch (err) {
      console.error("Error updating API settings:", err);
      res.status(500).json({ message: "Error updating API settings" });
    }
  });
  
  app.post("/api/settings/test", async (req, res) => {
    try {
      const settings = await storage.getApiSettings();
      
      if (!settings.openaiApiKey) {
        return res.json({ 
          success: false, 
          message: "Brak klucza API OpenAI. Wprowadź klucz API."
        });
      }
      
      // Test only OpenAI connection since Gemini is temporarily disabled
      const openaiResult = await aiService.testOpenAIConnection(settings.openaiApiKey);
      
      if (openaiResult) {
        // Update settings
        settings.isWorking = true;
        settings.lastTested = new Date().toISOString();
        await storage.updateApiSettings(settings);
        
        res.json({ 
          success: true, 
          message: "Połączenie z API OpenAI zostało ustanowione pomyślnie!"
        });
      } else {
        // Update settings
        settings.isWorking = false;
        settings.lastTested = new Date().toISOString();
        await storage.updateApiSettings(settings);
        
        const message = "Błąd połączenia z API OpenAI. Sprawdź poprawność klucza API.";
        
        res.json({ success: false, message });
      }
    } catch (err) {
      console.error("Error testing API connection:", err);
      res.status(500).json({ 
        success: false, 
        message: `Błąd testowania połączenia: ${err.message}` 
      });
    }
  });
  
  // File download route
  app.get("/api/download/:filename", async (req, res) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(process.cwd(), "uploads", filename);
      
      // Check if file exists
      await fs.access(filePath);
      
      res.download(filePath);
    } catch (err) {
      console.error("Error downloading file:", err);
      res.status(404).json({ message: "File not found" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

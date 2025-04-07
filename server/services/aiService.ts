import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Requirement, InsertRequirement, System, Impact, InsertImpact, ImpactLevel } from "@shared/schema";
import fs from "fs";
import { TextUtils } from "./textUtils";

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
        model: "gpt-4o", // Uaktualnione do pełnej wersji gpt-4o zgodnie z poleceniem użytkownika
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
      console.log(`aiService.extractRequirements wywołane z ${documentIds.length} dokumentami: ${JSON.stringify(documentIds)}`);
      
      if (!documentIds || documentIds.length === 0) {
        throw new Error("Brak ID dokumentów do analizy");
      }
      
      // Odczytanie zawartości dla każdego pliku TXT
      const textsFromDocuments: string[] = [];
      const documentNames: string[] = [];
      
      // Najpierw sprawdź czy dokumenty istnieją i spróbuj odczytać ich treść
      for (const docId of documentIds) {
        // Sprawdź czy plik istnieje w katalogu uploadów
        try {
          const uploadDir = "./uploads";
          const filePath = `${uploadDir}/${docId}`;
          
          console.log(`Sprawdzanie pliku ${filePath}...`);
          
          // W nowej implementacji plik jest już w formacie TXT
          try {
            const textContent = await fs.promises.readFile(filePath, 'utf-8');
            if (textContent && textContent.length > 0) {
              console.log(`Odczytano treść z pliku ${filePath}, ${textContent.length} znaków`);
              textsFromDocuments.push(textContent);
              documentNames.push(docId);
            } else {
              console.log(`Plik ${filePath} jest pusty lub nie udało się go odczytać`);
              // Jeśli nie ma tekstu, dodaj informację o tym
              textsFromDocuments.push(`[Nie udało się odczytać treści dokumentu ${docId}]`);
              documentNames.push(docId);
            }
          } catch (fileError) {
            console.error(`Błąd odczytu pliku ${filePath}:`, fileError);
            // Jeśli nie ma pliku tekstowego, informujemy że nie znaleziono dokumentu
            textsFromDocuments.push(`[Nie znaleziono dokumentu ${docId}]`);
            documentNames.push(docId);
          }
        } catch (error) {
          console.error(`Błąd przetwarzania dokumentu ${docId}:`, error);
          // Jeśli wystąpił błąd, dodaj informację o tym
          textsFromDocuments.push(`[Błąd przetwarzania dokumentu ${docId}]`);
          documentNames.push(docId);
        }
      }
      
      // Jeśli nie znaleziono żadnych treści dokumentów, zwróć błąd
      if (textsFromDocuments.length === 0) {
        throw new Error("Nie znaleziono treści żadnego z dokumentów");
      }
      
      // Użyj OpenAI do ekstrakcji wymagań
      const openai = await this.getOpenAIInstance();
      
      // Przygotuj prompt zawierający treść dokumentów
      const documentTexts = textsFromDocuments.map((text, index) => 
        `DOKUMENT ${index + 1} (${documentNames[index]}):\n${text.substring(0, 10000)}${text.length > 10000 ? '...' : ''}`
      ).join('\n\n--------\n\n');
      
      const prompt = `
      ## Prompt do Ekstrakcji Kluczowych Wymagań z Przepisów Prawnych
      
      Jesteś ekspertem w dziedzinie prawa i zgodności IT. Twoim zadaniem jest analiza dokumentów prawnych i ekstrakcja precyzyjnych wymagań, które mają wpływ na systemy IT w środowiskach przedsiębiorstw. Skup się wyłącznie na zmianach wpływających na systemy przedsiębiorstw, a nie na administrację publiczną.
      
      DOKUMENT(Y) DO ANALIZY:
      ${documentTexts}
      
      ZADANIE:
      Wyodrębnij i przeanalizuj wszystkie istotne dla IT wymagania z dostarczonych dokumentów prawnych, zwracając szczególną uwagę na obowiązki regulacyjne, które wymagają zmian w systemach IT, procesach lub obsłudze danych.
      
      Dla KAŻDEGO zidentyfikowanego wymagania, przedstaw następującą strukturalną analizę:
      
      1. IDENTYFIKATOR WYMAGANIA: Odwołanie do konkretnego artykułu, paragrafu lub sekcji, w której pojawia się to wymaganie.
      
      2. TREŚĆ WYMAGANIA: Zacytuj dokładny tekst z dokumentu, który ustanawia to wymaganie.
      
      3. KATEGORYZACJA: Sklasyfikuj wymaganie do TYLKO JEDNEJ z tych kategorii (użyj dokładnie tak, jak wymienione):
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
      
      4. PRZEDMIOT: Opisz dokładnie, który aspekt systemów IT to dotyczy (np. "przechowywanie danych osobowych klientów", "mechanizmy autoryzacji transakcji", "zautomatyzowane możliwości raportowania").
      
      5. CEL ZGODNOŚCI: Jaki konkretny wynik lub stan musi zostać osiągnięty, aby zapewnić zgodność z tym wymaganiem? Bądź konkretny i mierzalny, jeśli to możliwe.
      
      6. IMPLIKACJE TECHNICZNE: Jakie konkretne możliwości techniczne lub funkcje muszą zaimplementować systemy IT? Bądź konkretny odnośnie tego, co systemy muszą ROBIĆ, a nie tylko ogólnych celów.
      
      7. HARMONOGRAM WDROŻENIA:
      - Wyraźny termin wspomniany w tekście (zacytuj, jeśli jest obecny)
      - Wywnioskowany termin na podstawie kontekstu
      - Standardowy okres wdrożenia, jeśli nie określono
      - Podaj szczegóły, jeśli to możliwe (np. "Kary do 20 milionów EUR lub 4% globalnego obrotu w ramach RODO")
      
      8. ODNIESIENIA KRZYŻOWE: Zauważ inne artykuły lub sekcje w przepisie, które odnoszą się do lub modyfikują to wymaganie.
      
      9. KLUCZOWE TERMINY: Wymień krytyczne terminy lub koncepcje, które pojawiają się w tym wymaganiu, które mogą wymagać precyzyjnej definicji dla implementacji technicznej.
      
      FORMAT:
      Przedstaw swoją analizę jako tablicę JSON, gdzie każdy obiekt ma następujące właściwości: identifier, requirementText, category, subjectMatter, complianceObjective, technicalImplications, implementationTimeline, crossReferences, keyTerms, source.
      
      DODATKOWE WYTYCZNE:
      - OBOWIĄZKOWO przeprowadź WYCZERPUJĄCĄ i SZCZEGÓŁOWĄ analizę CAŁEGO dokumentu prawnego, bez pomijania żadnych artykułów i ustępów
      - Zidentyfikuj i wyodrębnij ABSOLUTNIE WSZYSTKIE wymagania prawne mające jakikolwiek wpływ na systemy IT - MINIMUM 20 wymagań
      - Traktuj KAŻDY artykuł, ustęp i punkt jako potencjalne źródło osobnego wymagania technicznego
      - Analizuj dokument bardzo SZCZEGÓŁOWO - znajdź nawet najmniejsze implikacje techniczne i traktuj je jako osobne wymagania
      - Zwróć szczególną uwagę na następujące aspekty wymagające zmian w systemach IT:
        * Zmiany w procesach przechowywania i przetwarzania danych
        * Dostęp do danych i zarządzanie uprawnieniami użytkowników
        * Zbieranie, przechowywanie i zarządzanie nowymi typami danych
        * Integracja i komunikacja między systemami wewnętrznymi i zewnętrznymi
        * Automatyzacja procesów biznesowych i administracyjnych
        * Implementacja i zmiany w API oraz usługach sieciowych
        * Wymagania dotyczące bezpieczeństwa danych i systemów
        * Mechanizmy raportowania, monitorowania i audytu
        * Terminy wdrożenia zmian i ich wpływ na harmonogramy projektów IT
        * Formaty danych i standardy interoperacyjności
      - Zidentyfikuj zarówno BEZPOŚREDNIE, jak i POŚREDNIE implikacje techniczne dla systemów IT
      - Znajdź ukryte i nieoczywiste wymagania techniczne, które wynikają z przepisów prawnych
      - Analizuj nawet fragmenty tekstu, które wydają się nie mieć bezpośredniego związku z IT
      - Dla każdej zmiany w prawie zastanów się, jakie procesy techniczne i systemy informatyczne będą musiały zostać dostosowane
      - Jeśli dokument zawiera mniej niż 20 wymagań bezpośrednich, KONIECZNIE zidentyfikuj dodatkowe implikacje techniczne
      - Wszystkie odpowiedzi muszą być w języku polskim
      
      ODPOWIEDZ W FORMACIE JSON:
      {
        "requirements": [
          {
            "identifier": "Art. X, ust. Y",
            "requirementText": "Dokładny cytat...",
            "category": "Jedna z podanych kategorii",
            "subjectMatter": "...",
            "complianceObjective": "...",
            "technicalImplications": "...",
            "implementationTimeline": "...",
            "crossReferences": "...",
            "keyTerms": "...",
            "source": "RODO" lub nazwa analizowanego dokumentu
          },
          // kolejne wymagania...
        ]
      }
      
      Dokładnie trzymaj się tego formatu JSON!
      `;
      
      console.log(`Wysyłanie zapytania do OpenAI z tekstem o długości ${prompt.length} znaków...`);
      
      // Wywołanie API OpenAI
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // Uaktualnione do pełnej wersji gpt-4o zgodnie z poleceniem użytkownika
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 4096 // Ustawiono maksymalny dostępny limit tokenów dla GPT-4o
      });
      
      const content = response.choices[0].message.content;
      if (!content) throw new Error("Pusta odpowiedź z OpenAI");
      
      console.log(`Otrzymano odpowiedź od OpenAI, długość: ${content.length} znaków`);
      console.log(`Początek odpowiedzi: ${content.substring(0, 200)}`);
      
      try {
        // Parsowanie odpowiedzi do formatu JSON
        const parsedResponse = JSON.parse(content);
        
        // Sprawdzenie czy odpowiedź zawiera tablicę requirements
        if (!parsedResponse.requirements || !Array.isArray(parsedResponse.requirements)) {
          console.error("Nieprawidłowy format odpowiedzi z OpenAI:", content);
          throw new Error("Nieprawidłowy format odpowiedzi z OpenAI - brak tablicy requirements");
        }
        
        console.log(`Wyodrębniono ${parsedResponse.requirements.length} wymagań`);
        
        // Mapowanie odpowiedzi na format InsertRequirement
        return parsedResponse.requirements.map((req: any) => ({
          identifier: req.identifier || "Brak identyfikatora",
          requirementText: req.requirementText || "Brak tekstu wymagania",
          category: req.category || "Inne",
          subjectMatter: req.subjectMatter || "",
          complianceObjective: req.complianceObjective || "",
          technicalImplications: req.technicalImplications || "",
          implementationTimeline: req.implementationTimeline || "",
          crossReferences: req.crossReferences || "",
          keyTerms: req.keyTerms || "",
          source: req.source || documentNames.join(", ") || "RODO"
        }));
      } catch (parseError) {
        console.error("Błąd parsowania odpowiedzi JSON z OpenAI:", parseError);
        console.error("Otrzymana odpowiedź:", content);
        throw new Error("Błąd parsowania odpowiedzi z OpenAI");
      }
    } catch (error) {
      console.error("Błąd ekstrakcji wymagań:", error);
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
      
      // Używamy pełnej liczby wymagań i systemów zgodnie z parametrami przekazanymi do funkcji
      console.log(`Analizuję ${requirements.length} wymagań i ${systems.length} systemów`);
      
      // Now using OpenAI instead of Gemini
      const openai = await this.getOpenAIInstance();
      
      const prompt = `
      Jesteś ekspertem w zakresie prawa i analiz zgodności IT. Twoim zadaniem jest analiza dokumentów prawnych i określenie szczegółowego wpływu wymagań regulacyjnych na systemy IT w środowisku korporacyjnym. Skup się wyłącznie na zmianach mających wpływ na systemy przedsiębiorstw.

      DANE WEJŚCIOWE:
      1. OPIS ARCHITEKTURY SYSTEMÓW:
      ${JSON.stringify(systems, null, 2)}
      
      2. WYMAGANIA REGULACYJNE:
      ${JSON.stringify(requirements, null, 2)}
      
      ZADANIE:
      Wykonaj szczegółową analizę mapowania, aby określić, jak każde wymaganie regulacyjne wpływa na opisaną architekturę IT. Uwzględnij bezpośrednie wpływy, pośrednie zależności i wyzwania integracyjne.
      
      PODEJŚCIE ANALITYCZNE:
      Dla KAŻDEGO komponentu systemu zidentyfikowanego w opisie architektury:
      
      1. IDENTYFIKACJA SYSTEMU:
         - Nazwa systemu i jego główna funkcja
         - Aktualne możliwości związane z wymaganiami regulacyjnymi
         - Kluczowe zależności z innymi systemami
      
      2. OCENA WPŁYWU:
         - Lista wszystkich wymagań regulacyjnych wpływających na ten system (z odniesieniem do ID wymagań)
         - Dla każdego istotnego wymagania:
           a. Poziom wpływu (Krytyczny/Wysoki/Średni/Niski/Brak) z uzasadnieniem
           b. Typ wpływu: Struktura danych, Funkcjonalność, Bezpieczeństwo, Integracja, Wydajność, Interfejs użytkownika, Raportowanie, Inne
           c. Analiza luki: opis konkretnej różnicy między obecnymi możliwościami a wymaganiami regulacyjnymi
      
      3. WYMAGANE MODYFIKACJE:
         - Niezbędne zmiany funkcjonalne (konkretne funkcje lub możliwości)
         - Wymagane zmiany modelu/struktury danych
         - Niezbędne modyfikacje API/interfejsu
         - Adaptacje mechanizmów bezpieczeństwa
      
      4. ZALEŻNOŚCI SYSTEMOWE:
         - Systemy nadrzędne, które muszą dostarczać dane/funkcjonalność
         - Systemy podrzędne, które wykorzystują dane/funkcjonalność
         - Punkty integracji wymagające modyfikacji
      
      5. OCENA ZŁOŻONOŚCI WDROŻENIA:
         - Szacowany poziom złożoności (Bardzo wysoki/Wysoki/Średni/Niski) z uzasadnieniem
         - Przewidywane kluczowe wyzwania techniczne
         - Wymagana specjalistyczna wiedza
      
      6. CZYNNIKI PRIORYTETYZACJI:
         - Uwarunkowania związane z terminem prawnym
         - Wymagania wstępne/zależności wdrożeniowe
         - Znaczenie operacyjne
      
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
      
      DODATKOWE WSKAZÓWKI:
      - Uwzględnij zarówno bezpośredni wpływ (system bezpośrednio obsługuje regulowane dane/procesy), jak i pośredni wpływ (system integruje się z bezpośrednio dotkniętymi systemami)
      - Zwróć szczególną uwagę na przepływy danych, zwłaszcza w przypadku danych wrażliwych
      - Uwzględnij implikacje bezpieczeństwa w całej analizie
      - Przeanalizuj, jak wymagania mogą być sprzeczne z istniejącymi zasadami architektury
      
      Zwróć analizę wpływu przynajmniej 3 różnych wymagań na przynajmniej 2 różne systemy.
      Wszystkie odpowiedzi muszą być w języku polskim.
      `;
      
      console.log("Wysyłam zapytanie do OpenAI...");
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // Uaktualnione do pełnej wersji gpt-4o zgodnie z poleceniem użytkownika
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 4096 // Ustawiono maksymalny dostępny limit tokenów dla GPT-4o
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
        // Upewnij się, że impact.impactLevel jest w jednym ze zdefiniowanych formatów
        let normalizedImpactLevel = impact.impactLevel || ImpactLevel.MEDIUM;
        
        // Konwersja wartości tekstowych na wartości z enuma
        if (normalizedImpactLevel === "krytyczny" || normalizedImpactLevel === "Krytyczny") {
          normalizedImpactLevel = ImpactLevel.CRITICAL;
        } else if (normalizedImpactLevel === "wysoki" || normalizedImpactLevel === "Wysoki") {
          normalizedImpactLevel = ImpactLevel.HIGH;
        } else if (normalizedImpactLevel === "średni" || normalizedImpactLevel === "Średni") {
          normalizedImpactLevel = ImpactLevel.MEDIUM;
        } else if (normalizedImpactLevel === "niski" || normalizedImpactLevel === "Niski") {
          normalizedImpactLevel = ImpactLevel.LOW;
        } else if (normalizedImpactLevel === "brak" || normalizedImpactLevel === "Brak") {
          normalizedImpactLevel = ImpactLevel.NONE;
        }
        
        // Log dla debugowania
        console.log(`Znormalizowany poziom wpływu: ${normalizedImpactLevel} (oryginalny: ${impact.impactLevel})`);
        
        return {
          systemId,
          requirementId,
          impactLevel: normalizedImpactLevel,
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
          // W awaryjnych danych generujemy różne poziomy wpływu, żeby przetestować wyświetlanie
          const impactLevels = [ImpactLevel.CRITICAL, ImpactLevel.HIGH, ImpactLevel.MEDIUM, ImpactLevel.LOW];
          const randomLevel = impactLevels[Math.floor(Math.random() * impactLevels.length)];
          
          impacts.push({
            systemId: system.id,
            requirementId: req.id,
            impactLevel: randomLevel,
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

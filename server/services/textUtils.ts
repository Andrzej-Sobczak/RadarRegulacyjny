import fs from 'fs/promises';
import path from 'path';

/**
 * Klasa narzędziowa do pracy z plikami tekstowymi
 */
export class TextUtils {
  /**
   * Odczytaj treść z pliku tekstowego
   */
  static async readTextFromFile(filePath: string): Promise<string> {
    try {
      // Sprawdź czy plik istnieje
      await fs.access(filePath);
      
      // Odczytaj plik jako tekst
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Plik tekstowy może zostać bezpośrednio przekazany do analizy
      console.log(`Odczytano ${content.length} znaków tekstu z pliku ${filePath}`);
      return content;
    } catch (error) {
      console.error(`Błąd podczas odczytu pliku tekstowego ${filePath}:`, error);
      throw error;
    }
  }
  
  /**
   * Oczyść i normalizuj tekst
   */
  static cleanText(text: string): string {
    // Usuń powtarzające się spacje
    let cleaned = text.replace(/\s+/g, ' ');
    
    // Usuń niedrukowane znaki kontrolne
    cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');
    
    // Normalizuj odstępy między akapitami
    cleaned = cleaned.replace(/\n\s*\n/g, '\n\n');
    
    // Usuwaj linie zawierające tylko liczby (numery stron)
    cleaned = cleaned.replace(/^\s*\d+\s*$/gm, '');
    
    // Konwertuj wiele spacji na pojedyncze
    cleaned = cleaned.replace(/[ \t]+/g, ' ');
    
    // Usuń spacje na początku i końcu
    cleaned = cleaned.trim();
    
    return cleaned;
  }
  
  /**
   * Odczytaj metadane pliku
   */
  static async getFileMetadata(filePath: string): Promise<any> {
    try {
      return {
        filename: path.basename(filePath),
        lastModified: new Date().toISOString(),
        size: (await fs.stat(filePath)).size
      };
    } catch (error) {
      console.error(`Błąd podczas odczytywania metadanych pliku ${filePath}:`, error);
      throw error;
    }
  }
}
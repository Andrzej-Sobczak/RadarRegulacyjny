import fs from 'fs/promises';
import path from 'path';

/**
 * Prosta klasa narzędziowa do pracy z plikami PDF bez zewnętrznych zależności
 * W rzeczywistej implementacji używalibyśmy biblioteki takiej jak pdf.js lub pdf-parse,
 * ale dla celów demonstracyjnych używamy prostej implementacji
 */
export class PDFUtils {
  /**
   * Wyodrębnij tekst z pliku PDF
   * W rzeczywistej implementacji używalibyśmy biblioteki do przetwarzania PDF,
   * ale dla celów demonstracyjnych zwraca podstawowy tekst
   */
  static async extractTextFromPDF(filePath: string): Promise<string> {
    try {
      // Sprawdź czy plik istnieje
      await fs.access(filePath);
      
      // Odczytaj plik jako buffer
      const buffer = await fs.readFile(filePath);
      
      // W rzeczywistej implementacji tutaj użylibyśmy biblioteki do przetwarzania PDF,
      // ale dla celów demonstracyjnych użyjemy prostego podejścia
      
      // Podstawowa metoda wyodrębniania tekstu - szukaj ciągów znaków UTF-8 w pliku
      let text = '';
      
      // Szukaj występowania ciągów Unicode w danych binarnych
      // Jest to bardzo uproszczone podejście, które nie będzie działać dobrze dla wszystkich PDF-ów,
      // ale wystarczy do celów demonstracyjnych
      for (let i = 0; i < buffer.length - 1; i++) {
        if (buffer[i] >= 32 && buffer[i] <= 126) { // Sprawdź, czy znak jest drukowalnym znakiem ASCII
          const char = String.fromCharCode(buffer[i]);
          text += char;
        } else if ((buffer[i] === 13 && buffer[i + 1] === 10) || buffer[i] === 10) { // CR LF lub LF
          text += '\n';
        }
      }
      
      // Oczyść tekst
      text = this.cleanPDFText(text);
      
      // Zapisz wyodrębniony tekst do pliku .txt dla łatwiejszego debugowania
      const textFilePath = `${filePath}.txt`;
      await fs.writeFile(textFilePath, text);
      
      // Zapisz metadane
      const metadataFilePath = `${filePath}.json`;
      const metadata = {
        filename: path.basename(filePath),
        extractedAt: new Date().toISOString(),
        fileSize: buffer.length,
        textLength: text.length
      };
      await fs.writeFile(metadataFilePath, JSON.stringify(metadata, null, 2));
      
      return text;
    } catch (error) {
      console.error(`Błąd podczas przetwarzania pliku PDF ${filePath}:`, error);
      throw error;
    }
  }
  
  /**
   * Oczyść i normalizuj tekst wyodrębniony z PDF
   */
  private static cleanPDFText(text: string): string {
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
   * Odczytaj metadane pliku PDF (dla celów demonstracyjnych)
   */
  static async extractMetadata(filePath: string): Promise<any> {
    try {
      return {
        filename: path.basename(filePath),
        lastModified: new Date().toISOString(),
        size: (await fs.stat(filePath)).size
      };
    } catch (error) {
      console.error(`Błąd podczas odczytywania metadanych PDF ${filePath}:`, error);
      throw error;
    }
  }
}
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getRequirements, getSystems, getImpacts, getApiSettings } from '../lib/api';
import { apiRequest } from '../lib/queryClient';
import { Requirement, System, Impact } from '@shared/schema';

type FileInfo = {
  id: string;
  name: string;
  type: 'regulation' | 'system' | 'requirements';
};

// Typ określający stan operacji przetwarzania
export type ProcessingStatus = {
  isProcessing: boolean;
  progress: number; // 0-100
  message: string;
};

interface AppContextType {
  // Załadowane pliki
  uploadedFiles: FileInfo[];
  addUploadedFile: (fileInfo: FileInfo) => void;
  removeUploadedFile: (fileId: string) => void;
  
  // Dane
  requirements: Requirement[];
  systems: System[];
  impacts: Impact[];
  
  // Funkcje resetujące dane
  clearRequirements: () => void;
  clearSystems: () => void;
  clearImpacts: () => void;
  
  // Nowa funkcja do resetowania całej analizy
  resetAllAnalysis: () => void;
  
  // Informacje o API
  isApiConfigured: boolean;
  
  // Stan przetwarzania dla operacji ekstrakcji i analizy
  extractionStatus: ProcessingStatus;
  setExtractionStatus: (status: ProcessingStatus) => void;
  
  analysisStatus: ProcessingStatus;
  setAnalysisStatus: (status: ProcessingStatus) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [uploadedFiles, setUploadedFiles] = useState<FileInfo[]>([]);
  const [isApiConfigured, setIsApiConfigured] = useState<boolean>(false);
  const queryClient = useQueryClient();
  
  // Inicjalizacja stanów przetwarzania
  const [extractionStatus, setExtractionStatus] = useState<ProcessingStatus>({
    isProcessing: false,
    progress: 0,
    message: ""
  });
  
  const [analysisStatus, setAnalysisStatus] = useState<ProcessingStatus>({
    isProcessing: false,
    progress: 0,
    message: ""
  });
  
  // Pobierz informacje o konfiguracji API - ustawiony refetchInterval wymusza częste odświeżanie
  const { data: apiSettings } = useQuery({
    queryKey: ['/api/settings'],
    refetchInterval: 2000, // Odświeżanie co 2 sekundy
    refetchOnWindowFocus: true, // Odświeżanie przy przełączaniu okien
    retry: true, // Spróbuj ponownie w przypadku niepowodzenia
    gcTime: 0, // Wyłączenie cache - zawsze pobieramy świeże dane (cacheTime jest już przestarzały)
  });
  
  // Aktualizuj stan po pobraniu danych
  useEffect(() => {
    if (apiSettings) {
      const settings = apiSettings as any;
      
      console.log("API settings:", settings);
      console.log("Klucz API (wartość):", settings.openaiApiKey);
      console.log("Klucz API (istnieje):", !!settings.openaiApiKey);
      console.log("Last Tested:", settings.lastTested);
      console.log("isWorking:", settings.isWorking);
      
      // NAJWAŻNIEJSZE: Ustawiamy stan isApiConfigured na true, JEŚLI:
      // 1. Klucz API istnieje (openaiApiKey nie jest pusty)
      // 2. ORAZ pole isWorking jest true ALBO ignorujemy isWorking całkowicie
      // Obecnie CAŁKOWICIE ignorujemy sprawdzanie isWorking - sam klucz to wystarczy
      const apiConfigured = !!settings.openaiApiKey;
      
      console.log("API skonfigurowane? (Finalne sprawdzenie):", apiConfigured);
      setIsApiConfigured(apiConfigured);
    }
  }, [apiSettings]);
  
  // Fetch data from API
  const { data: requirementsData = [] } = useQuery({
    queryKey: ['/api/requirements'],
  });
  
  const { data: systemsData = [] } = useQuery({
    queryKey: ['/api/systems'],
  });
  
  const { data: impactsData = [] } = useQuery({
    queryKey: ['/api/impact'],
  });
  
  // Zapewniamy poprawne typy danych
  const requirements = requirementsData as Requirement[];
  const systems = systemsData as System[];
  const impacts = impactsData as Impact[];
  
  // Dodawanie nowego pliku
  const addUploadedFile = (fileInfo: FileInfo) => {
    setUploadedFiles(prev => [...prev.filter(f => f.id !== fileInfo.id), fileInfo]);
  };
  
  // Usuwanie pliku i powiązanych danych
  const removeUploadedFile = (fileId: string) => {
    // Znajdź typ pliku, który został usunięty
    const fileToRemove = uploadedFiles.find(file => file.id === fileId);
    
    // Usuń plik z listy
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    
    if (fileToRemove) {
      // Jeśli usuwamy plik z wymaganiami, wyczyść wymagania
      if (fileToRemove.type === 'requirements') {
        queryClient.setQueryData(['/api/requirements'], []);
      }
      // Jeśli usuwamy plik systemowy, wyczyść systemy
      else if (fileToRemove.type === 'system') {
        queryClient.setQueryData(['/api/systems'], []);
      }
    }
  };
  
  // Czyszczenie danych
  const clearRequirements = () => {
    queryClient.setQueryData(['/api/requirements'], []);
    setUploadedFiles(prev => prev.filter(f => f.type !== 'regulation' && f.type !== 'requirements'));
  };
  
  const clearSystems = () => {
    queryClient.setQueryData(['/api/systems'], []);
    setUploadedFiles(prev => prev.filter(f => f.type !== 'system'));
  };
  
  const clearImpacts = () => {
    queryClient.setQueryData(['/api/impact'], []);
  };
  
  // Funkcja resetująca całą analizę - czyści wszystkie dane, ale zachowuje klucz API
  const resetAllAnalysis = async () => {
    try {
      // Resetuj dane w komponentach UI - najpierw settery, żeby użytkownik od razu zobaczył efekt
      setUploadedFiles([]);
      setExtractionStatus({ isProcessing: false, progress: 0, message: "" });
      setAnalysisStatus({ isProcessing: false, progress: 0, message: "" });
      
      // Wyślij zapytania API o usunięcie danych - najpierw te wartości na serwerze
      try {
        await apiRequest({
          url: '/api/requirements/reset',
          method: 'POST',
        });
        
        await apiRequest({
          url: '/api/systems/reset',
          method: 'POST',
        });
        
        await apiRequest({
          url: '/api/impact/reset',
          method: 'POST',
        });
      } catch (err) {
        console.error("Błąd API podczas resetowania:", err);
      }
      
      // Następnie wyczyść lokalną pamięć podręczną React Query
      queryClient.setQueryData(['/api/requirements'], []);
      queryClient.setQueryData(['/api/systems'], []);
      queryClient.setQueryData(['/api/impact'], []);
            
      // Odśwież wszystkie zapytania z serwera
      await queryClient.invalidateQueries({ queryKey: ['/api/requirements'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/systems'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/impact'] });
      
      console.log("Zresetowano całą analizę. Wszystkie dane zostały wyczyszczone.");
    } catch (error) {
      console.error("Błąd podczas resetowania analizy:", error);
      
      // Alternatywne podejście, jeśli API nie zadziała
      queryClient.setQueryData(['/api/requirements'], []);
      queryClient.setQueryData(['/api/systems'], []);
      queryClient.setQueryData(['/api/impact'], []);
      setUploadedFiles([]);
    }
  };
  
  // Debugowanie danych
  useEffect(() => {
    console.log("Liczba wymagań w AppContext:", requirements.length);
    console.log("Liczba systemów w AppContext:", systems.length);
    console.log("Liczba analiz w AppContext:", impacts.length);
  }, [requirements, systems, impacts]);
  
  const value: AppContextType = {
    uploadedFiles,
    addUploadedFile,
    removeUploadedFile,
    requirements,
    systems,
    impacts,
    clearRequirements,
    clearSystems,
    clearImpacts,
    resetAllAnalysis,
    isApiConfigured,
    extractionStatus,
    setExtractionStatus,
    analysisStatus,
    setAnalysisStatus
  };
  
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
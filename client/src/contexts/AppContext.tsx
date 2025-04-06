import React, { createContext, useState, useContext, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getRequirements, getSystems, getImpacts } from '../lib/api';
import { Requirement, System, Impact } from '@shared/schema';

type FileInfo = {
  id: string;
  name: string;
  type: 'regulation' | 'system' | 'requirements';
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [uploadedFiles, setUploadedFiles] = useState<FileInfo[]>([]);
  const queryClient = useQueryClient();
  
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
  
  // Usuwanie pliku
  const removeUploadedFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
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
    clearImpacts
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
import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileUpload } from "../components/FileUpload";
import { SystemImpactItem } from "../components/SystemImpactItem";
import {
  uploadSystemFile,
  uploadRequirementsFile,
  getSystems,
  getRequirements,
  analyzeImpact,
  getImpacts,
  exportImpactAnalysis,
} from "../lib/api";
import { ImpactLevel } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Download, ChevronDown, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "../contexts/AppContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Analysis: React.FC = () => {
  const [uploadedReqFiles, setUploadedReqFiles] = useState<File[]>([]);
  const [uploadedSysFiles, setUploadedSysFiles] = useState<File[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [impactFilter, setImpactFilter] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { uploadedFiles: contextFiles, addUploadedFile, removeUploadedFile } = useAppContext();

  // Queries
  const { data: requirements = [] } = useQuery({
    queryKey: ['/api/requirements'],
  });

  const { data: systems = [] } = useQuery({
    queryKey: ['/api/systems'],
  });

  const { data: impacts = [], isLoading: isLoadingImpacts } = useQuery({
    queryKey: ['/api/impact'],
    enabled: showResults,
  });

  // Upload mutations
  const uploadReqMutation = useMutation({
    mutationFn: (file: File) => uploadRequirementsFile(file),
    onSuccess: (data) => {
      // Dodaj plik do globalnego kontekstu
      addUploadedFile({ id: data.id, name: data.name, type: 'requirements' });
      toast({
        title: "Plik wczytany pomyślnie",
        description: `Plik ${data.name} został poprawnie wczytany.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Błąd podczas wczytywania pliku",
        description: `${error}`,
        variant: "destructive",
      });
    },
  });

  const uploadSysMutation = useMutation({
    mutationFn: (file: File) => uploadSystemFile(file),
    onSuccess: (data) => {
      // Dodaj plik do globalnego kontekstu
      addUploadedFile({ id: data.id, name: data.name, type: 'system' });
      toast({
        title: "Plik wczytany pomyślnie",
        description: `Plik ${data.name} został poprawnie wczytany.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Błąd podczas wczytywania pliku",
        description: `${error}`,
        variant: "destructive",
      });
    },
  });

  // Analysis mutation
  const analysisMutation = useMutation({
    mutationFn: async () => {
      // Upewnij się, że masz poprawne dane do analizy
      if (!requirements || requirements.length === 0) {
        console.warn("Brak wymagań do analizy");
        throw new Error("Brak wymagań do analizy");
      }
      
      if (!systems || systems.length === 0) {
        console.warn("Brak systemów do analizy");
        throw new Error("Brak systemów do analizy");
      }
      
      const reqIds = requirements.map(r => r.id);
      const sysIds = systems.map(s => s.id);
      
      console.log("Rozpoczynam analizę z następującymi danymi:", {
        requirementIds: reqIds,
        systemIds: sysIds,
        requirements,
        systems
      });
      
      try {
        // Wykonaj analizę wpływu
        return await analyzeImpact(reqIds, sysIds);
      } catch (err) {
        console.error("Błąd w funkcji analyzeImpact:", err);
        throw err;
      }
    },
    onSuccess: (data) => {
      console.log("Analiza zakończona sukcesem, otrzymano wyniki:", data);
      queryClient.setQueryData(['/api/impact'], data);
      setShowResults(true);
      toast({
        title: "Analiza zakończona",
        description: `Analiza wpływu została zakończona pomyślnie. Znaleziono ${data.length} punktów wpływu.`,
      });
    },
    onError: (error) => {
      console.error("Błąd analizy:", error);
      toast({
        title: "Błąd podczas analizy",
        description: `${error}`,
        variant: "destructive",
      });
    },
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: exportImpactAnalysis,
    onSuccess: (data) => {
      // Create a link to download the file
      const link = document.createElement('a');
      link.href = data.url;
      link.download = 'analiza_wplywu.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Eksport zakończony",
        description: "Analiza wpływu została wyeksportowana pomyślnie.",
      });
    },
    onError: (error) => {
      toast({
        title: "Błąd podczas eksportu",
        description: `${error}`,
        variant: "destructive",
      });
    },
  });

  const handleReqFileUpload = async (files: File[]) => {
    setUploadedReqFiles(files);
    
    // Upload each file
    for (const file of files) {
      await uploadReqMutation.mutateAsync(file);
    }
  };

  const handleSysFileUpload = async (files: File[]) => {
    setUploadedSysFiles(files);
    
    // Upload each file
    for (const file of files) {
      await uploadSysMutation.mutateAsync(file);
    }
  };

  // Obsługa usuwania plików
  const handleDeleteReqFile = (fileId: string) => {
    removeUploadedFile(fileId);
    toast({
      title: "Plik usunięty",
      description: "Plik z wymaganiami został usunięty pomyślnie."
    });
  };
  
  const handleDeleteSysFile = (fileId: string) => {
    removeUploadedFile(fileId);
    toast({
      title: "Plik usunięty",
      description: "Plik systemowy został usunięty pomyślnie."
    });
  };
  
  // Effect do synchronizacji danych przy przełączaniu zakładek
  useEffect(() => {
    setShowResults(impacts.length > 0);
  }, [impacts]);
  
  const handleAnalyzeImpact = () => {
    console.log("Liczba wymagań:", requirements.length);
    console.log("Liczba systemów:", systems.length);
    
    if (requirements.length === 0 || systems.length === 0) {
      toast({
        title: "Brak danych",
        description: "Proszę wczytać pliki z wymaganiami i opisami systemów przed przeprowadzeniem analizy.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Pobierz ID wszystkich wymagań i systemów
      const reqIds = requirements.map(req => req.id);
      const sysIds = systems.map(sys => sys.id);
      
      console.log("Wysyłam do analizy wymagania z ID:", reqIds);
      console.log("Wysyłam do analizy systemy z ID:", sysIds);
      
      // Wywołaj analizę
      analysisMutation.mutate();
      
      toast({
        title: "Rozpoczęto analizę",
        description: `Analizuję wpływ ${reqIds.length} wymagań na ${sysIds.length} systemów.`,
      });
    } catch (error) {
      console.error("Błąd podczas analizy wpływu:", error);
      toast({
        title: "Błąd analizy",
        description: "Wystąpił nieoczekiwany błąd podczas analizy. Spróbuj ponownie.",
        variant: "destructive",
      });
    }
  };

  const handleExportAnalysis = () => {
    exportMutation.mutate();
  };

  // Count impacts by level
  const impactCounts = impacts.reduce(
    (acc, impact) => {
      if (impact.impactLevel === ImpactLevel.CRITICAL) acc.critical++;
      if (impact.impactLevel === ImpactLevel.HIGH) acc.high++;
      if (impact.impactLevel === ImpactLevel.MEDIUM) acc.medium++;
      if (impact.impactLevel === ImpactLevel.LOW) acc.low++;
      return acc;
    },
    { critical: 0, high: 0, medium: 0, low: 0 }
  );

  // Filter impacts
  const filteredImpacts = impactFilter
    ? impacts.filter((impact) => impact.impactLevel === impactFilter)
    : impacts;

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-medium mb-2">Wymagania na systemy IT</h2>
        <p className="text-sm text-gray-500 mb-4">
          Załaduj plik JSON zawierający wymagania regulacyjne lub wybierz wymagania wczytane w poprzednim kroku.
          {requirements.length > 0 && (
            <span className="ml-2 text-[#3498DB]">Aktualnie wczytano {requirements.length} wymagań.</span>
          )}
        </p>
        <FileUpload 
          onFileSelected={handleReqFileUpload} 
          fileType="JSON" 
        />
        
        {/* Lista wczytanych plików z wymaganiami */}
        {contextFiles.filter(f => f.type === 'requirements').length > 0 && (
          <div className="mt-4 border rounded-md p-3">
            <h3 className="text-sm font-medium mb-2">Wczytane pliki z wymaganiami:</h3>
            <ul className="space-y-2">
              {contextFiles
                .filter(f => f.type === 'requirements')
                .map(file => (
                  <li key={file.id} className="flex items-center justify-between text-sm py-1 px-2 bg-slate-50 rounded">
                    <span className="truncate max-w-[80%]">{file.name}</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteReqFile(file.id)}
                      className="h-8 w-8 p-0 text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))
              }
            </ul>
          </div>
        )}
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-medium mb-2">Opis systemów</h2>
        <p className="text-sm text-gray-500 mb-4">
          Załaduj pliki PDF opisujące architekturę systemów IT, które będą analizowane pod kątem zgodności z wymaganiami.
          {systems.length > 0 && (
            <span className="ml-2 text-[#3498DB]">Aktualnie wczytano {systems.length} systemów.</span>
          )}
        </p>
        <FileUpload 
          onFileSelected={handleSysFileUpload} 
          fileType="PDF" 
        />
        
        {/* Lista wczytanych plików systemowych */}
        {contextFiles.filter(f => f.type === 'system').length > 0 && (
          <div className="mt-4 border rounded-md p-3">
            <h3 className="text-sm font-medium mb-2">Wczytane pliki systemowe:</h3>
            <ul className="space-y-2">
              {contextFiles
                .filter(f => f.type === 'system')
                .map(file => (
                  <li key={file.id} className="flex items-center justify-between text-sm py-1 px-2 bg-slate-50 rounded">
                    <span className="truncate max-w-[80%]">{file.name}</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteSysFile(file.id)}
                      className="h-8 w-8 p-0 text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))
              }
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Button
            className="w-full py-3 bg-[#3498DB] text-white hover:bg-[#3498DB]/90"
            onClick={handleAnalyzeImpact}
            disabled={analysisMutation.isPending}
          >
            {analysisMutation.isPending
              ? "Trwa analiza..."
              : "Wykonaj analizę wpływu"}
          </Button>
          <Button
            className="w-full py-3 border border-[#3498DB] text-[#3498DB] bg-white hover:bg-[#3498DB]/10"
            onClick={handleExportAnalysis}
            disabled={exportMutation.isPending || !showResults}
            variant="outline"
          >
            <Download className="mr-2 h-4 w-4" /> Pobierz raport z analizy
          </Button>
        </div>
      </div>

      {showResults && (
        <div className="border rounded-lg p-6 mt-8">
          <h3 className="text-lg font-medium mb-6">Wyniki analizy wpływu</h3>
          
          <div className="mb-6">
            <h4 className="font-medium mb-2">Podsumowanie wpływu na systemy</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-[#E74C3C]/10 p-4 rounded-lg border border-[#E74C3C]/20 text-center">
                <p className="text-xs uppercase mb-1">Wpływ krytyczny</p>
                <p className="text-2xl font-bold text-[#E74C3C]">{impactCounts.critical}</p>
              </div>
              <div className="bg-[#F39C12]/10 p-4 rounded-lg border border-[#F39C12]/20 text-center">
                <p className="text-xs uppercase mb-1">Wpływ wysoki</p>
                <p className="text-2xl font-bold text-[#F39C12]">{impactCounts.high}</p>
              </div>
              <div className="bg-[#3498DB]/10 p-4 rounded-lg border border-[#3498DB]/20 text-center">
                <p className="text-xs uppercase mb-1">Wpływ średni</p>
                <p className="text-2xl font-bold text-[#3498DB]">{impactCounts.medium}</p>
              </div>
              <div className="bg-[#2ECC71]/10 p-4 rounded-lg border border-[#2ECC71]/20 text-center">
                <p className="text-xs uppercase mb-1">Wpływ niski</p>
                <p className="text-2xl font-bold text-[#2ECC71]">{impactCounts.low}</p>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium">Szczegółowa analiza systemów</h4>
              <div className="flex items-center">
                <span className="text-sm mr-2">Filtruj:</span>
                <Select 
                  onValueChange={(value) => setImpactFilter(value === "all" ? null : value)}
                  defaultValue="all"
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Wszystkie systemy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie systemy</SelectItem>
                    <SelectItem value={ImpactLevel.CRITICAL}>Wpływ krytyczny</SelectItem>
                    <SelectItem value={ImpactLevel.HIGH}>Wpływ wysoki</SelectItem>
                    <SelectItem value={ImpactLevel.MEDIUM}>Wpływ średni</SelectItem>
                    <SelectItem value={ImpactLevel.LOW}>Wpływ niski</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {isLoadingImpacts ? (
              <p>Ładowanie wyników analizy...</p>
            ) : filteredImpacts.length === 0 ? (
              <p>Nie znaleziono wyników pasujących do filtra.</p>
            ) : (
              <>
                {filteredImpacts.map((impact) => {
                  const system = systems.find(s => s.id === impact.systemId);
                  return system ? (
                    <SystemImpactItem
                      key={impact.id}
                      system={system}
                      impact={impact}
                      requirements={requirements}
                    />
                  ) : null;
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Analysis;

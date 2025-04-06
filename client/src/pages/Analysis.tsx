import React, { useState } from "react";
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
import { Download, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
    mutationFn: () => 
      analyzeImpact(
        requirements.map(r => r.id),
        systems.map(s => s.id)
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/impact'], data);
      setShowResults(true);
      toast({
        title: "Analiza zakończona",
        description: "Analiza wpływu została zakończona pomyślnie.",
      });
    },
    onError: (error) => {
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

  const handleAnalyzeImpact = () => {
    if (requirements.length === 0 || systems.length === 0) {
      toast({
        title: "Brak danych",
        description: "Proszę wczytać pliki z wymaganiami i opisami systemów przed przeprowadzeniem analizy.",
        variant: "destructive",
      });
      return;
    }
    
    analysisMutation.mutate();
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
        <h2 className="text-xl font-medium mb-6">Wymagania na systemy IT</h2>
        <FileUpload 
          onFileSelected={handleReqFileUpload} 
          fileType="JSON" 
        />
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-medium mb-6">Opis systemów</h2>
        <FileUpload 
          onFileSelected={handleSysFileUpload} 
          fileType="PDF" 
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

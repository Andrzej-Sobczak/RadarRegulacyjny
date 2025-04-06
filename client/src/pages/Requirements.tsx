import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileUpload } from "../components/FileUpload";
import { RequirementItem } from "../components/RequirementItem";
import { 
  uploadRegulationFile,
  extractRequirements, 
  getRequirements,
  updateRequirement,
  deleteRequirement,
  exportRequirements
} from "../lib/api";
import { Requirement } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Requirements: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadedFileIds, setUploadedFileIds] = useState<string[]>([]);
  const [showRequirements, setShowRequirements] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Query for fetching requirements
  const { data: requirements = [], isLoading } = useQuery({
    queryKey: ['/api/requirements'],
    enabled: showRequirements
  });
  
  // Mutation for uploading files
  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadRegulationFile(file),
    onSuccess: (data) => {
      setUploadedFileIds(prev => [...prev, data.id]);
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
    }
  });
  
  // Mutation for extracting requirements
  const extractMutation = useMutation({
    mutationFn: (documentIds: string[]) => extractRequirements(documentIds),
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/requirements'], data);
      setShowRequirements(true);
      toast({
        title: "Wymagania wyekstrahowane",
        description: `Znaleziono ${data.length} wymagań w podanych dokumentach.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Błąd podczas ekstrakcji wymagań",
        description: `${error}`,
        variant: "destructive",
      });
    }
  });
  
  // Mutation for updating requirement
  const updateMutation = useMutation({
    mutationFn: (requirement: Requirement) => updateRequirement(requirement),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/requirements'] });
      toast({
        title: "Wymaganie zaktualizowane",
        description: "Zmiany zostały zapisane pomyślnie."
      });
    },
    onError: (error) => {
      toast({
        title: "Błąd podczas aktualizacji",
        description: `${error}`,
        variant: "destructive",
      });
    }
  });
  
  // Mutation for deleting requirement
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteRequirement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/requirements'] });
      toast({
        title: "Wymaganie usunięte",
        description: "Wymaganie zostało usunięte pomyślnie."
      });
    },
    onError: (error) => {
      toast({
        title: "Błąd podczas usuwania",
        description: `${error}`,
        variant: "destructive",
      });
    }
  });
  
  // Mutation for exporting requirements
  const exportMutation = useMutation({
    mutationFn: exportRequirements,
    onSuccess: (data) => {
      // Create a link to download the file
      const link = document.createElement('a');
      link.href = data.url;
      link.download = 'wymagania.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Eksport zakończony",
        description: "Wymagania zostały wyeksportowane pomyślnie."
      });
    },
    onError: (error) => {
      toast({
        title: "Błąd podczas eksportu",
        description: `${error}`,
        variant: "destructive",
      });
    }
  });
  
  const handleFileUpload = async (files: File[]) => {
    setUploadedFiles(files);
    
    // Upload each file
    for (const file of files) {
      await uploadMutation.mutateAsync(file);
    }
  };
  
  const handleExtractRequirements = () => {
    if (uploadedFileIds.length === 0) {
      toast({
        title: "Brak plików",
        description: "Proszę wczytać pliki przed ekstrakcją wymagań.",
        variant: "destructive",
      });
      return;
    }
    
    extractMutation.mutate(uploadedFileIds);
  };
  
  const handleEditRequirement = (requirement: Requirement) => {
    // In a real application, this would open a modal or form for editing
    // For simplicity, we'll just update with the existing data
    updateMutation.mutate(requirement);
  };
  
  const handleDeleteRequirement = (id: number) => {
    if (confirm("Czy na pewno chcesz usunąć to wymaganie?")) {
      deleteMutation.mutate(id);
    }
  };
  
  const handleExportRequirements = () => {
    exportMutation.mutate();
  };
  
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-medium mb-6">Przepisy</h2>
        <FileUpload 
          onFileSelected={handleFileUpload} 
          fileType="PDF" 
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            className="w-full py-3 bg-[#3498DB] text-white hover:bg-[#3498DB]/90"
            onClick={handleExtractRequirements}
            disabled={extractMutation.isPending}
          >
            {extractMutation.isPending
              ? "Trwa ekstrakcja..."
              : "Wyekstrahuj wymagania na systemy IT"}
          </Button>
          <Button
            className="w-full py-3 border border-[#3498DB] text-[#3498DB] bg-white hover:bg-[#3498DB]/10"
            onClick={handleExportRequirements}
            disabled={exportMutation.isPending || !showRequirements}
            variant="outline"
          >
            <Download className="mr-2 h-4 w-4" /> Pobierz wymagania
          </Button>
        </div>
      </div>
      
      {showRequirements && (
        <div className="border rounded-lg p-6 mt-8">
          <h3 className="text-lg font-medium mb-4">Wyekstrahowane wymagania</h3>
          
          {isLoading ? (
            <p>Ładowanie wymagań...</p>
          ) : requirements.length === 0 ? (
            <p>Nie znaleziono wymagań w podanych dokumentach.</p>
          ) : (
            <>
              {requirements.map((requirement) => (
                <RequirementItem
                  key={requirement.id}
                  requirement={requirement}
                  onEdit={handleEditRequirement}
                  onDelete={handleDeleteRequirement}
                />
              ))}
              
              <div className="mt-4 flex justify-end">
                <Button
                  className="px-6 py-2 bg-[#3498DB] text-white hover:bg-[#3498DB]/90"
                >
                  Zatwierdź wymagania
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Requirements;

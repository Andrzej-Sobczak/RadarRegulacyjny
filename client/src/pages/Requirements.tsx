import React, { useState, useEffect } from "react";
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
import { Requirement, RequirementCategory } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "../contexts/AppContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";

const Requirements: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadedFileIds, setUploadedFileIds] = useState<string[]>([]);
  const [showRequirements, setShowRequirements] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentRequirement, setCurrentRequirement] = useState<Requirement | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { 
    uploadedFiles: contextFiles, 
    addUploadedFile, 
    removeUploadedFile, 
    isApiConfigured,
    extractionStatus,
    setExtractionStatus
  } = useAppContext();
  
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
      // Dodaj plik do globalnego kontekstu
      addUploadedFile({ id: data.id, name: data.name, type: 'regulation' });
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
    mutationFn: (documentIds: string[]) => {
      // Rozpocznij pokazywanie postępu ekstrakcji
      setExtractionStatus({
        isProcessing: true,
        progress: 0,
        message: "Rozpoczynam ekstrakcję wymagań..."
      });
      
      // Symulacja postępu (w rzeczywistości powinno się aktualizować na podstawie rzeczywistych odpowiedzi z serwera)
      const progressInterval = setInterval(() => {
        setExtractionStatus(prev => {
          if (prev.progress >= 95) {
            clearInterval(progressInterval);
            return prev;
          }
          return {
            ...prev,
            progress: prev.progress + Math.floor(Math.random() * 10) + 1,
            message: prev.progress < 30 ? "Analizowanie dokumentów..." : 
                     prev.progress < 60 ? "Identyfikowanie wymagań..." : 
                     "Formatowanie wyników..."
          };
        });
      }, 1000);
      
      return extractRequirements(documentIds)
        .then(result => {
          clearInterval(progressInterval);
          // Oznacz ekstrakcję jako zakończoną
          setExtractionStatus({
            isProcessing: false,
            progress: 100,
            message: "Ekstrakcja zakończona pomyślnie"
          });
          return result;
        })
        .catch(error => {
          clearInterval(progressInterval);
          // Oznacz ekstrakcję jako zakończoną z błędem
          setExtractionStatus({
            isProcessing: false,
            progress: 0,
            message: `Błąd: ${error.message}`
          });
          throw error;
        });
    },
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
    // Nie używamy tutaj useAppContext, zamiast tego korzystamy z isApiConfigured 
    // przekazanego z komponentu wyżej
    
    if (!isApiConfigured) {
      toast({
        title: "Brak klucza API",
        description: "Proszę skonfigurować klucz API OpenAI w zakładce Administracja przed ekstrakcją wymagań.",
        variant: "destructive",
      });
      return;
    }
    
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
  
  // Formularz dla edycji wymagania
  const form = useForm<Requirement>({
    defaultValues: {
      id: 0,
      identifier: "",
      requirementText: "",
      category: "",
      subjectMatter: "",
      complianceObjective: "",
      technicalImplications: "",
      implementationTimeline: "",
      crossReferences: "",
      keyTerms: "",
      createdAt: new Date().toISOString(),
    }
  });

  // Funkcja pomocnicza do mapowania kategorii z angielskiego na polski
  const mapCategoryToPL = (categoryName: string): string => {
    // Sprawdź czy kategoria odpowiada jednej z wartości w RequirementCategory
    // Jeśli tak, to użyj polskiej nazwy, jeśli nie, to użyj oryginalnej wartości
    
    // Mapowanie znanych angielskich kategorii na polskie odpowiedniki z enuma
    const categoryMapping: Record<string, string> = {
      "Data Processing and Storage": RequirementCategory.DATA_PROCESSING,
      "User Rights and Consent Management": RequirementCategory.USER_RIGHTS,
      "Security and Access Control": RequirementCategory.SECURITY,
      "Reporting and Documentation": RequirementCategory.REPORTING,
      "System Functionality": RequirementCategory.SYSTEM_FUNCTIONALITY,
      "Data Retention and Deletion": RequirementCategory.DATA_RETENTION,
      "Integration Requirements": RequirementCategory.INTEGRATION,
      "Authentication and Authorization": RequirementCategory.AUTHENTICATION,
      "User Interface": RequirementCategory.USER_INTERFACE,
      "Other": RequirementCategory.OTHER
    };
    
    return categoryMapping[categoryName] || categoryName;
  };
  
  // Obsługa otwarcia modala edycji
  const handleEditRequirement = (requirement: Requirement) => {
    // Mapuj kategorię z angielskiej na polską przed edycją
    const mappedRequirement = {
      ...requirement,
      category: mapCategoryToPL(requirement.category)
    };
    
    setCurrentRequirement(mappedRequirement);
    form.reset(mappedRequirement);
    setEditDialogOpen(true);
  };
  
  // Funkcja pomocnicza do mapowania kategorii z polskiego na angielski
  const mapCategoryToEN = (categoryName: string): string => {
    // Odwrotna mapa do mapCategoryToPL - z polskiego na angielski
    const reverseCategoryMapping: Record<string, string> = {
      [RequirementCategory.DATA_PROCESSING]: "Data Processing and Storage",
      [RequirementCategory.USER_RIGHTS]: "User Rights and Consent Management",
      [RequirementCategory.SECURITY]: "Security and Access Control",
      [RequirementCategory.REPORTING]: "Reporting and Documentation",
      [RequirementCategory.SYSTEM_FUNCTIONALITY]: "System Functionality",
      [RequirementCategory.DATA_RETENTION]: "Data Retention and Deletion",
      [RequirementCategory.INTEGRATION]: "Integration Requirements",
      [RequirementCategory.AUTHENTICATION]: "Authentication and Authorization",
      [RequirementCategory.USER_INTERFACE]: "User Interface",
      [RequirementCategory.OTHER]: "Other"
    };
    
    return reverseCategoryMapping[categoryName] || categoryName;
  };

  // Obsługa zapisu edytowanego wymagania
  const handleSaveRequirement = (data: Requirement) => {
    // Mapuj kategorię z powrotem na angielską przed zapisem do bazy danych
    const mappedData = {
      ...data,
      category: mapCategoryToEN(data.category)
    };
    
    updateMutation.mutate(mappedData, {
      onSuccess: () => {
        setEditDialogOpen(false);
        setCurrentRequirement(null);
      }
    });
  };
  
  const handleDeleteRequirement = (id: number) => {
    if (confirm("Czy na pewno chcesz usunąć to wymaganie?")) {
      deleteMutation.mutate(id);
    }
  };
  
  const handleExportRequirements = () => {
    exportMutation.mutate();
  };
  
  // Inicjalizacja i aktualizacja stanu na podstawie danych
  useEffect(() => {
    setShowRequirements(requirements.length > 0);
    
    // Synchronizacja z plikami z kontekstu
    const regulationFiles = contextFiles.filter(f => f.type === 'regulation');
    if (regulationFiles.length > 0) {
      setUploadedFileIds(regulationFiles.map(f => f.id));
    }
  }, [requirements, contextFiles]);
  
  // Funkcja do usuwania pliku
  const handleDeleteFile = (fileId: string) => {
    removeUploadedFile(fileId);
    setUploadedFileIds(prev => prev.filter(id => id !== fileId));
    toast({
      title: "Plik usunięty",
      description: "Plik został usunięty pomyślnie."
    });
  };
  
  return (
    <div>
      {/* Modal edycji wymagania */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edytuj wymaganie</DialogTitle>
            <DialogDescription>
              Wprowadź zmiany w wymaganiu i kliknij Zapisz, aby zatwierdzić.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveRequirement)} className="space-y-4">
              <FormField
                control={form.control}
                name="identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Identyfikator</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="requirementText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tekst wymagania</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategoria</FormLabel>
                    <Select 
                      defaultValue={field.value} 
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz kategorię" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(RequirementCategory).map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="subjectMatter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Obszar</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="implementationTimeline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Termin wdrożenia</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="complianceObjective"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cel zgodności</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="technicalImplications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Implikacje techniczne</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="crossReferences"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Odniesienia</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="keyTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kluczowe terminy</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                >
                  Anuluj
                </Button>
                <Button 
                  type="submit"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Zapisywanie..." : "Zapisz zmiany"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <div className="mb-8">
        <h2 className="text-xl font-medium mb-6">Przepisy</h2>
        <FileUpload 
          onFileSelected={handleFileUpload} 
          fileType="PDF" 
        />
        
        {/* Pasek postępu ekstrakcji */}
        {extractionStatus.isProcessing && (
          <div className="mt-4 border rounded-md p-4 bg-white">
            <div className="flex justify-between mb-2">
              <h3 className="text-sm font-medium">Postęp ekstrakcji wymagań</h3>
              <span className="text-sm font-medium">{extractionStatus.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
                style={{ width: `${extractionStatus.progress}%` }}
              ></div>
            </div>
            <p className="mt-2 text-sm text-gray-600">{extractionStatus.message}</p>
          </div>
        )}
        
        {/* Lista wczytanych plików */}
        {contextFiles.filter(f => f.type === 'regulation').length > 0 && (
          <div className="mt-4 border rounded-md p-3">
            <h3 className="text-sm font-medium mb-2">Wczytane pliki:</h3>
            <ul className="space-y-2">
              {contextFiles
                .filter(f => f.type === 'regulation')
                .map(file => (
                  <li key={file.id} className="flex items-center justify-between text-sm py-1 px-2 bg-slate-50 rounded">
                    <span className="truncate max-w-[80%]">{file.name}</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteFile(file.id)}
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
                  onClick={() => {
                    toast({
                      title: "Wymagania zatwierdzone",
                      description: "Wszystkie wymagania zostały zatwierdzone i będą użyte do analizy wpływu.",
                    });
                  }}
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

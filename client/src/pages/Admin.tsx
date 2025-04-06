import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { getApiSettings, updateApiSettings, testApiConnection } from "../lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle } from "lucide-react";

const Admin: React.FC = () => {
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null);
  const [testMessage, setTestMessage] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    // Fetch current API settings
    const fetchSettings = async () => {
      try {
        const settings = await getApiSettings();
        if (settings.openaiApiKey) setOpenaiApiKey(settings.openaiApiKey);
      } catch (error) {
        console.error("Failed to fetch API settings:", error);
      }
    };

    fetchSettings();
  }, []);

  // Update API settings mutation
  const updateMutation = useMutation({
    mutationFn: () => updateApiSettings({
      openaiApiKey,
      geminiApiKey: "", // Temporary: Gemini is disabled
    }),
    onSuccess: () => {
      toast({
        title: "Ustawienia zapisane",
        description: "Klucz API został pomyślnie zapisany.",
      });
    },
    onError: (error) => {
      toast({
        title: "Błąd podczas zapisywania ustawień",
        description: `${error}`,
        variant: "destructive",
      });
    },
  });

  // Test API connection mutation
  const testMutation = useMutation({
    mutationFn: testApiConnection,
    onSuccess: (data) => {
      setTestSuccess(data.success);
      setTestMessage(data.message);
    },
    onError: (error) => {
      setTestSuccess(false);
      setTestMessage(`Błąd podczas testowania połączenia: ${error}`);
    },
  });

  const handleUpdateSettings = () => {
    updateMutation.mutate();
  };

  const handleTestConnection = () => {
    // Clear previous test results
    setTestSuccess(null);
    setTestMessage("");
    
    if (!openaiApiKey) {
      toast({
        title: "Brak klucza API",
        description: "Proszę wprowadzić klucz API OpenAI przed testowaniem połączenia.",
        variant: "destructive",
      });
      return;
    }

    // First save the settings, then test
    updateMutation.mutate();
    testMutation.mutate();
  };

  return (
    <div>
      <h2 className="text-xl font-medium mb-6">API Key do OpenAI</h2>
      <div className="mb-8">
        <Input
          type="password"
          placeholder="Wprowadź klucz API OpenAI"
          className="w-full px-4 py-3 border mb-4"
          value={openaiApiKey}
          onChange={(e) => setOpenaiApiKey(e.target.value)}
        />
        <p className="text-sm text-gray-500 mb-2">
          Notatka: System jest skonfigurowany do używania modelu gpt-4o-mini.
        </p>
      </div>

      <Button
        className="w-full py-3 bg-[#3498DB] text-white hover:bg-[#3498DB]/90 mb-4"
        onClick={handleTestConnection}
        disabled={testMutation.isPending}
      >
        {testMutation.isPending
          ? "Testowanie połączenia..."
          : "Przetestuj połączenie via API"}
      </Button>

      {testSuccess === true && (
        <Alert className="mt-4 p-4 bg-[#2ECC71]/10 border border-[#2ECC71] text-[#2ECC71]">
          <CheckCircle className="h-4 w-4 mr-2" />
          <AlertDescription>
            {testMessage || "Połączenie z API zostało ustanowione pomyślnie!"}
          </AlertDescription>
        </Alert>
      )}

      {testSuccess === false && (
        <Alert className="mt-4 p-4 bg-[#E74C3C]/10 border border-[#E74C3C] text-[#E74C3C]">
          <XCircle className="h-4 w-4 mr-2" />
          <AlertDescription>
            {testMessage || "Błąd połączenia z API. Sprawdź poprawność kluczy API."}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default Admin;

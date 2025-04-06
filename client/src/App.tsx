import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient";
import { TabNavigation } from "./components/TabNavigation";
import Requirements from "./pages/Requirements";
import Analysis from "./pages/Analysis";
import Admin from "./pages/Admin";
import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppProvider, useAppContext } from "./contexts/AppContext";

type Tab = "extraction" | "analysis" | "admin";

// Komponent sprawdzający ustawienie API
const ApiCheck: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isApiConfigured } = useAppContext();
  const [activeTab, setActiveTab] = useState<Tab>("extraction");
  const [redirectedToAdmin, setRedirectedToAdmin] = useState<boolean>(false);

  useEffect(() => {
    // Przekieruj do panelu admina tylko gdy API nie jest skonfigurowane i jeszcze nie przekierowaliśmy
    if (!isApiConfigured && !redirectedToAdmin && activeTab !== "admin") {
      setActiveTab("admin");
      setRedirectedToAdmin(true);
    }
  }, [isApiConfigured, activeTab, redirectedToAdmin]);

  return (
    <div className="min-h-screen bg-[#ECF0F1] text-[#2C3E50] font-sans">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
          
          <div className="p-6">
            {/* Alert jest teraz wyświetlany tylko gdy faktycznie API nie jest skonfigurowane */}
            {!isApiConfigured && activeTab !== "admin" && (
              <Alert className="mb-6 p-4 bg-[#E74C3C]/10 border border-[#E74C3C] text-[#E74C3C]">
                <AlertCircle className="h-4 w-4 mr-2" />
                <AlertDescription className="flex justify-between items-center">
                  <span>
                    Proszę skonfigurować klucz API OpenAI przed korzystaniem z aplikacji.
                  </span>
                  <Button
                    className="bg-[#E74C3C] text-white hover:bg-[#E74C3C]/90 ml-4"
                    onClick={() => setActiveTab("admin")}
                  >
                    Przejdź do konfiguracji
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            
            {activeTab === "extraction" && <Requirements />}
            {activeTab === "analysis" && <Analysis />}
            {activeTab === "admin" && <Admin />}
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <ApiCheck>
          {/* Treść aplikacji jest renderowana wewnątrz komponentu ApiCheck */}
        </ApiCheck>
        <Toaster />
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;

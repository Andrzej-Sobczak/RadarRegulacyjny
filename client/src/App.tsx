import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient";
import { TabNavigation } from "./components/TabNavigation";
import Requirements from "./pages/Requirements";
import Analysis from "./pages/Analysis";
import Admin from "./pages/Admin";
import { useState } from "react";

type Tab = "extraction" | "analysis" | "admin";

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("extraction");

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-[#ECF0F1] text-[#2C3E50] font-sans">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
            
            <div className="p-6">
              {activeTab === "extraction" && <Requirements />}
              {activeTab === "analysis" && <Analysis />}
              {activeTab === "admin" && <Admin />}
            </div>
          </div>
        </div>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;

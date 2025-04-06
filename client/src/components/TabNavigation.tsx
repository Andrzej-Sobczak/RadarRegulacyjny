import React from "react";

type Tab = "extraction" | "analysis" | "admin";

interface TabNavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ 
  activeTab, 
  onTabChange 
}) => {
  return (
    <div className="border-b">
      <div className="flex">
        <button
          className={`px-8 py-4 font-medium border-b-2 ${
            activeTab === "extraction"
              ? "border-[#3498DB] text-[#3498DB]"
              : "border-transparent hover:text-[#3498DB]"
          }`}
          onClick={() => onTabChange("extraction")}
        >
          Ekstracja wymagań
        </button>
        <button
          className={`px-8 py-4 font-medium border-b-2 ${
            activeTab === "analysis"
              ? "border-[#3498DB] text-[#3498DB]"
              : "border-transparent hover:text-[#3498DB]"
          }`}
          onClick={() => onTabChange("analysis")}
        >
          Analiza wpływu
        </button>
        <button
          className={`px-8 py-4 font-medium border-b-2 ${
            activeTab === "admin"
              ? "border-[#3498DB] text-[#3498DB]"
              : "border-transparent hover:text-[#3498DB]"
          }`}
          onClick={() => onTabChange("admin")}
        >
          Administracja
        </button>
      </div>
    </div>
  );
};

import React, { useState } from "react";
import { Impact, System, Requirement, ImpactLevel } from "@shared/schema";

interface SystemImpactItemProps {
  system: System;
  impact: Impact;
  requirements: Requirement[];
}

const getImpactColor = (impactLevel: string) => {
  // Sprawdzamy zarówno wersję z enuma jak i bezpośrednie wartości tekstowe (z małej i dużej litery)
  if (impactLevel === ImpactLevel.CRITICAL || 
      impactLevel === "Krytyczny" || 
      impactLevel === "krytyczny") {
    return "bg-[#E74C3C]";
  } else if (impactLevel === ImpactLevel.HIGH || 
             impactLevel === "Wysoki" || 
             impactLevel === "wysoki") {
    return "bg-[#F39C12]";
  } else if (impactLevel === ImpactLevel.MEDIUM || 
             impactLevel === "Średni" || 
             impactLevel === "średni") {
    return "bg-[#3498DB]";
  } else if (impactLevel === ImpactLevel.LOW || 
             impactLevel === "Niski" || 
             impactLevel === "niski") {
    return "bg-[#2ECC71]";
  } else {
    console.log("Nieznany poziom wpływu:", impactLevel);
    return "bg-[#BDC3C7]";
  }
};

const getImpactBadgeStyle = (impactLevel: string) => {
  // Sprawdzamy zarówno wersję z enuma jak i bezpośrednie wartości tekstowe (z małej i dużej litery)
  if (impactLevel === ImpactLevel.CRITICAL || 
      impactLevel === "Krytyczny" || 
      impactLevel === "krytyczny") {
    return "bg-[#E74C3C]/20 text-[#E74C3C]";
  } else if (impactLevel === ImpactLevel.HIGH || 
             impactLevel === "Wysoki" || 
             impactLevel === "wysoki") {
    return "bg-[#F39C12]/20 text-[#F39C12]";
  } else if (impactLevel === ImpactLevel.MEDIUM || 
             impactLevel === "Średni" || 
             impactLevel === "średni") {
    return "bg-[#3498DB]/20 text-[#3498DB]";
  } else if (impactLevel === ImpactLevel.LOW || 
             impactLevel === "Niski" || 
             impactLevel === "niski") {
    return "bg-[#2ECC71]/20 text-[#2ECC71]";
  } else {
    return "bg-[#BDC3C7]/20 text-[#BDC3C7]";
  }
};

export const SystemImpactItem: React.FC<SystemImpactItemProps> = ({
  system,
  impact,
  requirements
}) => {
  const [detailsVisible, setDetailsVisible] = useState(false);
  
  const toggleDetails = () => {
    setDetailsVisible(!detailsVisible);
  };
  
  const requiredModifications = impact.requiredModifications as string[];
  const dependencies = impact.dependencies as { name: string }[];
  
  // Find requirements that affect this system
  const affectingRequirements = requirements.filter(req => 
    req.id === impact.requirementId
  );
  
  return (
    <div className="border rounded-lg p-4 mb-4 bg-white">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full ${getImpactColor(impact.impactLevel)} mr-2`}></div>
            <h5 className="font-medium">{system.name}</h5>
          </div>
          <p className="text-sm text-gray-600 mt-1">{system.description}</p>
        </div>
        <span className={`${getImpactBadgeStyle(impact.impactLevel)} text-xs px-2 py-1 rounded-full`}>
          Wpływ {impact.impactLevel}
        </span>
      </div>
      
      <div className="mt-4">
        <button 
          className="text-[#3498DB] hover:text-[#3498DB]/80 text-sm font-medium flex items-center"
          onClick={toggleDetails}
        >
          <span>{detailsVisible ? "Ukryj szczegóły" : "Pokaż szczegóły"}</span>
          <svg
            className={`ml-1 w-4 h-4 transform ${detailsVisible ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 9l-7 7-7-7"
            ></path>
          </svg>
        </button>
        
        {detailsVisible && (
          <div className="mt-4 border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h6 className="font-medium mb-2 text-sm">Wymagania wpływające na system:</h6>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {affectingRequirements.map(req => (
                    <li key={req.id}>{req.identifier} - {req.complianceObjective}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h6 className="font-medium mb-2 text-sm">Wymagane modyfikacje:</h6>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {requiredModifications.map((mod, idx) => (
                    <li key={idx}>{mod}</li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="mt-4">
              <h6 className="font-medium mb-2 text-sm">Ocena złożoności wdrożenia:</h6>
              <div className="flex items-center">
                <span className={`${getImpactBadgeStyle(impact.impactLevel)} text-xs px-2 py-1 rounded-full mr-2`}>
                  {impact.complexity} złożoność
                </span>
                <span className="text-sm">{impact.gapAnalysis}</span>
              </div>
            </div>
            
            {dependencies && dependencies.length > 0 && (
              <div className="mt-4">
                <h6 className="font-medium mb-2 text-sm">Zależności systemowe:</h6>
                <div className="flex flex-wrap gap-2">
                  {dependencies.map((dep, idx) => (
                    <span key={idx} className="bg-neutral/20 text-secondary text-xs px-2 py-1 rounded-full">
                      {dep.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

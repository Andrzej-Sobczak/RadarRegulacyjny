import React, { useState } from "react";
import { Requirement } from "@shared/schema";
import { Edit, Trash2 } from "lucide-react";

interface RequirementItemProps {
  requirement: Requirement;
  onEdit: (requirement: Requirement) => void;
  onDelete: (requirementId: number) => void;
}

export const RequirementItem: React.FC<RequirementItemProps> = ({
  requirement,
  onEdit,
  onDelete
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-lg p-4 mb-4 bg-white">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium">{requirement.identifier}</h4>
        <span className="bg-[#3498DB]/20 text-[#3498DB] text-xs px-2 py-1 rounded-full">
          {requirement.category}
        </span>
      </div>
      <p className="text-sm mb-2">
        "{requirement.requirementText}"
      </p>
      {expanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
          <div>
            <p className="font-medium">Kategoria:</p>
            <p>{requirement.category}</p>
          </div>
          <div>
            <p className="font-medium">Obszar:</p>
            <p>{requirement.subjectMatter}</p>
          </div>
          <div>
            <p className="font-medium">Cel zgodności:</p>
            <p>{requirement.complianceObjective}</p>
          </div>
          <div>
            <p className="font-medium">Implikacje techniczne:</p>
            <p>{requirement.technicalImplications}</p>
          </div>
          {requirement.implementationTimeline && (
            <div>
              <p className="font-medium">Czas wdrożenia:</p>
              <p>{requirement.implementationTimeline}</p>
            </div>
          )}
          {requirement.crossReferences && (
            <div>
              <p className="font-medium">Odniesienia:</p>
              <p>{requirement.crossReferences}</p>
            </div>
          )}
          {requirement.keyTerms && (
            <div>
              <p className="font-medium">Kluczowe terminy:</p>
              <p>{requirement.keyTerms}</p>
            </div>
          )}
        </div>
      )}
      <div className="flex justify-between mt-4">
        <button 
          className="text-[#3498DB] hover:text-[#3498DB]/80 text-sm font-medium flex items-center"
          onClick={() => setExpanded(!expanded)}
        >
          <span>{expanded ? "Ukryj szczegóły" : "Pokaż szczegóły"}</span>
          <svg
            className={`ml-1 w-4 h-4 transform ${expanded ? "rotate-180" : ""}`}
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
        <div className="flex">
          <button 
            className="text-[#3498DB] hover:text-[#3498DB]/80 mr-4"
            onClick={() => onEdit(requirement)}
          >
            <Edit className="w-4 h-4 mr-1 inline" /> Edytuj
          </button>
          <button 
            className="text-[#E74C3C] hover:text-[#E74C3C]/80"
            onClick={() => onDelete(requirement.id)}
          >
            <Trash2 className="w-4 h-4 mr-1 inline" /> Usuń
          </button>
        </div>
      </div>
    </div>
  );
};

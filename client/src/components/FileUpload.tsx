import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileCode } from "lucide-react";

interface FileUploadProps {
  onFileSelected: (files: File[]) => void;
  fileType: "PDF" | "JSON";
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  onFileSelected, 
  fileType, 
  className = ""
}) => {
  const [files, setFiles] = useState<File[]>([]);
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
    onFileSelected(acceptedFiles);
  }, [onFileSelected]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: fileType === "PDF" 
      ? { 'application/pdf': ['.pdf'] }
      : { 'application/json': ['.json'] }
  });
  
  return (
    <div className={`border-2 border-dashed border-[#BDC3C7] rounded-lg p-8 mb-4 text-center bg-white ${className}`}>
      <div {...getRootProps()} className="flex flex-col items-center justify-center cursor-pointer">
        <input {...getInputProps()} />
        <div className="bg-[#ECF0F1] rounded-full p-3 mb-4">
          {fileType === "PDF" ? (
            <Upload className="h-6 w-6 text-[#34495E]" />
          ) : (
            <FileCode className="h-6 w-6 text-[#34495E]" />
          )}
        </div>
        {files.length > 0 ? (
          <div>
            <p className="mb-2 text-base">Wybrane pliki ({files.length}):</p>
            <ul className="list-none text-sm text-gray-500 mb-4">
              {files.map((file, i) => (
                <li key={i}>{file.name}</li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            <p className="mb-2 text-base">
              {isDragActive
                ? "Upuść pliki tutaj..."
                : "Przeciągnij pliki lub wybierz pliki"}
            </p>
            <p className="text-sm text-gray-500 mb-4">{fileType}</p>
          </>
        )}
        <button 
          className="px-6 py-2 bg-[#3498DB] text-white rounded-md hover:bg-[#3498DB]/90 transition font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          Wybierz pliki
        </button>
      </div>
    </div>
  );
};

import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle, Loader2, X, Upload, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { extractCerfaNumber, getCerfaUrl, cerfaExists } from "@/lib/cerfa-utils";

interface UploadedFile {
  id: string;
  fileName: string;
  storagePath: string;
  url: string;
}

interface DocumentUploadProps {
  demarcheId: string;
  documentType: string;
  label: string;
  onUploadComplete?: () => void;
}

export function DocumentUpload({ demarcheId, documentType, label, onUploadComplete }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    await handleUpload(selectedFile);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async (file: File) => {
    if (!file) return;

    setUploading(true);

    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${demarcheId}/${documentType}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('demarche-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('demarche-documents')
        .getPublicUrl(fileName);

      // Save document reference in database
      const { data: docData, error: dbError } = await supabase
        .from('documents')
        .insert({
          demarche_id: demarcheId,
          type_document: documentType,
          document_type: documentType,
          nom_fichier: file.name,
          url: publicUrl,
          taille_octets: file.size
        })
        .select()
        .single();

      if (dbError) throw dbError;

      toast({
        title: "Document téléchargé",
        description: "Le document a été téléchargé avec succès"
      });

      // Add to uploaded files list
      if (docData) {
        setUploadedFiles(prev => [...prev, {
          id: docData.id,
          fileName: file.name,
          storagePath: fileName,
          url: publicUrl
        }]);
      }
      
      if (onUploadComplete) onUploadComplete();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (fileToRemove: UploadedFile) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('demarche-documents')
        .remove([fileToRemove.storagePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', fileToRemove.id);

      if (dbError) throw dbError;

      toast({
        title: "Document supprimé",
        description: "Le document a été supprimé avec succès"
      });

      // Remove from state
      setUploadedFiles(prev => prev.filter(f => f.id !== fileToRemove.id));
      
      if (onUploadComplete) onUploadComplete();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (uploading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      await handleUpload(file);
    }
  };

  const handleClick = () => {
    if (!uploading) {
      fileInputRef.current?.click();
    }
  };

  // Check if this document is a Cerfa
  const cerfaNumber = extractCerfaNumber(label);
  const hasCerfa = cerfaNumber && cerfaExists(cerfaNumber);

  // Render label with Cerfa link if applicable
  const renderLabel = () => {
    if (!hasCerfa || !cerfaNumber) {
      return <Label>{label}</Label>;
    }

    // Split the label to highlight the Cerfa part
    const cerfaRegex = /(\(cerfa\s+\d+\*\d+\))/i;
    const parts = label.split(cerfaRegex);
    
    return (
      <Label className="flex items-center gap-2 flex-wrap">
        {parts.map((part, index) => {
          if (cerfaRegex.test(part)) {
            return (
              <a
                key={index}
                href={getCerfaUrl(cerfaNumber)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 underline inline-flex items-center gap-1 font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                {part}
                <Download className="h-3 w-3" />
              </a>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </Label>
    );
  };

  return (
    <div className="space-y-3">
      {renderLabel()}
      
      {/* List of uploaded files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((file) => (
            <div key={file.id} className="flex items-center justify-between gap-2 p-3 rounded-lg border bg-success/5 border-success/20">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                <FileText className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm truncate">{file.fileName}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(file)}
                className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
      
      {/* Upload zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-lg p-6 transition-all cursor-pointer
          ${isDragOver ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/50"}
          ${uploading ? "cursor-not-allowed opacity-75" : "hover:bg-accent/50"}
        `}
      >
        <Input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          accept=".pdf,.jpg,.jpeg,.png,image/*"
          capture="environment"
          disabled={uploading}
          className="hidden"
        />
        
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Upload en cours...</p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {isDragOver ? "Déposez le fichier ici" : uploadedFiles.length > 0 ? "Ajouter un autre fichier (recto/verso)" : "Glissez-déposez votre fichier"}
                </p>
                <p className="text-xs text-muted-foreground">
                  ou cliquez pour sélectionner (PDF, JPG, PNG)
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

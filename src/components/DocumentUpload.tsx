import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle, Loader2, X, Upload, Download, FileCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { extractCerfaNumber, getCerfaUrl, cerfaExists } from "@/lib/cerfa-utils";
import { cn } from "@/lib/utils";

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
  
  // Check if this is a recto/verso document (can have 2 files)
  const isRectoVerso = label.toLowerCase().includes('recto') && label.toLowerCase().includes('verso');
  const maxFiles = isRectoVerso ? 2 : 1;

  // Load existing documents on mount
  useEffect(() => {
    const loadExistingDocuments = async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('demarche_id', demarcheId)
        .eq('type_document', documentType);

      if (data && !error) {
        const files = data.map(doc => ({
          id: doc.id,
          fileName: doc.nom_fichier,
          storagePath: doc.url.split('/').pop() || '',
          url: doc.url
        }));
        setUploadedFiles(files);
      }
    };

    if (demarcheId && documentType) {
      loadExistingDocuments();
    }
  }, [demarcheId, documentType]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Check if max files reached
    if (uploadedFiles.length >= maxFiles) {
      toast({
        title: "Limite atteinte",
        description: `Vous ne pouvez télécharger que ${maxFiles} fichier${maxFiles > 1 ? 's' : ''} pour ce document`,
        variant: "destructive"
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

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
    if (!label) return null;
    
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
    <div className="space-y-2">
      {label && renderLabel()}
      
      {/* List of uploaded files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-1">
          {uploadedFiles.map((file) => (
            <div key={file.id} className="flex items-center justify-between gap-2 p-2 rounded-md border bg-success/5 border-success/20">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileCheck className="h-3.5 w-3.5 text-success flex-shrink-0" />
                <span className="text-xs truncate">{file.fileName}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(file)}
                className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      
      {/* Upload zone - only show if not at max files */}
      {uploadedFiles.length < maxFiles && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          className={cn(
            "relative border-2 border-dashed rounded-md p-3 transition-all cursor-pointer flex items-center justify-between gap-2",
            isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
            uploading && "cursor-not-allowed opacity-75"
          )}
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
        
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground flex-1">Upload en cours...</span>
          </>
        ) : (
          <>
            <span className="text-sm text-muted-foreground flex-1">
              {isDragOver ? "Déposez le fichier ici" : uploadedFiles.length > 0 ? "Sélectionner un fichier" : "Sélectionner un fichier"}
            </span>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </>
        )}
      </div>
      )}
    </div>
  );
}

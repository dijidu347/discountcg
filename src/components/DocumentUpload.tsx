import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle, Loader2, X, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DocumentUploadProps {
  demarcheId: string;
  documentType: string;
  label: string;
  onUploadComplete?: () => void;
}

export function DocumentUpload({ demarcheId, documentType, label, onUploadComplete }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [storagePath, setStoragePath] = useState<string>("");
  const [documentId, setDocumentId] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFileName(selectedFile.name);
    await handleUpload(selectedFile);
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

      setUploaded(true);
      setStoragePath(fileName);
      if (docData) setDocumentId(docData.id);
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

  const handleRemove = async () => {
    try {
      // Delete from storage
      if (storagePath) {
        const { error: storageError } = await supabase.storage
          .from('demarche-documents')
          .remove([storagePath]);

        if (storageError) throw storageError;
      }

      // Delete from database
      if (documentId) {
        const { error: dbError } = await supabase
          .from('documents')
          .delete()
          .eq('id', documentId);

        if (dbError) throw dbError;
      }

      toast({
        title: "Document supprimé",
        description: "Vous pouvez maintenant uploader un nouveau document"
      });

      // Reset state
      setUploaded(false);
      setFileName("");
      setStoragePath("");
      setDocumentId("");
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
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
    if (!uploading && !uploaded) {
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

    if (uploading || uploaded) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      setFileName(file.name);
      await handleUpload(file);
    }
  };

  const handleClick = () => {
    if (!uploading && !uploaded) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-lg p-6 transition-all cursor-pointer
          ${isDragOver ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/50"}
          ${uploaded ? "border-success bg-success/5" : ""}
          ${uploading || uploaded ? "cursor-not-allowed opacity-75" : "hover:bg-accent/50"}
        `}
      >
        <Input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          accept=".pdf,.jpg,.jpeg,.png,image/*"
          capture="environment"
          disabled={uploading || uploaded}
          className="hidden"
        />
        
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Upload en cours...</p>
            </>
          ) : uploaded ? (
            <>
              <CheckCircle className="h-8 w-8 text-success" />
              <p className="text-sm font-medium text-success">Document téléchargé</p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {isDragOver ? "Déposez le fichier ici" : "Glissez-déposez votre fichier"}
                </p>
                <p className="text-xs text-muted-foreground">
                  ou cliquez pour sélectionner (PDF, JPG, PNG)
                </p>
              </div>
            </>
          )}
        </div>
      </div>
      
      {fileName && (
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="truncate">{fileName}</span>
          </div>
          {uploaded && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <X className="h-4 w-4 mr-1" />
              Supprimer
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

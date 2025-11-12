import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle, Loader2, X } from "lucide-react";
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
      
      if (onUploadComplete) onUploadComplete();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type="file"
          onChange={handleFileChange}
          accept=".pdf,.jpg,.jpeg,.png,image/*"
          capture="environment"
          disabled={uploading || uploaded}
          className={uploaded ? "border-success" : ""}
        />
        {uploading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        )}
        {uploaded && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <CheckCircle className="h-4 w-4 text-success" />
          </div>
        )}
      </div>
      {fileName && (
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>{fileName}</span>
            {uploaded && <span className="text-success font-medium">✓ Téléchargé</span>}
          </div>
          {uploaded && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="h-8 text-destructive hover:text-destructive"
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

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DocumentUploadProps {
  demarcheId: string;
  documentType: string;
  label: string;
  onUploadComplete?: () => void;
}

export function DocumentUpload({ demarcheId, documentType, label, onUploadComplete }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
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
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          demarche_id: demarcheId,
          type_document: documentType,
          document_type: documentType,
          nom_fichier: file.name,
          url: publicUrl,
          taille_octets: file.size
        });

      if (dbError) throw dbError;

      toast({
        title: "Document téléchargé",
        description: "Le document a été téléchargé avec succès"
      });

      setFile(null);
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

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.jpg,.jpeg,.png"
            disabled={uploading}
          />
        </div>
        {file && (
          <>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              size="sm"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Upload..." : "Télécharger"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFile(null)}
              disabled={uploading}
              size="sm"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
      {file && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span>{file.name} ({(file.size / 1024).toFixed(2)} KB)</span>
        </div>
      )}
    </div>
  );
}

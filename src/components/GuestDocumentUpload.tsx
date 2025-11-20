import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, X, Upload, FileCheck, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface UploadedFile {
  id: string;
  fileName: string;
  side: string;
  validation_status: string;
  rejection_reason?: string;
}

interface GuestDocumentUploadProps {
  orderId: string;
  documentType: string;
  label: string;
  existingFiles: UploadedFile[];
  onUploadComplete?: () => void;
}

export function GuestDocumentUpload({ 
  orderId, 
  documentType, 
  label, 
  existingFiles,
  onUploadComplete 
}: GuestDocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const rectoInputRef = useRef<HTMLInputElement>(null);
  const versoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const rectoFile = existingFiles.find(f => f.side === 'recto');
  const versoFile = existingFiles.find(f => f.side === 'verso');
  
  const cleanFileName = (name: string) => {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-zA-Z0-9]/g, '_') // Replace special chars with underscore
      .replace(/_+/g, '_') // Remove duplicate underscores
      .toLowerCase();
  };

  const handleUpload = async (file: File, side: 'recto' | 'verso') => {
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const cleanDocType = cleanFileName(documentType);
      const fileName = `${orderId}/${cleanDocType}_${side}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('guest-order-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('guest-order-documents')
        .getPublicUrl(fileName);

      await supabase.from('guest_order_documents').insert({
        order_id: orderId,
        type_document: documentType,
        nom_fichier: file.name,
        url: publicUrl,
        taille_octets: file.size,
        side: side,
        validation_status: 'pending',
      });

      toast({
        title: "Document téléchargé",
        description: `Le ${side} a été téléchargé avec succès`
      });

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, side: 'recto' | 'verso') => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    await handleUpload(selectedFile, side);
    
    if (side === 'recto' && rectoInputRef.current) {
      rectoInputRef.current.value = "";
    } else if (side === 'verso' && versoInputRef.current) {
      versoInputRef.current.value = "";
    }
  };

  const handleRemove = async (fileToRemove: UploadedFile) => {
    try {
      const storagePath = fileToRemove.fileName;
      
      await supabase.storage
        .from('guest-order-documents')
        .remove([storagePath]);

      await supabase
        .from('guest_order_documents')
        .delete()
        .eq('id', fileToRemove.id);

      toast({
        title: "Document supprimé",
        description: "Le document a été supprimé avec succès"
      });

      if (onUploadComplete) onUploadComplete();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const renderFileStatus = (file: UploadedFile | undefined, side: 'recto' | 'verso') => {
    if (!file) {
      return (
        <div
          onClick={() => side === 'recto' ? rectoInputRef.current?.click() : versoInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-md p-3 transition-all cursor-pointer flex items-center justify-between gap-2",
            "border-border hover:border-primary/50"
          )}
        >
          <span className="text-sm text-muted-foreground flex-1">
            Sélectionner {side}
          </span>
          <Upload className="h-4 w-4 text-muted-foreground" />
        </div>
      );
    }

    const getStatusBadge = () => {
      if (file.validation_status === 'approved') {
        return <Badge className="bg-green-500">Validé</Badge>;
      } else if (file.validation_status === 'rejected') {
        return <Badge variant="destructive">Refusé</Badge>;
      }
      return <Badge variant="secondary">En attente</Badge>;
    };

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 p-2 rounded-md border bg-card">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FileCheck className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            <span className="text-xs truncate">{file.fileName}</span>
            {getStatusBadge()}
          </div>
          {file.validation_status !== 'approved' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleRemove(file)}
              className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        {file.validation_status === 'rejected' && file.rejection_reason && (
          <div className="flex items-start gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-medium text-destructive">Raison du rejet :</p>
              <p className="text-xs text-destructive/80">{file.rejection_reason}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Recto</Label>
          <Input
            ref={rectoInputRef}
            type="file"
            onChange={(e) => handleFileChange(e, 'recto')}
            accept=".pdf,.jpg,.jpeg,.png,image/*"
            capture="environment"
            disabled={uploading}
            className="hidden"
          />
          {renderFileStatus(rectoFile, 'recto')}
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Verso</Label>
          <Input
            ref={versoInputRef}
            type="file"
            onChange={(e) => handleFileChange(e, 'verso')}
            accept=".pdf,.jpg,.jpeg,.png,image/*"
            capture="environment"
            disabled={uploading}
            className="hidden"
          />
          {renderFileStatus(versoFile, 'verso')}
        </div>
      </div>

      {uploading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Upload en cours...</span>
        </div>
      )}
    </div>
  );
}

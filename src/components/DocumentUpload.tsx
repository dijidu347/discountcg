import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle, Loader2, X, Upload, Download, FileCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { extractCerfaNumber, getCerfaUrl, cerfaExists } from "@/lib/cerfa-utils";
import { cn } from "@/lib/utils";
import { validatePdfOnlyFile } from "@/lib/documentRestrictions";
import { compressFile, isFileTooLarge } from "@/lib/file-compression";

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
  customName?: string; // Nom personnalisé à afficher
  onUploadComplete?: () => void;
  isBlocked?: boolean;
  blockedMessage?: string;
  pdfOnly?: boolean; // Si true: n'accepte que des PDF de moins de 1 Mo
}

export function DocumentUpload({ demarcheId, documentType, label, customName, onUploadComplete, isBlocked = false, blockedMessage, pdfOnly = false }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
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
        const files = data.map(doc => {
          // Extraire le chemin complet depuis l'URL: demarcheId/type_timestamp.ext
          let storagePath = '';
          const url = doc.url;
          if (url.includes('/demarche-documents/')) {
            const match = url.match(/\/demarche-documents\/(.+)$/);
            if (match) {
              storagePath = decodeURIComponent(match[1]);
            }
          }
          // Fallback: construire le chemin depuis demarcheId + filename
          if (!storagePath && doc.nom_fichier) {
            const urlParts = url.split('/');
            const fileName = urlParts.pop() || '';
            const possibleDemarcheId = urlParts.pop() || '';
            if (possibleDemarcheId && fileName) {
              storagePath = `${possibleDemarcheId}/${fileName}`;
            } else {
              storagePath = fileName;
            }
          }
          return {
            id: doc.id,
            fileName: doc.nom_fichier,
            storagePath,
            url
          };
        });
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

  const handleUpload = async (originalFile: File) => {
    if (!originalFile) return;

    // Reject oversized files up front — PDFs are not compressed, so nothing
    // downstream would shrink them.
    if (isFileTooLarge(originalFile)) {
      toast({
        title: "Fichier trop lourd",
        description: "Ce fichier dépasse la taille maximale de 50 Mo. Si c'est un PDF scanné, essayez de le rescanner en qualité normale plutôt qu'en haute définition.",
        variant: "destructive"
      });
      return;
    }

    // Restriction PDF < 1 Mo pour certaines démarches
    if (pdfOnly) {
      const validationError = validatePdfOnlyFile(originalFile);
      if (validationError) {
        toast({
          title: "Fichier refusé",
          description: validationError,
          variant: "destructive"
        });
        return;
      }
    }

    // Compress images before upload — PDFs and other formats pass through.
    setIsCompressing(true);
    let file: File;
    try {
      const result = await compressFile(originalFile);
      file = result.file;
    } catch (compressionError) {
      toast({
        title: "Erreur",
        description: "La compression de l'image a échoué. Veuillez réessayer.",
        variant: "destructive"
      });
      return;
    } finally {
      setIsCompressing(false);
    }

    setUploading(true);

    try {
      // Upload to storage — name and extension come from the compressed file
      const fileExt = file.name.split('.').pop();
      const fileName = `${demarcheId}/${documentType}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('demarche-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Store the file path - signed URLs will be generated on demand
      // since the bucket is now private
      const fileUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/demarche-documents/${fileName}`;

      // Save document reference in database
      const { data: docData, error: dbError } = await supabase
        .from('documents')
        .insert({
          demarche_id: demarcheId,
          type_document: documentType,
          document_type: customName || documentType, // Utiliser le nom personnalisé si fourni
          nom_fichier: file.name,
          url: fileUrl,
          taille_octets: file.size
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Notify admin about new document - reset admin_viewed to false and add notification
      const { data: demarcheData } = await supabase
        .from('demarches')
        .select('garage_id, immatriculation, numero_demarche')
        .eq('id', demarcheId)
        .single();

      if (demarcheData) {
        // Reset admin_viewed to bring attention to this demarche
        await supabase
          .from('demarches')
          .update({ admin_viewed: false })
          .eq('id', demarcheId);

        // Create notification for admin
        await supabase
          .from('notifications')
          .insert({
            demarche_id: demarcheId,
            garage_id: demarcheData.garage_id,
            type: 'new_document',
            message: `Nouveau document ajouté: ${customName || documentType} (${demarcheData.numero_demarche || demarcheData.immatriculation})`
          });
      }

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
          url: fileUrl
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
                download
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

  if (isBlocked) {
    return (
      <div className="space-y-2">
        {label && renderLabel()}
        <div className="p-4 border-2 border-dashed border-warning/50 rounded-md bg-warning/5">
          <p className="text-sm text-warning font-medium">
            {blockedMessage || "Upload bloqué - Paiement requis"}
          </p>
        </div>
      </div>
    );
  }

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
        <>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          className={cn(
            "relative border-2 border-dashed rounded-md p-3 transition-all cursor-pointer flex items-center justify-between gap-2",
            isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
            (uploading || isCompressing) && "cursor-not-allowed opacity-75"
          )}
        >
        <Input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          accept={pdfOnly ? "application/pdf,.pdf" : ".pdf,.jpg,.jpeg,.png,.heic,.heif,image/*"}
          disabled={uploading || isCompressing}
          className="hidden"
        />

        {isCompressing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground flex-1">Optimisation de l'image...</span>
          </>
        ) : uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground flex-1">Upload en cours...</span>
          </>
        ) : (
          <>
            {/* Gris plus soutenu que muted-foreground : l'invite se lisait mal
                sur le fond clair de la carte quand une option est selectionnee. */}
            <span className="text-sm text-foreground/70 flex-1">
              {isDragOver ? "Déposez le fichier ici" : "Sélectionner un fichier"}
            </span>
            <Upload className="h-4 w-4 text-foreground/70" />
          </>
        )}
      </div>
        {pdfOnly && (
          <p className="text-xs text-muted-foreground mt-1">
            Format PDF uniquement, moins de 1 Mo.
          </p>
        )}
        </>
      )}
    </div>
  );
}

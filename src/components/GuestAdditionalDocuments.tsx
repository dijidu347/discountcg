import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, X, Upload, Plus, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface UploadSlot {
  id: string;
  file: File | null;
  uploading: boolean;
  uploaded: boolean;
  documentId?: string;
  fileName?: string;
  url?: string;
}

interface GuestAdditionalDocumentsProps {
  orderId: string;
  documentType: string;
  rejectionReason: string;
  onUploadComplete?: () => void;
}

export function GuestAdditionalDocuments({ 
  orderId, 
  documentType,
  rejectionReason,
  onUploadComplete 
}: GuestAdditionalDocumentsProps) {
  const [slots, setSlots] = useState<UploadSlot[]>([
    { id: '1', file: null, uploading: false, uploaded: false }
  ]);
  const { toast } = useToast();
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const addSlot = () => {
    const newId = (slots.length + 1).toString();
    setSlots([...slots, { id: newId, file: null, uploading: false, uploaded: false }]);
  };

  const removeSlot = async (slotId: string) => {
    const slot = slots.find(s => s.id === slotId);
    
    // If the document was uploaded, delete it from storage and database
    if (slot?.documentId) {
      try {
        // Delete from storage
        const urlParts = slot.url?.split('/');
        if (urlParts && urlParts.length > 0) {
          const path = urlParts.slice(-2).join('/'); // Get orderId/filename
          await supabase.storage
            .from('guest-order-documents')
            .remove([path]);
        }

        // Delete from database
        await supabase
          .from('guest_order_documents')
          .delete()
          .eq('id', slot.documentId);

        toast({
          title: "Document supprimé",
          description: "La pièce jointe a été supprimée",
        });
      } catch (error: any) {
        console.error("Error deleting document:", error);
      }
    }

    setSlots(slots.filter(s => s.id !== slotId));
    if (onUploadComplete) onUploadComplete();
  };

  const cleanFileName = (name: string) => {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[()\/\\]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
  };

  const handleFileSelect = async (slotId: string, file: File) => {
    setSlots(slots.map(s => 
      s.id === slotId ? { ...s, file, uploading: true } : s
    ));

    try {
      const fileExt = file.name.split('.').pop();
      const cleanDocType = cleanFileName(documentType);
      const fileName = `${orderId}/${cleanDocType}_complement_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('guest-order-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('guest-order-documents')
        .getPublicUrl(fileName);

      const { data: docData, error: insertError } = await supabase
        .from('guest_order_documents')
        .insert({
          order_id: orderId,
          type_document: `${documentType} (complément)`,
          nom_fichier: file.name,
          url: publicUrl,
          taille_octets: file.size,
          side: null,
          validation_status: 'pending',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setSlots(slots.map(s => 
        s.id === slotId 
          ? { 
              ...s, 
              uploading: false, 
              uploaded: true,
              documentId: docData.id,
              fileName: file.name,
              url: publicUrl
            } 
          : s
      ));

      toast({
        title: "Document téléchargé",
        description: "Votre pièce jointe a été envoyée avec succès"
      });

      if (onUploadComplete) onUploadComplete();
    } catch (error: any) {
      console.error("Upload error:", error);
      setSlots(slots.map(s => 
        s.id === slotId ? { ...s, uploading: false, file: null } : s
      ));
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'upload",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
      <div className="flex items-start gap-2">
        <FileText className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h4 className="font-semibold text-sm mb-1">
            Documents complémentaires pour : {documentType}
          </h4>
          <p className="text-xs text-muted-foreground mb-3">
            Raison du rejet : {rejectionReason}
          </p>
          
          <div className="space-y-3">
            {slots.map((slot) => (
              <div key={slot.id} className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    ref={(el) => (fileInputRefs.current[slot.id] = el)}
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(slot.id, file);
                    }}
                    accept=".pdf,.jpg,.jpeg,.png,image/*"
                    disabled={slot.uploading || slot.uploaded}
                    className="hidden"
                  />
                  
                  {!slot.uploaded ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRefs.current[slot.id]?.click()}
                      disabled={slot.uploading}
                      className="w-full justify-start"
                      size="sm"
                    >
                      {slot.uploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Upload en cours...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          {slot.file ? slot.file.name : 'Choisir un fichier'}
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 p-2 bg-card rounded-md border">
                      <FileText className="h-4 w-4 text-green-600" />
                      <span className="text-xs flex-1 truncate">{slot.fileName}</span>
                      <Badge className="bg-green-600">Envoyé</Badge>
                    </div>
                  )}
                </div>
                
                {slots.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSlot(slot.id)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addSlot}
            className="mt-3 w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une pièce jointe
          </Button>
        </div>
      </div>
    </div>
  );
}

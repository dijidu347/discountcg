import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UploadDocumentProps {
  orderId: string;
  documentType: string;
  onUploadSuccess: () => void;
}

export const UploadDocument = ({ orderId, documentType, onUploadSuccess }: UploadDocumentProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      // Créer une preview pour les images
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${documentType.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}_${file.name}`;
      const filePath = `${orderId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('guest-order-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('guest-order-documents')
        .getPublicUrl(filePath);

      // Delete any existing document of the same type to prevent duplicates
      // (re-upload replaces the old document instead of creating a new row)
      await supabase
        .from('guest_order_documents')
        .delete()
        .eq('order_id', orderId)
        .eq('type_document', documentType);

      const { error: dbError } = await supabase
        .from('guest_order_documents')
        .insert({
          order_id: orderId,
          type_document: documentType,
          nom_fichier: file.name,
          url: publicUrl,
          taille_octets: file.size,
          validation_status: 'pending',
        });

      if (dbError) throw dbError;

      setUploaded(true);
      onUploadSuccess();
      
      toast({
        title: "Document envoyé",
        description: "Votre document a été envoyé avec succès",
      });
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de l'envoi du document",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setPreview(null);
    setUploaded(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{documentType}</h4>
            {uploaded && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Envoyé</span>
              </div>
            )}
          </div>

          {!file && !uploaded && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Choisir un fichier
              </Button>
            </div>
          )}

          {file && preview && (
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-48 object-cover rounded-lg"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={handleRemove}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {file && !uploaded && (
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Envoyer
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GuestDocumentUpload } from "@/components/GuestDocumentUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UploadListSimpleProps {
  orderId: string;
  isPaid: boolean;
  demarcheType: string;
}

interface UploadedFile {
  id: string;
  fileName: string;
  side: string;
  validation_status: string;
  rejection_reason?: string;
  type_document: string;
}

interface OrderInfo {
  tracking_number: string;
  email: string;
  nom: string;
  prenom: string;
  immatriculation: string;
  montant_ttc: number;
}

interface RequiredDocument {
  id: string;
  nom_document: string;
  obligatoire: boolean;
  ordre: number;
}

// Documents qui nécessitent recto/verso
const RECTO_VERSO_KEYWORDS = [
  "pièce d'identité",
  "carte d'identité",
  "permis de conduire",
  "permis du titulaire",
  "permis du co-titulaire",
  "identité et permis",
];

const isRectoOnly = (docName: string): boolean => {
  const lower = docName.toLowerCase();
  return !RECTO_VERSO_KEYWORDS.some(keyword => lower.includes(keyword));
};

export const UploadListSimple = ({ orderId, isPaid, demarcheType }: UploadListSimpleProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [requiredDocuments, setRequiredDocuments] = useState<RequiredDocument[]>([]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load required documents from DB
      const { data: docsConfig } = await supabase
        .from('guest_order_required_documents')
        .select('*')
        .eq('demarche_type_code', demarcheType)
        .eq('actif', true)
        .order('ordre');

      if (docsConfig) {
        setRequiredDocuments(docsConfig);
      }

      // Load existing uploaded documents
      const { data: existingDocs } = await supabase
        .from('guest_order_documents')
        .select('*')
        .eq('order_id', orderId);

      if (existingDocs) {
        setUploadedFiles(existingDocs.map(doc => ({
          id: doc.id,
          fileName: doc.nom_fichier,
          side: doc.side || '',
          validation_status: doc.validation_status || 'pending',
          rejection_reason: doc.rejection_reason || undefined,
          type_document: doc.type_document
        })));
      }

      // Get order info
      const { data: order } = await supabase
        .from('guest_orders')
        .select('tracking_number, email, nom, prenom, immatriculation, montant_ttc')
        .eq('id', orderId)
        .single();

      if (order) {
        setOrderInfo(order as OrderInfo);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0) {
      toast({
        title: "Aucun document",
        description: "Veuillez déposer au moins un document avant d'envoyer.",
        variant: "destructive",
      });
      return;
    }

    if (!orderInfo) {
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les informations de la commande",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await supabase
        .from('guest_orders')
        .update({ documents_complets: true })
        .eq('id', orderId);

      if (orderInfo.email && orderInfo.email.trim() !== '') {
        await supabase.functions.invoke('send-guest-order-email', {
          body: {
            type: 'documents_received',
            orderData: {
              tracking_number: orderInfo.tracking_number,
              email: orderInfo.email,
              nom: orderInfo.nom,
              prenom: orderInfo.prenom,
              immatriculation: orderInfo.immatriculation,
              montant_ttc: orderInfo.montant_ttc,
            }
          }
        });
      }

      toast({
        title: "Documents envoyés",
        description: "Vos documents ont été envoyés avec succès. Vous allez être redirigé vers la page de suivi.",
      });

      setTimeout(() => {
        navigate(`/suivi/${orderInfo.tracking_number}`);
      }, 1500);

    } catch (error) {
      console.error('Error submitting documents:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'envoi des documents.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (orderId && isPaid) {
      loadData();
    } else {
      setIsLoading(false);
    }
  }, [orderId, isPaid]);

  if (!isPaid) {
    return (
      <Card className="opacity-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Documents requis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Vous pourrez déposer vos documents après le paiement et avoir renseigné vos informations
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Déposez vos documents
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Déposez vos documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {requiredDocuments.map((doc) => {
          const filesForDoc = uploadedFiles.filter(f => f.type_document === doc.nom_document);
          
          return (
            <GuestDocumentUpload
              key={doc.id}
              orderId={orderId}
              documentType={doc.nom_document}
              label={`${doc.nom_document}${!doc.obligatoire ? ' (facultatif)' : ''}`}
              existingFiles={filesForDoc}
              onUploadComplete={loadData}
              rectoOnly={isRectoOnly(doc.nom_document)}
            />
          );
        })}

        {/* Submit button */}
        <div className="pt-4 border-t">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || uploadedFiles.length === 0}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Envoyer mes documents
              </>
            )}
          </Button>
          {uploadedFiles.length === 0 && (
            <p className="text-sm text-muted-foreground text-center mt-2">
              Veuillez déposer au moins un document avant d'envoyer
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

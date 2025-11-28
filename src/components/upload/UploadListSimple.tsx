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
  demarcheType: "DA" | "DC";
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

// Documents requis pour DA
const documentsDA = [
  { id: "da_1", nom_document: "Certificat de cession (cerfa 15776*01)", rectoOnly: true },
  { id: "da_2", nom_document: "Certificat déclaration d'achat (cerfa 13751*02)", rectoOnly: true },
  { id: "da_3", nom_document: "Carte grise barrée et tamponnée", rectoOnly: false },
  { id: "da_4", nom_document: "Dernière DA enregistrée (si achat à un pro)", rectoOnly: true },
  { id: "da_5", nom_document: "Accusé d'enregistrement déclaration de cession", rectoOnly: true },
];

// Documents requis pour DC
const documentsDC = [
  { id: "dc_1", nom_document: "Certificat de cession (cerfa 15776*01)", rectoOnly: true },
  { id: "dc_2", nom_document: "Certificat déclaration d'achat (si achat à un pro)", rectoOnly: true },
  { id: "dc_3", nom_document: "Carte grise barrée et tamponnée (signée, datée)", rectoOnly: false },
  { id: "dc_4", nom_document: "Carte d'identité du nouveau propriétaire", rectoOnly: false },
  { id: "dc_5", nom_document: "Dernière DA enregistrée (si achat à un pro)", rectoOnly: true },
];

export const UploadListSimple = ({ orderId, isPaid, demarcheType }: UploadListSimpleProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);

  const requiredDocuments = demarcheType === "DA" ? documentsDA : documentsDC;

  const loadData = async () => {
    setIsLoading(true);
    try {
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
      // Update order to indicate documents received
      await supabase
        .from('guest_orders')
        .update({ documents_complets: true })
        .eq('id', orderId);

      // Send email if email is provided
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

      // Redirect to tracking page
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
              label={doc.nom_document}
              existingFiles={filesForDoc}
              onUploadComplete={loadData}
              rectoOnly={doc.rectoOnly}
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

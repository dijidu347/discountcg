import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GuestDocumentUpload } from "@/components/GuestDocumentUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UploadListProps {
  orderId: string;
  isPaid: boolean;
}

interface RequiredDocument {
  id: string;
  nom_document: string;
  ordre: number;
  obligatoire: boolean;
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
  is_heberge: boolean;
  has_cotitulaire: boolean;
  tracking_number: string;
  requires_resubmission_payment: boolean;
  resubmission_paid: boolean;
  email: string;
  nom: string;
  prenom: string;
  immatriculation: string;
  montant_ttc: number;
  marque: string | null;
  modele: string | null;
}

export const UploadList = ({ orderId, isPaid }: UploadListProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [requiredDocuments, setRequiredDocuments] = useState<RequiredDocument[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState("");
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load required documents
      const { data: reqDocs } = await supabase
        .from('guest_order_required_documents')
        .select('*')
        .eq('actif', true)
        .order('ordre');

      if (reqDocs) {
        setRequiredDocuments(reqDocs);
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

      // Check order info for conditional documents and blocking
      const { data: order } = await supabase
        .from('guest_orders')
        .select('requires_resubmission_payment, resubmission_paid, tracking_number, is_heberge, has_cotitulaire, email, nom, prenom, immatriculation, montant_ttc, marque, modele')
        .eq('id', orderId)
        .single();

      if (order) {
        setOrderInfo(order as OrderInfo);
        if (order.requires_resubmission_payment && !order.resubmission_paid) {
          setIsBlocked(true);
          setBlockedMessage("Un paiement de 10€ est requis avant de pouvoir renvoyer des documents.");
        } else {
          setIsBlocked(false);
          setBlockedMessage("");
        }
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

      // Send email only if email is provided
      if (orderInfo.email && orderInfo.email.trim() !== '') {
        const { error: emailError } = await supabase.functions.invoke('send-guest-order-email', {
          body: {
            type: 'documents_received',
            orderData: {
              tracking_number: orderInfo.tracking_number,
              email: orderInfo.email,
              nom: orderInfo.nom,
              prenom: orderInfo.prenom,
              immatriculation: orderInfo.immatriculation,
              montant_ttc: orderInfo.montant_ttc,
              marque: orderInfo.marque,
              modele: orderInfo.modele,
            }
          }
        });

        if (emailError) {
          console.error('Error sending email:', emailError);
        }
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

  // Build the list of documents to display
  const documentsToShow: Array<{ id: string; nom_document: string; rectoOnly?: boolean }> = [
    ...requiredDocuments.map(doc => ({ id: doc.id, nom_document: doc.nom_document, rectoOnly: false }))
  ];

  // Add attestation de domicile if hébergé
  if (orderInfo?.is_heberge) {
    documentsToShow.push({
      id: 'attestation_domicile',
      nom_document: 'Attestation de domicile (hébergement)',
      rectoOnly: true
    });
  }

  // Add co-titulaire ID if has_cotitulaire
  if (orderInfo?.has_cotitulaire) {
    documentsToShow.push({
      id: 'cotitulaire_id',
      nom_document: "Pièce d'identité du co-titulaire",
      rectoOnly: false
    });
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
        {documentsToShow.map((doc) => {
          const filesForDoc = uploadedFiles.filter(f => f.type_document === doc.nom_document);
          
          return (
            <GuestDocumentUpload
              key={doc.id}
              orderId={orderId}
              documentType={doc.nom_document}
              label={doc.nom_document}
              existingFiles={filesForDoc}
              onUploadComplete={loadData}
              isBlocked={isBlocked}
              blockedMessage={blockedMessage}
              rectoOnly={doc.rectoOnly}
            />
          );
        })}

        {/* Submit button */}
        <div className="pt-4 border-t">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isBlocked || uploadedFiles.length === 0}
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

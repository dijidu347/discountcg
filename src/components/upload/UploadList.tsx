import { useState, useEffect } from "react";
import { GuestDocumentUpload } from "@/components/GuestDocumentUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

export const UploadList = ({ orderId, isPaid }: UploadListProps) => {
  const [requiredDocuments, setRequiredDocuments] = useState<RequiredDocument[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState("");

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

      // Check if order is blocked for resubmission payment
      const { data: order } = await supabase
        .from('guest_orders')
        .select('requires_resubmission_payment, resubmission_paid')
        .eq('id', orderId)
        .single();

      if (order && order.requires_resubmission_payment && !order.resubmission_paid) {
        setIsBlocked(true);
        setBlockedMessage("Un paiement de 10€ est requis avant de pouvoir renvoyer des documents.");
      } else {
        setIsBlocked(false);
        setBlockedMessage("");
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoading(false);
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
            Vous pourrez déposer vos documents après le paiement
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
      <CardContent className="space-y-6">
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
              isBlocked={isBlocked}
              blockedMessage={blockedMessage}
            />
          );
        })}
      </CardContent>
    </Card>
  );
};

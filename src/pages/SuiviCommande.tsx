import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Loader2, 
  CheckCircle, 
  Clock, 
  Package, 
  Truck, 
  FileCheck,
  Mail,
  Phone,
  MapPin,
  FileText,
  AlertCircle,
  Download
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { GuestDocumentUpload } from "@/components/GuestDocumentUpload";

const SuiviCommande = () => {
  const { trackingNumber } = useParams();
  const { toast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [carteGriseUrl, setCarteGriseUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOrder();
    loadDocuments();
  }, [trackingNumber]);

  const loadOrder = async () => {
    if (!trackingNumber) return;

    const { data, error } = await supabase
      .from("guest_orders")
      .select("*")
      .eq("tracking_number", trackingNumber)
      .single();

    if (error || !data) {
      toast({
        title: "Commande introuvable",
        description: "Vérifiez votre numéro de suivi",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    setOrder(data);
    setIsLoading(false);

    // Check for carte grise finale
    if (data.status === 'finalise') {
      const { data: carteGriseDoc } = await supabase
        .from('guest_order_documents')
        .select('url')
        .eq('order_id', data.id)
        .eq('type_document', 'carte_grise_finale')
        .single();
      
      if (carteGriseDoc) {
        setCarteGriseUrl(carteGriseDoc.url);
      }
    }
  };

  const loadDocuments = async () => {
    if (!trackingNumber) return;

    // Get order first to get the ID
    const { data: orderData } = await supabase
      .from("guest_orders")
      .select("id")
      .eq("tracking_number", trackingNumber)
      .single();

    if (!orderData) return;

    const { data: docsData } = await supabase
      .from("guest_order_documents")
      .select("*")
      .eq("order_id", orderData.id)
      .neq("type_document", "carte_grise_finale")
      .order("created_at", { ascending: false });

    if (docsData) {
      setDocuments(docsData);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "en_attente":
        return {
          label: "En attente de paiement",
          color: "bg-yellow-500",
          icon: Clock,
        };
      case "paye":
        return {
          label: "Paiement reçu",
          color: "bg-blue-500",
          icon: CheckCircle,
        };
      case "en_traitement":
        return {
          label: "En traitement",
          color: "bg-blue-500",
          icon: Package,
        };
      case "valide":
        return {
          label: "Validé",
          color: "bg-green-500",
          icon: FileCheck,
        };
      case "finalise":
        return {
          label: "Expédié",
          color: "bg-green-600",
          icon: Truck,
        };
      case "refuse":
        return {
          label: "Refusé",
          color: "bg-red-500",
          icon: Clock,
        };
      default:
        return {
          label: status,
          color: "bg-gray-500",
          icon: Clock,
        };
    }
  };

  const getSteps = () => {
    const steps = [
      {
        label: "Commande créée",
        status: "completed",
        date: order?.created_at,
      },
      {
        label: "Paiement reçu",
        status: order?.paye ? "completed" : "pending",
        date: order?.paid_at,
      },
      {
        label: "En traitement",
        status: ["en_traitement", "valide", "finalise"].includes(order?.status)
          ? "completed"
          : "pending",
        date: null,
      },
      {
        label: "Validé",
        status: ["valide", "finalise"].includes(order?.status)
          ? "completed"
          : "pending",
        date: order?.validated_at,
      },
      {
        label: "Expédié",
        status: order?.status === "finalise" ? "completed" : "pending",
        date: null,
      },
    ];

    return steps;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Commande introuvable</h1>
          <p className="text-muted-foreground">
            Vérifiez votre numéro de suivi et réessayez
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  const statusInfo = getStatusInfo(order.status);
  const StatusIcon = statusInfo.icon;
  const steps = getSteps();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Suivi de commande</h1>
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-card rounded-full border-2 border-primary">
              <span className="text-sm text-muted-foreground">N° de suivi</span>
              <span className="text-xl font-bold text-primary">
                {order.tracking_number}
              </span>
            </div>
          </div>

          {/* Status Badge */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-4">
                <div className={`w-12 h-12 ${statusInfo.color} rounded-full flex items-center justify-center`}>
                  <StatusIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{statusInfo.label}</p>
                  <p className="text-sm text-muted-foreground">
                    Immatriculation: {order.immatriculation}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progress Steps */}
          <Card>
            <CardHeader>
              <CardTitle>Progression de votre commande</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="relative">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          step.status === "completed"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {step.status === "completed" ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <Clock className="w-5 h-5" />
                        )}
                      </div>
                      {index < steps.length - 1 && (
                        <div
                          className={`absolute left-5 top-10 w-0.5 h-8 ${
                            step.status === "completed" ? "bg-primary" : "bg-muted"
                          }`}
                        />
                      )}
                    </div>
                    <div className="flex-1 pt-2">
                      <p className="font-semibold">{step.label}</p>
                      {step.date && (
                        <p className="text-sm text-muted-foreground">
                          {new Date(step.date).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Order Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Informations de contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p>
                  <span className="font-semibold">Nom:</span> {order.prenom} {order.nom}
                </p>
                <p>
                  <span className="font-semibold">Email:</span> {order.email}
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {order.telephone}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Adresse de livraison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>{order.adresse}</p>
                <p>
                  {order.code_postal} {order.ville}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>Notifications actives</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {order.email_notifications && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Email</Badge>
                  <span className="text-sm">
                    Vous recevrez des mises à jour par email
                  </span>
                </div>
              )}
              {order.sms_notifications && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">SMS</Badge>
                  <span className="text-sm">
                    Vous recevrez des mises à jour par SMS
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Box */}
          {order.status !== "finalise" && (
            <Card className="border-primary bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold mb-2">Délai de traitement</p>
                    <p className="text-sm text-muted-foreground">
                      Votre carte grise sera traitée et expédiée sous 24h ouvrées
                      maximum après validation de votre dossier. Vous recevrez un
                      email de confirmation à chaque étape.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {order.commentaire && (
            <Card className="border-yellow-500">
              <CardHeader>
                <CardTitle className="text-yellow-600">
                  Message de l'administration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>{order.commentaire}</p>
              </CardContent>
            </Card>
          )}

          {/* Carte Grise Finale */}
          {carteGriseUrl && (
            <Card className="border-green-500 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <FileCheck className="w-6 h-6" />
                  Votre carte grise est disponible !
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Votre carte grise a été traitée et est maintenant disponible au téléchargement.
                </p>
                <a
                  href={carteGriseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <Download className="w-5 h-5" />
                  Télécharger ma carte grise
                </a>
              </CardContent>
            </Card>
          )}

          {/* Documents envoyés */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Mes documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {documents.length > 0 ? (
                  documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{doc.type_document}</p>
                        {doc.side && (
                          <p className="text-sm text-muted-foreground">{doc.side}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Envoyé le {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.validation_status === 'pending' && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            En attente
                          </Badge>
                        )}
                        {doc.validation_status === 'approved' && (
                          <Badge variant="default" className="bg-green-600 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Validé
                          </Badge>
                        )}
                        {doc.validation_status === 'rejected' && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Refusé
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Aucun document envoyé pour le moment
                  </p>
                )}

                {/* Afficher les documents rejetés à re-uploader */}
                {documents.some(doc => doc.validation_status === 'rejected') && (
                  <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h3 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Documents à renvoyer
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Certains documents ont été refusés. Veuillez les renvoyer ci-dessous.
                    </p>
                    {documents
                      .filter(doc => doc.validation_status === 'rejected')
                      .map(doc => {
                        // Get existing files for this document type and side
                        const existingFiles = documents
                          .filter(d => d.type_document === doc.type_document && d.side === doc.side)
                          .map(d => ({
                            id: d.id,
                            fileName: d.nom_fichier,
                            side: d.side || 'recto',
                            validation_status: d.validation_status,
                            rejection_reason: d.rejection_reason
                          }));

                        return (
                          <div key={doc.id} className="mb-4">
                            <div className="mb-2">
                              <p className="font-medium">{doc.type_document}</p>
                              {doc.rejection_reason && (
                                <p className="text-sm text-red-600">
                                  Raison: {doc.rejection_reason}
                                </p>
                              )}
                            </div>
                            <GuestDocumentUpload
                              orderId={order.id}
                              documentType={doc.type_document}
                              label={doc.type_document}
                              existingFiles={existingFiles}
                              onUploadComplete={loadDocuments}
                            />
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default SuiviCommande;

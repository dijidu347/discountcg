import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Download,
  CreditCard,
  Ban,
  Upload
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { GuestDocumentUpload } from "@/components/GuestDocumentUpload";

const SuiviCommande = () => {
  const { trackingNumber } = useParams();
  const { toast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [adminDocuments, setAdminDocuments] = useState<any[]>([]);
  const [carteGriseUrl, setCarteGriseUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requiredDocuments, setRequiredDocuments] = useState<any[]>([]);
  const [factureUrl, setFactureUrl] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadRequiredDocuments();
    loadOrder();
    loadDocuments();
  }, [trackingNumber]);

  const loadRequiredDocuments = async () => {
    const { data } = await supabase
      .from("guest_order_required_documents")
      .select("*")
      .eq("actif", true)
      .order("ordre");
    
    if (data) {
      setRequiredDocuments(data);
    }
  };

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

    // Check for carte grise finale (même si pas encore finalisé)
    const { data: carteGriseDoc } = await supabase
      .from('guest_order_documents')
      .select('url')
      .eq('order_id', data.id)
      .eq('type_document', 'carte_grise_finale')
      .single();
    
    if (carteGriseDoc) {
      setCarteGriseUrl(carteGriseDoc.url);
    }

    // Get facture from factures table
    const { data: facture } = await supabase
      .from('factures')
      .select('pdf_url')
      .eq('guest_order_id', data.id)
      .single();
    
    if (facture?.pdf_url) {
      setFactureUrl(facture.pdf_url);
    }
  };

  const handleResubmissionPayment = async () => {
    if (!order) return;
    
    setIsProcessingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-resubmission-payment', {
        body: {
          order_id: order.id,
          amount: order.resubmission_payment_amount || 10,
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le paiement",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
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

    // Load customer documents (exclude carte_grise_finale and admin documents)
    const { data: docsData } = await supabase
      .from("guest_order_documents")
      .select("*")
      .eq("order_id", orderData.id)
      .neq("type_document", "carte_grise_finale")
      .not("type_document", "like", "admin_%")
      .order("created_at", { ascending: false });

    if (docsData) {
      setDocuments(docsData);
    }

    // Load admin documents separately
    const { data: adminDocs } = await supabase
      .from("guest_order_documents")
      .select("*")
      .eq("order_id", orderData.id)
      .like("type_document", "admin_%")
      .order("created_at", { ascending: false });

    if (adminDocs) {
      setAdminDocuments(adminDocs);
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

  // Group documents by type and side, filter out empty verso
  const groupedDocuments = documents.reduce((acc: any[], doc) => {
    // Skip if it's a verso without a file
    if (doc.side === 'verso' && !doc.url) return acc;
    acc.push(doc);
    return acc;
  }, []);

  // Get unique rejected document types for re-upload
  const rejectedDocTypes = [...new Set(
    documents
      .filter(doc => doc.validation_status === 'rejected')
      .map(doc => doc.type_document)
  )];

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

          {/* Options souscrites */}
          <Card>
            <CardHeader>
              <CardTitle>Options souscrites</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Options supplémentaires */}
              {order.dossier_prioritaire && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-orange-500">Prioritaire</Badge>
                    <span className="text-sm">Dossier Prioritaire</span>
                  </div>
                  <span className="text-sm text-orange-600 font-medium">+5,00 €</span>
                </div>
              )}
              
              {order.certificat_non_gage && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-500">Non-gage</Badge>
                    <span className="text-sm">Certificat de non-gage</span>
                  </div>
                  <span className="text-sm text-blue-600 font-medium">+10,00 €</span>
                </div>
              )}

              {/* Options de suivi */}
              {order.email_notifications ? (
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-700">Email</Badge>
                    <span className="text-sm">Suivi par email</span>
                  </div>
                  <span className="text-sm text-green-600 font-medium">Gratuit</span>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Email</Badge>
                    <span className="text-sm text-muted-foreground">Suivi par email</span>
                  </div>
                  <span className="text-sm text-muted-foreground">Non souscrit</span>
                </div>
              )}
              
              {order.sms_notifications ? (
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary">SMS</Badge>
                    <span className="text-sm">Suivi par SMS</span>
                  </div>
                  <span className="text-sm text-primary font-medium">5,00 €</span>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">SMS</Badge>
                    <span className="text-sm text-muted-foreground">Suivi par SMS</span>
                  </div>
                  <span className="text-sm text-muted-foreground">Non souscrit</span>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground pt-2">
                * Les emails essentiels (document refusé, dossier terminé) sont toujours envoyés.
              </p>
            </CardContent>
          </Card>

          {/* Informations complémentaires */}
          <Card>
            <CardHeader>
              <CardTitle>Informations complémentaires</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Co-titulaire */}
              {order.has_cotitulaire && (
                <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800">
                  <p className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-2">Co-titulaire</p>
                  <p className="font-medium">{order.cotitulaire_prenom} {order.cotitulaire_nom}</p>
                </div>
              )}

              {/* Questions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <span className="text-sm">Véhicule acheté chez un pro</span>
                  <Badge variant={order.vehicule_pro ? "default" : "secondary"}>
                    {order.vehicule_pro ? "Oui" : "Non"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <span className="text-sm">Leasing/LLD/LOA</span>
                  <Badge variant={order.vehicule_leasing ? "default" : "secondary"}>
                    {order.vehicule_leasing ? "Oui" : "Non"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <span className="text-sm">Mineur (-18 ans)</span>
                  <Badge variant={order.is_mineur ? "destructive" : "secondary"}>
                    {order.is_mineur ? "Oui" : "Non"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <span className="text-sm">Hébergé</span>
                  <Badge variant={order.is_heberge ? "default" : "secondary"}>
                    {order.is_heberge ? "Oui" : "Non"}
                  </Badge>
                </div>
              </div>
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

          {/* Facture */}
          {factureUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Facture
                </CardTitle>
              </CardHeader>
              <CardContent>
                <a
                  href={factureUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Télécharger ma facture
                </a>
              </CardContent>
            </Card>
          )}

          {/* Documents envoyés par l'administration */}
          {adminDocuments.length > 0 && (
            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <FileCheck className="w-5 h-5" />
                  Documents de l'administration
                </CardTitle>
                <CardDescription>
                  Documents envoyés par notre équipe pour votre dossier
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {adminDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg bg-primary/5">
                      <div className="flex-1">
                        <p className="font-medium">{doc.type_document.replace('admin_', '')}</p>
                        <p className="text-xs text-muted-foreground">
                          Envoyé le {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
                      >
                        <Download className="w-4 h-4" />
                        Télécharger
                      </a>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Carte Grise Finale - MISE EN AVANT */}
          {carteGriseUrl && (
            <Card className="border-2 border-green-500 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
                  <FileCheck className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl text-green-700 dark:text-green-300">
                  🎉 Votre carte grise est disponible !
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-center">
                <p className="text-muted-foreground text-lg">
                  Félicitations ! Votre carte grise a été traitée et est maintenant disponible au téléchargement.
                </p>
                <a
                  href={carteGriseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all transform hover:scale-105 font-semibold text-lg shadow-lg"
                >
                  <Download className="w-6 h-6" />
                  Télécharger ma carte grise
                </a>
                <p className="text-sm text-muted-foreground mt-4">
                  Conservez précieusement ce document. Il vous sera demandé en cas de contrôle.
                </p>
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
                 {groupedDocuments.length > 0 ? (
                  groupedDocuments.map((doc) => {
                    return (
                      <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{doc.type_document}</p>
                          {doc.side && (
                            <p className="text-sm text-muted-foreground capitalize">{doc.side}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Envoyé le {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                          </p>
                          {doc.rejection_reason && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                              <p className="text-xs font-semibold text-red-700">Raison du rejet:</p>
                              <p className="text-xs text-red-600">{doc.rejection_reason}</p>
                            </div>
                          )}
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
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Aucun document envoyé pour le moment
                  </p>
                )}

                {/* Afficher les documents rejetés à re-uploader */}
                {rejectedDocTypes.length > 0 && (
                  <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h3 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Documents à renvoyer
                    </h3>
                    
                    {/* Payment required message */}
                    {order.requires_resubmission_payment && !order.resubmission_paid ? (
                      <div className="p-4 bg-orange-100 border border-orange-300 rounded-lg mb-4">
                        <div className="flex items-start gap-3">
                          <Ban className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-semibold text-orange-700 mb-2">
                              Paiement requis pour renvoyer vos documents
                            </p>
                            <p className="text-sm text-orange-600 mb-4">
                              Suite à des documents non conformes, un paiement de <strong>{order.resubmission_payment_amount || 10} €</strong> est 
                              requis avant de pouvoir soumettre de nouveaux documents.
                            </p>
                            <Button 
                              onClick={handleResubmissionPayment}
                              disabled={isProcessingPayment}
                              className="bg-orange-500 hover:bg-orange-600 text-white"
                            >
                              {isProcessingPayment ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Chargement...
                                </>
                              ) : (
                                <>
                                  <CreditCard className="w-4 h-4 mr-2" />
                                  Payer {order.resubmission_payment_amount || 10} € pour renvoyer
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mb-4">
                        Certains documents ont été refusés. Veuillez les renvoyer ci-dessous.
                      </p>
                    )}

                    {rejectedDocTypes.map(docType => {
                      const isBlocked = order.requires_resubmission_payment && !order.resubmission_paid;
                      // Don't pass rejected files - allow fresh upload
                      const existingFiles: any[] = [];

                      return (
                        <div key={docType} className="mb-4">
                          <div className="mb-2">
                            <p className="font-medium">{docType}</p>
                            {documents.find(d => d.type_document === docType && d.rejection_reason)?.rejection_reason && (
                              <p className="text-sm text-red-600">
                                Raison: {documents.find(d => d.type_document === docType)?.rejection_reason}
                              </p>
                            )}
                          </div>
                          <GuestDocumentUpload
                            orderId={order.id}
                            documentType={docType}
                            label={`Renvoyer: ${docType}`}
                            existingFiles={existingFiles}
                            isBlocked={isBlocked}
                            blockedMessage={`Veuillez payer ${order.resubmission_payment_amount || 10} € pour pouvoir renvoyer ce document.`}
                            onUploadComplete={() => {
                              loadDocuments();
                              loadOrder();
                            }}
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
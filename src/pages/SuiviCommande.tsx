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
  MapPin
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const SuiviCommande = () => {
  const { trackingNumber } = useParams();
  const { toast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOrder();
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
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default SuiviCommande;

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, XCircle, FileText, User, Car, MapPin, Mail, Phone, Calendar, Euro, Download, Eye } from "lucide-react";
import { DocumentViewer } from "@/components/DocumentViewer";

interface GuestOrder {
  id: string;
  tracking_number: string;
  immatriculation: string;
  marque: string | null;
  modele: string | null;
  date_mec: string | null;
  energie: string | null;
  puiss_fisc: number | null;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
  code_postal: string;
  ville: string;
  montant_ht: number;
  montant_ttc: number;
  frais_dossier: number;
  status: string;
  paye: boolean;
  documents_complets: boolean;
  commentaire: string | null;
  created_at: string;
  validated_at: string | null;
  validated_by: string | null;
}

interface Document {
  id: string;
  type_document: string;
  nom_fichier: string;
  url: string;
  created_at: string;
}

export default function GuestOrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<GuestOrder | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentaire, setCommentaire] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  useEffect(() => {
    if (user) {
      checkAdminAndLoadData();
    }
  }, [user, id]);

  const checkAdminAndLoadData = async () => {
    if (!user) return;

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (!roles?.some((r) => r.role === "admin")) {
      navigate("/dashboard");
      return;
    }

    await loadOrderData();
  };

  const loadOrderData = async () => {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from("guest_orders")
        .select("*")
        .eq("id", id)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);
      setCommentaire(orderData.commentaire || "");

      const { data: docsData, error: docsError } = await supabase
        .from("guest_order_documents")
        .select("*")
        .eq("order_id", id)
        .order("created_at", { ascending: false });

      if (docsError) throw docsError;
      setDocuments(docsData || []);
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!user || !order) return;

    setIsValidating(true);
    try {
      const { error } = await supabase
        .from("guest_orders")
        .update({
          status: "valide",
          validated_at: new Date().toISOString(),
          validated_by: user.id,
          commentaire: commentaire,
        })
        .eq("id", order.id);

      if (error) throw error;

      toast({
        title: "Commande validée",
        description: "La commande a été validée avec succès",
      });

      await loadOrderData();
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: "Impossible de valider la commande",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleReject = async () => {
    if (!user || !order) return;

    setIsValidating(true);
    try {
      const { error } = await supabase
        .from("guest_orders")
        .update({
          status: "refuse",
          validated_at: new Date().toISOString(),
          validated_by: user.id,
          commentaire: commentaire,
        })
        .eq("id", order.id);

      if (error) throw error;

      toast({
        title: "Commande refusée",
        description: "La commande a été refusée",
      });

      await loadOrderData();
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: "Impossible de refuser la commande",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const toggleDocumentsComplets = async () => {
    if (!order) return;

    try {
      const { error } = await supabase
        .from("guest_orders")
        .update({
          documents_complets: !order.documents_complets,
        })
        .eq("id", order.id);

      if (error) throw error;

      toast({
        title: "Statut mis à jour",
        description: `Documents marqués comme ${!order.documents_complets ? "complets" : "incomplets"}`,
      });

      await loadOrderData();
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      en_attente: { variant: "secondary", label: "En attente" },
      valide: { variant: "default", label: "Validé" },
      finalise: { variant: "default", label: "Finalisé" },
      refuse: { variant: "destructive", label: "Refusé" },
    };
    const config = variants[status] || { variant: "secondary", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Commande non trouvée</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate("/admin/guest-orders")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux commandes particuliers
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Commande {order.tracking_number}</h1>
            <p className="text-muted-foreground">
              Créée le {new Date(order.created_at).toLocaleDateString("fr-FR")}
            </p>
          </div>
          {getStatusBadge(order.status)}
        </div>

        {/* Informations client */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle>Informations Client</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Nom complet</p>
              <p className="font-medium">{order.prenom} {order.nom}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Mail className="h-4 w-4" /> Email
              </p>
              <p className="font-medium">{order.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Phone className="h-4 w-4" /> Téléphone
              </p>
              <p className="font-medium">{order.telephone}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-4 w-4" /> Adresse
              </p>
              <p className="font-medium">{order.adresse}, {order.code_postal} {order.ville}</p>
            </div>
          </CardContent>
        </Card>

        {/* Informations véhicule */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5 text-primary" />
              <CardTitle>Informations Véhicule</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Immatriculation</p>
              <p className="font-medium font-mono">{order.immatriculation}</p>
            </div>
            {order.marque && (
              <div>
                <p className="text-sm text-muted-foreground">Marque</p>
                <p className="font-medium">{order.marque}</p>
              </div>
            )}
            {order.modele && (
              <div>
                <p className="text-sm text-muted-foreground">Modèle</p>
                <p className="font-medium">{order.modele}</p>
              </div>
            )}
            {order.energie && (
              <div>
                <p className="text-sm text-muted-foreground">Énergie</p>
                <p className="font-medium">{order.energie}</p>
              </div>
            )}
            {order.puiss_fisc && (
              <div>
                <p className="text-sm text-muted-foreground">Puissance fiscale</p>
                <p className="font-medium">{order.puiss_fisc} CV</p>
              </div>
            )}
            {order.date_mec && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-4 w-4" /> Mise en circulation
                </p>
                <p className="font-medium">{order.date_mec}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Montants */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Euro className="h-5 w-5 text-primary" />
              <CardTitle>Détails du paiement</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Montant HT</span>
              <span className="font-medium">{order.montant_ht.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frais de dossier</span>
              <span className="font-medium">{order.frais_dossier.toFixed(2)} €</span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex justify-between text-lg font-bold">
              <span>Total TTC</span>
              <span>{order.montant_ttc.toFixed(2)} €</span>
            </div>
            <div className="pt-2">
              <Badge variant={order.paye ? "default" : "secondary"}>
                {order.paye ? "Payé" : "Non payé"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle>Documents ({documents.length})</CardTitle>
              </div>
              <Button
                variant={order.documents_complets ? "default" : "outline"}
                size="sm"
                onClick={toggleDocumentsComplets}
              >
                {order.documents_complets ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Documents complets
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Documents incomplets
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Aucun document uploadé</p>
            ) : (
              <div className="grid gap-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{doc.nom_fichier}</p>
                        <p className="text-sm text-muted-foreground">{doc.type_document}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedDoc(doc)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(doc.url, '_blank')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Viewer de document */}
        {selectedDoc && (
          <DocumentViewer
            isOpen={!!selectedDoc}
            onClose={() => setSelectedDoc(null)}
            documentUrl={selectedDoc.url}
            documentName={selectedDoc.nom_fichier}
            documentType={selectedDoc.type_document}
          />
        )}

        {/* Commentaire admin */}
        <Card>
          <CardHeader>
            <CardTitle>Commentaire administrateur</CardTitle>
            <CardDescription>
              Notes internes visibles uniquement par les administrateurs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Ajoutez un commentaire..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Actions de validation */}
        {order.status === "en_attente" && (
          <Card>
            <CardHeader>
              <CardTitle>Actions de validation</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button
                onClick={handleValidate}
                disabled={isValidating}
                className="flex-1"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Valider la commande
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isValidating}
                className="flex-1"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Refuser la commande
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, XCircle, FileText, User, Car, MapPin, Mail, Phone, Calendar, Euro, Download, Eye, AlertCircle, Send, FileCheck, Ban, Loader2 } from "lucide-react";
import { Textarea as TextareaInput } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
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
  requires_resubmission_payment: boolean;
  resubmission_payment_amount: number;
  resubmission_paid: boolean;
  sms_notifications: boolean;
  email_notifications: boolean;
  dossier_prioritaire?: boolean;
  certificat_non_gage?: boolean;
  has_cotitulaire?: boolean;
  cotitulaire_nom?: string | null;
  cotitulaire_prenom?: string | null;
  vehicule_pro?: boolean;
  vehicule_leasing?: boolean;
  is_mineur?: boolean;
  is_heberge?: boolean;
  demarche_type?: string;
}

interface Document {
  id: string;
  type_document: string;
  nom_fichier: string;
  url: string;
  created_at: string;
  validation_status: string;
  validated_at: string | null;
  rejection_reason: string | null;
  side: string | null;
}

// Bulk Reject Dialog Component
function BulkRejectDialog({ 
  onReject, 
  disabled, 
  count 
}: { 
  onReject: (reason: string) => void; 
  disabled: boolean; 
  count: number; 
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const handleReject = () => {
    if (reason.trim()) {
      onReject(reason);
      setOpen(false);
      setReason("");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={disabled}>
          <XCircle className="mr-2 h-4 w-4" />
          Refuser la sélection
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Refuser {count} document(s)</AlertDialogTitle>
          <AlertDialogDescription>
            Indiquez la raison du refus. Un seul email sera envoyé au client avec tous les documents refusés.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea
          placeholder="Raison du refus..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleReject}
            disabled={!reason.trim()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Confirmer le refus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Reject with Payment Dialog Component
function RejectWithPaymentDialog({ 
  onReject, 
  disabled, 
  count,
  amount = 10
}: { 
  onReject: (reason: string) => void; 
  disabled: boolean; 
  count: number;
  amount?: number;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const handleReject = () => {
    if (reason.trim()) {
      onReject(reason);
      setOpen(false);
      setReason("");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="border-orange-500 text-orange-600 hover:bg-orange-50">
          <Ban className="mr-2 h-4 w-4" />
          Refuser + Paiement ({count})
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-orange-600">Refuser et demander paiement</AlertDialogTitle>
          <AlertDialogDescription>
            Le client devra payer <strong>{amount} €</strong> avant de pouvoir renvoyer ses documents. 
            Utilisez cette option uniquement en cas d'abus (documents illisibles répétés, documents non recevables...).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea
          placeholder="Raison du refus (sera communiquée au client)..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleReject}
            disabled={!reason.trim()}
            className="bg-orange-500 text-white hover:bg-orange-600"
          >
            Refuser et exiger {amount} €
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
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
  const [carteGriseUrl, setCarteGriseUrl] = useState("");
  const [isSendingCarteGrise, setIsSendingCarteGrise] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [adminDocFile, setAdminDocFile] = useState<File | null>(null);
  const [adminDocName, setAdminDocName] = useState("");
  const [adminDocDescription, setAdminDocDescription] = useState("");
  const [isSendingAdminDoc, setIsSendingAdminDoc] = useState(false);
  const [sentAdminDocs, setSentAdminDocs] = useState<any[]>([]);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [isSendingNotification, setIsSendingNotification] = useState(false);

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

      // Load documents - exclude carte_grise_finale from list
      const { data: docsData, error: docsError } = await supabase
        .from("guest_order_documents")
        .select("*")
        .eq("order_id", id)
        .neq("type_document", "carte_grise_finale")
        .order("created_at", { ascending: false });

      if (docsError) throw docsError;
      setDocuments(docsData || []);

      // Load admin sent documents
      const { data: adminDocs, error: adminDocsError } = await supabase
        .from("guest_order_admin_documents")
        .select("*")
        .eq("order_id", id)
        .order("created_at", { ascending: false });

      if (!adminDocsError) {
        setSentAdminDocs(adminDocs || []);
      }
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

  const sendNotificationToClient = async () => {
    if (!notificationMessage || !order) return;

    setIsSendingNotification(true);
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          type: 'custom_notification',
          to: order.email,
          data: {
            customerName: `${order.prenom} ${order.nom}`,
            subject: `📬 Information - Commande ${order.tracking_number}`,
            message: notificationMessage
          }
        }
      });

      toast({
        title: "Notification envoyée",
        description: "Le client a été notifié par email"
      });
      setNotificationMessage("");
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la notification",
        variant: "destructive"
      });
    } finally {
      setIsSendingNotification(false);
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

      // Envoyer email de confirmation de commande validée
      try {
        const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            type: 'order_confirmation',
            to: order.email,
            data: {
              tracking_number: order.tracking_number,
              nom: order.nom,
              prenom: order.prenom,
              immatriculation: order.immatriculation,
              montant_ttc: order.montant_ttc,
            }
          }
        });
        
        if (emailError) {
          console.error('Erreur envoi email (error):', emailError);
        } else {
          console.log('Email de validation envoyé avec succès:', emailResult);
        }
      } catch (emailCatchError) {
        console.error('Erreur envoi email (catch):', emailCatchError);
      }

      toast({
        title: "Commande validée",
        description: "La commande a été validée avec succès et le client a été notifié",
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

      // Envoyer email de refus de commande
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'document_rejected',
            to: order.email,
            data: {
              tracking_number: order.tracking_number,
              nom: order.nom,
              prenom: order.prenom,
              rejectedDocuments: [{ nom: 'Commande', raison: commentaire || 'Commande refusée' }]
            }
          }
        });
        console.log('Email de refus envoyé');
      } catch (emailError) {
        console.error('Erreur envoi email:', emailError);
      }

      toast({
        title: "Commande refusée",
        description: "La commande a été refusée et le client a été notifié",
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

  const handleSendCarteGrise = async () => {
    if (!order || !carteGriseUrl.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez uploader la carte grise",
        variant: "destructive",
      });
      return;
    }

    setIsSendingCarteGrise(true);
    try {
      // Save carte grise document in database
      await supabase.from('guest_order_documents').insert({
        order_id: order.id,
        type_document: 'carte_grise_finale',
        nom_fichier: 'carte_grise_finale.pdf',
        url: carteGriseUrl,
        validation_status: 'approved',
      });

      // Send email avec carte grise - Envoi de l'email de dossier terminé
      await supabase.functions.invoke('send-email', {
        body: {
          type: 'completed',
          to: order.email,
          data: {
            tracking_number: order.tracking_number,
            nom: order.nom,
            prenom: order.prenom,
            immatriculation: order.immatriculation,
          }
        }
      });


      // Update order status to finalise
      await supabase
        .from("guest_orders")
        .update({ status: "finalise" })
        .eq("id", order.id);

      toast({
        title: "Démarche terminée",
        description: "Le client a été notifié que sa démarche est terminée",
      });

      await loadOrderData();
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la notification",
        variant: "destructive",
      });
    } finally {
      setIsSendingCarteGrise(false);
    }
  };

  const toggleDocSelection = (docId: string) => {
    setSelectedDocs(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const handleBulkApprove = async () => {
    if (selectedDocs.length === 0) return;

    setIsValidating(true);
    try {
      const { error } = await supabase
        .from("guest_order_documents")
        .update({
          validation_status: "approved",
          validated_at: new Date().toISOString(),
          validated_by: user?.id,
          rejection_reason: null,
        })
        .in("id", selectedDocs);

      if (error) throw error;

      toast({
        title: "Documents validés",
        description: `${selectedDocs.length} document(s) validé(s) avec succès`,
      });

      setSelectedDocs([]);
      await loadOrderData();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de valider les documents",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleBulkReject = async (reason: string) => {
    if (selectedDocs.length === 0 || !reason.trim()) return;

    setIsValidating(true);
    try {
      const { error } = await supabase
        .from("guest_order_documents")
        .update({
          validation_status: "rejected",
          validated_at: new Date().toISOString(),
          validated_by: user?.id,
          rejection_reason: reason,
        })
        .in("id", selectedDocs);

      if (error) throw error;

      // Récupérer les documents refusés pour l'email
      const { data: rejectedDocs } = await supabase
        .from("guest_order_documents")
        .select("type_document")
        .in("id", selectedDocs);

      // Envoyer l'email avec tous les documents refusés
      if (order && rejectedDocs) {
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'document_rejected',
            to: order.email,
            data: {
              tracking_number: order.tracking_number,
              nom: order.nom,
              prenom: order.prenom,
              rejectedDocuments: rejectedDocs.map(d => ({
                nom: d.type_document,
                raison: reason
              }))
            }
          }
        });
      }

      toast({
        title: "Documents refusés",
        description: `${selectedDocs.length} document(s) refusé(s). Le client a été notifié par email.`,
      });

      setSelectedDocs([]);
      await loadOrderData();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de refuser les documents",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleBulkRejectWithPayment = async (reason: string) => {
    if (selectedDocs.length === 0 || !reason.trim() || !order) return;

    setIsValidating(true);
    try {
      // Update documents as rejected
      const { error } = await supabase
        .from("guest_order_documents")
        .update({
          validation_status: "rejected",
          validated_at: new Date().toISOString(),
          validated_by: user?.id,
          rejection_reason: reason,
        })
        .in("id", selectedDocs);

      if (error) throw error;

      // Set resubmission payment requirement on the order
      const { error: orderError } = await supabase
        .from("guest_orders")
        .update({
          requires_resubmission_payment: true,
          resubmission_paid: false,
        })
        .eq("id", order.id);

      if (orderError) throw orderError;

      // Send email notification about payment required
      await supabase.functions.invoke('send-email', {
        body: {
          type: 'resubmission_payment_required',
          to: order.email,
          data: {
            tracking_number: order.tracking_number,
            nom: order.nom,
            prenom: order.prenom,
            amount: order.resubmission_payment_amount || 10,
            reason: reason
          }
        }
      });

      toast({
        title: "Documents refusés avec paiement requis",
        description: `Le client doit payer ${order.resubmission_payment_amount || 10} € pour renvoyer ses documents.`,
      });

      setSelectedDocs([]);
      await loadOrderData();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de traiter la demande",
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
          <div className="flex items-center gap-2">
            {order.demarche_type && order.demarche_type !== 'CG' && (
              <Badge variant="outline" className="text-sm">
                {order.demarche_type === 'DA' ? "Déclaration d'achat" : 
                 order.demarche_type === 'DC' ? "Déclaration de cession" : 
                 "Carte grise"}
              </Badge>
            )}
            {getStatusBadge(order.status)}
          </div>
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

        {/* Options supplémentaires */}
        {(order.dossier_prioritaire || order.certificat_non_gage) && (
          <Card className="border-orange-200 dark:border-orange-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                <CardTitle>Options supplémentaires</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.dossier_prioritaire && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-orange-500">Prioritaire</Badge>
                    <span className="text-sm font-medium">Dossier Prioritaire</span>
                  </div>
                  <span className="text-sm text-orange-600 font-medium">+5,00 €</span>
                </div>
              )}
              {order.certificat_non_gage && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-500">Non-gage</Badge>
                    <span className="text-sm font-medium">Certificat de non-gage</span>
                  </div>
                  <span className="text-sm text-blue-600 font-medium">+10,00 €</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Co-titulaire */}
        {order.has_cotitulaire && (
          <Card className="border-purple-200 dark:border-purple-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-purple-500" />
                <CardTitle>Co-titulaire</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nom complet</p>
                  <p className="font-medium">{order.cotitulaire_prenom} {order.cotitulaire_nom}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Questions conditionnelles */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              <CardTitle>Informations complémentaires</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-sm">Véhicule acheté chez un pro</span>
                <Badge variant={order.vehicule_pro ? "default" : "secondary"}>
                  {order.vehicule_pro ? "Oui" : "Non"}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-sm">Véhicule en leasing/LLD/LOA</span>
                <Badge variant={order.vehicule_leasing ? "default" : "secondary"}>
                  {order.vehicule_leasing ? "Oui" : "Non"}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-sm">Client mineur (-18 ans)</span>
                <Badge variant={order.is_mineur ? "destructive" : "secondary"}>
                  {order.is_mineur ? "Oui" : "Non"}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-sm">Client hébergé</span>
                <Badge variant={order.is_heberge ? "default" : "secondary"}>
                  {order.is_heberge ? "Oui" : "Non"}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-sm">Co-titulaire</span>
                <Badge variant={order.has_cotitulaire ? "default" : "secondary"}>
                  {order.has_cotitulaire ? "Oui" : "Non"}
                </Badge>
              </div>
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
          <CardContent className="space-y-3">
            {/* Carte Grise (exonérée TVA) */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Carte grise (exonérée TVA)</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taxe régionale</span>
                <span className="font-medium">{order.montant_ht.toFixed(2)} €</span>
              </div>
            </div>
            
            {/* Services (soumis à TVA) */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Services (HT)</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frais de dossier</span>
                <span className="font-medium">{order.frais_dossier.toFixed(2)} €</span>
              </div>
              {order.sms_notifications && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Suivi par SMS</span>
                  <span className="font-medium">5.00 €</span>
                </div>
              )}
              {order.email_notifications && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Suivi par email</span>
                  <span>Gratuit</span>
                </div>
              )}
            </div>
            
            <div className="h-px bg-border" />
            
            {/* Totaux */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Carte grise (exonérée)</span>
                <span>{order.montant_ht.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total HT (services)</span>
                <span>{(order.frais_dossier + (order.sms_notifications ? 5 : 0)).toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>TVA (20%)</span>
                <span>{((order.frais_dossier + (order.sms_notifications ? 5 : 0)) * 0.20).toFixed(2)} €</span>
              </div>
            </div>
            
            <div className="h-px bg-border" />
            <div className="flex justify-between text-lg font-bold">
              <span>Total TTC</span>
              <span>{order.montant_ttc.toFixed(2)} €</span>
            </div>
            
            <div className="pt-2 flex gap-2 flex-wrap">
              <Badge variant={order.paye ? "default" : "secondary"}>
                {order.paye ? "Payé" : "Non payé"}
              </Badge>
              {order.sms_notifications && (
                <Badge className="bg-primary">SMS activé</Badge>
              )}
              {order.email_notifications && (
                <Badge variant="secondary">Email activé</Badge>
              )}
              {order.requires_resubmission_payment && (
                <Badge variant={order.resubmission_paid ? "default" : "outline"} className={order.resubmission_paid ? "bg-green-500" : "border-orange-500 text-orange-600"}>
                  {order.resubmission_paid ? "Renvoi payé" : `Renvoi requis: ${order.resubmission_payment_amount || 10}€`}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle>Documents ({documents.length})</CardTitle>
                {selectedDocs.length > 0 && (
                  <Badge variant="secondary">{selectedDocs.length} sélectionné(s)</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedDocs.length > 0 && (
                  <>
                    <BulkRejectDialog 
                      onReject={handleBulkReject}
                      disabled={isValidating}
                      count={selectedDocs.length}
                    />
                    <RejectWithPaymentDialog
                      onReject={handleBulkRejectWithPayment}
                      disabled={isValidating}
                      count={selectedDocs.length}
                      amount={order.resubmission_payment_amount || 10}
                    />
                    <Button
                      onClick={handleBulkApprove}
                      disabled={isValidating}
                      size="sm"
                      variant="default"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Valider la sélection
                    </Button>
                  </>
                )}
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
            </div>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Aucun document uploadé</p>
            ) : (
              <div className="grid gap-3">
                {documents.map((doc) => (
                  <DocumentValidationCard 
                    key={doc.id} 
                    doc={doc} 
                    order={order}
                    onValidationChange={loadOrderData}
                    onView={() => setSelectedDoc(doc)}
                    isSelected={selectedDocs.includes(doc.id)}
                    onToggleSelect={() => toggleDocSelection(doc.id)}
                  />
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

        {/* Envoyer une notification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Envoyer une notification
            </CardTitle>
            <CardDescription>
              Envoyer un email personnalisé au client
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={notificationMessage}
              onChange={(e) => setNotificationMessage(e.target.value)}
              placeholder="Écrivez votre message..."
              rows={4}
            />
            <Button 
              onClick={sendNotificationToClient} 
              className="w-full" 
              disabled={!notificationMessage || isSendingNotification}
            >
              {isSendingNotification ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Envoyer
                </>
              )}
            </Button>
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

        {/* Envoi carte grise */}
        {(order.status === "valide" || order.status === "finalise") && (
          <Card>
            <CardHeader>
              <CardTitle>Finaliser la démarche</CardTitle>
              <CardDescription>
                Uploadez la carte grise finale et notifiez le client que sa démarche est terminée
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="carte-grise-file">Carte grise finale (PDF)</Label>
                <Input
                  id="carte-grise-file"
                  type="file"
                  accept=".pdf"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !order) return;

                    try {
                      // Upload to storage
                      const fileName = `${order.id}/carte_grise_finale_${Date.now()}.pdf`;
                      const { error: uploadError } = await supabase.storage
                        .from('guest-order-documents')
                        .upload(fileName, file);

                      if (uploadError) throw uploadError;

                      const { data: { publicUrl } } = supabase.storage
                        .from('guest-order-documents')
                        .getPublicUrl(fileName);

                      setCarteGriseUrl(publicUrl);

                      toast({
                        title: "Fichier uploadé",
                        description: "Le fichier est prêt à être envoyé",
                      });
                    } catch (error) {
                      console.error("Error:", error);
                      toast({
                        title: "Erreur",
                        description: "Impossible d'uploader le fichier",
                        variant: "destructive",
                      });
                    }
                  }}
                />
                {carteGriseUrl && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <FileCheck className="h-4 w-4" />
                    Fichier prêt à envoyer
                  </p>
                )}
              </div>
              <Button
                onClick={handleSendCarteGrise}
                disabled={isSendingCarteGrise || !carteGriseUrl.trim()}
                className="w-full"
              >
                {isSendingCarteGrise ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background mr-2" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Finaliser et notifier le client
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Envoyer un document au client */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Envoyer un document au client
            </CardTitle>
            <CardDescription>
              Uploadez un document qui sera envoyé par email et visible sur le suivi du client
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-doc-name">Nom du document *</Label>
              <Input
                id="admin-doc-name"
                placeholder="Ex: Certificat de non-gage, Attestation..."
                value={adminDocName}
                onChange={(e) => setAdminDocName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-doc-description">Description (optionnel)</Label>
              <Input
                id="admin-doc-description"
                placeholder="Description du document..."
                value={adminDocDescription}
                onChange={(e) => setAdminDocDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-doc-file">Fichier (PDF) *</Label>
              <Input
                id="admin-doc-file"
                type="file"
                accept=".pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setAdminDocFile(file);
                    if (!adminDocName) {
                      setAdminDocName(file.name.replace('.pdf', ''));
                    }
                  }
                }}
              />
              {adminDocFile && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <FileCheck className="h-4 w-4" />
                  {adminDocFile.name}
                </p>
              )}
            </div>
            <Button
              onClick={async () => {
                if (!adminDocFile || !adminDocName.trim() || !order) return;
                
                setIsSendingAdminDoc(true);
                try {
                  // Upload file
                  const fileName = `${order.id}/admin_${Date.now()}_${adminDocFile.name}`;
                  const { error: uploadError } = await supabase.storage
                    .from('guest-order-documents')
                    .upload(fileName, adminDocFile);

                  if (uploadError) throw uploadError;

                  const { data: { publicUrl } } = supabase.storage
                    .from('guest-order-documents')
                    .getPublicUrl(fileName);

                  // Save to database
                  const { error: dbError } = await supabase
                    .from('guest_order_admin_documents')
                    .insert({
                      order_id: order.id,
                      nom_fichier: adminDocName,
                      url: publicUrl,
                      description: adminDocDescription || null,
                      taille_octets: adminDocFile.size,
                      sent_by: user?.id,
                      email_sent: true,
                      email_sent_at: new Date().toISOString()
                    });

                  if (dbError) throw dbError;

                  // Send email
                  await supabase.functions.invoke('send-email', {
                    body: {
                      type: 'admin_document',
                      to: order.email,
                      data: {
                        tracking_number: order.tracking_number,
                        nom: order.nom,
                        prenom: order.prenom,
                        document_name: adminDocName,
                        description: adminDocDescription
                      }
                    }
                  });

                  toast({
                    title: "Document envoyé",
                    description: "Le document a été envoyé au client par email",
                  });

                  // Reset form
                  setAdminDocFile(null);
                  setAdminDocName("");
                  setAdminDocDescription("");
                  
                  // Reload admin docs
                  await loadOrderData();
                } catch (error) {
                  console.error("Error:", error);
                  toast({
                    title: "Erreur",
                    description: "Impossible d'envoyer le document",
                    variant: "destructive",
                  });
                } finally {
                  setIsSendingAdminDoc(false);
                }
              }}
              disabled={isSendingAdminDoc || !adminDocFile || !adminDocName.trim()}
              className="w-full"
            >
              {isSendingAdminDoc ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background mr-2" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Envoyer au client
                </>
              )}
            </Button>

            {/* List of sent admin documents */}
            {sentAdminDocs.length > 0 && (
              <div className="mt-6 space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Documents déjà envoyés:</p>
                {sentAdminDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{doc.nom_fichier}</p>
                      {doc.description && (
                        <p className="text-xs text-muted-foreground">{doc.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Envoyé le {new Date(doc.created_at).toLocaleDateString('fr-FR', { 
                          day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                        })}
                      </p>
                    </div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Document Validation Card Component
function DocumentValidationCard({ 
  doc, 
  order, 
  onValidationChange,
  onView,
  isSelected,
  onToggleSelect
}: { 
  doc: Document; 
  order: GuestOrder;
  onValidationChange: () => void;
  onView: () => void;
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("guest_order_documents")
        .update({
          validation_status: "approved",
          validated_at: new Date().toISOString(),
          validated_by: user?.id,
          rejection_reason: null,
        })
        .eq("id", doc.id);

      if (error) throw error;

      // Check if all documents (excluding carte_grise_finale) are approved
      const { data: allDocs } = await supabase
        .from("guest_order_documents")
        .select("validation_status")
        .eq("order_id", order.id)
        .neq("type_document", "carte_grise_finale");

      const allApproved = allDocs?.every(d => d.validation_status === 'approved');

      // If all documents approved, update order status to processing
      if (allApproved) {
        await supabase
          .from("guest_orders")
          .update({ status: "en_traitement" })
          .eq("id", order.id);
      }

      toast({
        title: "Document validé",
        description: "Document approuvé avec succès",
      });

      onValidationChange();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de valider le document",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Raison requise",
        description: "Veuillez indiquer la raison du rejet",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("guest_order_documents")
        .update({
          validation_status: "rejected",
          validated_at: new Date().toISOString(),
          validated_by: user?.id,
          rejection_reason: rejectionReason,
        })
        .eq("id", doc.id);

      if (error) throw error;

      // Send email notification de documents refusés
      await supabase.functions.invoke('send-email', {
        body: {
          type: 'document_rejected',
          to: order.email,
          data: {
            tracking_number: order.tracking_number,
            nom: order.nom,
            prenom: order.prenom,
            rejectedDocuments: [{
              nom: doc.type_document,
              raison: rejectionReason
            }]
          }
        }
      });

      toast({
        title: "Document refusé",
        description: "Le client a été notifié par email",
      });

      setShowRejectDialog(false);
      setRejectionReason("");
      onValidationChange();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de refuser le document",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = () => {
    if (doc.validation_status === 'approved') {
      return <Badge className="bg-green-500">Validé</Badge>;
    } else if (doc.validation_status === 'rejected') {
      return <Badge variant="destructive">Refusé</Badge>;
    }
    return <Badge variant="secondary">En attente</Badge>;
  };

  return (
    <div>
      <div className="p-3 border rounded-lg space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <Checkbox 
              checked={isSelected}
              onCheckedChange={onToggleSelect}
            />
            <FileText className="h-5 w-5 text-muted-foreground mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">{doc.nom_fichier}</p>
                {getStatusBadge()}
              </div>
              <p className="text-sm text-muted-foreground">
                {doc.type_document} {doc.side && `(${doc.side})`}
              </p>
              {doc.rejection_reason && (
                <div className="mt-2 flex items-start gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{doc.rejection_reason}</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onView}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {doc.validation_status === 'pending' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleApprove}
                  disabled={isProcessing}
                >
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRejectDialog(true)}
                  disabled={isProcessing}
                >
                  <XCircle className="h-4 w-4 text-destructive" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refuser le document</AlertDialogTitle>
            <AlertDialogDescription>
              Indiquez la raison du refus. Le client recevra un email l'informant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Raison du refus..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReject}
              disabled={!rejectionReason.trim() || isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmer le refus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

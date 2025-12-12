import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, Send, CheckCircle, XCircle, Clock, Eye, Plus, Mail, Phone, Zap, FileCheck as FileCheckIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DocumentUpload } from "@/components/DocumentUpload";
import { DocumentViewer } from "@/components/DocumentViewer";
import { Badge } from "@/components/ui/badge";
import { FactureButton } from "@/components/FactureButton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
            Indiquez la raison du refus. Le garage sera notifié.
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

// Reject with Payment Dialog Component for garage abuse prevention
function RejectWithPaymentDialog({ 
  onReject, 
  disabled,
  amount = 10
}: { 
  onReject: (reason: string) => void; 
  disabled: boolean;
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
        <Button variant="outline" size="sm" disabled={disabled} className="border-warning text-warning hover:bg-warning/10">
          <XCircle className="mr-2 h-4 w-4" />
          Refuser + Paiement ({amount}€)
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Refuser et demander un paiement</AlertDialogTitle>
          <AlertDialogDescription>
            Le garage devra payer {amount}€ avant de pouvoir renvoyer des documents. Utilisez cette option pour les documents abusifs ou illisibles répétés.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea
          placeholder="Raison du refus (ex: Document illisible, non-conforme...)..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleReject}
            disabled={!reason.trim()}
            className="bg-warning text-warning-foreground hover:bg-warning/90"
          >
            Refuser et demander {amount}€
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function DemarcheDetail() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [demarche, setDemarche] = useState<any>(null);
  const [garage, setGarage] = useState<any>(null);
  const [vehicule, setVehicule] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [paiement, setPaiement] = useState<any>(null);
  const [trackingServices, setTrackingServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [documentLabels, setDocumentLabels] = useState<Record<string, string>>({});
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState("info");
  const [invalidDocDialog, setInvalidDocDialog] = useState<{
    open: boolean;
    docId: string | null;
    comment: string;
  }>({ open: false, docId: null, comment: "" });
  const [viewerState, setViewerState] = useState<{
    isOpen: boolean;
    url: string;
    name: string;
    type: string;
  }>({ isOpen: false, url: "", name: "", type: "" });
  const [adminUploadRows, setAdminUploadRows] = useState<number>(1);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && id) {
      checkAdminAndLoadData();
    }
  }, [user, id]);

  const checkAdminAndLoadData = async () => {
    if (!user) return;

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const hasAdminRole = roles?.some(r => r.role === 'admin');

    if (!hasAdminRole) {
      navigate("/dashboard");
      return;
    }

    setIsAdmin(true);
    await loadDemarcheData();
  };

  const loadDemarcheData = async () => {
    if (!id) return;

    const { data: demarcheData } = await supabase
      .from('demarches')
      .select('*')
      .eq('id', id)
      .single();

    if (demarcheData) {
      setDemarche(demarcheData);

      const { data: garageData } = await supabase
        .from('garages')
        .select('*')
        .eq('id', demarcheData.garage_id)
        .single();

      setGarage(garageData || null);

      // Load vehicule data
      if (demarcheData.vehicule_id) {
        const { data: vehiculeData } = await supabase
          .from('vehicules')
          .select('*')
          .eq('id', demarcheData.vehicule_id)
          .single();

        if (vehiculeData) {
          setVehicule(vehiculeData);
        }
      }

      const { data: documentsData } = await supabase
        .from('documents')
        .select('*')
        .eq('demarche_id', id)
        .order('created_at', { ascending: false });

      if (documentsData) {
        setDocuments(documentsData);
      }

      const { data: paiementData } = await supabase
        .from('paiements')
        .select('*')
        .eq('demarche_id', id)
        .single();

      if (paiementData) {
        setPaiement(paiementData);
      }

      // Load tracking services
      const { data: trackingData } = await supabase
        .from('tracking_services')
        .select('*')
        .eq('demarche_id', id);

      setTrackingServices(trackingData || []);

      // Load document labels from action_documents
      const { data: actionData } = await supabase
        .from('actions_rapides')
        .select('id')
        .eq('code', demarcheData.type)
        .single();

      if (actionData) {
        const { data: actionDocs } = await supabase
          .from('action_documents')
          .select('*')
          .eq('action_id', actionData.id)
          .order('ordre');

        if (actionDocs) {
          const labels: Record<string, string> = {};
          actionDocs.forEach((doc, idx) => {
            labels[`doc_${idx + 1}`] = doc.nom_document;
          });
          setDocumentLabels(labels);
        }
      }
    }

    setLoading(false);
  };

  // Realtime: auto-refresh when documents or demarche update
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`admin-demarche-detail-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'documents', filter: `demarche_id=eq.${id}` },
        () => loadDemarcheData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'demarches', filter: `id=eq.${id}` },
        () => loadDemarcheData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const updateStatus = async (newStatus: any) => {
    if (!id) return;

    const { error } = await supabase
      .from('demarches')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Statut mis à jour",
        description: "Le statut de la démarche a été modifié"
      });
      
      // Si le statut est "finalisé", marquer admin_viewed comme true pour enlever de "à traiter"
      if (newStatus === 'finalise') {
        await supabase
          .from('demarches')
          .update({ admin_viewed: true })
          .eq('id', id);
      }
      
      loadDemarcheData();
    }
  };

  const validateDocument = async (docId: string, status: 'valid' | 'invalid', comment?: string) => {
    const { error } = await supabase
      .from('documents')
      .update({
        validation_status: status === 'valid' ? 'validated' : 'rejected',
        validation_comment: comment || null,
        validated_at: new Date().toISOString(),
        validated_by: user?.id
      })
      .eq('id', docId);

    if (error) {
      console.error('Document validation error', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de valider le document",
        variant: "destructive"
      });
    } else {
      toast({
        title: status === 'valid' ? "Document validé" : "Document refusé",
        description: status === 'valid' 
          ? "Le document a été marqué comme valide" 
          : "Le garage sera notifié du problème"
      });

      // If invalid, send notification to garage
      if (status === 'invalid' && garage && comment) {
        await supabase
          .from('notifications')
          .insert({
            garage_id: garage.id,
            demarche_id: id,
            type: 'document_invalid',
            message: `Un document a été refusé pour la démarche ${demarche.immatriculation}. Raison: ${comment}`,
            created_by: user?.id
          });

        // Récupérer le type du document refusé
        const { data: docData } = await supabase
          .from('documents')
          .select('type_document')
          .eq('id', docId)
          .single();

        // Envoyer email au garage
        try {
          await supabase.functions.invoke('send-email', {
            body: {
              type: 'document_rejected',
              to: garage.email,
              data: {
                tracking_number: demarche.numero_demarche || demarche.id,
                nom: garage.raison_sociale,
                prenom: '',
                rejectedDocuments: [{
                  nom: docData?.type_document || 'Document',
                  raison: comment
                }]
              }
            }
          });
          console.log('Email de refus envoyé au garage');
        } catch (emailError) {
          console.error('Erreur envoi email:', emailError);
        }
      }

      // Reload data to reflect changes
      await loadDemarcheData();
    }
  };

  const handleInvalidateDocument = (docId: string) => {
    setInvalidDocDialog({ open: true, docId, comment: "" });
  };

  const confirmInvalidateDocument = async () => {
    if (!invalidDocDialog.docId || !invalidDocDialog.comment) {
      toast({
        title: "Erreur",
        description: "Veuillez indiquer la raison du refus",
        variant: "destructive"
      });
      return;
    }

    await validateDocument(invalidDocDialog.docId, 'invalid', invalidDocDialog.comment);
    setInvalidDocDialog({ open: false, docId: null, comment: "" });
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

    try {
      for (const docId of selectedDocs) {
        await supabase
          .from("documents")
          .update({
            validation_status: "validated",
            validated_at: new Date().toISOString(),
            validated_by: user?.id,
            validation_comment: null,
          })
          .eq("id", docId);
      }

      toast({
        title: "Documents validés",
        description: `${selectedDocs.length} document(s) validé(s) avec succès`,
      });

      setSelectedDocs([]);
      await loadDemarcheData();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de valider les documents",
        variant: "destructive",
      });
    }
  };

// Handle reject with payment (abuse prevention)
  const handleRejectWithPayment = async (docId: string, reason: string) => {
    if (!docId || !reason.trim()) return;

    try {
      // Update document status
      await supabase
        .from("documents")
        .update({
          validation_status: "rejected",
          validated_at: new Date().toISOString(),
          validated_by: user?.id,
          validation_comment: reason,
        })
        .eq("id", docId);

      // Update demarche to require resubmission payment
      await supabase
        .from("demarches")
        .update({
          requires_resubmission_payment: true,
          resubmission_paid: false,
        })
        .eq("id", id);

      // Create notification
      if (garage) {
        await supabase
          .from('notifications')
          .insert({
            garage_id: garage.id,
            demarche_id: id,
            type: 'resubmission_payment_required',
            message: `Un paiement de ${demarche.resubmission_payment_amount || 10}€ est requis pour renvoyer des documents. Raison: ${reason}`,
            created_by: user?.id
          });

        // Send email to garage
        try {
          await supabase.functions.invoke('send-email', {
            body: {
              type: 'demarche_resubmission_payment_required',
              to: garage.email,
              data: {
                tracking_number: demarche.numero_demarche || demarche.id,
                nom: garage.raison_sociale,
                prenom: '',
                amount: demarche.resubmission_payment_amount || 10,
                reason: reason,
                immatriculation: demarche.immatriculation
              }
            }
          });
          console.log('Email de demande de paiement envoyé au garage');
        } catch (emailError) {
          console.error('Erreur envoi email:', emailError);
        }
      }

      toast({
        title: "Document refusé avec paiement requis",
        description: `Le garage devra payer ${demarche.resubmission_payment_amount || 10}€ avant de pouvoir renvoyer des documents`,
      });

      await loadDemarcheData();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de traiter le refus",
        variant: "destructive",
      });
    }
  };

  const handleBulkReject = async (reason: string) => {
    if (selectedDocs.length === 0 || !reason.trim()) return;

    try {
      // Récupérer les noms des documents refusés
      const { data: rejectedDocs } = await supabase
        .from("documents")
        .select("type_document")
        .in("id", selectedDocs);

      // Mettre à jour les documents
      for (const docId of selectedDocs) {
        await supabase
          .from("documents")
          .update({
            validation_status: "rejected",
            validated_at: new Date().toISOString(),
            validated_by: user?.id,
            validation_comment: reason,
          })
          .eq("id", docId);
      }

      // Créer une notification groupée
      if (garage && rejectedDocs) {
        await supabase
          .from('notifications')
          .insert({
            garage_id: garage.id,
            demarche_id: id,
            type: 'document_invalid',
            message: `${selectedDocs.length} document(s) refusé(s) pour la démarche ${demarche.immatriculation}. Raison: ${reason}`,
            created_by: user?.id
          });

        // Envoyer email au garage
        try {
          await supabase.functions.invoke('send-email', {
            body: {
              type: 'document_rejected',
              to: garage.email,
              data: {
                tracking_number: demarche.numero_demarche || demarche.id,
                nom: garage.raison_sociale,
                prenom: '',
                rejectedDocuments: rejectedDocs.map(d => ({
                  nom: d.type_document,
                  raison: reason
                }))
              }
            }
          });
          console.log('Email de refus envoyé au garage');
        } catch (emailError) {
          console.error('Erreur envoi email:', emailError);
        }
      }

      toast({
        title: "Documents refusés",
        description: `${selectedDocs.length} document(s) refusé(s). Le garage a été notifié par email.`,
      });

      setSelectedDocs([]);
      await loadDemarcheData();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de refuser les documents",
        variant: "destructive",
      });
    }
  };

  const sendNotification = async () => {
    if (!notificationMessage || !garage || !id) return;

    try {
      // Insert notification in database
      const { error } = await supabase
        .from('notifications')
        .insert({
          garage_id: garage.id,
          demarche_id: id,
          type: notificationType,
          message: notificationMessage,
          created_by: user?.id
        });

      if (error) throw error;

      // Get subject based on notification type
      const subjectMap: Record<string, string> = {
        'info': `📬 Information - Démarche ${demarche?.numero_demarche || id}`,
        'document_request': `📄 Documents requis - ${demarche?.immatriculation || 'Démarche'}`,
        'document_ready': `✅ Documents disponibles - ${demarche?.immatriculation || 'Démarche'}`,
        'review_request': `📝 Action requise - ${demarche?.immatriculation || 'Démarche'}`
      };

      // Send email notification
      await supabase.functions.invoke('send-email', {
        body: {
          type: 'custom_notification',
          to: garage.email,
          data: {
            customerName: garage.raison_sociale,
            subject: subjectMap[notificationType] || subjectMap['info'],
            message: notificationMessage
          }
        }
      });

      toast({
        title: "Notification envoyée",
        description: "Le garage a été notifié par email"
      });
      setNotificationMessage("");
    } catch (err) {
      console.error('Error sending notification:', err);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la notification",
        variant: "destructive"
      });
    }
  };

  const getValidationBadge = (status: string) => {
    switch (status) {
      case 'valid':
      case 'validated':
        return <Badge className="bg-success text-success-foreground"><CheckCircle className="h-3 w-3 mr-1" /> Validé</Badge>;
      case 'invalid':
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Refusé</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> En attente</Badge>;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin || !demarche) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-accent/5 to-background">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Vehicule Info */}
            {vehicule && (
              <Card>
                <CardHeader>
                  <CardTitle>Informations du véhicule</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Immatriculation</p>
                      <p className="font-medium">{vehicule.immatriculation}</p>
                    </div>
                    {vehicule.marque && (
                      <div>
                        <p className="text-sm text-muted-foreground">Marque</p>
                        <p className="font-medium">{vehicule.marque}</p>
                      </div>
                    )}
                    {vehicule.modele && (
                      <div>
                        <p className="text-sm text-muted-foreground">Modèle</p>
                        <p className="font-medium">{vehicule.modele}</p>
                      </div>
                    )}
                    {vehicule.version && (
                      <div>
                        <p className="text-sm text-muted-foreground">Version</p>
                        <p className="font-medium">{vehicule.version}</p>
                      </div>
                    )}
                    {vehicule.couleur && (
                      <div>
                        <p className="text-sm text-muted-foreground">Couleur</p>
                        <p className="font-medium">{vehicule.couleur}</p>
                      </div>
                    )}
                    {vehicule.vin && (
                      <div>
                        <p className="text-sm text-muted-foreground">VIN</p>
                        <p className="font-medium">{vehicule.vin}</p>
                      </div>
                    )}
                    {vehicule.numero_formule && (
                      <div>
                        <p className="text-sm text-muted-foreground">N° de formule</p>
                        <p className="font-medium">{vehicule.numero_formule}</p>
                      </div>
                    )}
                    {vehicule.carrosserie && (
                      <div>
                        <p className="text-sm text-muted-foreground">Carrosserie</p>
                        <p className="font-medium">{vehicule.carrosserie}</p>
                      </div>
                    )}
                    {vehicule.genre && (
                      <div>
                        <p className="text-sm text-muted-foreground">Genre</p>
                        <p className="font-medium">{vehicule.genre}</p>
                      </div>
                    )}
                    {vehicule.type && (
                      <div>
                        <p className="text-sm text-muted-foreground">Type</p>
                        <p className="font-medium">{vehicule.type}</p>
                      </div>
                    )}
                    {vehicule.energie && (
                      <div>
                        <p className="text-sm text-muted-foreground">Énergie</p>
                        <p className="font-medium">{vehicule.energie}</p>
                      </div>
                    )}
                    {vehicule.puiss_fisc && (
                      <div>
                        <p className="text-sm text-muted-foreground">Puissance fiscale</p>
                        <p className="font-medium">{vehicule.puiss_fisc} CV</p>
                      </div>
                    )}
                    {vehicule.puiss_ch && (
                      <div>
                        <p className="text-sm text-muted-foreground">Puissance DIN</p>
                        <p className="font-medium">{vehicule.puiss_ch} ch</p>
                      </div>
                    )}
                    {vehicule.cylindree && (
                      <div>
                        <p className="text-sm text-muted-foreground">Cylindrée</p>
                        <p className="font-medium">{vehicule.cylindree} cm³</p>
                      </div>
                    )}
                    {vehicule.co2 && (
                      <div>
                        <p className="text-sm text-muted-foreground">CO2</p>
                        <p className="font-medium">{vehicule.co2} g/km</p>
                      </div>
                    )}
                    {vehicule.ptr && (
                      <div>
                        <p className="text-sm text-muted-foreground">PTAC</p>
                        <p className="font-medium">{vehicule.ptr} kg</p>
                      </div>
                    )}
                    {vehicule.date_mec && (
                      <div>
                        <p className="text-sm text-muted-foreground">Date de MEC</p>
                        <p className="font-medium">{new Date(vehicule.date_mec).toLocaleDateString('fr-FR')}</p>
                      </div>
                    )}
                    {vehicule.date_cg && (
                      <div>
                        <p className="text-sm text-muted-foreground">Date CG</p>
                        <p className="font-medium">{new Date(vehicule.date_cg).toLocaleDateString('fr-FR')}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Demarche Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <span>Démarche</span>
                      <span className="font-mono text-sm font-semibold text-primary px-2 py-1 bg-primary/10 rounded">
                        {demarche.numero_demarche}
                      </span>
                    </CardTitle>
                    <CardDescription>
                      Créée le {new Date(demarche.created_at).toLocaleDateString('fr-FR')} • {demarche.immatriculation}
                    </CardDescription>
                  </div>
                  <FactureButton 
                    demarcheId={demarche.id}
                    existingFactureId={demarche.facture_id}
                    onFactureGenerated={loadDemarcheData}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type</Label>
                    <p className="text-sm font-medium mt-1">{demarche.type}</p>
                  </div>
                  <div>
                    <Label>Statut actuel</Label>
                    <p className="text-sm font-medium mt-1">{demarche.status}</p>
                  </div>
                  <div>
                    <Label>Paiement</Label>
                    <p className="text-sm font-medium mt-1">
                      {demarche.is_free_token 
                        ? "🎁 Jeton gratuit" 
                        : demarche.paid_with_tokens
                          ? "💳 Payé avec solde"
                          : demarche.paye 
                            ? "✅ Payé" 
                            : "❌ Non payé"}
                    </p>
                  </div>
                </div>

                {/* Détails des prix */}
                <div className="border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-medium text-sm mb-3">Détails des prix</h4>
                  <div className="space-y-2 text-sm">
                    {demarche.prix_carte_grise && demarche.prix_carte_grise > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Taxe régionale (carte grise)</span>
                        <span className="font-medium">{demarche.prix_carte_grise.toFixed(2)} €</span>
                      </div>
                    )}
                    {demarche.frais_dossier && demarche.frais_dossier > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Frais de dossier HT</span>
                        <span className="font-medium">{demarche.frais_dossier.toFixed(2)} €</span>
                      </div>
                    )}
                    {trackingServices.length > 0 && (
                      <>
                        {trackingServices.map((service) => (
                          <div key={service.id} className="flex justify-between">
                            <span className="text-muted-foreground">
                              {service.service_type === 'dossier_prioritaire' && 'Dossier prioritaire'}
                              {service.service_type === 'certificat_non_gage' && 'Certificat de non-gage'}
                              {service.service_type === 'suivi_email' && 'Suivi par email'}
                              {service.service_type === 'suivi_sms' && 'Suivi par SMS'}
                              {service.service_type === 'suivi_complet' && 'Suivi complet'}
                            </span>
                            <span className="font-medium">{service.price.toFixed(2)} € HT</span>
                          </div>
                        ))}
                      </>
                    )}
                    <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                      <span>Total TTC</span>
                      <span className="text-primary">{demarche.montant_ttc?.toFixed(2) || '0.00'} €</span>
                    </div>
                  </div>
                </div>

                {/* Resubmission payment status */}
                {demarche.requires_resubmission_payment && (
                  <div className={`p-3 rounded-md ${demarche.resubmission_paid ? 'bg-success/10 border border-success/20' : 'bg-warning/10 border border-warning/20'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {demarche.resubmission_paid 
                            ? "✅ Paiement de renvoi effectué" 
                            : `⚠️ Paiement de renvoi requis (${demarche.resubmission_payment_amount || 10}€)`
                          }
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {demarche.resubmission_paid 
                            ? "Le garage peut maintenant renvoyer des documents"
                            : "Le garage doit payer avant de pouvoir renvoyer des documents"
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {demarche.commentaire && (
                  <div>
                    <Label>Commentaire</Label>
                    <p className="text-sm mt-1">{demarche.commentaire}</p>
                  </div>
                )}

                <div>
                  <Label>Changer le statut</Label>
                  <Select onValueChange={(value: any) => updateStatus(value)} defaultValue={demarche.status}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en_saisie">En saisie</SelectItem>
                      <SelectItem value="en_attente">En attente</SelectItem>
                      <SelectItem value="paye">Payé</SelectItem>
                      <SelectItem value="valide">Validé</SelectItem>
                      <SelectItem value="finalise">Finalisé</SelectItem>
                      <SelectItem value="refuse">Refusé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Documents */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle>Documents</CardTitle>
                    <CardDescription>
                      {documents.length} document(s)
                      {selectedDocs.length > 0 && ` • ${selectedDocs.length} sélectionné(s)`}
                    </CardDescription>
                  </div>
                  {selectedDocs.length > 0 && (
                    <div className="flex gap-2">
                      <BulkRejectDialog 
                        onReject={handleBulkReject}
                        disabled={false}
                        count={selectedDocs.length}
                      />
                      <Button
                        onClick={handleBulkApprove}
                        size="sm"
                        variant="default"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Valider la sélection
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun document téléchargé</p>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div key={doc.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <Checkbox 
                              checked={selectedDocs.includes(doc.id)}
                              onCheckedChange={() => toggleDocSelection(doc.id)}
                            />
                            <div className="flex-1">
                              {/* Afficher le nom personnalisé pour les pièces supplémentaires ou le label standard */}
                              {(doc.type_document?.startsWith('autre_piece') && doc.document_type) ? (
                                <p className="text-xs font-semibold text-primary uppercase mb-2">
                                  {doc.document_type}
                                </p>
                              ) : documentLabels[doc.type_document] && (
                                <p className="text-xs font-semibold text-primary uppercase mb-2">
                                  {documentLabels[doc.type_document]}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-medium">{doc.nom_fichier}</p>
                                {getValidationBadge(doc.validation_status || 'pending')}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {(doc.taille_octets / 1024).toFixed(2)} KB
                              </p>
                              {doc.validation_comment && (
                                <p className="text-xs text-destructive mt-2 p-2 bg-destructive/10 rounded">
                                  Motif du refus: {doc.validation_comment}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => setViewerState({
                              isOpen: true,
                              url: doc.url,
                              name: doc.nom_fichier,
                              type: doc.type_document
                            })}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Voir
                          </Button>
                        </div>
                        
                        {doc.validation_status !== 'valid' && doc.validation_status !== 'validated' && doc.validation_status !== 'invalid' && doc.validation_status !== 'rejected' && (
                          <div className="flex gap-2 flex-wrap">
                            <Button 
                              size="sm" 
                              className="flex-1 bg-success hover:bg-success/90"
                              onClick={() => validateDocument(doc.id, 'valid')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Valider
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              className="flex-1"
                              onClick={() => handleInvalidateDocument(doc.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Refuser
                            </Button>
                            <RejectWithPaymentDialog
                              onReject={(reason) => handleRejectWithPayment(doc.id, reason)}
                              disabled={false}
                              amount={demarche.resubmission_payment_amount || 10}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold">Envoyer un document au client</h4>
                    <Button variant="secondary" size="sm" onClick={() => setAdminUploadRows((n) => n + 1)}>
                      <Plus className="h-4 w-4 mr-1" /> Ajouter une pièce jointe
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {Array.from({ length: adminUploadRows }).map((_, idx) => (
                      <DocumentUpload
                        key={`admin-upload-${idx}`}
                        demarcheId={demarche.id}
                        documentType="admin_document"
                        label={`Pièce jointe ${idx + 1}`}
                        onUploadComplete={async (uploadedFileName?: string) => {
                          // Mettre le statut à "finalisé" et marquer comme vu automatiquement
                          await supabase
                            .from('demarches')
                            .update({ 
                              status: 'finalise',
                              admin_viewed: true 
                            })
                            .eq('id', demarche.id);
                          
                          // Envoyer les emails au garage
                          if (garage) {
                            try {
                              // Email pour le document reçu
                              await supabase.functions.invoke('send-email', {
                                body: {
                                  type: 'garage_document_received',
                                  to: garage.email,
                                  data: {
                                    garage_name: garage.raison_sociale,
                                    reference: demarche.numero_demarche || demarche.id,
                                    immatriculation: demarche.immatriculation,
                                    document_name: uploadedFileName || `Pièce jointe ${idx + 1}`,
                                    demarche_id: demarche.id
                                  }
                                }
                              });
                              console.log('Email document reçu envoyé au garage');

                              // Email pour la démarche finalisée (avec délai pour éviter rate limiting)
                              setTimeout(async () => {
                                try {
                                  await supabase.functions.invoke('send-email', {
                                    body: {
                                      type: 'garage_demarche_completed',
                                      to: garage.email,
                                      data: {
                                        garage_name: garage.raison_sociale,
                                        reference: demarche.numero_demarche || demarche.id,
                                        immatriculation: demarche.immatriculation,
                                        type: demarche.type,
                                        demarche_id: demarche.id
                                      }
                                    }
                                  });
                                  console.log('Email démarche finalisée envoyé au garage');
                                } catch (emailError) {
                                  console.error('Erreur envoi email finalisé:', emailError);
                                }
                              }, 600);
                            } catch (emailError) {
                              console.error('Erreur envoi email document:', emailError);
                            }
                          }
                          
                          loadDemarcheData();
                          toast({
                            title: "Document envoyé et dossier clôturé",
                            description: "Le document a été envoyé au client et le garage a été notifié par email"
                          });
                        }}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Garage Info */}
            {garage && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Informations garage</CardTitle>
                    {garage.is_verified ? (
                      <Badge className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Vérifié
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        Non vérifié
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <Label>Raison sociale</Label>
                    <p className="font-medium">{garage.raison_sociale}</p>
                  </div>
                  <div>
                    <Label>SIRET</Label>
                    <p className="font-medium">{garage.siret}</p>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p className="font-medium">{garage.email}</p>
                  </div>
                  <div>
                    <Label>Téléphone</Label>
                    <p className="font-medium">{garage.telephone}</p>
                  </div>
                  <div>
                    <Label>Adresse</Label>
                    <p className="font-medium">{garage.adresse}<br />{garage.code_postal} {garage.ville}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Options souscrites */}
            {trackingServices.length > 0 && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    Options souscrites
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    {trackingServices.map((service) => {
                      const serviceLabels: Record<string, { name: string; icon: any }> = {
                        'dossier_prioritaire': { name: 'Dossier prioritaire', icon: Zap },
                        'certificat_non_gage': { name: 'Certificat de non gage', icon: FileCheckIcon },
                        'email': { name: 'Suivi par email', icon: Mail },
                        'phone': { name: 'Suivi par SMS', icon: Phone },
                        'email_phone': { name: 'Suivi complet', icon: CheckCircle },
                      };
                      const serviceInfo = serviceLabels[service.service_type] || { name: service.service_type, icon: CheckCircle };
                      const Icon = serviceInfo.icon;
                      return (
                        <Badge key={service.id} variant="secondary" className="flex items-center gap-1.5 px-3 py-1.5 text-sm w-fit">
                          <Icon className="h-3.5 w-3.5" />
                          {serviceInfo.name}
                          <span className="text-muted-foreground ml-1">({service.price}€)</span>
                        </Badge>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Send Notification */}
            <Card>
              <CardHeader>
                <CardTitle>Envoyer une notification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Type</Label>
                  <Select value={notificationType} onValueChange={setNotificationType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Information</SelectItem>
                      <SelectItem value="document_request">Demande de document</SelectItem>
                      <SelectItem value="document_ready">Document prêt</SelectItem>
                      <SelectItem value="review_request">Demande d'avis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Message</Label>
                  <Textarea
                    value={notificationMessage}
                    onChange={(e) => setNotificationMessage(e.target.value)}
                    placeholder="Écrivez votre message..."
                    rows={4}
                  />
                </div>

                <Button onClick={sendNotification} className="w-full" disabled={!notificationMessage}>
                  <Send className="mr-2 h-4 w-4" />
                  Envoyer
                </Button>
              </CardContent>
            </Card>

            {/* Payment Info */}
            {paiement && (
              <Card>
                <CardHeader>
                  <CardTitle>Paiement</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <Label>Montant</Label>
                    <p className="font-medium">{paiement.montant.toFixed(2)}€</p>
                  </div>
                  <div>
                    <Label>Statut</Label>
                    <p className="font-medium">{paiement.status}</p>
                  </div>
                  {paiement.validated_at && (
                    <div>
                      <Label>Validé le</Label>
                      <p className="font-medium">
                        {new Date(paiement.validated_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Invalid Document Dialog */}
      <Dialog open={invalidDocDialog.open} onOpenChange={(open) => setInvalidDocDialog({ ...invalidDocDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser le document</DialogTitle>
            <DialogDescription>
              Indiquez la raison du refus de ce document
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="refusal-comment">Raison du refus *</Label>
              <Textarea
                id="refusal-comment"
                value={invalidDocDialog.comment}
                onChange={(e) => setInvalidDocDialog({ ...invalidDocDialog, comment: e.target.value })}
                placeholder="Ex: Document illisible, mauvais format, information manquante..."
                rows={4}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setInvalidDocDialog({ open: false, docId: null, comment: "" })}
            >
              Annuler
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmInvalidateDocument}
              disabled={!invalidDocDialog.comment}
            >
              Confirmer le refus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DocumentViewer
        isOpen={viewerState.isOpen}
        onClose={() => setViewerState({ isOpen: false, url: "", name: "", type: "" })}
        documentUrl={viewerState.url}
        documentName={viewerState.name}
        documentType={viewerState.type}
      />
    </div>
  );
}
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
import { ArrowLeft, Download, Send, CheckCircle, XCircle, Clock, Eye, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DocumentUpload } from "@/components/DocumentUpload";
import { DocumentViewer } from "@/components/DocumentViewer";
import { Badge } from "@/components/ui/badge";
import { FactureButton } from "@/components/FactureButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function DemarcheDetail() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [demarche, setDemarche] = useState<any>(null);
  const [garage, setGarage] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [paiement, setPaiement] = useState<any>(null);
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

      if (garageData) {
        setGarage(garageData);
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

  const sendNotification = async () => {
    if (!notificationMessage || !garage || !id) return;

    const { error } = await supabase
      .from('notifications')
      .insert({
        garage_id: garage.id,
        demarche_id: id,
        type: notificationType,
        message: notificationMessage,
        created_by: user?.id
      });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la notification",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Notification envoyée",
        description: "Le garage a été notifié"
      });
      setNotificationMessage("");
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
            {/* Demarche Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Démarche #{demarche.immatriculation}</CardTitle>
                    <CardDescription>
                      Créée le {new Date(demarche.created_at).toLocaleDateString('fr-FR')}
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
                    <Label>Montant TTC</Label>
                    <p className="text-sm font-medium mt-1">{demarche.montant_ttc.toFixed(2)}€</p>
                  </div>
                  <div>
                    <Label>Statut actuel</Label>
                    <p className="text-sm font-medium mt-1">{demarche.status}</p>
                  </div>
                  <div>
                    <Label>Paiement</Label>
                    <p className="text-sm font-medium mt-1">{demarche.paye ? "✅ Payé" : "❌ Non payé"}</p>
                  </div>
                </div>

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
                <CardTitle>Documents</CardTitle>
                <CardDescription>{documents.length} document(s)</CardDescription>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun document téléchargé</p>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div key={doc.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {documentLabels[doc.type_document] && (
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
                          <div className="flex gap-2">
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
                        onUploadComplete={() => {
                          loadDemarcheData();
                          toast({
                            title: "Document envoyé",
                            description: "Le document a été mis à disposition du client"
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
                  <CardTitle>Informations garage</CardTitle>
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
...
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
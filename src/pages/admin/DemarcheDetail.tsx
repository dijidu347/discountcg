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
import { ArrowLeft, Download, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DocumentUpload } from "@/components/DocumentUpload";

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
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState("info");

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
        .eq('demarche_id', id);

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
    }

    setLoading(false);
  };

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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40">
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
                <CardTitle>Démarche #{demarche.immatriculation}</CardTitle>
                <CardDescription>
                  Créée le {new Date(demarche.created_at).toLocaleDateString('fr-FR')}
                </CardDescription>
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
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="text-sm font-medium">{doc.nom_fichier}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.type_document} • {(doc.taille_octets / 1024).toFixed(2)} KB
                          </p>
                        </div>
                        <Button size="sm" variant="outline" asChild>
                          <a href={doc.url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-semibold mb-4">Envoyer un document au client</h4>
                  <DocumentUpload
                    demarcheId={demarche.id}
                    documentType="admin_document"
                    label="Document final"
                    onUploadComplete={() => {
                      loadDemarcheData();
                      sendNotification();
                    }}
                  />
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
    </div>
  );
}

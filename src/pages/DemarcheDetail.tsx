import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DocumentUpload } from "@/components/DocumentUpload";
import { DocumentViewer } from "@/components/DocumentViewer";
import { QuestionnaireResponses } from "@/components/QuestionnaireResponses";
import { ArrowLeft, FileText, AlertCircle, CheckCircle, XCircle, Upload, Eye, Mail, Phone, Zap, FileCheck as FileCheckIcon, CreditCard, Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { formatPrice } from "@/lib/utils";

const statusLabels: Record<string, string> = {
  en_saisie: "En saisie",
  en_attente: "En attente",
  paye: "Payé",
  valide: "Validé",
  finalise: "Finalisé",
  refuse: "Refusé"
};

const typeLabels: Record<string, string> = {
  DA: "Déclaration d'achat",
  DC: "Déclaration de cession",
  CG: "Carte grise",
  CG_DA: "CG + DA",
  DA_DC: "DA + DC",
  CG_IMPORT: "Import étranger"
};

export default function DemarcheDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [demarche, setDemarche] = useState<any>(null);
  const [vehicule, setVehicule] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [documentLabels, setDocumentLabels] = useState<Record<string, string>>({});
  const [notifications, setNotifications] = useState<any[]>([]);
  const [trackingServices, setTrackingServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [uploadSlots, setUploadSlots] = useState<number[]>([1]);
  const [viewerState, setViewerState] = useState<{
    isOpen: boolean;
    url: string;
    name: string;
    type: string;
  }>({ isOpen: false, url: "", name: "", type: "" });

  // Show toast on successful resubmission payment
  useEffect(() => {
    if (searchParams.get('resubmission_paid') === 'true') {
      toast({
        title: "Paiement accepté",
        description: "Vous pouvez maintenant renvoyer vos documents.",
      });
      // Clean URL
      window.history.replaceState({}, '', `/demarche/${id}`);
    }
  }, [searchParams, id, toast]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && id) {
      loadData();
    }
  }, [user, id]);

  const loadData = async () => {
    if (!user || !id) return;

    // Load garage
    const { data: garageData } = await supabase
      .from('garages')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!garageData) {
      toast({
        title: "Erreur",
        description: "Garage non trouvé",
        variant: "destructive"
      });
      navigate("/dashboard");
      return;
    }

    // Load demarche
    const { data: demarcheData } = await supabase
      .from('demarches')
      .select('*')
      .eq('id', id)
      .eq('garage_id', garageData.id)
      .single();

    if (!demarcheData) {
      toast({
        title: "Erreur",
        description: "Démarche non trouvée",
        variant: "destructive"
      });
      navigate("/mes-demarches");
      return;
    }

    setDemarche(demarcheData);

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

    // Load documents and remove duplicates by id
    const { data: documentsData } = await supabase
      .from('documents')
      .select('*')
      .eq('demarche_id', id)
      .order('created_at', { ascending: false });

    // Remove duplicates based on document id
    const uniqueDocs = documentsData ? 
      Array.from(new Map(documentsData.map(doc => [doc.id, doc])).values()) : [];
    
    setDocuments(uniqueDocs);

    // Load notifications for this demarche
    const { data: notifData } = await supabase
      .from('notifications')
      .select('*')
      .eq('demarche_id', id)
      .order('created_at', { ascending: false });

    setNotifications(notifData || []);

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

    setLoading(false);
  };

  // Realtime: refresh when documents or demarche change
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`demarche-detail-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'documents', filter: `demarche_id=eq.${id}` },
        () => loadData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'demarches', filter: `id=eq.${id}` },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const getValidationBadge = (status: string) => {
    switch (status) {
      case 'validated':
        return <Badge className="bg-success"><CheckCircle className="h-3 w-3 mr-1" />Validé</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Refusé</Badge>;
      default:
        return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />En attente</Badge>;
    }
  };

  const handleResubmissionPayment = async () => {
    if (!demarche) return;
    
    setIsProcessingPayment(true);
    try {
      console.log('Creating resubmission payment for demarche:', demarche.id);
      
      const { data, error } = await supabase.functions.invoke('create-resubmission-payment', {
        body: {
          demarche_id: demarche.id,
          amount: demarche.resubmission_payment_amount || 10,
        },
      });

      console.log('Payment response:', { data, error });

      if (error) throw error;

      if (data?.url) {
        console.log('Redirecting to:', data.url);
        window.open(data.url, '_blank');
      } else {
        throw new Error("URL de paiement non reçue");
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      toast({
        title: "Erreur",
        description: err.message || "Impossible de créer le paiement",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Check if uploads should be blocked due to pending resubmission payment
  const isUploadBlocked = demarche?.requires_resubmission_payment && !demarche?.resubmission_paid;

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

  if (!demarche) {
    return null;
  }

  const rejectedDocuments = documents.filter(d => d.validation_status === 'rejected');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/mes-demarches")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour à mes démarches
        </Button>

        {/* Bandeau de statut de paiement bien visible */}
        {demarche.paye || demarche.status === 'paye' ? (
          <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/30 border-2 border-green-400 dark:border-green-600 rounded-xl flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
              <CheckCircle className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-green-800 dark:text-green-300">Paiement accepté</p>
              <p className="text-sm text-green-700 dark:text-green-400">Votre paiement a été validé avec succès</p>
            </div>
          </div>
        ) : demarche.status === 'refuse' ? (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border-2 border-red-400 dark:border-red-600 rounded-xl flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-red-500 flex items-center justify-center">
              <XCircle className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-red-800 dark:text-red-300">Démarche refusée</p>
              <p className="text-sm text-red-700 dark:text-red-400">Cette démarche a été refusée. Consultez les commentaires pour plus d'informations.</p>
            </div>
          </div>
        ) : demarche.is_free_token ? (
          <div className="mb-6 p-4 bg-emerald-100 dark:bg-emerald-900/30 border-2 border-emerald-400 dark:border-emerald-600 rounded-xl flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-emerald-500 flex items-center justify-center">
              <CheckCircle className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-emerald-800 dark:text-emerald-300">Démarche offerte</p>
              <p className="text-sm text-emerald-700 dark:text-emerald-400">Cette démarche est gratuite grâce à votre jeton offert</p>
            </div>
          </div>
        ) : demarche.status === 'en_attente' && !demarche.paye ? (
          <div className="mb-6 p-4 bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-400 dark:border-orange-600 rounded-xl flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-orange-500 flex items-center justify-center animate-pulse">
              <AlertCircle className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-orange-800 dark:text-orange-300">En attente de paiement</p>
              <p className="text-sm text-orange-700 dark:text-orange-400">Veuillez procéder au paiement pour finaliser votre démarche</p>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
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
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-semibold text-primary px-2 py-1 bg-primary/10 rounded">
                          {demarche.numero_demarche}
                        </span>
                      </div>
                      <CardTitle className="text-2xl">{typeLabels[demarche.type]}</CardTitle>
                      <CardDescription>Immatriculation: {demarche.immatriculation}</CardDescription>
                    </div>
                    <Badge 
                      className={
                        demarche.status === 'valide' || demarche.status === 'finalise' 
                          ? 'bg-success' 
                          : demarche.status === 'refuse'
                          ? 'bg-destructive'
                          : 'bg-warning'
                      }
                    >
                      {statusLabels[demarche.status]}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Montant TTC</p>
                    <p className="text-xl font-bold">{formatPrice(demarche.montant_ttc || 0)} €</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date de création</p>
                    <p className="font-medium">{new Date(demarche.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Paiement</p>
                    <Badge variant={demarche.paye ? "default" : "secondary"}>
                      {demarche.paye ? "Payé" : "Non payé"}
                    </Badge>
                  </div>
                  {demarche.commentaire && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Commentaire</p>
                      <p className="font-medium">{demarche.commentaire}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Réponses au questionnaire */}
            <QuestionnaireResponses demarcheId={demarche.id} />

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
                  <div className="flex flex-wrap gap-2">
                    {trackingServices.map((service) => {
                      const serviceLabels: Record<string, { name: string; icon: any }> = {
                        'dossier_prioritaire': { name: 'Dossier prioritaire', icon: Zap },
                        'certificat_non_gage': { name: 'Certificat de non gage', icon: FileCheckIcon },
                        'email': { name: 'Suivi par email', icon: Mail },
                        'phone': { name: 'Suivi par SMS', icon: Phone },
                        'email_phone': { name: 'Suivi complet (Email + SMS)', icon: CheckCircle },
                      };
                      const serviceInfo = serviceLabels[service.service_type] || { name: service.service_type, icon: CheckCircle };
                      const Icon = serviceInfo.icon;
                      return (
                        <Badge key={service.id} variant="secondary" className="flex items-center gap-1.5 px-3 py-1.5 text-sm">
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

            {/* Documents de l'administration */}
            {documents.filter(d => d.type_document === 'admin_document').length > 0 && (
              <Card className="border-accent bg-accent/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Documents de l'administration
                  </CardTitle>
                  <CardDescription>Documents officiels mis à disposition par l'administration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {documents.filter(d => d.type_document === 'admin_document').map((doc) => (
                    <div key={doc.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium">{doc.nom_fichier}</p>
                          <p className="text-sm text-muted-foreground">
                            Type: {doc.type_document} • {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        {getValidationBadge(doc.validation_status)}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => setViewerState({
                            isOpen: true,
                            url: doc.url,
                            name: doc.nom_fichier,
                            type: doc.type_document
                          })}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Voir le document
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {documents.filter(d => d.type_document !== 'admin_document').length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">Aucun document</p>
                ) : (
                  documents.filter(d => d.type_document !== 'admin_document').map((doc) => (
                    <div key={doc.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          {/* Afficher le nom personnalisé pour les pièces supplémentaires ou le label standard */}
                          {(doc.type_document?.startsWith('autre_piece') && doc.document_type) ? (
                            <p className="text-xs font-semibold text-primary uppercase mb-1">
                              {doc.document_type}
                            </p>
                          ) : documentLabels[doc.type_document] && (
                            <p className="text-xs font-semibold text-primary uppercase mb-1">
                              {documentLabels[doc.type_document]}
                            </p>
                          )}
                          <p className="font-medium">{doc.nom_fichier}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        {getValidationBadge(doc.validation_status)}
                      </div>
                      
                      {doc.validation_status === 'rejected' && doc.validation_comment && (
                        <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                          <p className="text-sm font-medium text-destructive mb-1">Raison du refus:</p>
                          <p className="text-sm">{doc.validation_comment}</p>
                        </div>
                      )}

                      <div className="mt-3 flex gap-2">
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => setViewerState({
                            isOpen: true,
                            url: doc.url,
                            name: doc.nom_fichier,
                            type: doc.type_document
                          })}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Voir le document
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Resubmission Payment Required */}
            {isUploadBlocked && (
              <Card className="border-warning bg-warning/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-warning">
                    <CreditCard className="h-5 w-5" />
                    Paiement requis
                  </CardTitle>
                  <CardDescription>
                    Suite à des documents non conformes, un paiement de {demarche.resubmission_payment_amount || 10}€ est requis pour pouvoir renvoyer vos documents.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={handleResubmissionPayment}
                    disabled={isProcessingPayment}
                    className="w-full bg-warning hover:bg-warning/90 text-warning-foreground"
                  >
                    {isProcessingPayment ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Redirection...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Payer {demarche.resubmission_payment_amount || 10}€ pour renvoyer
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Upload new document if rejected */}
            {rejectedDocuments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-warning">
                    <Upload className="h-5 w-5" />
                    Remplacer les documents refusés
                  </CardTitle>
                  <CardDescription>
                    {isUploadBlocked 
                      ? "Veuillez d'abord effectuer le paiement ci-dessus pour pouvoir renvoyer vos documents."
                      : "Certains documents ont été refusés. Veuillez uploader de nouveaux documents."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {uploadSlots.map((slotId, index) => (
                    <DocumentUpload
                      key={slotId}
                      demarcheId={demarche.id}
                      documentType={`correction_${slotId}`}
                      label={`Document ${index + 1}`}
                      onUploadComplete={loadData}
                      isBlocked={isUploadBlocked}
                      blockedMessage="Paiement requis pour renvoyer des documents"
                    />
                  ))}
                  
                  {!isUploadBlocked && (
                    <Button
                      variant="outline"
                      onClick={() => setUploadSlots(prev => [...prev, Math.max(...prev) + 1])}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter + de document
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">N° de démarche</p>
                  <p className="font-mono text-sm font-semibold text-primary">{demarche.numero_demarche}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Statut</p>
                  <p className="font-medium">{statusLabels[demarche.status]}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Documents complets</p>
                  <Badge variant={demarche.documents_complets ? "default" : "secondary"}>
                    {demarche.documents_complets ? "Oui" : "Non"}
                  </Badge>
                </div>
                {demarche.validated_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Validé le</p>
                    <p className="font-medium">{new Date(demarche.validated_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {demarche.status === 'en_attente' && (
              <>
                <Card className="border-warning bg-warning/5">
                  <CardHeader>
                    <CardTitle className="text-lg text-warning">En cours de traitement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">
                      Votre démarche est en cours de vérification par notre équipe. Vous serez notifié dès que le traitement sera terminé.
                    </p>
                  </CardContent>
                </Card>

                {notifications.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Messages de l'administration</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {notifications.map((notif) => (
                          <div key={notif.id} className="border-l-4 border-primary pl-4 py-2">
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant="outline">{notif.type}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(notif.created_at).toLocaleDateString('fr-FR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <p className="text-sm">{notif.message}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>

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

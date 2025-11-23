import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, FileCheck, Save, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DocumentUpload } from "@/components/DocumentUpload";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VehicleForm } from "@/components/VehicleForm";
import { VehicleFormCG } from "@/components/VehicleFormCG";
import { TrackingServiceOption } from "@/components/TrackingServiceOption";
import { StripePayment } from "@/components/StripePayment";


export default function NouvelleDemarche() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [garage, setGarage] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [demarcheId, setDemarcheId] = useState<string | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<Set<string>>(new Set());
  const [actionDetails, setActionDetails] = useState<any>(null);
  const [documentsRequis, setDocumentsRequis] = useState<any[]>([]);
  const [actionsRapides, setActionsRapides] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedImmatriculation, setSelectedImmatriculation] = useState<string>("");
  const [additionalDocs, setAdditionalDocs] = useState<number[]>([1, 2, 3, 4, 5]);
  const [carteGrisePrice, setCarteGrisePrice] = useState<number>(0);
  const [formData, setFormData] = useState({
    type: searchParams.get('type') || "",
    commentaire: ""
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadGarage();
      loadActionsRapides();
    }
  }, [user]);

  useEffect(() => {
    if (formData.type) {
      loadActionDetails();
    }
  }, [formData.type]);

  useEffect(() => {
    // Auto-create draft when type is selected
    if (formData.type && !demarcheId && garage && actionDetails) {
      handleAutoCreateDraft();
    }
  }, [formData.type, garage, actionDetails]);

  useEffect(() => {
    // Load existing documents when demarcheId changes
    if (demarcheId) {
      loadExistingDocuments();
    }
  }, [demarcheId]);

  useEffect(() => {
    // Update demarche montant when carteGrisePrice changes
    if (demarcheId && actionDetails && carteGrisePrice > 0) {
      updateDemarcheMontant();
    }
  }, [carteGrisePrice, demarcheId, actionDetails]);

  const updateDemarcheMontant = async () => {
    if (!demarcheId || !actionDetails) return;

    const totalMontant = actionDetails.prix + carteGrisePrice;

    await supabase
      .from('demarches')
      .update({
        frais_dossier: totalMontant,
        montant_ttc: totalMontant,
      })
      .eq('id', demarcheId);
  };

  const loadExistingDocuments = async () => {
    if (!demarcheId) return;

    const { data: documents } = await supabase
      .from('documents')
      .select('*')
      .eq('demarche_id', demarcheId);

    if (documents && documents.length > 0) {
      const docTypes = new Set(documents.map(doc => doc.type_document));
      setUploadedDocuments(docTypes);
    }
  };

  const loadGarage = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('garages')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setGarage(data);
    }
  };

  const loadActionsRapides = async () => {
    const { data } = await supabase
      .from('actions_rapides')
      .select('*')
      .eq('actif', true)
      .order('ordre');

    if (data) {
      setActionsRapides(data);
    }
  };

  const loadActionDetails = async () => {
    const { data: action } = await supabase
      .from('actions_rapides')
      .select('*')
      .eq('code', formData.type)
      .eq('actif', true)
      .single();

    if (action) {
      setActionDetails(action);

      const { data: docs } = await supabase
        .from('action_documents')
        .select('*')
        .eq('action_id', action.id)
        .order('ordre');

      setDocumentsRequis(docs || []);
    }
  };

  const handleAutoCreateDraft = async () => {
    if (!garage || demarcheId || !actionDetails) return;

    const { data, error } = await supabase
      .from('demarches')
      .insert({
        garage_id: garage.id,
        type: formData.type,
        immatriculation: selectedImmatriculation || 'TEMP',
        commentaire: formData.commentaire,
        frais_dossier: actionDetails.prix + carteGrisePrice,
        montant_ttc: actionDetails.prix + carteGrisePrice,
        status: 'en_saisie',
        is_draft: true,
        paye: false,
        vehicule_id: selectedVehicleId
      } as any)
      .select()
      .single();

    if (!error && data) {
      setDemarcheId(data.id);
    }
  };

  const handleVehicleSelect = (vehicleId: string, immatriculation: string, vehicleData?: any) => {
    setSelectedVehicleId(vehicleId);
    setSelectedImmatriculation(immatriculation);
  };

  const handlePriceCalculated = (price: number) => {
    setCarteGrisePrice(price);
  };

  const handleSaveDraft = async () => {
    if (!garage || !demarcheId) return;

    setLoading(true);

    const { error } = await supabase
      .from('demarches')
      .update({
        immatriculation: selectedImmatriculation,
        commentaire: formData.commentaire,
        vehicule_id: selectedVehicleId
      })
      .eq('id', demarcheId);

    setLoading(false);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer le brouillon",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Brouillon enregistré",
        description: "Vos modifications ont été sauvegardées"
      });
    }
  };

  const getFraisDossier = () => {
    return actionDetails?.prix || 0;
  };

  const getTotalPrice = () => {
    return getFraisDossier() + carteGrisePrice;
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedImmatriculation.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner ou créer un véhicule",
        variant: "destructive"
      });
      return;
    }

    // Check if all obligatory documents are uploaded
    const requiredDocs = documentsRequis.filter(doc => doc.obligatoire);
    const uploadedRequiredDocs = requiredDocs.filter((doc, idx) => {
      const docKey = `doc_${idx + 1}`;
      return uploadedDocuments.has(docKey);
    });
    
    if (uploadedRequiredDocs.length < requiredDocs.length) {
      toast({
        title: "Documents obligatoires manquants",
        description: `Veuillez télécharger tous les documents obligatoires (${uploadedRequiredDocs.length}/${requiredDocs.length})`,
        variant: "destructive"
      });
      return;
    }

    // Update before payment
    if (demarcheId) {
      await supabase
        .from('demarches')
        .update({
          immatriculation: selectedImmatriculation,
          commentaire: formData.commentaire,
          vehicule_id: selectedVehicleId
        })
        .eq('id', demarcheId);
    }

    setShowPaymentDialog(true);
  };

  const handlePaymentSuccess = async () => {
    if (!demarcheId) return;

    // Update demarche to mark as not draft
    await supabase
      .from('demarches')
      .update({
        is_draft: false,
        documents_complets: true,
      })
      .eq('id', demarcheId);

    toast({
      title: "Paiement validé",
      description: "Votre démarche a été soumise avec succès"
    });

    navigate("/mes-demarches");
  };

  const handlePaymentCancel = () => {
    setShowPaymentDialog(false);
  };

  const handleDocumentUploadComplete = (documentType: string) => {
    setUploadedDocuments(prev => new Set(prev).add(documentType));
    // Reload documents to ensure count is accurate
    loadExistingDocuments();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  const requiredDocsCount = documentsRequis.filter(doc => doc.obligatoire).length;
  const allDocsUploaded = uploadedDocuments.size >= requiredDocsCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-accent/5 to-background">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour au tableau de bord
        </Button>

        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Nouvelle démarche</CardTitle>
            <CardDescription>
              Créez une nouvelle démarche administrative pour un véhicule
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitPayment} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="type">Type de démarche *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez le type" />
                  </SelectTrigger>
                  <SelectContent>
                    {actionsRapides.map((action) => (
                      <SelectItem key={action.id} value={action.code}>
                        {action.titre} - {action.prix}€
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {garage && (
                <>
                  {formData.type === 'CG' ? (
                    <VehicleFormCG
                      garageId={garage.id}
                      onVehicleSelect={handleVehicleSelect}
                      selectedVehicleId={selectedVehicleId}
                      onPriceCalculated={handlePriceCalculated}
                    />
                  ) : (
                    <VehicleForm
                      garageId={garage.id}
                      onVehicleSelect={handleVehicleSelect}
                      selectedVehicleId={selectedVehicleId}
                      onPriceCalculated={handlePriceCalculated}
                    />
                  )}
                </>
              )}


              <div className="space-y-2">
                <Label htmlFor="commentaire">Commentaire (optionnel)</Label>
                <Textarea
                  id="commentaire"
                  placeholder="Informations complémentaires..."
                  value={formData.commentaire}
                  onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
                  rows={4}
                />
              </div>

              {demarcheId && garage && (
                <TrackingServiceOption demarcheId={demarcheId} garageId={garage.id} />
              )}

              {formData.type && demarcheId && documentsRequis.length > 0 && (
                <div className="space-y-6">
                  {/* Pièces justificatives */}
                  <div className="bg-muted/50 p-6 rounded-lg space-y-4 border-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">Pièces justificatives</h3>
                      {allDocsUploaded && (
                        <FileCheck className="h-5 w-5 text-success" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <span className="text-destructive">*</span> = Document obligatoire
                    </p>
                    
                    <div className="space-y-3">
                      {documentsRequis.map((doc, idx) => {
                        const isCarteGrise = doc.nom_document.toLowerCase().includes('carte grise');
                        
                        // Si c'est une carte grise, afficher recto et verso séparément
                        if (isCarteGrise) {
                          return (
                            <div key={doc.id} className="space-y-3">
                              <div className="flex items-center gap-4">
                                <div className="flex-1">
                                  <Label className="text-sm font-medium flex items-center gap-2">
                                    Carte grise recto (ou recto/verso)
                                    {doc.obligatoire ? (
                                      <span className="text-destructive text-xs">*</span>
                                    ) : (
                                      <span className="text-muted-foreground text-xs">(Optionnel)</span>
                                    )}
                                  </Label>
                                </div>
                                <div className="w-[400px]">
                                  <DocumentUpload
                                    demarcheId={demarcheId}
                                    documentType={`doc_${idx + 1}_recto`}
                                    label=""
                                    onUploadComplete={() => handleDocumentUploadComplete(`doc_${idx + 1}_recto`)}
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="flex-1">
                                  <Label className="text-sm font-medium">
                                    Carte grise verso
                                  </Label>
                                </div>
                                <div className="w-[400px]">
                                  <DocumentUpload
                                    demarcheId={demarcheId}
                                    documentType={`doc_${idx + 1}_verso`}
                                    label=""
                                    onUploadComplete={() => handleDocumentUploadComplete(`doc_${idx + 1}_verso`)}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        }
                        
                        return (
                          <div key={doc.id} className="flex items-center gap-4">
                            <div className="flex-1">
                              <Label className="text-sm font-medium flex items-center gap-2">
                                {doc.nom_document}
                                {doc.obligatoire ? (
                                  <span className="text-destructive text-xs">*</span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">(Optionnel)</span>
                                )}
                              </Label>
                            </div>
                            <div className="w-[400px]">
                              <DocumentUpload
                                demarcheId={demarcheId}
                                documentType={`doc_${idx + 1}`}
                                label=""
                                onUploadComplete={() => handleDocumentUploadComplete(`doc_${idx + 1}`)}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Autres pièces justificatives */}
                  <div className="bg-muted/50 p-6 rounded-lg space-y-4 border-2">
                    <h3 className="font-semibold text-lg">Autres pièces justificatives</h3>
                    
                    <div className="space-y-3">
                      {additionalDocs.map((docNum) => (
                        <div key={docNum} className="flex items-center gap-4">
                          <div className="flex-1">
                            <Label className="text-sm font-medium">Autre pièce {docNum}</Label>
                          </div>
                          <div className="w-[400px]">
                            <DocumentUpload
                              demarcheId={demarcheId}
                              documentType={`autre_piece_${docNum}`}
                              label=""
                              onUploadComplete={() => handleDocumentUploadComplete(`autre_piece_${docNum}`)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAdditionalDocs([...additionalDocs, additionalDocs.length + 1])}
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter une pièce supplémentaire
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <Button 
                  type="button"
                  variant="outline" 
                  size="lg" 
                  onClick={handleSaveDraft}
                  disabled={loading || !demarcheId}
                  className="flex-1"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Enregistrer le brouillon
                </Button>
                <Button 
                  type="submit"
                  size="lg" 
                  disabled={loading || !allDocsUploaded || !selectedImmatriculation.trim()}
                  className="flex-1 bg-success hover:bg-success/90"
                >
                  Payer {getTotalPrice()}€
                </Button>
              </div>
            </form>

              <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Paiement de la démarche</DialogTitle>
                    <DialogDescription>
                      Frais de dossier : {getFraisDossier()}€
                      {carteGrisePrice > 0 && ` + Prix carte grise : ${carteGrisePrice.toFixed(2)}€`}
                      <br />
                      Montant total : {getTotalPrice()}€
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    {demarcheId && (
                      <StripePayment
                        demarcheId={demarcheId}
                        amount={getTotalPrice()}
                        onSuccess={handlePaymentSuccess}
                        onCancel={handlePaymentCancel}
                      />
                    )}
                  </div>
                </DialogContent>
              </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
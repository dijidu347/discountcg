import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, FileCheck, Plus, Gift, FileText, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DocumentUpload } from "@/components/DocumentUpload";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VehicleForm } from "@/components/VehicleForm";
import { VehicleFormCG } from "@/components/VehicleFormCG";
import { VehicleFormSimple } from "@/components/VehicleFormSimple";
import { TrackingServiceOption } from "@/components/TrackingServiceOption";
import { StripePayment } from "@/components/StripePayment";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


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
  const [additionalDocs, setAdditionalDocs] = useState<{id: number; name: string}[]>([
    { id: 1, name: "" },
    { id: 2, name: "" },
    { id: 3, name: "" },
    { id: 4, name: "" },
    { id: 5, name: "" }
  ]);
  const [carteGrisePrice, setCarteGrisePrice] = useState<number>(0);
  const [trackingServicePrice, setTrackingServicePrice] = useState<number>(0);
  const [freeTokenAvailable, setFreeTokenAvailable] = useState<boolean>(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const demarcheIdRef = useRef<string | null>(null);
  const paymentCompletedRef = useRef(false);
  const [formData, setFormData] = useState({
    type: searchParams.get('type') || "",
    commentaire: ""
  });

  // Keep refs in sync with state for cleanup
  useEffect(() => {
    demarcheIdRef.current = demarcheId;
  }, [demarcheId]);

  useEffect(() => {
    paymentCompletedRef.current = paymentCompleted;
  }, [paymentCompleted]);

  // Cleanup: delete draft demarche if user leaves without completing payment
  useEffect(() => {
    const deleteDraft = async () => {
      const draftId = demarcheIdRef.current;
      if (draftId && !paymentCompletedRef.current) {
        console.log("[NouvelleDemarche] Cleaning up unpaid draft:", draftId);
        await supabase
          .from('demarches')
          .delete()
          .eq('id', draftId)
          .eq('is_draft', true)
          .eq('paye', false);
      }
    };

    // Handle page unload
    const handleBeforeUnload = () => {
      if (demarcheIdRef.current && !paymentCompletedRef.current) {
        // Use fetch with keepalive for page unload
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/demarches?id=eq.${demarcheIdRef.current}&is_draft=eq.true&paye=eq.false`;
        fetch(url, {
          method: 'DELETE',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
          },
          keepalive: true,
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      deleteDraft();
    };
  }, []);

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
    // Update demarche montant when carteGrisePrice or trackingServicePrice changes
    if (demarcheId && actionDetails) {
      // Pour DA et DC, on n'a pas besoin de carteGrisePrice
      if (formData.type === 'DA' || formData.type === 'DC') {
        updateDemarcheMontant();
      } else if (carteGrisePrice > 0) {
        updateDemarcheMontant();
      }
    }
  }, [carteGrisePrice, trackingServicePrice, demarcheId, actionDetails, formData.type]);

  const updateDemarcheMontant = async () => {
    if (!demarcheId || !actionDetails) return;

    // Frais de dossier = prix de l'action (0 si jeton gratuit)
    const fraisDossierHT = freeTokenAvailable ? 0 : actionDetails.prix;
    
    // Prix carte grise (taxe régionale, exonérée TVA) - 0 pour DA/DC
    const prixCarteGrise = (formData.type === 'DA' || formData.type === 'DC') ? 0 : carteGrisePrice;
    
    // Options (soumises à TVA)
    const optionsHT = trackingServicePrice;
    
    // Total des services soumis à TVA
    const totalServicesHT = fraisDossierHT + optionsHT;
    
    // TVA 20% sur les services uniquement
    const tva = totalServicesHT * 0.20;
    
    // Total TTC = carte grise (exonérée) + services HT + TVA
    const totalTTC = prixCarteGrise + totalServicesHT + tva;

    await supabase
      .from('demarches')
      .update({
        prix_carte_grise: prixCarteGrise,
        frais_dossier: fraisDossierHT,
        montant_ht: totalServicesHT,
        montant_ttc: totalTTC,
      } as any)
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
      setFreeTokenAvailable(data.free_token_available === true);
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

    // Frais de dossier = prix de l'action (0 si jeton gratuit)
    const fraisDossierHT = freeTokenAvailable ? 0 : actionDetails.prix;
    
    // Prix carte grise (taxe régionale, exonérée TVA) - 0 pour DA/DC
    const prixCarteGrise = (formData.type === 'DA' || formData.type === 'DC') ? 0 : carteGrisePrice;
    
    // Total des services soumis à TVA (pas d'options au début)
    const totalServicesHT = fraisDossierHT;
    
    // TVA 20% sur les services uniquement
    const tva = totalServicesHT * 0.20;
    
    // Total TTC = carte grise (exonérée) + services HT + TVA
    const totalTTC = prixCarteGrise + totalServicesHT + tva;

    const { data, error } = await supabase
      .from('demarches')
      .insert({
        garage_id: garage.id,
        type: formData.type,
        immatriculation: selectedImmatriculation || 'TEMP',
        commentaire: formData.commentaire,
        prix_carte_grise: prixCarteGrise,
        frais_dossier: fraisDossierHT,
        montant_ht: totalServicesHT,
        montant_ttc: totalTTC,
        status: 'en_saisie',
        is_draft: true,
        paye: false,
        vehicule_id: selectedVehicleId,
        is_free_token: freeTokenAvailable
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


  const getFraisDossier = () => {
    // Si jeton gratuit disponible, le prix de l'action est 0
    if (freeTokenAvailable) return 0;
    return actionDetails?.prix || 0;
  };

  const getOriginalFraisDossier = () => {
    return actionDetails?.prix || 0;
  };

  const getTotalPrice = () => {
    const basePrice = getFraisDossier();
    const vehiclePrice = (formData.type === 'DA' || formData.type === 'DC') ? 0 : carteGrisePrice;
    return basePrice + vehiclePrice + trackingServicePrice;
  };

  const handleTrackingServiceChange = (price: number) => {
    setTrackingServicePrice(price);
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
    
    // Trouver l'index de la première carte grise à dédoubler (sans recto/verso dans le nom)
    const firstCarteGriseIdx = documentsRequis.findIndex(d => {
      const name = d.nom_document.toLowerCase();
      return name.includes('carte grise') && !name.includes('recto') && !name.includes('verso');
    });
    
    const uploadedRequiredDocs = requiredDocs.filter((doc, idx) => {
      // Récupérer l'index du document dans la liste complète
      const docIndex = documentsRequis.indexOf(doc);
      const docKey = `doc_${docIndex + 1}`;
      const docName = doc.nom_document.toLowerCase();
      const isCarteGrise = docName.includes('carte grise') && 
                          !docName.includes('recto') && 
                          !docName.includes('verso');
      
      // Pour la PREMIÈRE carte grise à dédoubler uniquement, vérifier si au moins le recto est uploadé
      if (isCarteGrise && docIndex === firstCarteGriseIdx) {
        return uploadedDocuments.has(`${docKey}_recto`) || uploadedDocuments.has(docKey);
      }
      
      // Pour tous les autres documents (y compris ceux avec "recto/verso" dans le nom), vérifier normalement
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

    // Si le montant total est 0, valider directement sans paiement
    if (getTotalPrice() === 0) {
      await handlePaymentSuccess();
      return;
    }

    setShowPaymentDialog(true);
  };

  const handlePaymentSuccess = async () => {
    if (!demarcheId) return;

    // Mark payment as completed to prevent cleanup deletion
    setPaymentCompleted(true);

    // Update demarche to mark as not draft
    await supabase
      .from('demarches')
      .update({
        is_draft: false,
        documents_complets: true,
      })
      .eq('id', demarcheId);

    // Si jeton gratuit utilisé, le marquer comme consommé
    if (freeTokenAvailable && garage) {
      await supabase
        .from('garages')
        .update({ free_token_available: false })
        .eq('id', garage.id);
      
      setFreeTokenAvailable(false);

      // Envoyer notification admin pour démarche offerte
      const { data: demarche } = await supabase
        .from('demarches')
        .select('*, vehicules(*)')
        .eq('id', demarcheId)
        .single();

      if (demarche) {
        const adminEmails = ["Discountcg@gmail.com", "dijidu347@gmail.com", "mathieugaillac4@gmail.com"];
        for (const adminEmail of adminEmails) {
          await supabase.functions.invoke("send-email", {
            body: {
              type: "admin_new_demarche",
              to: adminEmail,
              data: {
                type: `Démarche garage - ${demarche.type}`,
                reference: demarche.numero_demarche || demarcheId,
                immatriculation: demarche.immatriculation,
                client_name: garage.raison_sociale || "N/A",
                montant_ttc: demarche.montant_ttc?.toFixed(2) || "0.00",
                is_free_token: true,
              },
            },
          });
        }

        // Email de confirmation au garage (jeton gratuit)
        await supabase.functions.invoke("send-email", {
          body: {
            type: "garage_demarche_confirmation",
            to: garage.email,
            data: {
              garage_name: garage.raison_sociale,
              type: demarche.type,
              reference: demarche.numero_demarche || demarcheId,
              immatriculation: demarche.immatriculation,
              montant_ttc: demarche.montant_ttc?.toFixed(2) || "0.00",
              is_free_token: true,
            },
          },
        });
      }
    } else {
      // Démarche payante - envoyer email de confirmation au garage
      const { data: demarche } = await supabase
        .from('demarches')
        .select('*, vehicules(*)')
        .eq('id', demarcheId)
        .single();

      if (demarche && garage) {
        await supabase.functions.invoke("send-email", {
          body: {
            type: "garage_demarche_confirmation",
            to: garage.email,
            data: {
              garage_name: garage.raison_sociale,
              type: demarche.type,
              reference: demarche.numero_demarche || demarcheId,
              immatriculation: demarche.immatriculation,
              montant_ttc: demarche.montant_ttc?.toFixed(2) || "0.00",
              is_free_token: false,
            },
          },
        });
      }
    }

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
            {freeTokenAvailable && (
              <Alert className="mb-6 border-2 border-green-500 bg-green-500/10">
                <Gift className="h-5 w-5 text-green-500" />
                <AlertTitle className="text-green-600 font-bold">🎁 Offre de bienvenue activée</AlertTitle>
                <AlertDescription className="text-green-600">
                  Les frais de dossier sont offerts pour cette démarche ! 
                  {(formData.type !== 'DA' && formData.type !== 'DC') && " Seule la taxe régionale carte grise reste à payer."}
                  {(formData.type === 'DA' || formData.type === 'DC') && " Cette démarche sera entièrement gratuite."}
                </AlertDescription>
              </Alert>
            )}
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
                        {action.titre} - {freeTokenAvailable ? '0€ (offert)' : `${action.prix}€`}
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
                  ) : (formData.type === 'DA' || formData.type === 'DC') ? (
                    <VehicleFormSimple
                      garageId={garage.id}
                      onVehicleSelect={handleVehicleSelect}
                      selectedVehicleId={selectedVehicleId}
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
                <TrackingServiceOption 
                  demarcheId={demarcheId} 
                  garageId={garage.id}
                  onPriceChange={handleTrackingServiceChange}
                />
              )}

              {formData.type && demarcheId && documentsRequis.length > 0 && (formData.type === 'CG' ? carteGrisePrice > 0 : true) && (
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
                      <span className="text-destructive text-base font-bold">*</span> = Document obligatoire
                    </p>
                    
                    <div className="space-y-3">
                      {documentsRequis.map((doc, idx) => {
                        const docName = doc.nom_document.toLowerCase();
                        // Vérifier si le document contient "recto/verso" ou "recto verso"
                        const hasRectoVerso = docName.includes('recto/verso') || docName.includes('recto verso');
                        
                        // Si le document contient "recto/verso", le dédoubler
                        if (hasRectoVerso) {
                          // Créer le nom pour le verso en remplaçant "recto/verso" ou "recto verso" par "verso"
                          const versoName = doc.nom_document
                            .replace(/recto\/verso/gi, 'verso')
                            .replace(/recto verso/gi, 'verso');
                          
                          return (
                            <div key={doc.id} className="space-y-3">
                              <div className="flex items-center gap-4">
                                <div className="flex-1">
                                  <Label className="text-sm font-medium flex items-center gap-2">
                                    {doc.nom_document}
                                    {doc.obligatoire ? (
                                      <span className="text-destructive text-base font-bold">*</span>
                                    ) : (
                                      <span className="text-muted-foreground text-xs">(optionnel)</span>
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
                              <div className="flex items-center gap-4">
                                <div className="flex-1">
                                  <Label className="text-sm font-medium flex items-center gap-2">
                                    {versoName}
                                    <span className="text-muted-foreground text-xs">(Optionnel)</span>
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
                        
                        // Afficher tous les autres documents normalement
                        return (
                          <div key={doc.id} className="flex items-center gap-4">
                            <div className="flex-1">
                              <Label className="text-sm font-medium flex items-center gap-2">
                                {doc.nom_document}
                                {doc.obligatoire ? (
                                  <span className="text-destructive text-base font-bold">*</span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">(optionnel)</span>
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
                  <div className="bg-muted/30 p-4 rounded-lg border border-dashed border-muted-foreground/30">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Pièces supplémentaires
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">Optionnel</span>
                      </h3>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setAdditionalDocs([...additionalDocs, { id: Date.now(), name: "" }])}
                        className="h-8 text-xs"
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Ajouter
                      </Button>
                    </div>
                    
                    {additionalDocs.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        Aucune pièce supplémentaire ajoutée
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {additionalDocs.map((doc, index) => (
                          <div key={doc.id} className="flex items-start gap-2 p-3 border rounded-md bg-background">
                            <div className="flex-1 space-y-2">
                              <Input
                                placeholder="Nom du document (ex: Procuration, Mandat...)"
                                value={doc.name}
                                onChange={(e) => {
                                  const newDocs = [...additionalDocs];
                                  newDocs[index] = { ...doc, name: e.target.value };
                                  setAdditionalDocs(newDocs);
                                }}
                                className="h-8 text-sm"
                              />
                              <DocumentUpload
                                demarcheId={demarcheId}
                                documentType={`autre_piece_${doc.id}`}
                                customName={doc.name || `Pièce ${index + 1}`}
                                label=""
                                onUploadComplete={() => handleDocumentUploadComplete(`autre_piece_${doc.id}`)}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setAdditionalDocs(additionalDocs.filter((_, i) => i !== index))}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Button 
                type="submit"
                size="lg" 
                disabled={loading || !selectedImmatriculation.trim() || ((formData.type !== 'DA' && formData.type !== 'DC') && carteGrisePrice === 0)}
                className={`w-full ${freeTokenAvailable ? 'bg-green-500 hover:bg-green-600' : 'bg-success hover:bg-success/90'}`}
              >
                {freeTokenAvailable && getTotalPrice() === 0 ? 'Valider gratuitement' : `Payer ${getTotalPrice()}€ HT`}
              </Button>
            </form>

              <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {freeTokenAvailable ? '🎁 Confirmation de votre démarche offerte' : 'Paiement de la démarche'}
                    </DialogTitle>
                    <DialogDescription>
                      {freeTokenAvailable && (
                        <span className="block text-green-600 font-medium mb-2">
                          Votre jeton gratuit sera utilisé pour cette démarche.
                        </span>
                      )}
                      Frais de dossier : {freeTokenAvailable ? (
                        <><span className="line-through text-muted-foreground">{getOriginalFraisDossier()}€</span> <span className="text-green-600 font-bold">0€ (offert)</span></>
                      ) : `${getFraisDossier()}€`}
                      {(formData.type !== 'DA' && formData.type !== 'DC') && carteGrisePrice > 0 && ` + Prix carte grise : ${carteGrisePrice.toFixed(2)}€`}
                      {trackingServicePrice > 0 && ` + Service de suivi : ${trackingServicePrice.toFixed(2)}€`}
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
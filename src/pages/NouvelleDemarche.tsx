import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, FileCheck, Plus, Gift, FileText, X, Download, Coins } from "lucide-react";
import { ActionQuestionnaire } from "@/components/ActionQuestionnaire";
import { useToast } from "@/hooks/use-toast";
import { DocumentUpload } from "@/components/DocumentUpload";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VehicleForm } from "@/components/VehicleForm";
import { VehicleFormCG } from "@/components/VehicleFormCG";
import { VehicleFormSimple } from "@/components/VehicleFormSimple";
import { VehicleInfoFormPro, VehicleInfoPro } from "@/components/VehicleInfoFormPro";
import { DocumentsNecessaires } from "@/components/DocumentsNecessaires";
import { TrackingServiceOption } from "@/components/TrackingServiceOption";
import { StripePayment } from "@/components/StripePayment";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatPrice } from "@/lib/utils";
import { extractCerfaNumber, getCerfaUrl, cerfaExists } from "@/lib/cerfa-utils";

// Types de démarches PRO qui nécessitent un traitement spécial
const PRO_DEMARCHE_TYPES = ["WW_PROVISOIRE_PRO", "W_GARAGE_PRO", "QUITUS_FISCAL_PRO"];
// Types de démarches PRO qui nécessitent les infos véhicule (VIN, marque, modèle)
const PRO_TYPES_WITH_VEHICLE = ["WW_PROVISOIRE_PRO", "QUITUS_FISCAL_PRO"];
// Types de démarches PRO qui n'ont pas besoin de bloc véhicule
const PRO_TYPES_WITHOUT_VEHICLE = ["W_GARAGE_PRO"];


export default function NouvelleDemarche() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { draftId } = useParams();
  const [garage, setGarage] = useState<any>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
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
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [payingWithTokens, setPayingWithTokens] = useState(false);
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<Record<string, string>>({});
  const [isQuestionnaireBlocked, setIsQuestionnaireBlocked] = useState(false);
  const [conditionalDocuments, setConditionalDocuments] = useState<any[]>([]);
  const demarcheIdRef = useRef<string | null>(null);
  const paymentCompletedRef = useRef(false);
  const [formData, setFormData] = useState({
    type: searchParams.get('type') || "",
    commentaire: ""
  });
  // État pour les démarches PRO - infos véhicule
  const [vehicleInfoPro, setVehicleInfoPro] = useState<VehicleInfoPro | null>(null);
  const [vehicleInfoProValid, setVehicleInfoProValid] = useState(false);
  // État pour vérifier si le questionnaire est complété
  const [questionnaireCompleted, setQuestionnaireCompleted] = useState(false);
  // Textes des réponses au questionnaire (pour DocumentsNecessaires)
  const [questionnaireAnswerTexts, setQuestionnaireAnswerTexts] = useState<Record<string, string>>({});

  // Keep refs in sync with state for cleanup
  useEffect(() => {
    demarcheIdRef.current = demarcheId;
  }, [demarcheId]);

  useEffect(() => {
    paymentCompletedRef.current = paymentCompleted;
  }, [paymentCompleted]);

  // Ne plus supprimer automatiquement les brouillons
  // Les garages peuvent les reprendre plus tard

  // Charger le brouillon si draftId est fourni
  useEffect(() => {
    const loadDraft = async () => {
      if (!draftId || !garage || draftLoaded) return;
      
      const { data: draft } = await supabase
        .from('demarches')
        .select('*')
        .eq('id', draftId)
        .eq('garage_id', garage.id)
        .eq('is_draft', true)
        .single();

      if (draft) {
        setDemarcheId(draft.id);
        setFormData({
          type: draft.type,
          commentaire: draft.commentaire || ""
        });
        setSelectedImmatriculation(draft.immatriculation || "");
        setSelectedVehicleId(draft.vehicule_id);
        setCarteGrisePrice(draft.prix_carte_grise || 0);
        setDraftLoaded(true);
      }
    };

    if (garage && draftId) {
      loadDraft();
    }
  }, [draftId, garage, draftLoaded]);

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
    // Auto-create draft when type is selected (seulement si pas de brouillon existant)
    if (formData.type && !demarcheId && garage && actionDetails && !draftId) {
      handleAutoCreateDraft();
    }
  }, [formData.type, garage, actionDetails, draftId]);

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

  // Jeton gratuit uniquement pour DA et DC
  const isFreeTokenEligible = freeTokenAvailable && (formData.type === 'DA' || formData.type === 'DC');

  const updateDemarcheMontant = async () => {
    if (!demarcheId || !actionDetails) return;

    // Frais de dossier = prix de l'action (0 si jeton gratuit ET DA/DC)
    const fraisDossierHT = isFreeTokenEligible ? 0 : actionDetails.prix;
    
    // Prix carte grise (taxe régionale, exonérée TVA) - 0 pour DA/DC
    const prixCarteGrise = (formData.type === 'DA' || formData.type === 'DC') ? 0 : carteGrisePrice;
    
    // Options
    const optionsHT = trackingServicePrice;
    
    // Total des services
    const totalServicesHT = fraisDossierHT + optionsHT;
    
    // Total TTC = carte grise + services (pas de TVA)
    const totalTTC = prixCarteGrise + totalServicesHT;

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
      setFreeTokenAvailable(data.free_token_available === true || data.unlimited_free_tokens === true);
      setTokenBalance(data.token_balance || 0);
    }
  };

  const loadActionsRapides = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('actions_rapides')
      .select('*')
      .eq('actif', true)
      .order('ordre');

    if (data) {
      // Filtrer les actions test_only sauf pour test@test.com
      const userEmail = user.email?.toLowerCase();
      const isTestUser = userEmail === 'test@test.com';
      console.log('User email:', userEmail, 'Is test user:', isTestUser);
      const filteredActions = data.filter((action: any) => {
        if (action.test_only) {
          return isTestUser;
        }
        return true;
      });
      console.log('Filtered actions:', filteredActions.length, 'Total:', data.length);
      setActionsRapides(filteredActions);
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
    
    // Total des services (pas d'options au début)
    const totalServicesHT = fraisDossierHT;
    
    // Total TTC = carte grise + services (pas de TVA)
    const totalTTC = prixCarteGrise + totalServicesHT;

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
    // Si jeton gratuit disponible ET DA/DC, le prix de l'action est 0
    if (isFreeTokenEligible) return 0;
    return actionDetails?.prix || 0;
  };

  const getOriginalFraisDossier = () => {
    return actionDetails?.prix || 0;
  };

  const getTotalPrice = () => {
    const basePrice = getFraisDossier();
    // Pour DA, DC et démarches PRO, pas de prix carte grise
    const vehiclePrice = (formData.type === 'DA' || formData.type === 'DC' || PRO_DEMARCHE_TYPES.includes(formData.type)) ? 0 : carteGrisePrice;
    return basePrice + vehiclePrice + trackingServicePrice;
  };

  // Calcul du coût en jetons (1 jeton = 5€, arrondi au supérieur)
  const getTokenCost = () => {
    // Pour les CG, le calcul est basé sur les frais de dossier uniquement (pas la carte grise)
    const fraisToConvert = getFraisDossier() + trackingServicePrice;
    return Math.ceil(fraisToConvert / 5);
  };

  const canPayWithTokens = () => {
    const tokenCost = getTokenCost();
    return tokenCost > 0 && tokenBalance >= tokenCost;
  };

  const handleTokenPayment = async () => {
    if (!demarcheId || !garage) return;
    
    const tokenCost = getTokenCost();
    
    if (tokenBalance < tokenCost) {
      toast({
        title: "Solde insuffisant",
        description: `Vous avez ${tokenBalance} jeton(s), mais ${tokenCost} sont nécessaires.`,
        variant: "destructive"
      });
      return;
    }

    setPayingWithTokens(true);

    try {
      // Déduire les jetons du solde
      const newBalance = tokenBalance - tokenCost;
      const { error: updateError } = await supabase
        .from('garages')
        .update({ token_balance: newBalance })
        .eq('id', garage.id);

      if (updateError) throw updateError;

      // Marquer la démarche comme payée avec jetons
      await supabase
        .from('demarches')
        .update({
          paye: true,
          paid_with_tokens: true,
          is_draft: false,
          documents_complets: true,
        })
        .eq('id', demarcheId);

      // Mettre à jour le solde local
      setTokenBalance(newBalance);

      // Fermer le dialog et traiter comme un succès
      setShowPaymentDialog(false);
      await handlePaymentSuccess();

    } catch (error) {
      console.error("Error processing token payment:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors du paiement par jetons",
        variant: "destructive"
      });
    } finally {
      setPayingWithTokens(false);
    }
  };

  const handleTrackingServiceChange = (price: number) => {
    setTrackingServicePrice(price);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation spécifique pour les démarches PRO
    if (PRO_DEMARCHE_TYPES.includes(formData.type)) {
      // Vérifier que le questionnaire est complété
      if (!questionnaireCompleted) {
        toast({
          title: "Questionnaire incomplet",
          description: "Veuillez répondre à toutes les questions avant de continuer",
          variant: "destructive"
        });
        return;
      }

      // Vérifier les infos véhicule pour les démarches qui les requièrent
      if (PRO_TYPES_WITH_VEHICLE.includes(formData.type) && !vehicleInfoProValid) {
        toast({
          title: "Informations véhicule incomplètes",
          description: "Veuillez remplir toutes les informations obligatoires du véhicule (VIN, marque, modèle)",
          variant: "destructive"
        });
        return;
      }
    } else {
      // Validation classique pour les démarches non-PRO
      if (!selectedImmatriculation.trim()) {
        toast({
          title: "Erreur",
          description: "Veuillez sélectionner ou créer un véhicule",
          variant: "destructive"
        });
        return;
      }
    }

    // Check if all obligatory documents are uploaded
    // Pour les démarches PRO, on utilise les documents du composant DocumentsNecessaires
    if (!PRO_DEMARCHE_TYPES.includes(formData.type)) {
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

    // Charger les données de la démarche pour l'envoi des mails
    const { data: demarche } = await supabase
      .from('demarches')
      .select('*, vehicules(*)')
      .eq('id', demarcheId)
      .single();

    // Si jeton gratuit utilisé (DA/DC uniquement)
    if (isFreeTokenEligible && garage) {
      // Marquer le jeton comme consommé seulement si ce n'est pas un compte avec jetons illimités
      if (!garage.unlimited_free_tokens) {
        await supabase
          .from('garages')
          .update({ free_token_available: false })
          .eq('id', garage.id);
        
        setFreeTokenAvailable(false);
      }

      // Toujours envoyer les mails admin pour les démarches avec jeton gratuit
      if (demarche) {
        const adminEmails = ["contact@discountcartegrise.fr", "mathieugaillac4@gmail.com"];
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
            {isFreeTokenEligible && (
              <Alert className="mb-6 border-2 border-green-500 bg-green-500/10">
                <Gift className="h-5 w-5 text-green-500" />
                <AlertTitle className="text-green-600 font-bold">🎁 Offre de bienvenue activée</AlertTitle>
                <AlertDescription className="text-green-600">
                  Les frais de dossier sont offerts pour cette démarche ! Cette démarche sera entièrement gratuite.
                </AlertDescription>
              </Alert>
            )}
            {freeTokenAvailable && !isFreeTokenEligible && (formData.type === 'DA' || formData.type === 'DC' || !formData.type) && (
              <Alert className="mb-6 border-2 border-blue-500 bg-blue-500/10">
                <Gift className="h-5 w-5 text-blue-500" />
                <AlertTitle className="text-blue-600 font-bold">💡 Offre de bienvenue disponible</AlertTitle>
                <AlertDescription className="text-blue-600">
                  Votre jeton gratuit est utilisable uniquement pour une Déclaration de cession ou une Déclaration d'achat.
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
                        {action.titre} - {(freeTokenAvailable && (action.code === 'DA' || action.code === 'DC')) ? '0€ (offert)' : `${action.prix}€`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {garage && (
                <>
                  {/* Formulaires véhicule classiques */}
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
                  ) : PRO_TYPES_WITH_VEHICLE.includes(formData.type) ? (
                    /* Formulaire véhicule PRO (VIN, marque, modèle sans immatriculation) */
                    <VehicleInfoFormPro
                      onVehicleInfoChange={(data, isValid) => {
                        setVehicleInfoPro(data);
                        setVehicleInfoProValid(isValid);
                        // Mettre une immatriculation temporaire basée sur le VIN
                        if (data.vin) {
                          setSelectedImmatriculation(`VIN-${data.vin.slice(-6)}`);
                        }
                      }}
                      requireVin={formData.type === 'WW_PROVISOIRE_PRO' || formData.type === 'QUITUS_FISCAL_PRO'}
                      requireDateMec={formData.type === 'WW_PROVISOIRE_PRO'}
                    />
                  ) : PRO_TYPES_WITHOUT_VEHICLE.includes(formData.type) ? (
                    /* W_GARAGE_PRO - Pas de bloc véhicule */
                    <Alert className="border-blue-500 bg-blue-50">
                      <AlertDescription className="text-blue-800">
                        Cette démarche est liée à votre entreprise et non à un véhicule précis. 
                        Aucune information véhicule n'est requise.
                      </AlertDescription>
                    </Alert>
                  ) : !PRO_DEMARCHE_TYPES.includes(formData.type) && (
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

              {/* Questions conditionnelles */}
              {actionDetails?.id && (
                <ActionQuestionnaire
                  actionId={actionDetails.id}
                  onAnswersChange={(answers, isBlocked, condDocs, allAnswered, answerTexts) => {
                    setQuestionnaireAnswers(answers);
                    setIsQuestionnaireBlocked(isBlocked);
                    setConditionalDocuments(condDocs);
                    setQuestionnaireAnswerTexts(answerTexts);
                    // Questionnaire complété = toutes les questions ont une réponse ET pas de blocage
                    setQuestionnaireCompleted(allAnswered && !isBlocked);
                  }}
                />
              )}

              {/* Documents Nécessaires pour démarches PRO - Affiché après le questionnaire */}
              {PRO_DEMARCHE_TYPES.includes(formData.type) && demarcheId && questionnaireCompleted && !isQuestionnaireBlocked && (
                <DocumentsNecessaires
                  demarcheType={formData.type}
                  demarcheId={demarcheId}
                  questionnaireAnswers={questionnaireAnswerTexts}
                  onDocumentUpload={(docType) => {
                    setUploadedDocuments(prev => new Set(prev).add(docType));
                  }}
                  uploadedDocuments={uploadedDocuments}
                />
              )}

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
                        
                        // Vérifier si c'est un CERFA téléchargeable
                        const cerfaNumber = extractCerfaNumber(doc.nom_document);
                        const hasCerfa = cerfaNumber && cerfaExists(cerfaNumber);
                        
                        // Fonction pour rendre le label avec lien CERFA
                        const renderDocLabel = (labelText: string, isObligatoire: boolean) => {
                          if (!hasCerfa || !cerfaNumber) {
                            return (
                              <Label className="text-sm font-medium flex items-center gap-2 flex-wrap">
                                {labelText}
                                {isObligatoire ? (
                                  <span className="text-destructive text-base font-bold">*</span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">(optionnel)</span>
                                )}
                              </Label>
                            );
                          }
                          
                          // Séparer le texte pour mettre le CERFA en lien cliquable
                          const cerfaRegex = /(\(cerfa\s+\d+\*\d+\))/i;
                          const parts = labelText.split(cerfaRegex);
                          
                          return (
                            <Label className="text-sm font-medium flex items-center gap-2 flex-wrap">
                              {parts.map((part, index) => {
                                if (cerfaRegex.test(part)) {
                                  return (
                                    <a
                                      key={index}
                                      href={getCerfaUrl(cerfaNumber)}
                                      download
                                      className="text-primary hover:text-primary/80 underline inline-flex items-center gap-1 font-medium"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {part}
                                      <Download className="h-3 w-3" />
                                    </a>
                                  );
                                }
                                return <span key={index}>{part}</span>;
                              })}
                              {isObligatoire ? (
                                <span className="text-destructive text-base font-bold">*</span>
                              ) : (
                                <span className="text-muted-foreground text-xs">(optionnel)</span>
                              )}
                            </Label>
                          );
                        };
                        
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
                                  {renderDocLabel(doc.nom_document, doc.obligatoire)}
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
                              {renderDocLabel(doc.nom_document, doc.obligatoire)}
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
                disabled={
                  loading || 
                  isQuestionnaireBlocked ||
                  // Pour les démarches PRO avec véhicule, vérifier les infos véhicule
                  (PRO_TYPES_WITH_VEHICLE.includes(formData.type) && !vehicleInfoProValid) ||
                  // Pour les démarches PRO, vérifier que le questionnaire est complété
                  (PRO_DEMARCHE_TYPES.includes(formData.type) && !questionnaireCompleted) ||
                  // Pour les démarches classiques, vérifier l'immatriculation
                  (!PRO_DEMARCHE_TYPES.includes(formData.type) && !selectedImmatriculation.trim()) ||
                  // Pour CG, vérifier le prix carte grise
                  ((formData.type !== 'DA' && formData.type !== 'DC' && !PRO_DEMARCHE_TYPES.includes(formData.type)) && carteGrisePrice === 0)
                }
                className={`w-full ${isFreeTokenEligible ? 'bg-green-500 hover:bg-green-600' : 'bg-success hover:bg-success/90'}`}
              >
                {isQuestionnaireBlocked ? 'Démarche impossible' : (isFreeTokenEligible && getTotalPrice() === 0 ? 'Valider gratuitement' : `Payer ${formatPrice(getTotalPrice())}€ HT`)}
              </Button>
            </form>

              <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {isFreeTokenEligible ? '🎁 Confirmation de votre démarche offerte' : 'Paiement de la démarche'}
                    </DialogTitle>
                    <DialogDescription>
                      {isFreeTokenEligible && (
                        <span className="block text-green-600 font-medium mb-2">
                          Votre jeton gratuit sera utilisé pour cette démarche.
                        </span>
                      )}
                      Frais de dossier : {isFreeTokenEligible ? (
                        <><span className="line-through text-muted-foreground">{formatPrice(getOriginalFraisDossier())}€</span> <span className="text-green-600 font-bold">0€ (offert)</span></>
                      ) : `${formatPrice(getFraisDossier())}€`}
                      {(formData.type !== 'DA' && formData.type !== 'DC') && carteGrisePrice > 0 && ` + Prix carte grise : ${formatPrice(carteGrisePrice)}€`}
                      {trackingServicePrice > 0 && ` + Service de suivi : ${formatPrice(trackingServicePrice)}€`}
                      <br />
                      Montant total : {formatPrice(getTotalPrice())}€
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-6">
                    {/* Token Payment Option */}
                    {!isFreeTokenEligible && getTokenCost() > 0 && (
                      <Card className={`border-2 ${canPayWithTokens() ? 'border-primary bg-primary/5' : 'border-muted bg-muted/30'}`}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                <Coins className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-semibold">Payer avec vos jetons</p>
                                <p className="text-sm text-muted-foreground">
                                  Coût : {getTokenCost()} jeton{getTokenCost() > 1 ? 's' : ''} • Votre solde : {tokenBalance} jeton{tokenBalance > 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                            <Button
                              onClick={handleTokenPayment}
                              disabled={!canPayWithTokens() || payingWithTokens}
                              className="bg-primary hover:bg-primary/90"
                            >
                              {payingWithTokens ? 'Paiement...' : canPayWithTokens() ? 'Utiliser mes jetons' : 'Solde insuffisant'}
                            </Button>
                          </div>
                          {!canPayWithTokens() && tokenBalance > 0 && (
                            <p className="text-sm text-destructive mt-2">
                              Il vous manque {getTokenCost() - tokenBalance} jeton{getTokenCost() - tokenBalance > 1 ? 's' : ''} pour cette démarche.
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Stripe Payment Option */}
                    {demarcheId && (
                      <div>
                        {!isFreeTokenEligible && getTokenCost() > 0 && (
                          <div className="flex items-center gap-2 mb-4">
                            <div className="flex-1 h-px bg-border"></div>
                            <span className="text-sm text-muted-foreground">ou</span>
                            <div className="flex-1 h-px bg-border"></div>
                          </div>
                        )}
                        <StripePayment
                          demarcheId={demarcheId}
                          amount={getTotalPrice()}
                          onSuccess={handlePaymentSuccess}
                          onCancel={handlePaymentCancel}
                        />
                      </div>
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
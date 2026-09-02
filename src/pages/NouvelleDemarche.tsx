import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, FileCheck, Plus, Gift, FileText, X, Download, Coins, Check, ChevronDown, FileQuestion } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ActionQuestionnaire } from "@/components/ActionQuestionnaire";
import { useToast } from "@/hooks/use-toast";
import { DocumentUpload } from "@/components/DocumentUpload";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VehicleForm } from "@/components/VehicleForm";
import { VehicleFormCG } from "@/components/VehicleFormCG";
import { VehicleFormSimple } from "@/components/VehicleFormSimple";
import { VehicleInfoFormPro, VehicleInfoPro } from "@/components/VehicleInfoFormPro";
import { PaymentModeSelector, PaymentMode } from "@/components/demarche/PaymentModeSelector";
import { CgvAcceptance } from "@/components/payment/CgvAcceptance";
import { typeHasPaymentChoice } from "@/lib/demarchePayment";
import { DocumentsNecessaires, getDocumentsConfig } from "@/components/DocumentsNecessaires";
// TrackingServiceOption supprimé - options SMS retirées
import { StripePayment } from "@/components/StripePayment";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatPrice } from "@/lib/utils";
import { extractCerfaNumber, getCerfaUrl, cerfaExists } from "@/lib/cerfa-utils";
import { getVehicleByPlate } from "@/lib/vehicle-api";
import { ExpressOptionCard } from "@/components/ExpressOptionCard";
import { NonGageChoice } from "@/components/demarche/NonGageChoice";
import { MandatGenerator } from "@/components/mandat/MandatGenerator";
import type { MandatData } from "@/lib/mandat";
import {
  isNonGageRequired,
  getNonGageSurcharge,
  getNonGagePrice,
  NON_GAGE_DOCUMENT_LABEL,
  NonGageMode,
} from "@/lib/nonGage";
import { isExpressEligible, getExpressSurcharge, EXPRESS_LABEL } from "@/lib/expressOption";
import type { PriceCalculation } from "@/utils/calculatePrice";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Types de démarches PRO qui nécessitent un traitement spécial
const PRO_DEMARCHE_TYPES = [
  "WW_PROVISOIRE_PRO",
  "W_GARAGE_PRO",
  "QUITUS_FISCAL_PRO",
  "CHANGEMENT_ADRESSE_PRO",
  "DUPLICATA_CG_PRO",
  "FIV_PRO",
  "CG_NEUF_PRO",
  "MODIF_CG_PRO",
  "ANNULATION_CPI_WW_PRO",
  "CHANGEMENT_ADRESSE_LOCATAIRE_PRO",
  "SUCCESSION_HERITAGE_PRO",
  "COTITULAIRE_PRO",
  "ANNULER_CORRIGER_DC_DA_PRO",
  "CYCLO_ANCIEN_PRO",
  "IMMAT_DEFINITIVE_PRO",
];
// Types de démarches PRO qui nécessitent les infos véhicule manuelles (VIN, marque, modèle)
const PRO_TYPES_WITH_VEHICLE = ["WW_PROVISOIRE_PRO", "QUITUS_FISCAL_PRO", "CG_NEUF_PRO"];
// Types de démarches PRO qui utilisent la plaque d'immatriculation (lookup API)
const PRO_TYPES_WITH_PLATE = ["DUPLICATA_CG_PRO", "FIV_PRO", "MODIF_CG_PRO", "ANNULATION_CPI_WW_PRO", "SUCCESSION_HERITAGE_PRO", "COTITULAIRE_PRO", "ANNULER_CORRIGER_DC_DA_PRO", "IMMAT_DEFINITIVE_PRO"];
// Types de démarches PRO qui n'ont pas besoin de bloc véhicule
const PRO_TYPES_WITHOUT_VEHICLE = ["W_GARAGE_PRO", "CHANGEMENT_ADRESSE_PRO", "CHANGEMENT_ADRESSE_LOCATAIRE_PRO", "CYCLO_ANCIEN_PRO"];

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
  // Détail complet du calcul carte grise (snapshot), remonté par VehicleFormCG.
  const [carteGriseDetails, setCarteGriseDetails] = useState<PriceCalculation | null>(null);
  const [expressSelected, setExpressSelected] = useState(false);
  // Certificat de non-gage (CG/DA/DC) : null tant que le garage n'a pas choisi.
  const [nonGageMode, setNonGageMode] = useState<NonGageMode | null>(null);
  // Mandat 13757 : qui est le mandant. Par defaut le client final, cas le plus
  // frequent ; le garage ne se designe mandant que pour ses propres vehicules.
  const [mandantType, setMandantType] = useState<'garage' | 'client'>('client');
  const [mandatSauvegarde, setMandatSauvegarde] = useState<MandatData | null>(null);
  // trackingServicePrice supprimé - options SMS retirées
  const [freeTokenAvailable, setFreeTokenAvailable] = useState<boolean>(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [payingWithTokens, setPayingWithTokens] = useState(false);
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<Record<string, string>>({});
  const [isQuestionnaireBlocked, setIsQuestionnaireBlocked] = useState(false);
  const [conditionalDocuments, setConditionalDocuments] = useState<any[]>([]);
  const demarcheIdRef = useRef<string | null>(null);
  const paymentCompletedRef = useRef(false);
  // Marque/modèle déjà obtenus par le formulaire véhicule pour la plaque en
  // cours. VehicleFormCG appelle l'API plaque (payante) pour calculer la taxe :
  // ce qu'il en rapporte est conservé ici pour ne pas la rappeler une seconde
  // fois sur la même plaque. Réinitialisé dès que la plaque change.
  const vehiculeConnuRef = useRef<{ plate: string; marque: string | null; modele: string | null } | null>(null);
  const [formData, setFormData] = useState({
    type: searchParams.get('type') || "",
    commentaire: ""
  });
  // État pour les démarches PRO - infos véhicule
  const [vehicleInfoPro, setVehicleInfoPro] = useState<VehicleInfoPro | null>(null);
  const [vehicleInfoProValid, setVehicleInfoProValid] = useState(false);
  // État pour vérifier si le questionnaire est complété
  const [questionnaireCompleted, setQuestionnaireCompleted] = useState(false);
  // Ouverture/fermeture du bloc questionnaire (modifiable même après complétion)
  const [isQuestionnaireOpen, setIsQuestionnaireOpen] = useState(true);
  // Textes des réponses au questionnaire (pour DocumentsNecessaires)
  const [questionnaireAnswerTexts, setQuestionnaireAnswerTexts] = useState<Record<string, string>>({});
  // Payment mode state
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("pro_pays_all");
  const [clientEmail, setClientEmail] = useState<string | undefined>();
  const [clientPhone, setClientPhone] = useState<string | undefined>();
  const [clientNom, setClientNom] = useState<string | undefined>();
  const [clientPrenom, setClientPrenom] = useState<string | undefined>();
  const [clientAdresse, setClientAdresse] = useState<string | undefined>();
  const [paymentModeConfirmed, setPaymentModeConfirmed] = useState(false);
  // Acceptation des CGV, exigée avant de finaliser la démarche quel que soit le
  // moyen retenu (carte, jetons, jeton gratuit ou lien envoyé au client).
  const [cgvAccepted, setCgvAccepted] = useState(false);

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
        setExpressSelected(draft.express || false);
        setNonGageMode((draft.non_gage_mode as NonGageMode) || null);
        setMandantType((draft.mandant_type as 'garage' | 'client') || 'client');
        setMandatSauvegarde((draft.mandat_data as unknown as MandatData) || null);
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
      } else if (carteGrisePrice > 0 || isExpressEligible(formData.type)) {
        updateDemarcheMontant();
      }
    }
  }, [carteGrisePrice, demarcheId, actionDetails, formData.type, expressSelected, nonGageMode]);

  // Jeton gratuit uniquement pour DA et DC
  const isFreeTokenEligible = freeTokenAvailable && (formData.type === 'DA' || formData.type === 'DC');

  // isDuplicataCgPro est maintenant dans PRO_TYPES_WITH_VEHICLE, plus besoin de traitement spécial

  const proDocsState = useMemo(() => {
    if (!PRO_DEMARCHE_TYPES.includes(formData.type)) {
      return { requiredIds: [] as string[], allRequiredUploaded: true, blockingMessage: null as string | null };
    }
    const { documents, blockingMessage } = getDocumentsConfig(formData.type, questionnaireAnswerTexts);
    const requiredIds = documents.filter((d) => d.obligatoire).map((d) => d.id);
    const allRequiredUploaded = requiredIds.every((id) => uploadedDocuments.has(id));
    return { requiredIds, allRequiredUploaded, blockingMessage };
  }, [formData.type, questionnaireAnswerTexts, uploadedDocuments]);

  // Deduit de la liste de pieces plutot que d'une liste de types codee en dur :
  // si la configuration admin change, le mandat suit sans retoucher au code.
  const mandatRequis = useMemo(() => {
    const noms = PRO_DEMARCHE_TYPES.includes(formData.type)
      ? getDocumentsConfig(formData.type, questionnaireAnswerTexts).documents.map((d) => d.nom)
      : documentsRequis.map((d) => d.nom_document as string);
    return noms.some((n: string) => /13757/.test(n ?? ""));
  }, [formData.type, questionnaireAnswerTexts, documentsRequis]);

  // Clé sous laquelle la pièce « mandat » est comptabilisée dans ce tunnel :
  // l'identifiant du document pour les démarches PRO, « doc_<rang> » pour les
  // démarches classiques. Sans elle, le mandat serait généré mais la pièce
  // resterait marquée manquante et bloquerait le paiement.
  const mandatDocumentType = useMemo(() => {
    if (PRO_DEMARCHE_TYPES.includes(formData.type)) {
      const doc = getDocumentsConfig(formData.type, questionnaireAnswerTexts).documents
        .find((d) => /13757/.test(d.nom ?? ""));
      return doc?.id;
    }
    const idx = documentsRequis.findIndex((d) => /13757/.test(d.nom_document ?? ""));
    return idx >= 0 ? `doc_${idx + 1}` : undefined;
  }, [formData.type, questionnaireAnswerTexts, documentsRequis]);

  useEffect(() => {
    console.log("=== DEBUG DUPLICATA_CG_PRO ===");
    console.log("type démarche:", formData.type);
    console.log("demarcheId:", demarcheId);
    console.log("questionnaireCompleted:", questionnaireCompleted);
    console.log("isQuestionnaireBlocked:", isQuestionnaireBlocked);
    console.log("garage:", garage?.id);
    console.log("actionDetails:", actionDetails?.code);
  }, [formData.type, questionnaireCompleted, demarcheId, isQuestionnaireBlocked, garage, actionDetails]);

  // Snapshot du détail carte grise (figé au calcul). Renvoyé UNIQUEMENT quand le
  // détail est en main ET qu'il y a une taxe carte grise (jamais DA/DC). Sinon
  // objet vide → ces colonnes ne sont pas incluses dans l'écriture, pour ne pas
  // écraser un snapshot déjà persisté (ex : rechargement d'un brouillon, où
  // carteGriseDetails est null). Aucun recalcul : valeurs issues de priceResult.
  const buildCarteGriseSnapshot = (): Record<string, number | null> => {
    const prixCG = (formData.type === 'DA' || formData.type === 'DC') ? 0 : carteGrisePrice;
    if (!carteGriseDetails || prixCG <= 0) return {};
    return {
      prix_cv: carteGriseDetails.prixCV,
      prix_cv_avant_abattement: carteGriseDetails.prixCVAvantAbattement ?? null,
      taxe_parafiscale: carteGriseDetails.taxeParafiscale,
      sous_total_arrondi: carteGriseDetails.sousTotalArrondi,
    };
  };

  const updateDemarcheMontant = async () => {
    if (!demarcheId || !actionDetails) return;

    // Frais de dossier = prix de l'action (0 si jeton gratuit ET DA/DC)
    const fraisDossierHT = isFreeTokenEligible ? 0 : actionDetails.prix;
    
    // Prix carte grise (taxe régionale, exonérée TVA) - 0 pour DA/DC
    const prixCarteGrise = (formData.type === 'DA' || formData.type === 'DC') ? 0 : carteGrisePrice;
    
    // Total des services
    const totalServicesHT = fraisDossierHT;

    // Total TTC = carte grise + services + surcoûts express et non-gage (pas de TVA)
    const totalTTC = prixCarteGrise + totalServicesHT + getExpressSurchargePro() + getNonGageSurchargePro();

    await supabase
      .from('demarches')
      .update({
        prix_carte_grise: prixCarteGrise,
        frais_dossier: fraisDossierHT,
        montant_ht: totalServicesHT,
        montant_ttc: totalTTC,
        express: expressSelected,
        non_gage_mode: nonGageMode,
        ...buildCarteGriseSnapshot(),
      } as any)
      .eq('id', demarcheId);
  };

  // Le surcoût non-gage est porté par une ligne `tracking_services`, comme les
  // autres options : la facture pro (generate-facture) et la page de paiement
  // client la reprennent alors sans code supplémentaire.
  const handleNonGageChange = async (mode: NonGageMode) => {
    setNonGageMode(mode);
    if (!demarcheId) return;

    if (mode === "facture") {
      await supabase
        .from('tracking_services')
        .upsert({
          demarche_id: demarcheId,
          service_type: 'certificat_non_gage',
          price: getNonGagePrice("pro"),
          status: 'pending',
        }, { onConflict: 'demarche_id,service_type' });
    } else {
      await supabase
        .from('tracking_services')
        .delete()
        .eq('demarche_id', demarcheId)
        .eq('service_type', 'certificat_non_gage');
    }
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

  // Enrichit la démarche avec marque/modèle.
  // Fire-and-forget : ne doit JAMAIS bloquer ni faire échouer la création,
  // et ne ralentit pas la navigation (pas de await côté appelant).
  //
  // L'API plaque n'est appelée QUE si marque et modèle sont réellement inconnus.
  // Quand le formulaire véhicule les a déjà rapportés (VehicleFormCG les obtient
  // en calculant la taxe, VehicleForm les lit dans la table vehicules), ils
  // arrivent ici via `connu` et sont écrits directement : l'appel payant à
  // vehicle-lookup pour une plaque déjà interrogée quelques secondes plus tôt
  // disparaît.
  const enrichDemarcheWithVehicle = (
    newDemarcheId: string,
    plate: string,
    connu?: { plate: string; marque: string | null; modele: string | null } | null
  ) => {
    if (!plate || plate === 'TEMP') return;

    const dejaConnu =
      connu && connu.plate === plate && (connu.marque || connu.modele) ? connu : null;

    void (async () => {
      try {
        let marque: string | null | undefined = dejaConnu?.marque;
        let modele: string | null | undefined = dejaConnu?.modele;

        if (!dejaConnu) {
          const res = await getVehicleByPlate(plate);
          if (!res?.success) return;
          marque = res?.data?.marque;
          modele = res?.data?.modele;
        }

        if (marque || modele) {
          await supabase
            .from('demarches')
            .update({ marque: marque ?? null, modele: modele ?? null } as any)
            .eq('id', newDemarcheId);
        }
      } catch (e) {
        console.log("Enrichissement marque/modèle ignoré:", e);
      }
    })();
  };

  const handleAutoCreateDraft = async () => {
    if (!garage || demarcheId || !actionDetails) return;

    // Le jeton gratuit ne s'applique qu'aux démarches DA et DC
    const isFreeTokenApplicable = freeTokenAvailable && (formData.type === 'DA' || formData.type === 'DC');

    // Frais de dossier = prix de l'action (0 si jeton gratuit ET DA/DC uniquement)
    const fraisDossierHT = isFreeTokenApplicable ? 0 : actionDetails.prix;
    
    // Prix carte grise (taxe régionale, exonérée TVA) - 0 pour DA/DC
    const prixCarteGrise = (formData.type === 'DA' || formData.type === 'DC') ? 0 : carteGrisePrice;
    
    // Total des services (pas d'options au début)
    const totalServicesHT = fraisDossierHT;

    // Total TTC = carte grise + services + surcoût express (pas de TVA)
    const totalTTC = prixCarteGrise + totalServicesHT + getExpressSurchargePro();

    const insertData: any = {
        garage_id: garage.id,
        type: formData.type,
        immatriculation: selectedImmatriculation || 'TEMP',
        commentaire: formData.commentaire,
        prix_carte_grise: prixCarteGrise,
        frais_dossier: fraisDossierHT,
        montant_ht: totalServicesHT,
        montant_ttc: totalTTC,
        express: expressSelected,
        status: 'en_saisie',
        is_draft: true,
        paye: false,
        vehicule_id: selectedVehicleId,
        // Le jeton gratuit ne s'applique qu'aux DA/DC
        is_free_token: isFreeTokenApplicable,
        ...buildCarteGriseSnapshot(),
    };

    // Ajouter les champs split payment seulement si le mode n'est pas le défaut
    // (ces colonnes peuvent ne pas encore exister en base)
    if (paymentMode && paymentMode !== 'pro_pays_all') {
      insertData.payment_mode = paymentMode;
      if (clientEmail) insertData.client_email = clientEmail;
      if (clientPhone) insertData.client_phone = clientPhone;
      if (clientNom) insertData.client_nom = clientNom;
      if (clientPrenom) insertData.client_prenom = clientPrenom;
      if (clientAdresse) insertData.client_adresse = clientAdresse;
    }

    const { data, error } = await supabase
      .from('demarches')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Error creating draft demarche:", error);
      // Retry without split payment columns if they don't exist yet
      if (error.message?.includes('payment_mode') || error.message?.includes('client_email') || error.message?.includes('client_phone') || error.code === '42703') {
        const { data: retryData, error: retryError } = await supabase
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
            express: expressSelected,
            status: 'en_saisie',
            is_draft: true,
            paye: false,
            vehicule_id: selectedVehicleId,
            is_free_token: isFreeTokenApplicable,
            ...buildCarteGriseSnapshot(),
          } as any)
          .select()
          .single();
        if (!retryError && retryData) {
          setDemarcheId(retryData.id);
          enrichDemarcheWithVehicle(retryData.id, selectedImmatriculation, vehiculeConnuRef.current);
        } else {
          console.error("Retry also failed:", retryError);
        }
      }
    } else if (data) {
      setDemarcheId(data.id);
      enrichDemarcheWithVehicle(data.id, selectedImmatriculation, vehiculeConnuRef.current);
    }
  };

  const handleVehicleSelect = async (vehicleId: string, immatriculation: string, vehicleData?: any) => {
    // Les CG passent un id bidon "temp-..." (généré par VehicleFormCG) qui n'est pas
    // un UUID : il ferait échouer l'update sur la FK vehicule_id. On ne garde que les vrais ids.
    const realVehicleId = (vehicleId && !vehicleId.startsWith('temp-')) ? vehicleId : null;
    setSelectedVehicleId(realVehicleId);
    setSelectedImmatriculation(immatriculation);

    // Le 3e argument porte les données que le formulaire a DÉJÀ obtenues pour
    // cette plaque (VehicleFormCG les tient de l'appel API fait pour la taxe ;
    // VehicleForm les tient de la table vehicules). On les mémorise pour la
    // création du brouillon, qui peut survenir après cette sélection.
    const marque: string | null = vehicleData?.marque ?? null;
    const modele: string | null = vehicleData?.modele ?? null;
    vehiculeConnuRef.current =
      immatriculation && (marque || modele) ? { plate: immatriculation, marque, modele } : null;

    // Update the draft demarche immatriculation in DB if it exists
    if (demarcheId && immatriculation) {
      const updatePayload: any = { immatriculation };
      if (realVehicleId) updatePayload.vehicule_id = realVehicleId;
      // Marque/modèle déjà connus : écrits dans le MÊME update, et aucun appel
      // à l'API plaque. Sinon seulement, on retombe sur l'enrichissement.
      if (marque) updatePayload.marque = marque;
      if (modele) updatePayload.modele = modele;

      await supabase
        .from('demarches')
        .update(updatePayload)
        .eq('id', demarcheId);

      if (!marque && !modele) {
        // Rien de connu : enrichissement via l'API plaque
        // (fire-and-forget ; ignore TEMP/plaque vide en interne)
        enrichDemarcheWithVehicle(demarcheId, immatriculation);
      }
    }
  };

  const handlePriceCalculated = (price: number, details?: PriceCalculation | null) => {
    setCarteGrisePrice(price);
    setCarteGriseDetails(details ?? null);
  };


  const getFraisDossier = () => {
    // Si jeton gratuit disponible ET DA/DC, le prix de l'action est 0
    if (isFreeTokenEligible) return 0;
    return actionDetails?.prix || 0;
  };

  const getOriginalFraisDossier = () => {
    return actionDetails?.prix || 0;
  };

  // Surcoût de l'option express (0 si non sélectionnée ou type non éligible)
  const getExpressSurchargePro = () =>
    (expressSelected && isExpressEligible(formData.type)) ? getExpressSurcharge(formData.type) : 0;

  // Surcoût du certificat de non-gage quand le garage nous en confie la commande.
  const getNonGageSurchargePro = () =>
    getNonGageSurcharge(formData.type, nonGageMode, "pro");

  const getTotalPrice = () => {
    const basePrice = getFraisDossier();
    // Pour DA, DC et démarches PRO, pas de prix carte grise
    const vehiclePrice = (formData.type === 'DA' || formData.type === 'DC' || PRO_DEMARCHE_TYPES.includes(formData.type)) ? 0 : carteGrisePrice;
    return basePrice + vehiclePrice + getExpressSurchargePro() + getNonGageSurchargePro();
  };

  // En mode split: le pro paie uniquement les frais de dossier (+ options tracking)
  // Le client paie la carte grise (taxe régionale)
  const getProPrice = () => {
    return getFraisDossier() + getExpressSurchargePro() + getNonGageSurchargePro();
  };

  const getClientPrice = () => {
    return (formData.type === 'DA' || formData.type === 'DC' || PRO_DEMARCHE_TYPES.includes(formData.type)) ? 0 : carteGrisePrice;
  };

  // Coût en jetons. 1 jeton = 1 € : garages.token_balance est stocké EN EUROS
  // (cf. webhook-stripe, PaiementDemarche, Dashboard). Aucune conversion à faire.
  const getTokenCost = () => {
    // Pour les CG, le calcul est basé sur les frais de dossier (+ options) uniquement (pas la carte grise)
    return getFraisDossier() + getExpressSurchargePro() + getNonGageSurchargePro();
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
        description: `Votre solde est de ${formatPrice(tokenBalance)}€, mais ${formatPrice(tokenCost)}€ sont nécessaires.`,
        variant: "destructive"
      });
      return;
    }

    setPayingWithTokens(true);

    try {
      // Déduire les jetons du solde
      const newBalance = Math.round((tokenBalance - tokenCost) * 100) / 100;
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

  // handleTrackingServiceChange supprimé - options SMS retirées

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

      // Note: Pour les PRO_TYPES_WITH_VEHICLE, la validation est faite plus bas avec vehicleInfoProValid

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
    if (PRO_DEMARCHE_TYPES.includes(formData.type)) {
      // Pour les démarches PRO, on utilise les documents du composant DocumentsNecessaires
      if (proDocsState.blockingMessage) {
        toast({
          title: "Démarche impossible",
          description: proDocsState.blockingMessage,
          variant: "destructive",
        });
        return;
      }

      if (!proDocsState.allRequiredUploaded) {
        toast({
          title: "Documents obligatoires manquants",
          description: "Veuillez uploader toutes les pièces justificatives obligatoires avant de passer au paiement.",
          variant: "destructive",
        });
        return;
      }
    } else {
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

    // Certificat de non-gage (CG/DA/DC) : le choix est imposé, et s'il a été
    // décidé de le fournir soi-même la pièce doit être déposée avant paiement.
    if (isNonGageRequired(formData.type)) {
      if (!nonGageMode) {
        toast({
          title: "Certificat de non-gage",
          description: "Indiquez si vous fournissez le certificat ou si nous devons le commander.",
          variant: "destructive",
        });
        return;
      }
      if (nonGageMode === 'fourni' && !uploadedDocuments.has('non_gage')) {
        toast({
          title: "Certificat de non-gage manquant",
          description: "Déposez le certificat, ou choisissez que nous le commandions pour vous.",
          variant: "destructive",
        });
        return;
      }
    }

    // --- Garde anti-lien-faux ---------------------------------------------
    // Seule la carte grise (CG) porte une taxe régionale (cf. VehicleFormCG /
    // calculatePrice, rendus uniquement pour CG). Pour tout autre type,
    // prix_carte_grise = 0 est normal et ne doit jamais bloquer le paiement.
    const typeIsTaxable = formData.type === 'CG';
    // Le paiement partagé est réservé aux cartes grises.
    if (paymentMode === 'split' && !typeIsTaxable) {
      toast({
        title: "Mode indisponible",
        description: "Le paiement partagé est réservé aux cartes grises.",
        variant: "destructive",
      });
      return;
    }
    // Carte grise : split et client_pays_all exigent une taxe réellement calculée.
    if ((paymentMode === 'split' || paymentMode === 'client_pays_all') && typeIsTaxable && !(carteGrisePrice > 0)) {
      toast({
        title: "Taxe carte grise non calculée",
        description: "Impossible d'envoyer un lien au client : la taxe n'a pas pu être calculée. Vérifiez les informations du véhicule (plaque, puissance fiscale) puis réessayez.",
        variant: "destructive",
      });
      return;
    }

    // Update before payment
    if (demarcheId) {
      // Pour les démarches PRO avec infos véhicule, créer un véhicule dans la base
      let vehicleIdToUse = selectedVehicleId;
      
      if (PRO_TYPES_WITH_VEHICLE.includes(formData.type) && vehicleInfoPro && garage) {
        // Créer un véhicule avec les infos PRO
        const { data: newVehicle, error: vehicleError } = await supabase
          .from('vehicules')
          .insert({
            garage_id: garage.id,
            immatriculation: selectedImmatriculation || `VIN-${vehicleInfoPro.vin?.slice(-6) || 'PRO'}`,
            marque: vehicleInfoPro.marque,
            modele: vehicleInfoPro.modele,
            vin: vehicleInfoPro.vin,
            date_mec: vehicleInfoPro.date_mec || null
          })
          .select()
          .single();
        
        if (!vehicleError && newVehicle) {
          vehicleIdToUse = newVehicle.id;
        }
      }
      
      const updateData: any = {
          immatriculation: selectedImmatriculation,
          commentaire: formData.commentaire,
          vehicule_id: vehicleIdToUse,
          payment_mode: paymentMode || 'pro_pays_all',
          client_email: clientEmail || null,
          client_phone: clientPhone || null,
          client_nom: clientNom || null,
          client_prenom: clientPrenom || null,
          client_adresse: clientAdresse || null,
          express: expressSelected,
      };
      console.log("=== UPDATE DEMARCHE ===", { demarcheId, paymentMode, clientEmail, updateData });
      const { error: updateError } = await supabase
        .from('demarches')
        .update(updateData)
        .eq('id', demarcheId);
      if (updateError) {
        console.error("UPDATE FAILED:", updateError);
      } else {
        console.log("UPDATE SUCCESS");
      }
    }

    // Si le montant total est 0, valider directement sans paiement
    if (getTotalPrice() === 0) {
      await handlePaymentSuccess();
      return;
    }

    // Si le client paie tout, rediriger vers la page d'envoi de lien
    if (paymentMode === 'client_pays_all') {
      navigate(`/paiement-demarche/${demarcheId}?mode=${paymentMode}&email=${encodeURIComponent(clientEmail || '')}&phone=${encodeURIComponent(clientPhone || '')}&immat=${encodeURIComponent(selectedImmatriculation || '')}`);
      return;
    }

    setShowPaymentDialog(true);
  };

  const handlePaymentSuccess = async () => {
    if (!demarcheId) return;

    // Mark payment as completed to prevent cleanup deletion
    setPaymentCompleted(true);

    // Save questionnaire responses if any
    if (Object.keys(questionnaireAnswers).length > 0 && actionDetails) {
      try {
        // Load questions to get question texts
        const { data: questionsData } = await supabase
          .from('action_questions')
          .select('id, question_text')
          .eq('action_id', actionDetails.id);

        const questionsMap = new Map(questionsData?.map(q => [q.id, q.question_text]) || []);

        // Save each response
        for (const [questionId, optionId] of Object.entries(questionnaireAnswers)) {
          const questionText = questionsMap.get(questionId) || '';
          const answerText = questionnaireAnswerTexts[questionId] || '';
          
          if (questionText && answerText) {
            await supabase
              .from('demarche_questionnaire_responses')
              .upsert({
                demarche_id: demarcheId,
                question_id: questionId,
                option_id: optionId,
                question_text: questionText,
                answer_text: answerText,
              }, {
                onConflict: 'demarche_id,question_id'
              });
          }
        }
      } catch (error) {
        console.error('Error saving questionnaire responses:', error);
      }
    }

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
        const adminEmails = ["contact@discountcartegrise.fr"];
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

    // Si split, rediriger vers la page d'envoi du lien client
    if (paymentMode === 'split') {
      navigate(`/paiement-demarche/${demarcheId}?mode=split&email=${encodeURIComponent(clientEmail || '')}&phone=${encodeURIComponent(clientPhone || '')}&pro_paid=true`);
      return;
    }

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
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Nouvelle démarche | Discount Carte Grise</title>
      </Helmet>
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
          {/* Étape 1 : Choix du mode de paiement (uniquement pour carte grise CG) */}
          {actionDetails && !paymentModeConfirmed && typeHasPaymentChoice(formData.type) && (
            <CardContent className="py-8">
              <PaymentModeSelector
                onSelect={(mode, email, phone, nom, prenom, adresse) => {
                  setPaymentMode(mode);
                  setClientEmail(email);
                  setClientPhone(phone);
                  setClientNom(nom);
                  setClientPrenom(prenom);
                  setClientAdresse(adresse);
                }}
                onConfirm={() => setPaymentModeConfirmed(true)}
                confirmed={false}
              />
            </CardContent>
          )}

          {/* Étape 2+ : Formulaire complet (affiché après confirmation du mode, ou directement pour non-CG) */}
          {(paymentModeConfirmed || formData.type !== 'CG') && (
          <>
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
              {/* Résumé du mode de paiement choisi (uniquement carte grise) */}
              {typeHasPaymentChoice(formData.type) && (
                <PaymentModeSelector
                  onSelect={(mode, email, phone, nom, prenom, adresse) => {
                    setPaymentMode(mode);
                    setClientEmail(email);
                    setClientPhone(phone);
                    setClientNom(nom);
                    setClientPrenom(prenom);
                    setClientAdresse(adresse);
                  }}
                  onConfirm={() => setPaymentModeConfirmed(false)}
                  confirmed={true}
                  initialMode={paymentMode}
                  initialClientEmail={clientEmail}
                  initialClientPhone={clientPhone}
                  initialClientNom={clientNom}
                  initialClientPrenom={clientPrenom}
                  initialClientAdresse={clientAdresse}
                />
              )}

              {/* Affichage du type de démarche sélectionné */}
              {actionDetails && (
                <div className="p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
                  <p className="text-sm text-muted-foreground mb-1">Type de démarche</p>
                  <p className="text-lg font-semibold text-primary">{actionDetails.titre}</p>
                  {actionDetails.description && (
                    <p className="text-sm text-muted-foreground mt-1">{actionDetails.description}</p>
                  )}
                </div>
              )}

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
                  ) : (formData.type === 'DA' || formData.type === 'DC' || PRO_TYPES_WITH_PLATE.includes(formData.type)) ? (
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
                      requireVin={PRO_TYPES_WITH_VEHICLE.includes(formData.type)}
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

              {/* Questions conditionnelles - Repliable (et modifiable) */}
              {actionDetails?.id && (
                <Collapsible
                  open={isQuestionnaireOpen}
                  onOpenChange={setIsQuestionnaireOpen}
                  className="border rounded-lg"
                >
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <FileQuestion className="h-5 w-5 text-primary" />
                        <span className="font-medium">Questions préalables</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {questionnaireCompleted && (
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500">
                            <Check className="h-3 w-3 mr-1" />
                            Complété
                          </Badge>
                        )}
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${
                            isQuestionnaireOpen ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4">
                      <ActionQuestionnaire
                        actionId={actionDetails.id}
                        onAnswersChange={(answers, isBlocked, condDocs, allAnswered, answerTexts) => {
                          setQuestionnaireAnswers(answers);
                          setIsQuestionnaireBlocked(isBlocked);
                          setConditionalDocuments(condDocs);
                          setQuestionnaireAnswerTexts(answerTexts);

                          // Questionnaire complété = toutes les questions ont une réponse ET pas de blocage
                          const completed = allAnswered && !isBlocked;
                          setQuestionnaireCompleted(completed);

                          // Une fois complété, on replie par défaut (mais l’utilisateur peut ré-ouvrir)
                          if (completed) setIsQuestionnaireOpen(false);
                        }}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Pièces justificatives - Bloc unique pour tous les types de démarches */}
              {formData.type && demarcheId && (
                <>
                  {/* ====== DÉMARCHES PRO ====== */}
                  {PRO_DEMARCHE_TYPES.includes(formData.type) && (
                    <div className="space-y-3">
                      {/* ÉTAPE 1 - Blocage questionnaire */}
                      {isQuestionnaireBlocked && (
                        <Alert variant="destructive">
                          <AlertTitle>Démarche impossible</AlertTitle>
                          <AlertDescription>
                            Une de vos réponses bloque cette démarche. Modifiez vos réponses dans le questionnaire.
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* ÉTAPE 2 - Questionnaire non complété */}
                      {!isQuestionnaireBlocked && !questionnaireCompleted && (
                        <Alert>
                          <AlertTitle>Questionnaire à compléter</AlertTitle>
                          <AlertDescription>
                            Répondez aux questions préalables ci-dessus pour afficher la liste des pièces justificatives.
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* ÉTAPE 3 - Documents (visible seulement si questionnaire complété ET pas de blocage) */}
                      {!isQuestionnaireBlocked && questionnaireCompleted && (
                        <DocumentsNecessaires
                          demarcheType={formData.type}
                          demarcheId={demarcheId}
                          questionnaireAnswers={questionnaireAnswerTexts}
                          onDocumentUpload={(docType) => {
                            setUploadedDocuments((prev) => new Set(prev).add(docType));
                            loadExistingDocuments();
                          }}
                          uploadedDocuments={uploadedDocuments}
                        />
                      )}
                    </div>
                  )}

                  {/* ====== DÉMARCHES CLASSIQUES ====== */}
                  {!PRO_DEMARCHE_TYPES.includes(formData.type) && (
                    /* Pour les démarches classiques */
                    documentsRequis.length > 0 && (formData.type === 'CG' ? carteGrisePrice > 0 : true) && (
                      <div className="space-y-6">
                        {/* Pièces justificatives */}
                        <div className="bg-muted/50 p-6 rounded-lg space-y-4 border-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-lg">Pièces justificatives</h3>
                            {allDocsUploaded && (
                              <FileCheck className="h-5 w-5 text-success" />
                            )}
                          </div>
                          <div className="space-y-3">
                            {documentsRequis.map((doc, idx) => {
                              const docName = doc.nom_document.toLowerCase();
                              const hasRectoVerso = docName.includes('recto/verso') || docName.includes('recto verso');
                              const cerfaNumber = extractCerfaNumber(doc.nom_document);
                              const hasCerfa = cerfaNumber && cerfaExists(cerfaNumber);
                              
                              const renderDocLabel = (labelText: string, isObligatoire: boolean) => {
                                if (!hasCerfa || !cerfaNumber) {
                                  return (
                                    <Label className="text-sm font-medium">
                                      {labelText}
                                      {isObligatoire ? (
                                        <span className="text-destructive text-base font-bold">&nbsp;*</span>
                                      ) : (
                                        <span className="text-muted-foreground text-xs">(optionnel)</span>
                                      )}
                                    </Label>
                                  );
                                }
                                
                                const cerfaRegex = /(\(cerfa\s+\d+(?:\*\d+)?\))/i;
                                const parts = labelText.split(cerfaRegex);
                                
                                return (
                                  <Label className="text-sm font-medium">
                                    {parts.map((part, index) => {
                                      if (cerfaRegex.test(part)) {
                                        return (
                                          <a
                                            key={index}
                                            href={getCerfaUrl(cerfaNumber)}
                                            target="_blank"
                                            rel="noopener noreferrer"
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
                                      <span className="text-destructive text-base font-bold">&nbsp;*</span>
                                    ) : (
                                      <span className="text-muted-foreground text-xs">(optionnel)</span>
                                    )}
                                  </Label>
                                );
                              };
                              
                              if (hasRectoVerso) {
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

                          <p className="text-xs text-muted-foreground pt-1">
                            <span className="text-destructive font-bold">*</span> = Document obligatoire
                          </p>
                        </div>

                        {/* Certificat de non-gage (CG/DA/DC uniquement).
                            Le dépôt s'ouvre dans la carte « Je fournis le certificat ». */}
                        <NonGageChoice
                          demarcheType={formData.type}
                          audience="pro"
                          value={nonGageMode}
                          onChange={handleNonGageChange}
                          uploadSlot={
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">
                                {NON_GAGE_DOCUMENT_LABEL}
                                <span className="text-destructive text-base font-bold">&nbsp;*</span>
                              </Label>
                              <DocumentUpload
                                demarcheId={demarcheId}
                                documentType="non_gage"
                                customName={NON_GAGE_DOCUMENT_LABEL}
                                label=""
                                onUploadComplete={() => handleDocumentUploadComplete('non_gage')}
                              />
                            </div>
                          }
                        />

                        {/* Mandat 13757, quand la liste de pièces l'exige */}
                        {mandatRequis && demarcheId && (
                          <div className="space-y-3">
                            <div className="p-4 rounded-lg border-2 border-border bg-card space-y-3">
                              <p className="font-medium text-sm">Qui donne le mandat ?</p>
                              <RadioGroup
                                value={mandantType}
                                onValueChange={async (v) => {
                                  const mode = v as 'garage' | 'client';
                                  setMandantType(mode);
                                  await supabase.from('demarches').update({ mandant_type: mode }).eq('id', demarcheId);
                                }}
                                className="space-y-2"
                              >
                                <div className="flex items-start space-x-3 p-3 rounded-lg border">
                                  <RadioGroupItem value="client" id="mandant_client" className="mt-0.5" />
                                  <Label htmlFor="mandant_client" className="cursor-pointer font-normal">
                                    <span className="font-medium">Mon client</span>
                                    <span className="block text-sm text-muted-foreground mt-1">
                                      Le mandat est établi à son nom et c'est lui qui signe, sur cet écran.
                                    </span>
                                  </Label>
                                </div>
                                <div className="flex items-start space-x-3 p-3 rounded-lg border">
                                  <RadioGroupItem value="garage" id="mandant_garage" className="mt-0.5" />
                                  <Label htmlFor="mandant_garage" className="cursor-pointer font-normal">
                                    <span className="font-medium">Mon garage</span>
                                    <span className="block text-sm text-muted-foreground mt-1">
                                      Véhicule qui vous appartient. Votre signature et votre tampon enregistrés sont
                                      apposés automatiquement.
                                    </span>
                                  </Label>
                                </div>
                              </RadioGroup>
                            </div>

                            <MandatGenerator
                              demarcheId={demarcheId}
                              saved={mandatSauvegarde}
                              defaults={
                                mandantType === 'garage'
                                  ? {
                                      identite: garage?.raison_sociale ?? "",
                                      siret: garage?.siret ?? "",
                                      adresse: garage?.adresse ?? "",
                                      codePostal: garage?.code_postal ?? "",
                                      commune: garage?.ville ?? "",
                                      natureOperation: actionDetails?.titre ?? "",
                                      marque: vehiculeConnuRef.current?.marque ?? vehicleInfoPro?.marque ?? "",
                                      vin: vehicleInfoPro?.vin ?? "",
                                      immatriculation: selectedImmatriculation,
                                    }
                                  : {
                                      identite: [clientPrenom, clientNom].filter(Boolean).join(" "),
                                      adresse: clientAdresse ?? "",
                                      natureOperation: actionDetails?.titre ?? "",
                                      marque: vehiculeConnuRef.current?.marque ?? vehicleInfoPro?.marque ?? "",
                                      vin: vehicleInfoPro?.vin ?? "",
                                      immatriculation: selectedImmatriculation,
                                    }
                              }
                              savedSignaturePath={mandantType === 'garage' ? garage?.signature_path : null}
                              savedTamponPath={mandantType === 'garage' ? garage?.tampon_path : null}
                              // Garage mandant sans signature enregistree : il la saisit ici,
                              // elle est conservee sur sa fiche et ne lui sera plus redemandee.
                              garageId={mandantType === 'garage' ? garage?.id : undefined}
                              // Le client signe sur la tablette du garage : le fichier reste
                              // cloisonne sous l'identifiant du garage, seul chemin ou ses
                              // droits d'ecriture s'appliquent.
                              signatureUploadPath={
                                mandantType === 'client' && garage
                                  ? `${garage.id}/demarche_${demarcheId}.png`
                                  : undefined
                              }
                              documentType={mandatDocumentType}
                              onGenerated={() =>
                                mandatDocumentType && handleDocumentUploadComplete(mandatDocumentType)
                              }
                            />
                          </div>
                        )}

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
                    )
                  )}
                </>
              )}

              <ExpressOptionCard
                demarcheType={formData.type}
                checked={expressSelected}
                onCheckedChange={(checked) => {
                  setExpressSelected(checked);
                  if (demarcheId) {
                    supabase.from('demarches').update({ express: checked } as any).eq('id', demarcheId);
                  }
                }}
              />

              <CgvAcceptance checked={cgvAccepted} onCheckedChange={setCgvAccepted} />

              <Button
                type="submit"
                size="lg"
                disabled={
                  !cgvAccepted ||
                  loading || 
                  isQuestionnaireBlocked ||
                  // Pour les démarches PRO avec véhicule, vérifier les infos véhicule
                  (PRO_TYPES_WITH_VEHICLE.includes(formData.type) && !vehicleInfoProValid) ||
                  // Pour les démarches PRO, vérifier que le questionnaire est complété
                  (PRO_DEMARCHE_TYPES.includes(formData.type) && !questionnaireCompleted) ||
                  // Pour les démarches PRO, vérifier que les documents obligatoires sont uploadés
                  (PRO_DEMARCHE_TYPES.includes(formData.type) && !proDocsState.allRequiredUploaded) ||
                  // Pour les démarches classiques, vérifier l'immatriculation
                  (!PRO_DEMARCHE_TYPES.includes(formData.type) && !selectedImmatriculation.trim()) ||
                  // Pour CG, vérifier le prix carte grise
                  ((formData.type !== 'DA' && formData.type !== 'DC' && !PRO_DEMARCHE_TYPES.includes(formData.type)) && carteGrisePrice === 0)
                }
                className={`w-full ${isFreeTokenEligible ? 'bg-green-500 hover:bg-green-600' : 'bg-success hover:bg-success/90'}`}
              >
                {isQuestionnaireBlocked ? 'Démarche impossible'
                  : isFreeTokenEligible && getTotalPrice() === 0 ? 'Valider gratuitement'
                  : paymentMode === 'client_pays_all' ? 'Envoyer le lien de paiement au client'
                  : paymentMode === 'split' ? `Payer ma part (${formatPrice(getProPrice())}€) & envoyer le lien au client`
                  : `Payer ${formatPrice(getTotalPrice())}€`}
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
                      {paymentMode !== 'split' && (formData.type !== 'DA' && formData.type !== 'DC') && carteGrisePrice > 0 && ` + Prix de la carte grise : ${formatPrice(carteGrisePrice)}€`}
                      <br />
                      {paymentMode === 'split' ? (
                        <>Votre part (frais de dossier) : {formatPrice(getProPrice())}€
                        <br />Part client (Prix de la carte grise) : {formatPrice(getClientPrice())}€ — un lien lui sera envoyé</>
                      ) : (
                        <>Montant total : {formatPrice(getTotalPrice())}€</>
                      )}
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
                                  Coût : {formatPrice(getTokenCost())}€ • Votre solde : {formatPrice(tokenBalance)}€
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
                              Il vous manque {formatPrice(getTokenCost() - tokenBalance)}€ pour cette démarche.
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
                          amount={paymentMode === 'split' ? getProPrice() : getTotalPrice()}
                          onSuccess={handlePaymentSuccess}
                          onCancel={handlePaymentCancel}
                          immatriculation={selectedImmatriculation}
                          paymentMode={paymentMode}
                          clientEmail={clientEmail}
                          clientPhone={clientPhone}
                        />
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
          </CardContent>
          </>
          )}
        </Card>
      </div>
    </div>
  );
}
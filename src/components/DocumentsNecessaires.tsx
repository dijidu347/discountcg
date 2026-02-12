import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, CheckCircle2, AlertTriangle, Download, Plus, X } from "lucide-react";
import { DocumentUpload } from "@/components/DocumentUpload";
import { extractCerfaNumber, getCerfaUrl, cerfaExists } from "@/lib/cerfa-utils";
import { Label } from "@/components/ui/label";

interface DocumentItem {
  id: string;
  nom: string;
  obligatoire: boolean;
  conditionKey?: string;
  recommended?: boolean;
  helpText?: string;
}

interface DocumentsNecessairesProps {
  demarcheType: string;
  demarcheId: string;
  questionnaireAnswers: Record<string, string>;
  onDocumentUpload: (docType: string) => void;
  uploadedDocuments: Set<string>;
}

// Configuration des documents par type de démarche
export const getDocumentsConfig = (
  demarcheType: string, 
  answers: Record<string, string>
): { documents: DocumentItem[]; blockingMessage: string | null } => {
  let documents: DocumentItem[] = [];
  let blockingMessage: string | null = null;

  // Récupérer les réponses par leurs clés
  const getAnswerText = (questionKey: string): string | undefined => {
    // On cherche dans les réponses l'option sélectionnée
    return Object.values(answers).find(v => v.toLowerCase().includes(questionKey.toLowerCase()));
  };

  switch (demarcheType) {
    case "WW_PROVISOIRE_PRO": {
      // Socle commun pour WW Provisoire
      documents = [
        { id: "ww_mandat", nom: "Mandat signé et tamponné (Cerfa 13757)", obligatoire: true },
        { id: "ww_assurance", nom: "Attestation d'assurance du véhicule", obligatoire: true },
        { id: "ww_coc", nom: "Certificat de conformité (COC)", obligatoire: true, helpText: "Nécessaire si le champ \"K\" de la carte grise est vide, ou pour un véhicule neuf ou très ancien." },
        { id: "ww_cerfa_13750", nom: "Demande d'immatriculation signée et tamponnée (Cerfa 13750)", obligatoire: true },
        { id: "ww_cg_etranger", nom: "Certificat d'immatriculation étranger", obligatoire: true },
        { id: "ww_quitus", nom: "Quitus fiscal ou preuve de dépôt de la demande", obligatoire: true, helpText: "Hormis régions : Nord (59), Pas-De-Calais (62), la Moselle (57), le Bas-Rhin (67)." },
        { id: "ww_controle_technique", nom: "Contrôle technique français ou étranger de moins de 6 mois", obligatoire: false, recommended: true, helpText: "Pour les véhicules de plus de 4 ans." },
      ];

      const allAnswerValues = Object.values(answers).join(" ").toLowerCase();

      // Si véhicule neuf
      if (allAnswerValues.includes("neuf")) {
        documents.push({ 
          id: "ww_facture", 
          nom: "Facture d'achat du véhicule", 
          obligatoire: true, 
          conditionKey: "neuf" 
        });
      }

      // Si véhicule occasion
      if (allAnswerValues.includes("occasion")) {
        documents.push({ 
          id: "ww_cession", 
          nom: "Facture d'achat ou Certificat de cession", 
          obligatoire: true, 
          conditionKey: "occasion",
          helpText: "Si nécessaire, retracer toute la chaîne de propriété."
        });
      }

      // Si LOA ou Crédit-bail
      if (allAnswerValues.includes("loa") || allAnswerValues.includes("crédit-bail") || allAnswerValues.includes("location")) {
        documents.push({ 
          id: "ww_contrat_location", 
          nom: "Contrat de location complet", 
          obligatoire: true, 
          conditionKey: "loa" 
        });
        documents.push({ 
          id: "ww_mandat_location", 
          nom: "Mandat de la société de location autorisant la démarche", 
          obligatoire: true, 
          conditionKey: "loa" 
        });
      }

      // Si titulaire = société
      if (allAnswerValues.includes("société") || allAnswerValues.includes("professionnel") || allAnswerValues.includes("entreprise")) {
        documents.push({ 
          id: "ww_kbis", 
          nom: "Extrait Kbis < 6 mois", 
          obligatoire: true, 
          conditionKey: "societe" 
        });
        documents.push({ 
          id: "ww_id_representant", 
          nom: "Pièce d'identité du représentant légal (recto/verso)", 
          obligatoire: true, 
          conditionKey: "societe" 
        });
      }

      // Règle bloquante: véhicule non assuré
      if (allAnswerValues.includes("non assuré") || allAnswerValues.includes("pas d'assurance")) {
        blockingMessage = "Impossible de continuer : le véhicule doit être assuré pour obtenir une immatriculation WW provisoire.";
      }
      break;
    }

    case "W_GARAGE_PRO": {
      // Documents requis - Cerfa 13752 en premier (obligatoire bloquant)
      documents = [
        { 
          id: "w_cerfa_13752", 
          nom: "Cerfa 13752*02 – Demande W Garage", 
          obligatoire: true,
          helpText: "Formulaire Cerfa 13752*02 complété et signé. (Sans ce document, le dossier ne peut pas être traité.)"
        },
        { id: "w_kbis", nom: "Extrait Kbis < 6 mois", obligatoire: true },
        { id: "w_id_dirigeant", nom: "Pièce d'identité du dirigeant", obligatoire: true },
        { id: "w_justif_domicile", nom: "Justificatif de domicile du dirigeant", obligatoire: true },
        { id: "w_mandat", nom: "Mandat d'immatriculation signé et tamponné (Cerfa 13757)", obligatoire: true },
        { id: "w_assurance", nom: "Attestation d'assurance W Garage", obligatoire: true },
        { 
          id: "w_attestation_fiscale", 
          nom: "Attestation de régularité fiscale / justificatif fiscal de l'activité", 
          obligatoire: true,
          helpText: "Document fiscal obligatoire (ex : avis CFE, TVA, attestation fiscale, etc.)."
        },
      ];

      const allAnswerValues = Object.values(answers).join(" ").toLowerCase();

      // Documents conditionnels - Si véhicule destiné à la revente
      if (allAnswerValues.includes("revente") || allAnswerValues.includes("vente")) {
        documents.push({ 
          id: "w_declaration_achat", 
          nom: "Déclaration d'achat (Cerfa 13751) signée et tamponnée", 
          obligatoire: true, 
          conditionKey: "revente" 
        });
        documents.push({ 
          id: "w_cession_vente", 
          nom: "Certificat de cession ou justificatif de vente aux enchères", 
          obligatoire: true, 
          conditionKey: "revente" 
        });
      }

      // Règles bloquantes
      if (allAnswerValues.includes("particulier") || allAnswerValues.includes("non professionnel")) {
        blockingMessage = "Impossible de continuer : le W Garage est réservé aux professionnels de l'automobile.";
      }
      if (allAnswerValues.includes("pas d'assurance w") || allAnswerValues.includes("non assuré")) {
        blockingMessage = "Impossible de continuer : une assurance W Garage est obligatoire.";
      }
      break;
    }

    case "QUITUS_FISCAL_PRO": {
      // Documents requis
      documents = [
        { id: "qf_facture", nom: "Facture d'achat ou certificat de cession", obligatoire: true },
        { id: "qf_cg_etranger", nom: "Certificat d'immatriculation étranger", obligatoire: true },
        { id: "qf_mandat", nom: "Mandat d'immatriculation signé (Cerfa 13757)", obligatoire: true },
        { id: "qf_id_representant", nom: "Pièce d'identité du représentant légal", obligatoire: true },
        { id: "qf_kbis", nom: "Extrait Kbis < 6 mois", obligatoire: true },
        { id: "qf_justif_siege", nom: "Justificatif de domicile du siège social", obligatoire: true },
      ];

      const allAnswerValues = Object.values(answers).join(" ").toLowerCase();

      // Documents conditionnels - Si TVA déjà payée à l'étranger
      if (allAnswerValues.includes("tva payée") || allAnswerValues.includes("tva acquittée") || allAnswerValues.includes("tva réglée")) {
        documents.push({ 
          id: "qf_justif_tva", 
          nom: "Justificatif de paiement de la TVA", 
          obligatoire: true, 
          conditionKey: "tva_payee" 
        });
      }

      // Règles bloquantes
      if (allAnswerValues.includes("hors ue") || allAnswerValues.includes("hors union européenne")) {
        blockingMessage = "Impossible de continuer : le quitus fiscal ne s'applique qu'aux véhicules provenant de l'Union Européenne.";
      }
      break;
    }

    case "CHANGEMENT_ADRESSE_PRO": {
      // Documents requis pour le changement d'adresse du titulaire (société)
      documents = [
        { id: "ca_id_dirigeant", nom: "Pièce d'identité du dirigeant (recto/verso)", obligatoire: true },
        { id: "ca_certificat_immat", nom: "Certificat d'immatriculation", obligatoire: true },
        { id: "ca_mandat", nom: "Mandat signé et tamponné (Cerfa 13757)", obligatoire: true },
        { id: "ca_cerfa_13750", nom: "Demande d'immatriculation signée et tamponnée (Cerfa 13750)", obligatoire: true },
        { id: "ca_kbis", nom: "Extrait Kbis de moins de 6 mois mis à jour", obligatoire: true },
      ];
      break;
    }

    case "DUPLICATA_CG_PRO": {
      // Documents requis pour la demande de duplicata de carte grise (société)
      documents = [
        { id: "dup_kbis", nom: "Extrait Kbis de moins de 6 mois", obligatoire: true },
        { id: "dup_id_dirigeant", nom: "Pièce d'identité du dirigeant (recto/verso)", obligatoire: true },
        { id: "dup_assurance", nom: "Attestation d'assurance du véhicule", obligatoire: true },
        { id: "dup_mandat", nom: "Mandat signé et tamponné (Cerfa 13757)", obligatoire: true },
        { id: "dup_cerfa_13750", nom: "Demande d'immatriculation signée et tamponnée (Cerfa 13750)", obligatoire: true },
        { id: "dup_cerfa_13753", nom: "Déclaration de perte ou de vol signée et tamponnée (Cerfa 13753)", obligatoire: true, helpText: "En cas de vol : document obligatoirement signé et tamponné par la police." },
        { id: "dup_ct", nom: "Contrôle technique en cours de validité", obligatoire: true },
      ];

      const allAnswerValues = Object.values(answers).join(" ").toLowerCase();

      // Documents conditionnels - Si LOA/LLD/Crédit-bail
      if (allAnswerValues.includes("oui")) {
        documents.push({ 
          id: "dup_mandat_location", 
          nom: "Mandat de la société de location autorisant le locataire à effectuer la démarche", 
          obligatoire: true, 
          conditionKey: "loa" 
        });
      }

      // Message d'info si CT égaré
      if (allAnswerValues.includes("égaré")) {
        const ctDoc = documents.find(d => d.id === "dup_ct");
        if (ctDoc) {
          ctDoc.helpText = "Si le PV de contrôle technique est perdu, contactez le centre ayant réalisé le contrôle pour obtenir un duplicata. Exceptionnellement, une photo de la vignette pare-brise peut être fournie.";
        }
      }
      break;
    }

    case "FIV_PRO": {
      // Documents requis pour la Fiche d'Identification de Véhicule (sociétés)
      documents = [
        { id: "fiv_kbis", nom: "Extrait Kbis de moins de 6 mois", obligatoire: true },
        { id: "fiv_id_dirigeant", nom: "Pièce d'identité du dirigeant (recto/verso)", obligatoire: true },
        { id: "fiv_mandat", nom: "Mandat signé et tamponné (Cerfa 13757)", obligatoire: true },
        { id: "fiv_cerfa_13753", nom: "Déclaration de perte ou de vol signée et tamponnée (Cerfa 13753)", obligatoire: true, helpText: "S'il s'agit d'un vol, le document doit être signé et tamponné par la police." },
      ];

      const allAnswerValues = Object.values(answers).join(" ").toLowerCase();

      // Documents conditionnels - Si LOA/LLD/Crédit-bail
      if (allAnswerValues.includes("oui")) {
        documents.push({ 
          id: "fiv_mandat_location", 
          nom: "Mandat de la société de location autorisant le locataire à effectuer la démarche", 
          obligatoire: true, 
          conditionKey: "loa" 
        });
      }
      break;
    }

    case "CG_NEUF_PRO": {
      // Documents requis pour l'immatriculation d'un véhicule neuf (sociétés)
      documents = [
        { id: "cgn_kbis", nom: "Extrait Kbis de moins de 6 mois", obligatoire: true },
        { id: "cgn_id_dirigeant", nom: "Pièce d'identité du dirigeant (recto/verso)", obligatoire: true },
        { id: "cgn_assurance", nom: "Attestation d'assurance", obligatoire: true },
        { id: "cgn_mandat", nom: "Mandat signé et tamponné (Cerfa 13757)", obligatoire: true },
        { id: "cgn_cerfa_13749", nom: "Cerfa 13749 remis par le constructeur – Demande de certificat d'immatriculation d'un véhicule neuf", obligatoire: true },
      ];

      const allAnswerValues = Object.values(answers).join(" ").toLowerCase();

      // Documents conditionnels - Si LOA/LLD/Crédit-bail
      if (allAnswerValues.includes("oui")) {
        documents.push({ 
          id: "cgn_contrat_location", 
          nom: "Contrat de location complet", 
          obligatoire: true, 
          conditionKey: "loa" 
        });
        documents.push({ 
          id: "cgn_mandat_location", 
          nom: "Mandat de la société de location autorisant le locataire à effectuer la démarche", 
          obligatoire: true, 
          conditionKey: "loa" 
        });
      }
      break;
    }

    case "MODIF_CG_PRO": {
      // Documents requis pour modification/correction de CG (sociétés)
      documents = [
        { id: "modif_kbis", nom: "Extrait Kbis de moins de 6 mois", obligatoire: true },
        { id: "modif_id_dirigeant", nom: "Pièce d'identité du dirigeant (recto/verso)", obligatoire: true },
        { id: "modif_assurance", nom: "Attestation d'assurance", obligatoire: true },
        { id: "modif_ci", nom: "Certificat d'immatriculation", obligatoire: true },
        { id: "modif_mandat", nom: "Mandat signé et tamponné (Cerfa 13757)", obligatoire: true },
        { id: "modif_cerfa_13750", nom: "Demande d'immatriculation signée et tamponnée (Cerfa 13750)", obligatoire: true },
        { id: "modif_justificatif", nom: "Pièce justificative officielle de la modification à apporter", obligatoire: true, helpText: "Document officiel attestant la modification demandée" },
        { id: "modif_ct", nom: "Contrôle technique en cours de validité", obligatoire: true },
      ];
      break;
    }

    case "ANNULATION_CPI_WW_PRO": {
      // Documents requis pour annulation CPI WW (sociétés)
      documents = [
        { id: "ann_attestation", nom: "Attestation d'annulation de vente manuscrite (signée par vendeur et acquéreur, cachet + signature si pro)", obligatoire: true, helpText: "L'ANTS préfère une version manuscrite. Doit reprendre l'identité des deux parties, du véhicule, les dates/lieux de vente et d'annulation, et la raison de l'annulation." },
        { id: "ann_id_parties", nom: "Pièce d'identité des deux parties : acheteur et vendeur (Kbis + ID dirigeant pour les pros)", obligatoire: true },
        { id: "ann_assurance", nom: "Attestation d'assurance", obligatoire: true },
        { id: "ann_mandat", nom: "Mandat signé et tamponné (Cerfa 13757)", obligatoire: true },
        { id: "ann_ci_etranger", nom: "Certificat d'immatriculation étranger", obligatoire: true },
        { id: "ann_coc", nom: "Certificat de conformité COC", obligatoire: false, helpText: "Nécessaire si le champ \"K\" de la carte grise est vide, ou pour un véhicule neuf ou très ancien" },
        { id: "ann_facture_cession", nom: "Facture d'achat ou Certificat de cession", obligatoire: true, helpText: "Si nécessaire, retracer toute la chaîne de propriété" },
      ];
      break;
    }

    case "CHANGEMENT_ADRESSE_LOCATAIRE_PRO": {
      // Documents requis pour changement d'adresse du locataire (sociétés)
      documents = [
        { id: "cal_kbis_id", nom: "Extrait Kbis de moins de 6 mois + Pièce d'identité du dirigeant (recto/verso)", obligatoire: true },
        { id: "cal_ci", nom: "Certificat d'immatriculation", obligatoire: true },
        { id: "cal_mandat_locataire", nom: "Mandat signé et tamponné par le locataire (Cerfa 13757)", obligatoire: true, helpText: "Mandat vous autorisant à faire la démarche" },
        { id: "cal_mandat_bailleur", nom: "Mandat signé et tamponné par le bailleur autorisant le locataire à effectuer des modifications", obligatoire: true },
        { id: "cal_cerfa_13750", nom: "Demande d'immatriculation signée et tamponnée par le locataire (Cerfa 13750)", obligatoire: true },
        { id: "cal_kbis_maj", nom: "Extrait Kbis de moins de 6 mois mis à jour", obligatoire: true, helpText: "Kbis avec la nouvelle adresse" },
      ];
      break;
    }
  }

  return { documents, blockingMessage };
};

export function DocumentsNecessaires({
  demarcheType,
  demarcheId,
  questionnaireAnswers,
  onDocumentUpload,
  uploadedDocuments
}: DocumentsNecessairesProps) {
  const { documents, blockingMessage } = useMemo(
    () => getDocumentsConfig(demarcheType, questionnaireAnswers),
    [demarcheType, questionnaireAnswers]
  );

  // Pièces supplémentaires
  const [additionalDocs, setAdditionalDocs] = useState<{id: number; name: string}[]>([]);
  const [newDocName, setNewDocName] = useState("");

  const handleAddDocument = () => {
    if (newDocName.trim()) {
      setAdditionalDocs(prev => [...prev, { id: Date.now(), name: newDocName.trim() }]);
      setNewDocName("");
    }
  };

  const handleRemoveAdditionalDoc = (docId: number) => {
    setAdditionalDocs(prev => prev.filter(d => d.id !== docId));
  };

  const requiredDocs = documents.filter(d => d.obligatoire);
  const uploadedRequiredCount = requiredDocs.filter(d => uploadedDocuments.has(d.id)).length;
  const allRequiredUploaded = uploadedRequiredCount === requiredDocs.length;

  if (blockingMessage) {
    return (
      <Alert variant="destructive" className="border-2">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle>Démarche impossible</AlertTitle>
        <AlertDescription>{blockingMessage}</AlertDescription>
      </Alert>
    );
  }

  const renderDocLabel = (doc: DocumentItem) => {
    const cerfaNumber = extractCerfaNumber(doc.nom);
    const hasCerfa = cerfaNumber && cerfaExists(cerfaNumber);

    // Badges
    const renderBadges = () => (
      <>
        {doc.obligatoire ? (
          <Badge variant="destructive" className="text-xs">Obligatoire</Badge>
        ) : doc.recommended ? (
          <Badge variant="outline" className="text-xs border-amber-500 text-amber-600 bg-amber-50">Recommandé</Badge>
        ) : (
          <span className="text-muted-foreground text-xs">(optionnel)</span>
        )}
        {doc.conditionKey && (
          <span className="text-xs text-muted-foreground italic">Requis selon votre situation</span>
        )}
      </>
    );

    // Help text
    const renderHelpText = () => doc.helpText ? (
      <p className="text-xs text-muted-foreground mt-1">{doc.helpText}</p>
    ) : null;

    if (!hasCerfa || !cerfaNumber) {
      return (
        <div className="flex-1">
          <div className="text-sm font-medium flex items-center gap-2 flex-wrap">
            {doc.nom}
            {renderBadges()}
          </div>
          {renderHelpText()}
        </div>
      );
    }

    // Séparer le texte pour mettre le CERFA en lien cliquable
    const cerfaRegex = /(\(cerfa\s+\d+\*?\d*\))/i;
    const parts = doc.nom.split(cerfaRegex);

    // Check if the cerfa number is in the document name (format: Cerfa XXXXX*XX)
    const cerfaInNameRegex = /cerfa\s+(\d+)\*?(\d*)/i;
    const hasCerfaInName = cerfaInNameRegex.test(doc.nom);

    return (
      <div className="flex-1">
        <div className="text-sm font-medium flex items-center gap-2 flex-wrap">
          {hasCerfaInName ? (
            // If cerfa is directly in the name (like "Cerfa 13752*02 – Demande W Garage")
            <>
              <a
                href={getCerfaUrl(cerfaNumber)}
                download
                className="text-primary hover:text-primary/80 underline inline-flex items-center gap-1 font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                {doc.nom}
                <Download className="h-3 w-3" />
              </a>
            </>
          ) : (
            // Original behavior for "(Cerfa XXXXX)" format
            parts.map((part, index) => {
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
            })
          )}
          {renderBadges()}
        </div>
        {renderHelpText()}
      </div>
    );
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Pièces justificatives
          </CardTitle>
          {allRequiredUploaded && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">Complet</span>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="text-destructive font-bold">*</span> = Document obligatoire
          {" · "}
          <span className="font-medium">{uploadedRequiredCount}/{requiredDocs.length}</span> documents requis uploadés
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Encart d'aide spécifique W_GARAGE_PRO */}
        {demarcheType === "W_GARAGE_PRO" && (
          <Alert className="border-primary/30 bg-primary/5">
            <FileText className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              <strong>Pour la première demande W Garage :</strong> le Cerfa 13752*02 et l'attestation de régularité fiscale sont <strong>obligatoires</strong>.
            </AlertDescription>
          </Alert>
        )}

        {documents.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Aucun document requis pour cette configuration.
          </p>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => {
              // Warning léger si document recommandé non uploadé
              const showRecommendedWarning = doc.recommended && !uploadedDocuments.has(doc.id);
              // Vérifier si le document nécessite recto/verso
              const docName = doc.nom.toLowerCase();
              const hasRectoVerso = docName.includes('recto/verso') || docName.includes('recto verso');
              
              return (
                <div key={doc.id} className="space-y-2">
                  <div 
                    className={`flex items-center gap-4 p-3 rounded-lg ${
                      showRecommendedWarning 
                        ? 'bg-amber-50 border border-amber-200' 
                        : 'bg-muted/30'
                    }`}
                  >
                    {renderDocLabel(doc)}
                    <div className="w-[350px]">
                      <DocumentUpload
                        demarcheId={demarcheId}
                        documentType={doc.id}
                        label=""
                        onUploadComplete={() => onDocumentUpload(doc.id)}
                      />
                    </div>
                  </div>
                  {/* Verso optionnel pour les documents recto/verso */}
                  {hasRectoVerso && (
                    <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/20 ml-6">
                      <div className="flex-1">
                        <div className="text-sm font-medium flex items-center gap-2 flex-wrap">
                          {doc.nom.replace(/\(recto\/verso\)/i, '').replace(/recto\/verso/i, '').trim()} (verso)
                          <span className="text-muted-foreground text-xs">(Optionnel)</span>
                        </div>
                      </div>
                      <div className="w-[350px]">
                        <DocumentUpload
                          demarcheId={demarcheId}
                          documentType={`${doc.id}_verso`}
                          label=""
                          onUploadComplete={() => onDocumentUpload(`${doc.id}_verso`)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pièces supplémentaires */}
        <div className="bg-muted/30 p-4 rounded-lg border border-dashed border-muted-foreground/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Pièces supplémentaires
              <span className="text-xs bg-muted px-2 py-0.5 rounded">Optionnel</span>
            </h3>
          </div>
          
          {/* Champ pour ajouter un nouveau document */}
          <div className="flex gap-2 mb-3">
            <Input
              placeholder="Nom du document (ex: Procuration, Mandat...)"
              value={newDocName}
              onChange={(e) => setNewDocName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddDocument();
                }
              }}
              className="h-9 text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddDocument}
              disabled={!newDocName.trim()}
              className="h-9"
            >
              <Plus className="w-4 h-4 mr-1" />
              Ajouter
            </Button>
          </div>
          
          {additionalDocs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              Aucune pièce supplémentaire ajoutée
            </p>
          ) : (
            <div className="space-y-2">
              {additionalDocs.map((doc) => (
                <div key={doc.id} className="flex items-start gap-2 p-3 border rounded-md bg-background">
                  <div className="flex-1 space-y-2">
                    <Label className="text-sm font-medium">{doc.name}</Label>
                    <DocumentUpload
                      demarcheId={demarcheId}
                      documentType={`autre_piece_${doc.id}`}
                      customName={doc.name}
                      label=""
                      onUploadComplete={() => onDocumentUpload(`autre_piece_${doc.id}`)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveAdditionalDoc(doc.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {allRequiredUploaded && (
          <Alert className="border-green-500 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-600">Tous les documents sont prêts</AlertTitle>
            <AlertDescription className="text-green-600">
              Vous pouvez maintenant procéder au paiement et à la validation de votre démarche.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

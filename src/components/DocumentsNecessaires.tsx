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
}

interface DocumentsNecessairesProps {
  demarcheType: string;
  demarcheId: string;
  questionnaireAnswers: Record<string, string>;
  onDocumentUpload: (docType: string) => void;
  uploadedDocuments: Set<string>;
}

// Configuration des documents par type de démarche
const getDocumentsConfig = (
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
      // Socle commun
      documents = [
        { id: "ww_mandat", nom: "Mandat d'immatriculation signé (Cerfa 13757)", obligatoire: true },
        { id: "ww_assurance", nom: "Attestation d'assurance du véhicule", obligatoire: true },
      ];

      // Documents conditionnels basés sur les réponses
      // Note: On détecte les réponses par leur texte ou ID d'option
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
          nom: "Certificat de cession", 
          obligatoire: true, 
          conditionKey: "occasion" 
        });
      }

      // Si origine Union Européenne ou Hors UE
      if (allAnswerValues.includes("union européenne") || allAnswerValues.includes("hors ue") || allAnswerValues.includes("import")) {
        documents.push({ 
          id: "ww_cg_etranger", 
          nom: "Certificat d'immatriculation étranger", 
          obligatoire: true, 
          conditionKey: "import" 
        });
        documents.push({ 
          id: "ww_coc", 
          nom: "Certificat de conformité (COC)", 
          obligatoire: true, 
          conditionKey: "import" 
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
          nom: "Pièce d'identité du représentant légal", 
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
      // Documents requis
      documents = [
        { id: "w_kbis", nom: "Extrait Kbis < 6 mois", obligatoire: true },
        { id: "w_id_dirigeant", nom: "Pièce d'identité du dirigeant", obligatoire: true },
        { id: "w_justif_domicile", nom: "Justificatif de domicile du dirigeant", obligatoire: true },
        { id: "w_mandat", nom: "Mandat d'immatriculation signé et tamponné (Cerfa 13757)", obligatoire: true },
        { id: "w_assurance", nom: "Attestation d'assurance W Garage", obligatoire: true },
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

    if (!hasCerfa || !cerfaNumber) {
      return (
        <Label className="text-sm font-medium flex items-center gap-2 flex-wrap">
          {doc.nom}
          {doc.obligatoire ? (
            <span className="text-destructive text-base font-bold">*</span>
          ) : (
            <span className="text-muted-foreground text-xs">(optionnel)</span>
          )}
          {doc.conditionKey && (
            <Badge variant="outline" className="text-xs">Conditionnel</Badge>
          )}
        </Label>
      );
    }

    // Séparer le texte pour mettre le CERFA en lien cliquable
    const cerfaRegex = /(\(cerfa\s+\d+\*?\d*\))/i;
    const parts = doc.nom.split(cerfaRegex);

    return (
      <Label className="text-sm font-medium flex items-center gap-2 flex-wrap">
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
        {doc.obligatoire ? (
          <span className="text-destructive text-base font-bold">*</span>
        ) : (
          <span className="text-muted-foreground text-xs">(optionnel)</span>
        )}
        {doc.conditionKey && (
          <Badge variant="outline" className="text-xs">Conditionnel</Badge>
        )}
      </Label>
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
        {documents.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Aucun document requis pour cette configuration.
          </p>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                <div className="flex-1">
                  {renderDocLabel(doc)}
                </div>
                <div className="w-[350px]">
                  <DocumentUpload
                    demarcheId={demarcheId}
                    documentType={doc.id}
                    label=""
                    onUploadComplete={() => onDocumentUpload(doc.id)}
                  />
                </div>
              </div>
            ))}
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

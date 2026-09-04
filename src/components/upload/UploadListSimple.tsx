import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GuestDocumentUpload } from "@/components/GuestDocumentUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Loader2, Send, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { NON_GAGE_DOCUMENT_LABEL } from "@/lib/nonGage";
import { getCerfaUrl } from "@/lib/cerfa-utils";
import { MandatGenerator } from "@/components/mandat/MandatGenerator";
import { MandatChoice } from "@/components/mandat/MandatChoice";
import { natureOperation, MANDAT_PREREMPLI_ACTIF, MANDAT_MODE_DEFAUT, type MandatData, type MandatMode } from "@/lib/mandat";

interface UploadListSimpleProps {
  orderId: string;
  isPaid: boolean;
  demarcheType: string;
}

interface UploadedFile {
  id: string;
  fileName: string;
  side: string;
  validation_status: string;
  rejection_reason?: string;
  type_document: string;
}

interface OrderInfo {
  tracking_number: string;
  email: string;
  nom: string;
  prenom: string;
  immatriculation: string;
  montant_ttc: number;
}

interface RequiredDocument {
  id: string;
  nom_document: string;
  obligatoire: boolean;
  ordre: number;
}

// Documents qui nécessitent recto/verso
const RECTO_VERSO_KEYWORDS = [
  "pièce d'identité",
  "carte d'identité",
  "permis de conduire",
  "permis du titulaire",
  "permis du co-titulaire",
  "identité et permis",
];

const isRectoOnly = (docName: string): boolean => {
  const lower = docName.toLowerCase();
  return !RECTO_VERSO_KEYWORDS.some(keyword => lower.includes(keyword));
};

export const UploadListSimple = ({ orderId, isPaid, demarcheType }: UploadListSimpleProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [requiredDocuments, setRequiredDocuments] = useState<RequiredDocument[]>([]);
  const [additionalDocs, setAdditionalDocs] = useState<string[]>([]);
  const [newDocName, setNewDocName] = useState("");
  // Le client a choisi de fournir lui-même le certificat de non-gage : la pièce
  // s'ajoute à la liste et bloque l'envoi du dossier tant qu'elle manque.
  const [nonGageFourni, setNonGageFourni] = useState(false);
  // Commande complète : sert à pré-remplir le mandat 13757.
  const [commande, setCommande] = useState<Record<string, unknown> | null>(null);
  // Depot de son propre mandat, ou remplissage en ligne. Par defaut le depot.
  const [mandatMode, setMandatMode] = useState<MandatMode>(MANDAT_MODE_DEFAUT);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // La commande porte le mode non-gage, qui conditionne la liste des pièces,
      // et les informations qui pré-remplissent le mandat.
      const { data: orderMode } = await supabase
        .from('guest_orders')
        .select('*')
        .eq('id', orderId)
        .single();
      setCommande(orderMode as Record<string, unknown> | null);
      setMandatMode(((orderMode as { mandat_mode?: MandatMode } | null)?.mandat_mode) || MANDAT_MODE_DEFAUT);
      const attendNonGage = orderMode?.non_gage_mode === 'fourni';
      setNonGageFourni(attendNonGage);

      // Load required documents from DB
      const { data: dbDocs } = await supabase
        .from('guest_order_required_documents')
        .select('*')
        .eq('demarche_type_code', demarcheType)
        .eq('actif', true)
        .order('ordre');

      // Liste effective = pièces configurées en base + le non-gage si le client
      // s'est engagé à le fournir. Le certificat n'est PAS stocké en base : il
      // dépend du choix de la commande, pas du type de démarche.
      const docsConfig = [...(dbDocs || [])];
      if (attendNonGage && !docsConfig.some(d => d.nom_document === NON_GAGE_DOCUMENT_LABEL)) {
        docsConfig.push({
          id: 'non_gage',
          nom_document: NON_GAGE_DOCUMENT_LABEL,
          obligatoire: true,
          ordre: 999,
        } as any);
      }

      if (docsConfig.length > 0) {
        // Deduplicate by nom_document to prevent showing same document type multiple times
        const seen = new Set<string>();
        const uniqueDocs = docsConfig.filter(doc => {
          const key = doc.nom_document;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setRequiredDocuments(uniqueDocs);
      }

      // Load existing uploaded documents
      const { data: existingDocs } = await supabase
        .from('guest_order_documents')
        .select('*')
        .eq('order_id', orderId);

      if (existingDocs) {
        setUploadedFiles(existingDocs.map(doc => ({
          id: doc.id,
          fileName: doc.nom_fichier,
          side: doc.side || '',
          validation_status: doc.validation_status || 'pending',
          rejection_reason: doc.rejection_reason || undefined,
          type_document: doc.type_document
        })));

        // Detect additional docs already uploaded (not in required list)
        if (docsConfig.length > 0) {
          const requiredNames = new Set(docsConfig.map((d: any) => d.nom_document));
          const extraTypes = [...new Set(
            existingDocs
              .filter(d => !requiredNames.has(d.type_document))
              .map(d => d.type_document)
          )];
          if (extraTypes.length > 0) {
            setAdditionalDocs(prev => {
              const existing = new Set(prev);
              const newOnes = extraTypes.filter(t => !existing.has(t));
              return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
            });
          }
        }
      }

      // Get order info
      const { data: order } = await supabase
        .from('guest_orders')
        .select('tracking_number, email, nom, prenom, immatriculation, montant_ttc')
        .eq('id', orderId)
        .single();

      if (order) {
        setOrderInfo(order as OrderInfo);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Le mandat n'est plus un simple emplacement de dépôt : il est généré
  // pré-rempli puis joint automatiquement, donc on l'extrait de la liste.
  const mandatDoc = MANDAT_PREREMPLI_ACTIF
    ? requiredDocuments.find((d) => /13757/.test(d.nom_document ?? ""))
    : undefined;
  const nature = natureOperation((commande?.demarche_type as string) ?? demarcheType);

  const handleAddDocument = () => {
    const name = newDocName.trim();
    if (!name) return;
    if (additionalDocs.includes(name)) {
      toast({ title: "Document déjà ajouté", variant: "destructive" });
      return;
    }
    setAdditionalDocs(prev => [...prev, name]);
    setNewDocName("");
  };

  const handleRemoveAdditionalDoc = (docName: string) => {
    const filesForDoc = uploadedFiles.filter(f => f.type_document === docName);
    if (filesForDoc.length > 0) {
      toast({ title: "Supprimez d'abord le fichier uploadé", variant: "destructive" });
      return;
    }
    setAdditionalDocs(prev => prev.filter(d => d !== docName));
  };

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0) {
      toast({
        title: "Aucun document",
        description: "Veuillez déposer au moins un document avant d'envoyer.",
        variant: "destructive",
      });
      return;
    }

    if (!orderInfo) {
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les informations de la commande",
        variant: "destructive",
      });
      return;
    }

    if (nonGageFourni && !uploadedFiles.some(f => f.type_document === NON_GAGE_DOCUMENT_LABEL)) {
      toast({
        title: "Certificat de non-gage manquant",
        description: "Vous avez choisi de fournir le certificat vous-même : déposez-le pour envoyer le dossier.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await supabase
        .from('guest_orders')
        .update({ documents_complets: true })
        .eq('id', orderId);

      if (orderInfo.email && orderInfo.email.trim() !== '') {
        await supabase.functions.invoke('send-guest-order-email', {
          body: {
            type: 'documents_received',
            orderData: {
              tracking_number: orderInfo.tracking_number,
              email: orderInfo.email,
              nom: orderInfo.nom,
              prenom: orderInfo.prenom,
              immatriculation: orderInfo.immatriculation,
              montant_ttc: orderInfo.montant_ttc,
            }
          }
        });
      }

      toast({
        title: "Documents envoyés",
        description: "Vos documents ont été envoyés avec succès. Vous allez être redirigé vers la page de suivi.",
      });

      setTimeout(() => {
        navigate(`/suivi/${orderInfo.tracking_number}`);
      }, 1500);

    } catch (error) {
      console.error('Error submitting documents:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'envoi des documents.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (orderId && isPaid) {
      loadData();
    } else {
      setIsLoading(false);
    }
  }, [orderId, isPaid]);

  if (!isPaid) {
    return (
      <Card className="opacity-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Documents requis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Vous pourrez déposer vos documents après le paiement et avoir renseigné vos informations
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Déposez vos documents
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Déposez vos documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {mandatDoc && commande && (
          <MandatChoice
            value={mandatMode}
            onChange={async (mode) => {
              setMandatMode(mode);
              await supabase.from('guest_orders').update({ mandat_mode: mode }).eq('id', orderId);
            }}
            slotUpload={
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Pas encore de mandat ?{" "}
                  <a
                    href={getCerfaUrl("13757_03")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2"
                  >
                    Télécharger le Cerfa vierge
                  </a>
                </p>
                <GuestDocumentUpload
                  orderId={orderId}
                  documentType={mandatDoc.nom_document}
                  label="Mandat rempli et signé"
                  existingFiles={uploadedFiles.filter((f) => f.type_document === mandatDoc.nom_document)}
                  onUploadComplete={loadData}
                  rectoOnly
                />
              </div>
            }
            slotGenere={
          <MandatGenerator
            orderId={orderId}
            documentType={mandatDoc.nom_document}
            saved={(commande.mandat_data as MandatData) ?? null}
            signatureUploadPath={`guest/${orderId}/signature.png`}
            defaults={{
              identite: [commande.prenom, commande.nom].filter(Boolean).join(" "),
              adresse: (commande.adresse as string) ?? "",
              codePostal: (commande.code_postal as string) ?? "",
              commune: (commande.ville as string) ?? "",
              natureOperation: nature,
              marque: (commande.marque as string) ?? "",
              vin: (commande.vin as string) ?? "",
              immatriculation: (commande.immatriculation as string) ?? "",
            }}
            flags={{
              vehiculePro: Boolean(commande.vehicule_pro),
              isMineur: Boolean(commande.is_mineur),
              hasCotitulaire: Boolean(commande.has_cotitulaire),
              vehiculeLeasing: Boolean(commande.vehicule_leasing),
            }}
            onGenerated={loadData}
          />
            }
          />
        )}

        {/* La piece "mandat" sort de la liste dans les deux cas : son depot comme
            son pre-remplissage vivent dans la carte de choix ci-dessus. */}
        {requiredDocuments.filter((d) => d.id !== mandatDoc?.id).map((doc) => {
          const filesForDoc = uploadedFiles.filter(f => f.type_document === doc.nom_document);

          return (
            <div key={doc.id}>
              {doc.obligatoire && (
                <p className="text-xs font-semibold text-red-500 mb-1">* Obligatoire</p>
              )}
              <GuestDocumentUpload
                orderId={orderId}
                documentType={doc.nom_document}
                label={`${doc.nom_document}${!doc.obligatoire ? ' (facultatif)' : ''}`}
                existingFiles={filesForDoc}
                onUploadComplete={loadData}
                rectoOnly={isRectoOnly(doc.nom_document)}
              />
            </div>
          );
        })}

        {/* Separator */}
        <div className="border-t pt-4 mt-4">
          <p className="text-sm font-medium mb-3">Pièces jointes supplémentaires</p>

          {/* Additional docs already added */}
          {additionalDocs.map((docName) => {
            const filesForDoc = uploadedFiles.filter(f => f.type_document === docName);
            return (
              <div key={docName} className="relative mb-3">
                <GuestDocumentUpload
                  orderId={orderId}
                  documentType={docName}
                  label={docName}
                  existingFiles={filesForDoc}
                  onUploadComplete={loadData}
                  rectoOnly={true}
                />
                {filesForDoc.length === 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveAdditionalDoc(docName)}
                    className="absolute top-2 right-2 h-6 w-6"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}

          {/* Add new doc input */}
          <div className="flex gap-2">
            <Input
              placeholder="Nom du document (ex: Cerfa, Procuration...)"
              value={newDocName}
              onChange={(e) => setNewDocName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddDocument()}
              className="flex-1"
            />
            <Button variant="outline" onClick={handleAddDocument} disabled={!newDocName.trim()}>
              <Plus className="w-4 h-4 mr-1" />
              Ajouter
            </Button>
          </div>
        </div>

        {/* Submit button */}
        <div className="pt-4 border-t">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || uploadedFiles.length === 0}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Envoyer mes documents
              </>
            )}
          </Button>
          {uploadedFiles.length === 0 && (
            <p className="text-sm text-muted-foreground text-center mt-2">
              Veuillez déposer au moins un document avant d'envoyer
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

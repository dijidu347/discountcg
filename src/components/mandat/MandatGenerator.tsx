import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { FileSignature, Loader2, Download, Info, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SignaturePad } from "@/components/signature/SignaturePad";
import {
  splitAdresse,
  consignesMandant,
  mandatGenerable,
  type MandantFlags,
  extensionPour,
  type MandatData,
} from "@/lib/mandat";
import { getCerfaUrl } from "@/lib/cerfa-utils";

interface MandatGeneratorProps {
  demarcheId?: string;
  orderId?: string;
  defaults: {
    identite: string;
    siret?: string;
    adresse?: string;
    codePostal?: string;
    commune?: string;
    natureOperation: string;
    signataire?: string;
    marque?: string;
    vin?: string;
    immatriculation?: string;
  };
  flags?: MandantFlags;
  // Corrections deja apportees et enregistrees lors d'un passage precedent.
  // Elles priment sur `defaults` : sinon, revenir sur la page effacerait le
  // travail de relecture du client.
  saved?: MandatData | null;
  // Signature et tampon déjà enregistrés (garage mandant) : rien à tracer.
  savedSignaturePath?: string | null;
  savedTamponPath?: string | null;
  // Chemin où déposer la signature tracée à l'instant, quand c'est le signataire
  // lui-même qui est devant l'écran.
  signatureUploadPath?: string;
  // Renseigne uniquement quand le garage est lui-meme le mandant. Une signature
  // ou un tampon manquant est alors saisi ici puis enregistre sur la fiche du
  // garage : il ne lui sera plus jamais redemande, et celui qui les a deja
  // enregistres ne voit rien.
  garageId?: string;
  // Mandant retenu par l'appelant, memorise avec le mandat.
  mandantType?: "garage" | "client";
  // Clé de la pièce « mandat » dans la liste de documents du tunnel appelant.
  documentType?: string;
  onGenerated?: (url: string) => void;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, payload] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export const MandatGenerator = ({
  demarcheId,
  orderId,
  defaults,
  flags = {},
  saved,
  savedSignaturePath,
  savedTamponPath,
  signatureUploadPath,
  garageId,
  mandantType,
  documentType,
  onGenerated,
}: MandatGeneratorProps) => {
  const { toast } = useToast();
  const adresse = useMemo(() => splitAdresse(defaults.adresse), [defaults.adresse]);

  // Une valeur relue prime toujours sur la proposition automatique, y compris
  // quand le client a volontairement vide un champ.
  const reprise = <T,>(sauve: T | undefined, propose: T): T => (sauve !== undefined ? sauve : propose);

  const [form, setForm] = useState({
    identite: reprise(saved?.mandant_identite, defaults.identite ?? ""),
    siret: reprise(saved?.mandant_siret, defaults.siret ?? ""),
    signataire: reprise(saved?.signataire_nom_qualite, defaults.signataire ?? ""),
    numero: reprise(saved?.adresse_numero, adresse.numero),
    extension: reprise(saved?.adresse_extension, adresse.extension),
    typeVoie: reprise(saved?.adresse_type_voie, adresse.type_voie),
    nomVoie: reprise(saved?.adresse_nom_voie, adresse.nom_voie),
    codePostal: reprise(saved?.adresse_code_postal, defaults.codePostal ?? ""),
    commune: reprise(saved?.adresse_commune, defaults.commune ?? ""),
    nature: reprise(saved?.nature_operation, defaults.natureOperation ?? ""),
    marque: reprise(saved?.vehicule_marque, defaults.marque ?? ""),
    vin: reprise(saved?.vehicule_vin, defaults.vin ?? ""),
    immatriculation: reprise(saved?.vehicule_immatriculation, defaults.immatriculation ?? ""),
  });
  // L'attestation d'assurance est pre-cochee : elle constate une obligation
  // legale que le mandat doit porter, et un dossier sans elle repart. Le client
  // garde la main pour la decocher.
  const [attesteAssurance, setAttesteAssurance] = useState(saved?.atteste_assurance ?? true);
  const [opposeProspection, setOpposeProspection] = useState(saved?.oppose_prospection ?? false);
  const [signature, setSignature] = useState<string | null>(null);
  const [tampon, setTampon] = useState<string | null>(null);
  // Chemins enregistres pendant cette session : la fiche garage recue en props
  // reste perimee jusqu'au prochain chargement, sans quoi les pads
  // reapparaitraient a la regeneration alors que tout vient d'etre sauvegarde.
  const [dejaEnregistre, setDejaEnregistre] = useState<{ signature?: string; tampon?: string }>({});
  // Remplacement demande explicitement : sans cela, une signature enregistree
  // ne pouvait plus jamais etre changee depuis cet ecran.
  const [remplacer, setRemplacer] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  // Les donnees vehicule arrivent souvent APRES l'affichage du mandat : le
  // client depose ses pieces, puis saisit la plaque. L'etat initial d'un
  // useState ne rejouant qu'au montage, les champs restaient vides et le Cerfa
  // sortait sans marque ni immatriculation.
  //
  // On resynchronise donc ces trois champs quand ils changent en amont, mais
  // uniquement tant que personne ne les a corriges a la main : une saisie du
  // client (ou une relecture deja enregistree) prime toujours sur la proposition.
  const dernierePropositionVehicule = useRef({
    marque: defaults.marque ?? "",
    vin: defaults.vin ?? "",
    immatriculation: defaults.immatriculation ?? "",
  });

  useEffect(() => {
    const propositions = {
      marque: defaults.marque ?? "",
      vin: defaults.vin ?? "",
      immatriculation: defaults.immatriculation ?? "",
    };
    setForm((actuel) => {
      let modifie = false;
      const suivant = { ...actuel };
      for (const champ of ["marque", "vin", "immatriculation"] as const) {
        const propose = propositions[champ];
        if (!propose) continue;
        const saisi = actuel[champ];
        // Champ encore vide, ou portant exactement ce qu'on avait propose :
        // personne n'y a touche, on peut le mettre a jour.
        const libre = saisi === "" || saisi === dernierePropositionVehicule.current[champ];
        if (!libre) continue;
        dernierePropositionVehicule.current[champ] = propose;
        if (saisi !== propose) {
          suivant[champ] = propose;
          modifie = true;
        }
      }
      return modifie ? suivant : actuel;
    });
  }, [defaults.marque, defaults.vin, defaults.immatriculation]);

  // Toute modification apres generation perime le PDF affiche : le lien
  // "Le verifier" pointait sur le document precedent, sans que rien ne signale
  // qu'il ne reflétait plus les cases cochées ni les champs corrigés. On revient
  // donc au bouton "Generer", pour que ce qui est montre corresponde toujours a
  // ce qui est saisi.
  useEffect(() => {
    setGeneratedUrl(null);
  }, [form, attesteAssurance, opposeProspection, signature, tampon]);

  const consignes = consignesMandant(flags);
  const generable = mandatGenerable(flags);
  // Soit la signature est déjà enregistrée (garage), soit le signataire trace la
  // sienne maintenant.
  const signatureConnue = dejaEnregistre.signature ?? savedSignaturePath ?? saved?.signature_path ?? null;
  const tamponConnu = dejaEnregistre.tampon ?? savedTamponPath ?? saved?.tampon_path ?? null;
  const doitSigner = !signatureConnue || remplacer;
  // Le Cerfa exige le cachet des qu'une societe est mandante : on le reclame
  // en meme temps que la signature, plutot que de produire un mandat incomplet.
  const doitTamponner = Boolean(garageId) && (!tamponConnu || remplacer);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const champsManquants = () => {
    const manquants: string[] = [];
    if (!form.identite.trim()) manquants.push("l'identité du mandant");
    if (!form.nomVoie.trim()) manquants.push("le nom de la voie");
    if (!form.codePostal.trim()) manquants.push("le code postal");
    if (!form.commune.trim()) manquants.push("la commune");
    if (!form.nature.trim()) manquants.push("la nature de l'opération");
    if (doitSigner && !signature && !signatureConnue) manquants.push("la signature");
    if (doitTamponner && !tampon && !tamponConnu) manquants.push("le tampon de l'entreprise");
    return manquants;
  };

  const generer = async () => {
    const manquants = champsManquants();
    if (manquants.length) {
      toast({
        title: "Informations incomplètes",
        description: `Il manque ${manquants.join(", ")}.`,
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      let signaturePath = signatureConnue ?? undefined;
      let tamponPath = tamponConnu ?? undefined;

      // Le chemin porte l'extension du contenu reel : un cachet en PDF ne doit
      // pas etre enregistre sous un nom en .png.
      const deposer = async (dataUrl: string, base: string) => {
        const blob = dataUrlToBlob(dataUrl);
        const chemin = `${base}.${extensionPour(blob.type)}`;
        const { error } = await supabase.storage
          .from("signatures")
          .upload(chemin, blob, { upsert: true, contentType: blob.type });
        if (error) throw error;
        return chemin;
      };

      if (garageId) {
        // Enregistrement definitif sur la fiche du garage : la prochaine
        // demarche reprendra ces chemins sans rien redemander.
        const patch: { signature_path?: string; tampon_path?: string } = {};
        if (signature) {
          signaturePath = await deposer(signature, `${garageId}/signature`);
          patch.signature_path = signaturePath;
        }
        if (tampon) {
          tamponPath = await deposer(tampon, `${garageId}/tampon`);
          patch.tampon_path = tamponPath;
        }
        if (Object.keys(patch).length) {
          const { error } = await supabase.from("garages").update(patch).eq("id", garageId);
          if (error) throw error;
          setDejaEnregistre((d) => ({
            signature: patch.signature_path ?? d.signature,
            tampon: patch.tampon_path ?? d.tampon,
          }));
        }
      } else if (signature && signatureUploadPath) {
        signaturePath = await deposer(signature, signatureUploadPath.replace(/\.png$/, ""));
      }

      const mandatData: MandatData = {
        mandant_type: mandantType,
        mandant_identite: form.identite.trim(),
        mandant_siret: form.siret.trim() || undefined,
        signataire_nom_qualite: form.signataire.trim() || undefined,
        adresse_numero: form.numero.trim() || undefined,
        adresse_extension: form.extension.trim() || undefined,
        adresse_type_voie: form.typeVoie.trim() || undefined,
        adresse_nom_voie: form.nomVoie.trim(),
        adresse_code_postal: form.codePostal.trim(),
        adresse_commune: form.commune.trim(),
        adresse_pays: "FRANCE",
        nature_operation: form.nature.trim(),
        vehicule_marque: form.marque.trim() || undefined,
        vehicule_vin: form.vin.trim().toUpperCase() || undefined,
        vehicule_immatriculation: form.immatriculation.trim().toUpperCase() || undefined,
        lieu_declaration: form.commune.trim(),
        atteste_assurance: attesteAssurance,
        oppose_prospection: opposeProspection,
        signature_path: signaturePath,
        tampon_path: tamponPath,
      };

      const { data, error } = await supabase.functions.invoke("generate-mandat", {
        body: { demarcheId, orderId, mandatData, documentType },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setGeneratedUrl(data.url);
      onGenerated?.(data.url);
      toast({ title: "Mandat généré", description: "Vérifiez-le, il est joint à votre dossier." });
    } catch (e) {
      console.error("Génération du mandat échouée:", e);
      const message = e instanceof Error ? e.message : "Impossible de générer le mandat.";
      toast({ title: "Erreur", description: message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  if (!generable) {
    return (
      <Card className="border-amber-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Mandat à faire signer par le loueur
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Le véhicule étant en location longue durée, le propriétaire reste le loueur : c'est lui qui doit
            établir le mandat. Nous ne pouvons pas le pré-remplir à votre nom sans le rendre inexact.
          </p>
          <Button variant="outline" asChild>
            <a href={getCerfaUrl("13757_03")} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4 mr-2" />
              Télécharger le Cerfa 13757 vierge
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSignature className="h-5 w-5 text-primary" />
          Mandat d'immatriculation
          <Badge variant="secondary" className="ml-auto">Cerfa 13757</Badge>
        </CardTitle>
        <CardDescription>
          Pré-rempli avec vos informations. Vérifiez-les, corrigez si besoin, et le mandat est joint
          automatiquement à votre dossier — rien à imprimer.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {consignes.map((c) => (
          <Alert key={c}>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">{c}</AlertDescription>
          </Alert>
        ))}

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mandant</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="mandat_identite">Nom, prénom ou raison sociale</Label>
              <Input id="mandat_identite" value={form.identite} onChange={set("identite")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mandat_siret">SIRET <span className="text-muted-foreground text-xs">(sociétés)</span></Label>
              <Input id="mandat_siret" value={form.siret} onChange={set("siret")} maxLength={14} placeholder="14 chiffres" />
            </div>
          </div>
          {(form.siret.trim() || flags.vehiculePro) && (
            <div className="space-y-1.5">
              <Label htmlFor="mandat_signataire">Nom et qualité du signataire</Label>
              <Input id="mandat_signataire" value={form.signataire} onChange={set("signataire")} placeholder="M. Dupont, gérant" />
              <p className="text-xs text-muted-foreground">Exigé par le Cerfa pour les sociétés, en plus du cachet.</p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Adresse</p>
          <div className="grid gap-3 grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="mandat_numero">N°</Label>
              <Input id="mandat_numero" value={form.numero} onChange={set("numero")} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="mandat_type_voie">Type de voie</Label>
              <Input id="mandat_type_voie" value={form.typeVoie} onChange={set("typeVoie")} placeholder="RUE, AVENUE…" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mandat_nom_voie">Nom de la voie</Label>
            <Input id="mandat_nom_voie" value={form.nomVoie} onChange={set("nomVoie")} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="mandat_cp">Code postal</Label>
              <Input id="mandat_cp" value={form.codePostal} onChange={set("codePostal")} maxLength={5} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mandat_commune">Commune</Label>
              <Input id="mandat_commune" value={form.commune} onChange={set("commune")} />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Véhicule et opération</p>
          <div className="space-y-1.5">
            <Label htmlFor="mandat_nature">Nature de l'opération</Label>
            <Input id="mandat_nature" value={form.nature} onChange={set("nature")} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="mandat_marque">Marque</Label>
              <Input id="mandat_marque" value={form.marque} onChange={set("marque")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mandat_immat">Immatriculation</Label>
              <Input id="mandat_immat" value={form.immatriculation} onChange={set("immatriculation")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mandat_vin">Numéro VIN</Label>
              <Input id="mandat_vin" value={form.vin} onChange={set("vin")} maxLength={17} placeholder="17 caractères" />
              <p className="text-xs text-muted-foreground">Champ E de votre carte grise.</p>
            </div>
          </div>
        </div>

        {!doitSigner && !doitTamponner && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-3">
            <p className="text-sm text-muted-foreground flex-1">
              {garageId
                ? "Votre signature et votre tampon enregistrés seront apposés."
                : "Votre signature enregistrée sera apposée."}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => setRemplacer(true)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Les remplacer
            </Button>
          </div>
        )}

        {(doitSigner || doitTamponner) && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {garageId ? "Signature et tampon de votre garage" : "Signature du mandant"}
            </p>

            {garageId && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  À enregistrer une seule fois : vos prochaines démarches les reprendront
                  automatiquement, vous n'aurez plus rien à saisir.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Déclarations</p>
          <div className="flex items-start space-x-3">
            <Checkbox
              id="mandat_assurance"
              checked={attesteAssurance}
              onCheckedChange={(c) => setAttesteAssurance(c as boolean)}
              className="mt-0.5"
            />
            <Label htmlFor="mandat_assurance" className="text-sm font-normal cursor-pointer leading-snug">
              Je suis informé(e) que pour circuler avec ce véhicule je suis dans l'obligation de
              l'assurer préalablement.
            </Label>
          </div>
          <div className="flex items-start space-x-3">
            <Checkbox
              id="mandat_prospection"
              checked={opposeProspection}
              onCheckedChange={(c) => setOpposeProspection(c as boolean)}
              className="mt-0.5"
            />
            <Label htmlFor="mandat_prospection" className="text-sm font-normal cursor-pointer leading-snug">
              Je m'oppose à la réutilisation de mes données personnelles à des fins de prospection
              commerciale.
            </Label>
          </div>
        </div>

        {doitSigner && (
              <SignaturePad
                label={garageId ? "Signature du dirigeant" : "Signez ci-dessous"}
                onChange={setSignature}
              />
            )}

            {doitTamponner && (
              <SignaturePad label="Tampon de l'entreprise" mode="upload" onChange={setTampon} />
            )}
          </div>
        )}

        {generatedUrl ? (
          <Alert className="border-green-500 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-green-700 dark:text-green-400">
                Mandat généré et joint à votre dossier.
              </span>
              <Button variant="outline" size="sm" asChild>
                <a href={generatedUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  Le vérifier
                </a>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setGeneratedUrl(null)}>
                Corriger et régénérer
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <Button onClick={generer} disabled={generating} className="w-full">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <FileSignature className="h-4 w-4 mr-2" />
                Générer mon mandat
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, PenLine, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SignaturePad } from "@/components/signature/SignaturePad";

interface GarageSignatureSettingsProps {
  garage: { id: string; signature_path?: string | null; tampon_path?: string | null } | null;
  onSaved?: (patch: { signature_path?: string | null; tampon_path?: string | null }) => void;
}

const BUCKET = "signatures";

// Le bucket est privé : on ne peut pas afficher l'image par URL publique, il
// faut une URL signée à durée limitée.
const SIGNED_URL_TTL = 60 * 60;

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, payload] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export const GarageSignatureSettings = ({ garage, onSaved }: GarageSignatureSettingsProps) => {
  const { toast } = useToast();
  const [signature, setSignature] = useState<string | null>(null);
  const [tampon, setTampon] = useState<string | null>(null);
  const [existingSignature, setExistingSignature] = useState<string | null>(null);
  const [existingTampon, setExistingTampon] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!garage) return;
      setLoading(true);
      try {
        for (const [path, setter] of [
          [garage.signature_path, setExistingSignature],
          [garage.tampon_path, setExistingTampon],
        ] as const) {
          if (!path) continue;
          const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
          if (data?.signedUrl) setter(data.signedUrl);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [garage]);

  const save = async () => {
    if (!garage) return;
    if (!signature && !tampon) {
      toast({ title: "Rien à enregistrer", description: "Tracez ou importez au moins une image.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const patch: { signature_path?: string; tampon_path?: string } = {};

      for (const [dataUrl, nom, cle] of [
        [signature, "signature", "signature_path"],
        [tampon, "tampon", "tampon_path"],
      ] as const) {
        if (!dataUrl) continue;
        // Le type vient du blob lui-même : une image importée peut être un
        // JPEG, et forcer image/png stockerait des octets JPEG sous une
        // etiquette mensongere.
        const blob = dataUrlToBlob(dataUrl);
        const extension = blob.type === "image/jpeg" ? "jpg" : "png";
        const path = `${garage.id}/${nom}.${extension}`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, blob, { upsert: true, contentType: blob.type });
        if (error) throw error;
        patch[cle] = path;
      }

      const { error: dbError } = await supabase.from("garages").update(patch).eq("id", garage.id);
      if (dbError) throw dbError;

      // On repasse par une URL signée pour afficher ce qui vient d'être stocké,
      // plutôt que de garder le dataURL local : ça vérifie au passage que la
      // lecture fonctionne bien avec les droits en place.
      for (const [cle, setter] of [
        ["signature_path", setExistingSignature],
        ["tampon_path", setExistingTampon],
      ] as const) {
        const path = patch[cle];
        if (!path) continue;
        const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
        if (data?.signedUrl) setter(data.signedUrl);
      }

      setSignature(null);
      setTampon(null);
      onSaved?.(patch);
      toast({ title: "Enregistré", description: "Vos mandats seront pré-remplis avec ces éléments." });
    } catch (e) {
      console.error("Enregistrement signature/tampon échoué:", e);
      const message = e instanceof Error ? e.message : "Impossible d'enregistrer.";
      toast({ title: "Erreur", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!garage) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenLine className="h-5 w-5 text-primary" />
          Signature et tampon
        </CardTitle>
        <CardDescription>
          Enregistrés une fois, ils pré-remplissent le mandat (Cerfa 13757) de vos démarches.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Ils ne sont apposés que lorsque <strong>votre garage est le mandant</strong> — véhicule qui vous
            appartient, ou mandat de votre client déjà en votre possession. Quand la démarche est faite au nom du
            client final, c'est lui qui doit signer.
          </AlertDescription>
        </Alert>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              {existingSignature && !signature && (
                <div className="rounded-lg border bg-muted/30 p-2">
                  <p className="text-xs text-muted-foreground mb-1">Signature enregistrée</p>
                  <img src={existingSignature} alt="Signature enregistrée" className="h-24 w-full object-contain" />
                </div>
              )}
              <SignaturePad
                label={existingSignature ? "Remplacer la signature" : "Signature du dirigeant"}
                onChange={setSignature}
              />
            </div>

            <div className="space-y-2">
              {existingTampon && !tampon && (
                <div className="rounded-lg border bg-muted/30 p-2">
                  <p className="text-xs text-muted-foreground mb-1">Tampon enregistré</p>
                  <img src={existingTampon} alt="Tampon enregistré" className="h-24 w-full object-contain" />
                </div>
              )}
              <SignaturePad
                label={existingTampon ? "Remplacer le tampon" : "Tampon de l'entreprise"}
                onChange={setTampon}
              />
            </div>
          </div>
        )}

        <Button onClick={save} disabled={saving || (!signature && !tampon)} className="w-full md:w-auto">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enregistrement...
            </>
          ) : (
            "Enregistrer"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

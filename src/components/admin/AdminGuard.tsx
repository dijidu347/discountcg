import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldCheck, Loader2, AlertCircle } from "lucide-react";

// Jeton d'appareil. Il ne donne aucun droit a lui seul : il ne vaut que
// presente avec une session admin valide, et le serveur n'en garde que
// l'empreinte.
const CLE_APPAREIL = "dcg_admin_device";

type Etape = "verification" | "autorise" | "code";

/**
 * Exige un second facteur avant d'ouvrir l'administration.
 *
 * A la premiere connexion depuis un appareil inconnu, un code a 6 chiffres est
 * envoye par e-mail. L'appareil est ensuite memorise pendant 60 jours.
 *
 * Les visiteurs non administrateurs traversent ce composant sans rien voir :
 * chaque page conserve son propre controle de role, celui-ci n'ajoute que la
 * couche de verification.
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [etape, setEtape] = useState<Etape>("verification");
  const [code, setCode] = useState("");
  const [emailMasque, setEmailMasque] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [verificationEnCours, setVerificationEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  // Supabase remplace l'objet user a chaque rafraichissement de session. Sans
  // ce garde-fou, l'effet se rejouait et renvoyait un code a chaque fois :
  // l'utilisateur recevait plusieurs mails et seul le dernier code etait
  // valide, donc celui qu'il lisait ne marchait jamais.
  const codeDejaDemande = useRef(false);

  const appeler = useCallback(async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("admin-2fa", { body: payload });
    if (error) {
      // 403 = l'utilisateur n'est pas administrateur. Ce n'est pas une erreur :
      // la page qu'il demande refusera elle-meme l'acces.
      const statut = (error as { context?: { status?: number } })?.context?.status;
      if (statut === 403) return { nonAdmin: true } as const;
      throw new Error("Vérification impossible");
    }
    return data as Record<string, unknown>;
  }, []);

  const demanderCode = useCallback(async () => {
    setEnvoiEnCours(true);
    setErreur(null);
    try {
      const r = await appeler({ action: "send" });
      if ("nonAdmin" in r) return;
      if (r?.error) setErreur(String(r.error));
      else setEmailMasque(String(r?.email ?? ""));
    } catch {
      setErreur("Le code n'a pas pu être envoyé. Réessayez.");
    } finally {
      setEnvoiEnCours(false);
    }
  }, [appeler]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setEtape("autorise"); // pas connecte : la page gere sa propre redirection
      return;
    }

    let annule = false;
    (async () => {
      try {
        const jeton = localStorage.getItem(CLE_APPAREIL) ?? undefined;
        const r = await appeler({ action: "check", deviceToken: jeton });
        if (annule) return;

        if ("nonAdmin" in r || r?.trusted) {
          setEtape("autorise");
          return;
        }
        setEtape("code");
        if (!codeDejaDemande.current) {
          codeDejaDemande.current = true;
          demanderCode();
        }
      } catch {
        if (!annule) {
          // En cas d'indisponibilite du service, on demande le code plutot que
          // d'ouvrir l'administration : le doute profite a la fermeture.
          setEtape("code");
          setErreur("Vérification indisponible. Demandez un code pour continuer.");
        }
      }
    })();

    return () => {
      annule = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, loading]);

  const valider = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerificationEnCours(true);
    setErreur(null);
    try {
      const r = await appeler({ action: "verify", code: code.trim() });
      if ("nonAdmin" in r) return;
      if (r?.ok && r?.deviceToken) {
        localStorage.setItem(CLE_APPAREIL, String(r.deviceToken));
        setEtape("autorise");
        return;
      }
      setErreur(String(r?.error ?? "Code incorrect."));
    } catch {
      setErreur("Vérification impossible. Réessayez.");
    } finally {
      setVerificationEnCours(false);
    }
  };

  if (loading || etape === "verification") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (etape === "autorise") return <>{children}</>;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-md border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Vérification de l'appareil
          </CardTitle>
          <CardDescription>
            {emailMasque
              ? `Nous avons envoyé un code à 6 chiffres à ${emailMasque}. Il est valable 10 minutes.`
              : "Cet appareil n'est pas encore reconnu pour l'administration."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={valider} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin_code">Code reçu par e-mail</Label>
              <Input
                id="admin_code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                className="text-center text-2xl tracking-[0.4em] font-mono"
                autoFocus
              />
            </div>

            {erreur && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{erreur}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={code.length !== 6 || verificationEnCours}>
              {verificationEnCours ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Vérification…
                </>
              ) : (
                "Valider"
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={demanderCode}
              disabled={envoiEnCours}
            >
              {envoiEnCours ? "Envoi…" : "Renvoyer un code"}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Une fois validé, cet appareil sera reconnu pendant 60 jours.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

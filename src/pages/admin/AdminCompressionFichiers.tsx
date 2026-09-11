import { useCallback, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { compressFile } from "@/lib/file-compression";
import { compresserPdf } from "@/lib/pdf-compression";

// Compression des pieces envoyees avant la compression a l'envoi (30/07/2026).
// Le travail se fait dans ce navigateur : chaque fichier est telecharge,
// compresse comme a l'envoi, puis remplace au meme chemin s'il est au moins
// 25 % plus leger. Chaque resultat est note en base : on peut fermer l'onglet
// et reprendre plus tard, rien n'est traite deux fois.

const GAIN_MINIMUM = 0.25;
const EN_PARALLELE = 3;
const TAILLE_LOT = 30;
const FICHIERS_TEST = 20;

interface Candidat {
  bucket: string;
  chemin: string;
  taille: number;
  type_mime: string;
}

interface Bilan {
  restants: number;
  octets_restants: number;
  compresses: number;
  gardes: number;
  erreurs: number;
  octets_economises: number;
}

type Rpc = (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc;

const go = (octets: number) => `${(octets / 1073741824).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} Go`;
const mo = (octets: number) => `${(octets / 1048576).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;

async function traiter(c: Candidat): Promise<{ statut: "compresse" | "garde" | "erreur"; apres: number | null; detail?: string }> {
  const { data: original, error: erreurLecture } = await supabase.storage.from(c.bucket).download(c.chemin);
  if (erreurLecture || !original) return { statut: "erreur", apres: null, detail: erreurLecture?.message ?? "lecture impossible" };

  let compresse: Blob | null = null;
  let typeContenu = c.type_mime;
  if (c.type_mime === "application/pdf") {
    compresse = await compresserPdf(original);
  } else {
    const nom = c.chemin.split("/").pop() || "document";
    const { file } = await compressFile(new File([original], nom, { type: c.type_mime }));
    if (file.type === "image/jpeg") {
      compresse = file;
      typeContenu = "image/jpeg";
    }
  }

  if (!compresse || compresse.size > original.size * (1 - GAIN_MINIMUM)) {
    return { statut: "garde", apres: original.size };
  }

  const { error: erreurEcriture } = await supabase.storage
    .from(c.bucket)
    .upload(c.chemin, compresse, { upsert: true, contentType: typeContenu });
  if (erreurEcriture) return { statut: "erreur", apres: null, detail: erreurEcriture.message };
  return { statut: "compresse", apres: compresse.size };
}

export default function AdminCompressionFichiers() {
  const [bilan, setBilan] = useState<Bilan | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [session, setSession] = useState({ traites: 0, economise: 0, erreurs: 0 });
  const [journal, setJournal] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const arreter = useRef(false);

  const chargerBilan = useCallback(async () => {
    const { data, error } = await rpc("bilan_compression");
    if (error) return setMessage(`Bilan indisponible : ${error.message}`);
    const ligne = (data as Bilan[] | null)?.[0];
    if (ligne) setBilan(ligne);
  }, []);

  useEffect(() => {
    chargerBilan();
  }, [chargerBilan]);

  const lancer = async (limite: number | null) => {
    arreter.current = false;
    setEnCours(true);
    setMessage(null);
    let traites = 0;
    try {
      while (!arreter.current && (limite === null || traites < limite)) {
        const { data, error } = await rpc("fichiers_a_compresser", { p_limite: TAILLE_LOT });
        if (error) throw new Error(error.message);
        let lot = (data as Candidat[] | null) ?? [];
        if (limite !== null) lot = lot.slice(0, limite - traites);
        if (lot.length === 0) {
          setMessage("Tous les anciens fichiers ont été traités.");
          break;
        }

        const file = [...lot];
        const ouvrier = async () => {
          while (!arreter.current && file.length > 0) {
            const c = file.shift()!;
            let resultat: Awaited<ReturnType<typeof traiter>>;
            try {
              resultat = await traiter(c);
            } catch (e) {
              resultat = { statut: "erreur", apres: null, detail: e instanceof Error ? e.message : String(e) };
            }
            await rpc("enregistrer_compression", {
              p_bucket: c.bucket,
              p_chemin: c.chemin,
              p_taille_avant: c.taille,
              p_taille_apres: resultat.apres,
              p_statut: resultat.statut,
              p_detail: resultat.detail ?? null,
            });
            traites += 1;
            const gain = resultat.statut === "compresse" && resultat.apres !== null ? c.taille - resultat.apres : 0;
            setSession((s) => ({
              traites: s.traites + 1,
              economise: s.economise + gain,
              erreurs: s.erreurs + (resultat.statut === "erreur" ? 1 : 0),
            }));
            const libelle =
              resultat.statut === "compresse"
                ? `${mo(c.taille)} → ${mo(resultat.apres ?? 0)}`
                : resultat.statut === "garde"
                  ? `gardé tel quel (${mo(c.taille)})`
                  : `erreur : ${resultat.detail}`;
            setJournal((j) => [`${c.chemin.split("/").pop()} — ${libelle}`, ...j].slice(0, 15));
          }
        };
        await Promise.all(Array.from({ length: EN_PARALLELE }, ouvrier));
        await chargerBilan();
      }
    } catch (e) {
      setMessage(`Traitement interrompu : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setEnCours(false);
      await chargerBilan();
    }
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <Helmet>
        <title>Compression des anciens fichiers</title>
      </Helmet>
      <Card>
        <CardHeader>
          <CardTitle>Compression des anciens fichiers</CardTitle>
          <CardDescription>
            Pièces envoyées avant le 30/07/2026. Chaque fichier est compressé comme à l'envoi et remplacé seulement s'il
            devient au moins 25 % plus léger. Les PDF qui contiennent du texte ne sont jamais modifiés. Laissez cet onglet
            ouvert pendant le traitement ; vous pouvez l'arrêter et le reprendre quand vous voulez.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Restants</p>
              <p className="text-xl font-bold">{bilan ? bilan.restants.toLocaleString("fr-FR") : "…"}</p>
              <p className="text-xs text-muted-foreground">{bilan ? go(bilan.octets_restants) : ""}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Compressés</p>
              <p className="text-xl font-bold">{bilan ? bilan.compresses.toLocaleString("fr-FR") : "…"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Gardés tels quels</p>
              <p className="text-xl font-bold">{bilan ? bilan.gardes.toLocaleString("fr-FR") : "…"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Économisé</p>
              <p className="text-xl font-bold text-emerald-600">{bilan ? go(bilan.octets_economises) : "…"}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" disabled={enCours} onClick={() => lancer(FICHIERS_TEST)}>
              Tester sur {FICHIERS_TEST} fichiers
            </Button>
            <Button disabled={enCours} onClick={() => lancer(null)}>
              Tout compresser
            </Button>
            <Button variant="ghost" disabled={!enCours} onClick={() => (arreter.current = true)}>
              Arrêter
            </Button>
          </div>

          {(enCours || session.traites > 0) && (
            <p className="text-sm">
              {enCours ? "En cours… " : ""}
              Cette session : {session.traites} fichiers traités, {go(session.economise)} économisés
              {session.erreurs > 0 ? `, ${session.erreurs} erreurs` : ""}.
            </p>
          )}
          {bilan && bilan.erreurs > 0 && (
            <p className="text-sm text-muted-foreground">{bilan.erreurs} fichiers en erreur au total : ils restent intacts.</p>
          )}
          {message && <p className="text-sm font-medium">{message}</p>}

          {journal.length > 0 && (
            <ul className="text-xs text-muted-foreground space-y-1 font-mono break-all">
              {journal.map((ligne, i) => (
                <li key={i}>{ligne}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

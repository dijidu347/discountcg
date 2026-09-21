import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, Loader2, LogOut, Mail, MapPin, Phone, Search, StickyNote } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatDateTimeParis } from "@/lib/dateFormat";

// Espace des prospecteurs : la liste des garages, leurs coordonnées et les notes
// de prospection. Aucune démarche, aucun montant : les données arrivent de
// fonctions en base (garages_prospection…) qui ne renvoient que les colonnes
// autorisées, et seulement aux rôles prospecteur et admin.

interface GarageProspection {
  id: string;
  raison_sociale: string | null;
  siret: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  inscrit_le: string;
  verification: "verifie" | "en_cours" | "jamais";
  actif_90j: boolean;
  derniere_note_le: string | null;
  prochain_rappel: string | null;
  nb_notes: number;
}

interface NoteProspection {
  id: string;
  auteur_email: string | null;
  contenu: string;
  rappel_le: string | null;
  created_at: string;
}

const VERIFICATION: Record<GarageProspection["verification"], { texte: string; classe: string }> = {
  verifie: { texte: "Vérifié", classe: "bg-green-600 hover:bg-green-600" },
  en_cours: { texte: "Vérification en cours", classe: "bg-amber-500 hover:bg-amber-500" },
  jamais: { texte: "Jamais demandée", classe: "bg-slate-200 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200" },
};

const jour = (valeur: string | null | undefined) => formatDateTimeParis(valeur)?.slice(0, 10) ?? "—";
const jourCalendrier = (valeur: string | null | undefined) =>
  valeur ? new Date(`${valeur}T12:00:00`).toLocaleDateString("fr-FR") : "—";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// bind : sans lui, la méthode détachée perd son client et plante au premier appel.
const rpc = supabase.rpc.bind(supabase) as unknown as (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>;

export default function Prospection() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [autorise, setAutorise] = useState<boolean | null>(null);
  const [garages, setGarages] = useState<GarageProspection[]>([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState("");
  const [filtreVerif, setFiltreVerif] = useState("tous");
  const [filtreActif, setFiltreActif] = useState("tous");
  const [aRappeler, setARappeler] = useState(false);
  const [page, setPage] = useState(1);
  const [ouvert, setOuvert] = useState<GarageProspection | null>(null);
  const [notes, setNotes] = useState<NoteProspection[]>([]);
  const [nouvelleNote, setNouvelleNote] = useState("");
  const [rappel, setRappel] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const liste = (roles || []).map((r) => r.role as string);
      const ok = liste.includes("prospecteur") || liste.includes("admin");
      setAutorise(ok);
      if (ok) charger();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const charger = async () => {
    setChargement(true);
    const { data, error } = await rpc("garages_prospection");
    if (error) {
      toast({ title: "Chargement impossible", description: error.message, variant: "destructive" });
    } else {
      setGarages((data || []) as GarageProspection[]);
    }
    setChargement(false);
  };

  const aujourdHui = new Date().toISOString().slice(0, 10);

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return garages.filter((g) => {
      if (q && ![g.raison_sociale, g.ville, g.email, g.siret, g.telephone, g.code_postal]
        .some((v) => (v || "").toLowerCase().includes(q))) return false;
      if (filtreVerif !== "tous" && g.verification !== filtreVerif) return false;
      if (filtreActif === "actifs" && !g.actif_90j) return false;
      if (filtreActif === "inactifs" && g.actif_90j) return false;
      if (aRappeler && !(g.prochain_rappel && g.prochain_rappel <= aujourdHui)) return false;
      return true;
    });
  }, [garages, recherche, filtreVerif, filtreActif, aRappeler, aujourdHui]);

  useEffect(() => setPage(1), [recherche, filtreVerif, filtreActif, aRappeler]);

  const PAR_PAGE = 50;
  const pages = Math.max(1, Math.ceil(filtres.length / PAR_PAGE));
  const visibles = filtres.slice((page - 1) * PAR_PAGE, page * PAR_PAGE);
  const nbARappeler = garages.filter((g) => g.prochain_rappel && g.prochain_rappel <= aujourdHui).length;

  const ouvrir = async (g: GarageProspection) => {
    setOuvert(g);
    setNotes([]);
    setNouvelleNote("");
    setRappel("");
    const { data } = await rpc("notes_prospection_garage", { p_garage_id: g.id });
    setNotes((data || []) as NoteProspection[]);
  };

  const ajouterNote = async () => {
    if (!ouvert) return;
    if (!nouvelleNote.trim()) {
      toast({ title: "Note vide", description: "Écrivez ce qui s'est dit avant d'enregistrer.", variant: "destructive" });
      return;
    }
    setEnregistrement(true);
    const { error } = await rpc("ajouter_note_prospection", {
      p_garage_id: ouvert.id,
      p_contenu: nouvelleNote,
      p_rappel_le: rappel || null,
    });
    setEnregistrement(false);
    if (error) {
      toast({ title: "Note non enregistrée", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Note enregistrée" });
    await ouvrir(ouvert);
    charger();
  };

  if (authLoading || autorise === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!autorise) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-lg font-semibold">Cet espace est réservé aux prospecteurs.</p>
        <p className="text-muted-foreground">Votre compte n'a pas encore l'accès. Demandez-le à DiscountCarteGrise.</p>
        <Button variant="outline" onClick={() => navigate("/")}>Retour à l'accueil</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Prospection | Discount Carte Grise</title>
      </Helmet>

      <div className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <p className="text-xl font-bold">DiscountCarteGrise · Prospection</p>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Déconnexion
          </Button>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Garages</h1>
            <p className="text-muted-foreground">
              {garages.length} garages inscrits · {nbARappeler} à rappeler aujourd'hui
            </p>
          </div>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-[1fr,200px,160px,auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Nom, ville, email, SIRET, téléphone…"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
          </div>
          <Select value={filtreVerif} onValueChange={setFiltreVerif}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Toute vérification</SelectItem>
              <SelectItem value="verifie">Vérifiés</SelectItem>
              <SelectItem value="en_cours">Vérification en cours</SelectItem>
              <SelectItem value="jamais">Jamais demandée</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtreActif} onValueChange={setFiltreActif}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Actifs et inactifs</SelectItem>
              <SelectItem value="actifs">Actifs</SelectItem>
              <SelectItem value="inactifs">Inactifs</SelectItem>
            </SelectContent>
          </Select>
          <Button variant={aRappeler ? "default" : "outline"} onClick={() => setARappeler((v) => !v)}>
            <CalendarClock className="mr-2 h-4 w-4" />
            À rappeler
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {chargement ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtres.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">Aucun garage ne correspond à ces filtres.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Garage</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Inscrit le</TableHead>
                      <TableHead>Vérification</TableHead>
                      <TableHead>Activité</TableHead>
                      <TableHead>Suivi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibles.map((g) => (
                      <TableRow key={g.id} className="cursor-pointer" onClick={() => ouvrir(g)}>
                        <TableCell>
                          <p className="font-medium">{g.raison_sociale || "Sans raison sociale"}</p>
                          <p className="text-xs text-muted-foreground">{[g.code_postal, g.ville].filter(Boolean).join(" ") || "—"}</p>
                        </TableCell>
                        <TableCell className="text-sm">
                          <p>{g.telephone || "—"}</p>
                          <p className="text-xs text-muted-foreground">{g.email || ""}</p>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm tabular-nums">{jour(g.inscrit_le)}</TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${VERIFICATION[g.verification].classe}`}>{VERIFICATION[g.verification].texte}</Badge>
                        </TableCell>
                        <TableCell>
                          {g.actif_90j ? (
                            <Badge className="bg-blue-600 text-xs hover:bg-blue-600">Actif</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Inactif</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {g.prochain_rappel ? (
                            <p className={g.prochain_rappel <= aujourdHui ? "font-semibold text-red-600" : ""}>
                              Rappel le {jourCalendrier(g.prochain_rappel)}
                            </p>
                          ) : null}
                          <p className="text-muted-foreground">
                            {g.nb_notes > 0 ? `${g.nb_notes} note${g.nb_notes > 1 ? "s" : ""} · ${jour(g.derniere_note_le)}` : "Aucune note"}
                          </p>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {pages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Précédent</Button>
            <span className="text-sm text-muted-foreground">Page {page} sur {pages}</span>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Suivant</Button>
          </div>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          « Actif » : au moins une démarche réglée ces 90 derniers jours.
        </p>
      </div>

      <Dialog open={!!ouvert} onOpenChange={(v) => !v && setOuvert(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          {ouvert && (
            <>
              <DialogHeader>
                <DialogTitle>{ouvert.raison_sociale || "Sans raison sociale"}</DialogTitle>
                <DialogDescription>SIRET {ouvert.siret || "—"} · inscrit le {jour(ouvert.inscrit_le)}</DialogDescription>
              </DialogHeader>

              <div className="grid gap-2 text-sm">
                <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />
                  {ouvert.telephone ? <a className="underline" href={`tel:${ouvert.telephone}`}>{ouvert.telephone}</a> : "—"}
                </p>
                <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />
                  {ouvert.email ? <a className="underline" href={`mailto:${ouvert.email}`}>{ouvert.email}</a> : "—"}
                </p>
                <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />
                  {[ouvert.adresse, [ouvert.code_postal, ouvert.ville].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "—"}
                </p>
                <div className="flex gap-2 pt-1">
                  <Badge className={`text-xs ${VERIFICATION[ouvert.verification].classe}`}>{VERIFICATION[ouvert.verification].texte}</Badge>
                  {ouvert.actif_90j ? <Badge className="bg-blue-600 text-xs hover:bg-blue-600">Actif</Badge> : <Badge variant="outline" className="text-xs">Inactif</Badge>}
                </div>
              </div>

              <div className="space-y-3 border-t pt-4">
                <p className="flex items-center gap-2 font-semibold"><StickyNote className="h-4 w-4" />Nouvelle note</p>
                <Textarea
                  placeholder="Appelé le gérant, intéressé par les packs de jetons, rappeler mardi…"
                  value={nouvelleNote}
                  onChange={(e) => setNouvelleNote(e.target.value)}
                  rows={3}
                />
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="rappel" className="text-xs">Date de rappel (facultatif)</Label>
                    <Input id="rappel" type="date" value={rappel} onChange={(e) => setRappel(e.target.value)} className="w-44" />
                  </div>
                  <Button onClick={ajouterNote} disabled={enregistrement}>
                    {enregistrement ? "Enregistrement…" : "Enregistrer la note"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2 border-t pt-4">
                <p className="font-semibold">Historique</p>
                {notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune note pour ce garage.</p>
                ) : (
                  notes.map((n) => (
                    <div key={n.id} className="rounded-md border p-3 text-sm">
                      <p className="whitespace-pre-wrap">{n.contenu}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDateTimeParis(n.created_at)} · {n.auteur_email || "—"}
                        {n.rappel_le ? ` · rappel le ${jourCalendrier(n.rappel_le)}` : ""}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

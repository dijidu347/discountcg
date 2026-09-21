import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { formatDateTimeParis } from "@/lib/dateFormat";

// Tous les comptes du site, avec leur type : professionnel, particulier,
// prospecteur (et admin). L'accès prospection se donne et se retire ici.
// La liste vient de liste_comptes(), réservée aux administrateurs.

interface Compte {
  user_id: string;
  email: string | null;
  nom: string | null;
  garage_id: string | null;
  roles: string[];
  inscrit_le: string;
  derniere_connexion: string | null;
}

type Filtre = "tous" | "pro" | "particulier" | "prospecteur" | "admin";

const estPro = (c: Compte) => !!c.garage_id || c.roles.includes("garage");
const estProspecteur = (c: Compte) => c.roles.includes("prospecteur");
const estAdmin = (c: Compte) => c.roles.includes("admin");
const estParticulier = (c: Compte) => !estPro(c) && !estProspecteur(c) && !estAdmin(c);

const jour = (v: string | null | undefined) => formatDateTimeParis(v)?.slice(0, 10) ?? "—";

// bind : sans lui, la méthode détachée perd son client et plante au premier appel.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = supabase.rpc.bind(supabase) as unknown as (fn: string, args?: Record<string, unknown>) => any;

export default function ManageAccounts() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<string | null>(null);
  // Fiche d'un compte sans garage (particulier, prospecteur) : l'accès
  // prospection se donne et se retire ici, pas depuis la liste.
  const [ficheCompte, setFicheCompte] = useState<Compte | null>(null);

  useEffect(() => {
    if (!authLoading && user) checkAdminAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const checkAdminAccess = async () => {
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user?.id);
    if (!roles?.some((r) => r.role === "admin")) {
      navigate("/");
      return;
    }
    await charger();
  };

  // Par pages de 1000 : une requête n'en renvoie jamais davantage.
  const charger = async () => {
    setLoading(true);
    const tous: Compte[] = [];
    for (let depuis = 0; ; depuis += 1000) {
      const { data, error } = await rpc("liste_comptes").range(depuis, depuis + 999);
      if (error) {
        toast({ title: "Chargement impossible", description: error.message, variant: "destructive" });
        break;
      }
      tous.push(...((data || []) as Compte[]));
      if (!data || data.length < 1000) break;
    }
    setComptes(tous);
    setLoading(false);
  };

  const compteurs = useMemo(() => ({
    tous: comptes.length,
    pro: comptes.filter(estPro).length,
    particulier: comptes.filter(estParticulier).length,
    prospecteur: comptes.filter(estProspecteur).length,
    admin: comptes.filter(estAdmin).length,
  }), [comptes]);

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return comptes.filter((c) => {
      if (filtre === "pro" && !estPro(c)) return false;
      if (filtre === "particulier" && !estParticulier(c)) return false;
      if (filtre === "prospecteur" && !estProspecteur(c)) return false;
      if (filtre === "admin" && !estAdmin(c)) return false;
      if (q && ![c.email, c.nom].some((v) => (v || "").toLowerCase().includes(q))) return false;
      return true;
    });
  }, [comptes, filtre, recherche]);

  useEffect(() => setPage(1), [filtre, recherche]);
  const PAR_PAGE = 50;
  const pages = Math.max(1, Math.ceil(filtres.length / PAR_PAGE));
  const visibles = filtres.slice((page - 1) * PAR_PAGE, page * PAR_PAGE);

  const adminVersProspecteur = async (c: Compte) => {
    setAction(c.user_id);
    const { error } = await rpc("admin_vers_prospecteur", { p_user_id: c.user_id });
    setAction(null);
    if (error) {
      toast({ title: "Compte non modifié", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Compte passé prospecteur", description: `${c.email ?? ""} n'a plus accès à l'administration.` });
    setFicheCompte((f) => (f ? { ...f, roles: [...f.roles.filter((r) => r !== "admin"), "prospecteur"] } : f));
    await charger();
  };

  const retirerAcces = async (c: Compte) => {
    setAction(c.user_id);
    const { error } = await rpc("retirer_prospecteur", { p_user_id: c.user_id });
    setAction(null);
    if (error) {
      toast({ title: "Accès non retiré", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Accès prospection retiré", description: c.email ?? "" });
    setFicheCompte((f) => (f ? { ...f, roles: f.roles.filter((r) => r !== "prospecteur") } : f));
    await charger();
  };

  const types = (c: Compte) => (
    <div className="flex flex-wrap gap-1">
      {estPro(c) && <Badge className="bg-blue-600 hover:bg-blue-600 text-xs">Professionnel</Badge>}
      {estProspecteur(c) && <Badge className="bg-purple-600 hover:bg-purple-600 text-xs">Prospecteur</Badge>}
      {estAdmin(c) && <Badge className="bg-slate-800 hover:bg-slate-800 text-xs">Admin</Badge>}
      {(c.roles.includes("particulier") || estParticulier(c)) && !estPro(c) && !estProspecteur(c) && !estAdmin(c) && (
        <Badge variant="outline" className="text-xs">Particulier</Badge>
      )}
    </div>
  );

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  const ONGLETS: { cle: Filtre; texte: string }[] = [
    { cle: "tous", texte: "Tous" },
    { cle: "pro", texte: "Professionnels" },
    { cle: "particulier", texte: "Particuliers" },
    { cle: "prospecteur", texte: "Prospecteurs" },
    { cle: "admin", texte: "Admins" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Gérer les comptes | Discount Carte Grise</title>
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/admin")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>

        <Card className="p-6">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
            <h1 className="text-2xl font-bold">Gestion des comptes</h1>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Nom ou email…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {ONGLETS.map((o) => (
              <Button
                key={o.cle}
                size="sm"
                variant={filtre === o.cle ? "default" : "outline"}
                onClick={() => setFiltre(o.cle)}
              >
                {o.texte} ({compteurs[o.cle]})
              </Button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Inscrit le</TableHead>
                  <TableHead>Dernière connexion</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibles.map((c) => (
                  <TableRow key={c.user_id}>
                    <TableCell className="font-medium">{c.nom || "—"}</TableCell>
                    <TableCell className="text-sm">{c.email || "—"}</TableCell>
                    <TableCell>{types(c)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm tabular-nums">{jour(c.inscrit_le)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm tabular-nums">{jour(c.derniere_connexion)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => (c.garage_id && !estAdmin(c) ? navigate(`/admin/garages/${c.garage_id}`) : setFicheCompte(c))}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Voir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {visibles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucun compte ne correspond.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {pages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Précédent</Button>
              <span className="text-sm text-muted-foreground">Page {page} sur {pages}</span>
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Suivant</Button>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={!!ficheCompte} onOpenChange={(v) => !v && setFicheCompte(null)}>
        <DialogContent className="max-w-lg">
          {ficheCompte && (
            <>
              <DialogHeader>
                <DialogTitle>{ficheCompte.nom || ficheCompte.email || "Compte"}</DialogTitle>
                <DialogDescription>{ficheCompte.email}</DialogDescription>
              </DialogHeader>
              <dl className="grid grid-cols-[auto,1fr] gap-x-6 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Type</dt>
                <dd>{types(ficheCompte)}</dd>
                <dt className="text-muted-foreground">Inscrit le</dt>
                <dd>{jour(ficheCompte.inscrit_le)}</dd>
                <dt className="text-muted-foreground">Dernière connexion</dt>
                <dd>{jour(ficheCompte.derniere_connexion)}</dd>
              </dl>
              {ficheCompte.garage_id && (
                <Button variant="outline" size="sm" className="self-start" onClick={() => navigate(`/admin/garages/${ficheCompte.garage_id}`)}>
                  <Eye className="h-4 w-4 mr-1" />
                  Voir la fiche garage
                </Button>
              )}
              {(estAdmin(ficheCompte) || estProspecteur(ficheCompte)) && (
                <div className="border-t pt-4 space-y-2">
                  <p className="font-semibold">Accès prospection</p>
                  {estAdmin(ficheCompte) ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Le compte perd l'accès à l'administration et ne voit plus que l'espace Prospection : les
                        garages et leurs coordonnées, jamais les démarches ni les chiffres.
                      </p>
                      {ficheCompte.user_id === user?.id ? (
                        <p className="text-sm text-muted-foreground">Vous ne pouvez pas modifier votre propre compte.</p>
                      ) : (
                        <Button disabled={action === ficheCompte.user_id} onClick={() => adminVersProspecteur(ficheCompte)}>
                          Rendre prospecteur (retire l'admin)
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button variant="outline" disabled={action === ficheCompte.user_id} onClick={() => retirerAcces(ficheCompte)}>
                      Retirer l'accès prospection
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

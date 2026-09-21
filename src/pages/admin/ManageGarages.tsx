import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Eye, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/utils";
import { formatDateTimeParis } from "@/lib/dateFormat";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RequiredDocument {
  id: string;
  code: string;
  nom_document: string;
  description: string;
  obligatoire: boolean;
  ordre: number;
  actif: boolean;
}

interface Notification {
  id: string;
  subject: string;
  message: string;
  created_at: string;
  sent_by: string;
}

// Jour d'inscription, sans l'heure : la colonne doit rester étroite.
const jourInscription = (valeur: string | null | undefined) =>
  formatDateTimeParis(valeur)?.slice(0, 10) ?? "—";

// Garages : onglets par étape de vérification, tri, filtres.
type Onglet = "a_verifier" | "en_attente" | "valides" | "sans_demande";
type Tri = "recents" | "anciens" | "depense" | "demarches";

interface Stats {
  total: number;
  nb_demarches: number;
  derniere_demarche: string | null;
  a_des_documents: boolean;
}

const JOUR = 86_400_000;

type Garage = Tables<"garages">;

// Département déduit du code postal (Corse : 2A / 2B, outre-mer : 3 chiffres).
const departementDe = (cp: string | null | undefined): string | null => {
  const c = String(cp || "").replace(/\s/g, "");
  if (!/^\d{5}$/.test(c)) return null;
  if (c.startsWith("97") || c.startsWith("98")) return c.slice(0, 3);
  if (c.startsWith("20")) return Number(c) < 20200 ? "2A" : "2B";
  return c.slice(0, 2);
};

const jour = (valeur: string | null | undefined) => formatDateTimeParis(valeur)?.slice(0, 10) ?? "—";

// Filtres, tri et onglet survivent à un aller-retour vers une fiche.
const lireMemoire = () => {
  try { return JSON.parse(sessionStorage.getItem("gerer-garages") || "{}"); } catch { return {}; }
};

export default function ManageGarages() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const memoire = useMemo(lireMemoire, []);
  const [garages, setGarages] = useState<Garage[]>([]);
  const [stats, setStats] = useState<Record<string, Stats>>({});
  const [loading, setLoading] = useState(true);
  const [requiredDocs, setRequiredDocs] = useState<RequiredDocument[]>([]);
  const [showManageDocsDialog, setShowManageDocsDialog] = useState(false);
  const [newDocForm, setNewDocForm] = useState({ nom_document: "", code: "", description: "", obligatoire: true });
  const [savingDoc, setSavingDoc] = useState(false);

  const [onglet, setOnglet] = useState<Onglet>(memoire.onglet ?? "a_verifier");
  const [recherche, setRecherche] = useState<string>(memoire.recherche ?? "");
  const [tri, setTri] = useState<Tri>(memoire.tri ?? "recents");
  const [activite, setActivite] = useState<string>(memoire.activite ?? "tous");
  const [solde, setSolde] = useState<string>(memoire.solde ?? "tous");
  const [offerte, setOfferte] = useState<string>(memoire.offerte ?? "tous");
  const [inscription, setInscription] = useState<string>(memoire.inscription ?? "tous");
  const [departement, setDepartement] = useState<string>(memoire.departement ?? "tous");
  const [page, setPage] = useState<number>(memoire.page ?? 1);

  useEffect(() => {
    try {
      sessionStorage.setItem("gerer-garages", JSON.stringify({ onglet, recherche, tri, activite, solde, offerte, inscription, departement, page }));
    } catch { /* navigation privée */ }
  }, [onglet, recherche, tri, activite, solde, offerte, inscription, departement, page]);

  useEffect(() => {
    if (!authLoading && user) {
      checkAdminAccess();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const checkAdminAccess = async () => {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user?.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roles) {
      navigate('/dashboard');
      return;
    }

    loadGarages();
    loadRequiredDocs();
  };

  const loadRequiredDocs = async () => {
    const { data } = await supabase
      .from('garage_verification_required_documents')
      .select('*')
      .order('ordre', { ascending: true });
    setRequiredDocs(data || []);
  };

  // Garages par pages de 1000 (plafond d'une requête), puis leurs chiffres
  // calculés en base (dépense, démarches, dernière démarche, documents).
  const loadGarages = async () => {
    const tous: Garage[] = [];
    for (let depuis = 0; ; depuis += 1000) {
      const { data, error } = await supabase
        .from('garages')
        .select('*')
        .order('created_at', { ascending: false })
        .range(depuis, depuis + 999);
      if (error) {
        console.error('Error loading garages:', error);
        break;
      }
      tous.push(...(data || []));
      if (!data || data.length < 1000) break;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: totaux } = await supabase.rpc('depense_par_garage' as any);
    const parGarage: Record<string, Stats> = {};
    ((totaux || []) as ({ garage_id: string } & Stats)[]).forEach((t) => {
      parGarage[t.garage_id] = {
        total: Number(t.total) || 0,
        nb_demarches: Number(t.nb_demarches) || 0,
        derniere_demarche: t.derniere_demarche,
        a_des_documents: !!t.a_des_documents,
      };
    });
    setStats(parGarage);
    setGarages(tous);
    setLoading(false);
  };

  // Check if all required documents are approved
  const handleAddRequiredDoc = async () => {
    if (!newDocForm.nom_document.trim() || !newDocForm.code.trim()) return;
    setSavingDoc(true);
    try {
      const maxOrdre = Math.max(...requiredDocs.map(d => d.ordre), 0);
      const { error } = await supabase.from('garage_verification_required_documents').insert({
        nom_document: newDocForm.nom_document,
        code: newDocForm.code.toLowerCase().replace(/\s+/g, '_'),
        description: newDocForm.description,
        obligatoire: newDocForm.obligatoire,
        ordre: maxOrdre + 1
      });
      if (error) throw error;
      toast({ title: "Document ajouté" });
      setNewDocForm({ nom_document: "", code: "", description: "", obligatoire: true });
      await loadRequiredDocs();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setSavingDoc(false);
    }
  };

  const handleToggleDocActive = async (doc: RequiredDocument) => {
    await supabase.from('garage_verification_required_documents')
      .update({ actif: !doc.actif })
      .eq('id', doc.id);
    await loadRequiredDocs();
  };

  const handleToggleDocRequired = async (doc: RequiredDocument) => {
    await supabase.from('garage_verification_required_documents')
      .update({ obligatoire: !doc.obligatoire })
      .eq('id', doc.id);
    await loadRequiredDocs();
  };

  // Étape de vérification de chaque garage (mêmes règles qu'avant, plus un
  // onglet pour ceux qui n'ont jamais rien demandé, jusqu'ici invisibles).
  const etape = (g: Garage): Onglet => {
    if (g.is_verified) return "valides";
    if (g.verification_requested_at && !g.verification_admin_viewed) return "a_verifier";
    if (stats[g.id]?.a_des_documents && g.verification_admin_viewed) return "en_attente";
    return "sans_demande";
  };

  const departements = useMemo(
    () => Array.from(new Set(garages.map((g) => departementDe(g.code_postal)).filter(Boolean) as string[])).sort(),
    [garages],
  );

  const maintenant = Date.now();
  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return garages.filter((g) => {
      const st = stats[g.id];
      if (q && ![g.raison_sociale, g.email, g.ville, g.siret, g.telephone].some((v) => (v || "").toLowerCase().includes(q))) return false;
      if (departement !== "tous" && departementDe(g.code_postal) !== departement) return false;
      if (activite !== "tous") {
        const derniere = st?.derniere_demarche ? new Date(st.derniere_demarche).getTime() : null;
        const age = derniere ? (maintenant - derniere) / JOUR : null;
        if (activite === "jamais" && age !== null) return false;
        if (activite === "actif" && !(age !== null && age <= 30)) return false;
        if (activite === "ralenti" && !(age !== null && age > 30 && age <= 90)) return false;
        if (activite === "inactif" && !(age !== null && age > 90)) return false;
      }
      if (solde === "avec" && !(Number(g.token_balance) > 0)) return false;
      if (solde === "vide" && Number(g.token_balance) > 0) return false;
      if (offerte === "non_utilisee" && !g.free_token_available) return false;
      if (inscription !== "tous" && maintenant - new Date(g.created_at).getTime() > Number(inscription) * JOUR) return false;
      return true;
    });
  }, [garages, stats, recherche, departement, activite, solde, offerte, inscription, maintenant]);

  const comptes = useMemo(() => {
    const c: Record<Onglet, number> = { a_verifier: 0, en_attente: 0, valides: 0, sans_demande: 0 };
    filtres.forEach((g) => { c[etape(g)]++; });
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtres, stats]);

  const liste = useMemo(() => {
    const valeur = (g: Garage) =>
      tri === "depense" ? stats[g.id]?.total || 0
        : tri === "demarches" ? stats[g.id]?.nb_demarches || 0
        : new Date(g.created_at).getTime();
    return filtres
      .filter((g) => etape(g) === onglet)
      .sort((a, b) => (tri === "anciens" ? valeur(a) - valeur(b) : valeur(b) - valeur(a)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtres, onglet, tri, stats]);

  const PAR_PAGE = 50;
  const pages = Math.max(1, Math.ceil(liste.length / PAR_PAGE));
  const pageCourante = Math.min(page, pages);
  const visibles = liste.slice((pageCourante - 1) * PAR_PAGE, pageCourante * PAR_PAGE);

  const filtresActifs = [activite, solde, offerte, inscription, departement].filter((v) => v !== "tous").length;
  const reinitialiser = () => {
    setActivite("tous"); setSolde("tous"); setOfferte("tous"); setInscription("tous"); setDepartement("tous"); setRecherche("");
  };
  const changer = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(1); };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  const ONGLETS: { cle: Onglet; texte: string }[] = [
    { cle: "a_verifier", texte: "À vérifier" },
    { cle: "en_attente", texte: "En attente de documents" },
    { cle: "valides", texte: "Validés" },
    { cle: "sans_demande", texte: "Sans demande" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Admin - Gérer les garages | Discount Carte Grise</title>
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate("/admin")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <Button variant="outline" onClick={() => setShowManageDocsDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Gérer les documents requis
          </Button>
        </div>

        <h1 className="text-3xl font-bold mb-4">Garages</h1>

        {/* Onglets */}
        <div className="flex flex-wrap gap-2 mb-4 border-b pb-3">
          {ONGLETS.map((o) => (
            <Button
              key={o.cle}
              variant={onglet === o.cle ? "default" : "ghost"}
              onClick={() => { setOnglet(o.cle); setPage(1); }}
            >
              {o.texte}
              <Badge variant={onglet === o.cle ? "secondary" : "outline"} className="ml-2">{comptes[o.cle]}</Badge>
            </Button>
          ))}
        </div>

        {/* Recherche, tri et filtres */}
        <Card className="p-4 mb-4 space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Nom, email, ville, SIRET, téléphone…"
                value={recherche}
                onChange={(e) => { setRecherche(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={tri} onValueChange={(v) => { setTri(v as Tri); setPage(1); }}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recents">Trier : plus récents</SelectItem>
                <SelectItem value="anciens">Trier : plus anciens</SelectItem>
                <SelectItem value="depense">Trier : plus grosse dépense</SelectItem>
                <SelectItem value="demarches">Trier : plus de démarches</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Select value={activite} onValueChange={changer(setActivite)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Activité : toutes</SelectItem>
                <SelectItem value="actif">Actif (moins de 30 j)</SelectItem>
                <SelectItem value="ralenti">En perte de vitesse (30 à 90 j)</SelectItem>
                <SelectItem value="inactif">Inactif (plus de 90 j)</SelectItem>
                <SelectItem value="jamais">Jamais de démarche</SelectItem>
              </SelectContent>
            </Select>
            <Select value={solde} onValueChange={changer(setSolde)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Solde : tous</SelectItem>
                <SelectItem value="avec">Avec du solde</SelectItem>
                <SelectItem value="vide">Solde vide</SelectItem>
              </SelectContent>
            </Select>
            <Select value={offerte} onValueChange={changer(setOfferte)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Démarche offerte : tous</SelectItem>
                <SelectItem value="non_utilisee">Pas encore utilisée</SelectItem>
              </SelectContent>
            </Select>
            <Select value={inscription} onValueChange={changer(setInscription)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Inscription : toutes</SelectItem>
                <SelectItem value="7">Inscrits depuis 7 jours</SelectItem>
                <SelectItem value="30">Inscrits depuis 30 jours</SelectItem>
                <SelectItem value="90">Inscrits depuis 90 jours</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departement} onValueChange={changer(setDepartement)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Département : tous</SelectItem>
                {departements.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(filtresActifs > 0 || recherche) && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {filtres.length} garage{filtres.length > 1 ? "s" : ""} correspondent (tous onglets confondus)
              </span>
              <Button variant="link" size="sm" className="h-auto p-0" onClick={() => { reinitialiser(); setPage(1); }}>
                Effacer les filtres
              </Button>
            </div>
          )}
        </Card>

        {/* Liste */}
        <Card className="p-0 overflow-hidden">
          {liste.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">Aucun garage dans cet onglet avec ces filtres.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Garage</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Inscrit le</TableHead>
                    {onglet === "a_verifier" && <TableHead>Demande le</TableHead>}
                    <TableHead>Dernière démarche</TableHead>
                    <TableHead className="text-right">Dépensé</TableHead>
                    <TableHead className="text-right">Démarches</TableHead>
                    <TableHead className="text-right">Solde</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibles.map((g) => {
                    const st = stats[g.id];
                    return (
                      <TableRow key={g.id} className="cursor-pointer" onClick={() => navigate(`/admin/garages/${g.id}`)}>
                        <TableCell>
                          <p className="font-medium">{g.raison_sociale || "Sans raison sociale"}</p>
                          <p className="text-xs text-muted-foreground">
                            {[g.code_postal, g.ville].filter(Boolean).join(" ") || "—"}
                            {g.free_token_available && <span className="ml-2 text-emerald-600">· offerte non utilisée</span>}
                          </p>
                        </TableCell>
                        <TableCell className="text-sm">
                          <p>{g.telephone || "—"}</p>
                          <p className="text-xs text-muted-foreground">{g.email}</p>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm tabular-nums">{jour(g.created_at)}</TableCell>
                        {onglet === "a_verifier" && (
                          <TableCell className="whitespace-nowrap text-sm tabular-nums">{jour(g.verification_requested_at)}</TableCell>
                        )}
                        <TableCell className="whitespace-nowrap text-sm tabular-nums">{jour(st?.derniere_demarche)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatPrice(st?.total || 0)} €</TableCell>
                        <TableCell className="text-right tabular-nums">{st?.nb_demarches || 0}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatPrice(Number(g.token_balance) || 0)} €</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); navigate(`/admin/garages/${g.id}`); }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Voir
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        {pages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" disabled={pageCourante <= 1} onClick={() => setPage(pageCourante - 1)}>Précédent</Button>
            <span className="text-sm text-muted-foreground">Page {pageCourante} sur {pages}</span>
            <Button variant="outline" size="sm" disabled={pageCourante >= pages} onClick={() => setPage(pageCourante + 1)}>Suivant</Button>
          </div>
        )}


        {/* Manage Required Documents Dialog */}
        <Dialog open={showManageDocsDialog} onOpenChange={setShowManageDocsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Documents requis pour la vérification</DialogTitle>
              <DialogDescription>
                Gérer les documents obligatoires et optionnels
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <Card className="p-4">
                <h4 className="font-medium mb-3">Ajouter un document</h4>
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Nom du document</Label>
                      <Input
                        placeholder="Ex: Attestation d'assurance"
                        value={newDocForm.nom_document}
                        onChange={(e) => setNewDocForm({ ...newDocForm, nom_document: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Code unique</Label>
                      <Input
                        placeholder="Ex: attestation_assurance"
                        value={newDocForm.code}
                        onChange={(e) => setNewDocForm({ ...newDocForm, code: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Description (optionnel)</Label>
                    <Input
                      placeholder="Instructions pour le garage"
                      value={newDocForm.description}
                      onChange={(e) => setNewDocForm({ ...newDocForm, description: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={newDocForm.obligatoire}
                      onCheckedChange={(checked) => setNewDocForm({ ...newDocForm, obligatoire: !!checked })}
                    />
                    <Label>Document obligatoire</Label>
                  </div>
                  <Button onClick={handleAddRequiredDoc} disabled={savingDoc}>
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter
                  </Button>
                </div>
              </Card>

              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {requiredDocs.map((doc) => (
                    <Card key={doc.id} className={`p-3 ${!doc.actif ? 'opacity-50' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{doc.nom_document}</h4>
                          <p className="text-sm text-muted-foreground">{doc.code}</p>
                          {doc.description && (
                            <p className="text-xs text-muted-foreground">{doc.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant={doc.obligatoire ? "default" : "outline"}
                            onClick={() => handleToggleDocRequired(doc)}
                          >
                            {doc.obligatoire ? "Obligatoire" : "Optionnel"}
                          </Button>
                          <Button
                            size="sm"
                            variant={doc.actif ? "outline" : "destructive"}
                            onClick={() => handleToggleDocActive(doc)}
                          >
                            {doc.actif ? "Actif" : "Inactif"}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

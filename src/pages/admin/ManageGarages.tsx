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
import { ArrowLeft, ArrowUpDown, CalendarDays, Check, ChevronDown, Eye, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
type Onglet = "tous" | "a_verifier" | "en_attente" | "valides" | "sans_demande";
type Etape = Exclude<Onglet, "tous">;
type Tri = "recents" | "anciens" | "depense" | "demarches";

interface Stats {
  total: number;
  nb_demarches: number;
  derniere_demarche: string | null;
  a_des_documents: boolean;
  dossier_complet: boolean;
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
// Les filtres étaient des valeurs uniques ("tous" = aucun) : on relit les deux formes.
const enListe = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(String) : typeof v === "string" && v && v !== "tous" ? [v] : [];
const lireMemoire = () => {
  try { return JSON.parse(sessionStorage.getItem("gerer-garages") || "{}"); } catch { return {}; }
};

// Filtre en pastille : blanche au repos, bleue quand au moins une case est
// cochée (avec la croix pour tout décocher). Plusieurs cases peuvent être
// cochées : un garage passe s'il correspond à l'une d'elles.
function FiltrePastille({ titre, valeurs, options, onChange, defilant }: {
  titre: string;
  valeurs: string[];
  options: { valeur: string; texte: string }[];
  onChange: (v: string[]) => void;
  defilant?: boolean;
}) {
  const choisies = options.filter((o) => valeurs.includes(o.valeur));
  const actif = choisies.length > 0;
  const resume = choisies.length === 1 ? choisies[0].texte : `${choisies.length} choix`;
  const basculer = (v: string) => onChange(valeurs.includes(v) ? valeurs.filter((x) => x !== v) : [...valeurs, v]);
  return (
    <div
      className={`inline-flex h-8 items-center rounded-full border text-sm transition-colors ${
        actif ? "border-blue-600 bg-blue-600 text-white" : "border-border bg-background text-foreground hover:border-blue-300 hover:bg-blue-50"
      }`}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`inline-flex h-full items-center gap-1.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${actif ? "pl-3 pr-1" : "px-3"}`}
          >
            <span className={actif ? "text-white/80" : ""}>{titre}{actif ? " :" : ""}</span>
            {actif && <span className="font-medium">{resume}</span>}
            {!actif && <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className={`min-w-[220px] ${defilant ? "max-h-72 overflow-y-auto" : ""}`}>
          {options.map((o) => {
            const coche = valeurs.includes(o.valeur);
            return (
              <DropdownMenuItem
                key={o.valeur}
                // Le menu reste ouvert pour cocher plusieurs cases d'affilée.
                onSelect={(e) => { e.preventDefault(); basculer(o.valeur); }}
                className="gap-2.5 cursor-pointer focus:bg-blue-50 focus:text-foreground"
              >
                <span
                  aria-hidden
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    coche ? "border-blue-600 bg-blue-600 text-white" : "border-muted-foreground/40 bg-background"
                  }`}
                >
                  {coche && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                {o.texte}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {actif && (
        <button
          type="button"
          aria-label={`Retirer le filtre ${titre}`}
          onClick={() => onChange([])}
          className="mr-1 rounded-full p-1 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// Période d'inscription : raccourcis (7, 30, 90 jours) et calendrier pour
// choisir du … au … . Dates au format AAAA-MM-JJ, jour local.
type Periode = { du: string | null; au: string | null };
const PERIODE_VIDE: Periode = { du: null, au: null };
const versJour = (d: Date) => format(d, "yyyy-MM-dd");
const depuisJour = (j: string) => { const [a, m, d] = j.split("-").map(Number); return new Date(a, m - 1, d); };
const lirePeriode = (v: unknown): Periode =>
  v && typeof v === "object" && !Array.isArray(v) && ("du" in v || "au" in v)
    ? { du: (v as Periode).du ?? null, au: (v as Periode).au ?? null }
    : PERIODE_VIDE;

const resumePeriode = (valeur: Periode) => {
  const court = (j: string) => format(depuisJour(j), "d MMM yyyy", { locale: fr });
  return valeur.du && valeur.au
    ? (valeur.du === valeur.au ? `le ${court(valeur.du)}`
      : valeur.du.slice(0, 4) === valeur.au.slice(0, 4)
        ? `${format(depuisJour(valeur.du), "d MMM", { locale: fr })} → ${court(valeur.au)}`
        : `${court(valeur.du)} → ${court(valeur.au)}`)
    : valeur.du ? `depuis le ${court(valeur.du)}` : valeur.au ? `jusqu'au ${court(valeur.au)}` : "";
};

// Calendrier deux mois pour choisir une période, aux couleurs bleues de la page
// (le rouge du thème reste réservé aux alertes).
function CalendrierPeriode({ valeur, onChange, onFermer }: { valeur: Periode; onChange: (p: Periode) => void; onFermer: () => void }) {
  const plage: DateRange | undefined = valeur.du
    ? { from: depuisJour(valeur.du), to: valeur.au ? depuisJour(valeur.au) : undefined }
    : undefined;
  return (
    <>
      <Calendar
        mode="range"
        locale={fr}
        numberOfMonths={2}
        defaultMonth={plage?.from ?? subDays(new Date(), 30)}
        selected={plage}
        onSelect={(r) => onChange({ du: r?.from ? versJour(r.from) : null, au: r?.to ? versJour(r.to) : r?.from ? versJour(r.from) : null })}
        disabled={{ after: new Date() }}
        classNames={{
          cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-blue-50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md [&:has([aria-selected].day-range-end)]:rounded-r-md focus-within:relative focus-within:z-20",
          day: "inline-flex h-9 w-9 items-center justify-center rounded-md p-0 text-sm font-normal hover:bg-blue-100 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 aria-selected:opacity-100",
          day_selected: "bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white",
          day_range_middle: "aria-selected:bg-blue-50 aria-selected:text-blue-900 rounded-none",
          day_today: "font-semibold underline underline-offset-4",
          day_outside: "day-outside text-muted-foreground opacity-40 aria-selected:bg-transparent",
        }}
      />
      <div className="flex items-center justify-between border-t p-3 text-xs text-muted-foreground">
        <span>Cliquez sur le premier jour, puis sur le dernier.</span>
        <Button type="button" size="sm" className="h-7 bg-blue-600 hover:bg-blue-700" onClick={onFermer}>
          OK
        </Button>
      </div>
    </>
  );
}

function FiltrePeriode({ titre, valeur, onChange }: { titre: string; valeur: Periode; onChange: (p: Periode) => void }) {
  const [ouvert, setOuvert] = useState(false);
  const actif = !!(valeur.du || valeur.au);
  const resume = resumePeriode(valeur);
  const derniersJours = (n: number) => {
    const aujourdhui = new Date();
    onChange({ du: versJour(subDays(aujourdhui, n - 1)), au: versJour(aujourdhui) });
    setOuvert(false);
  };
  return (
    <div
      className={`inline-flex h-8 items-center rounded-full border text-sm transition-colors ${
        actif ? "border-blue-600 bg-blue-600 text-white" : "border-border bg-background text-foreground hover:border-blue-300 hover:bg-blue-50"
      }`}
    >
      <Popover open={ouvert} onOpenChange={setOuvert}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`inline-flex h-full items-center gap-1.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${actif ? "pl-3 pr-1" : "px-3"}`}
          >
            <CalendarDays className={`h-3.5 w-3.5 ${actif ? "text-white/80" : "text-muted-foreground"}`} />
            <span className={actif ? "text-white/80" : ""}>{titre}{actif ? " :" : ""}</span>
            {actif && <span className="font-medium">{resume}</span>}
            {!actif && <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <div className="flex flex-wrap gap-1.5 border-b p-3">
            {[7, 30, 90].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => derniersJours(n)}
                className="rounded-full border px-3 py-1 text-xs hover:border-blue-300 hover:bg-blue-50"
              >
                {n} derniers jours
              </button>
            ))}
          </div>
          <CalendrierPeriode valeur={valeur} onChange={onChange} onFermer={() => setOuvert(false)} />
        </PopoverContent>
      </Popover>
      {actif && (
        <button
          type="button"
          aria-label={`Retirer le filtre ${titre}`}
          onClick={() => onChange(PERIODE_VIDE)}
          className="mr-1 rounded-full p-1 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// Activité : raccourcis cochables avec le nombre de garages concernés, ou une
// période « dernière démarche entre le … et le … ». L'un remplace l'autre.
function FiltreActivite({ choix, periode, options, onChoix, onPeriode }: {
  choix: string[];
  periode: Periode;
  options: { valeur: string; texte: string; nombre: number }[];
  onChoix: (v: string[]) => void;
  onPeriode: (p: Periode) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const aPeriode = !!(periode.du || periode.au);
  const choisies = options.filter((o) => choix.includes(o.valeur));
  const actif = aPeriode || choisies.length > 0;
  const resume = aPeriode
    ? `dernière démarche ${resumePeriode(periode)}`
    : choisies.length === 1 ? choisies[0].texte : `${choisies.length} choix`;
  const basculer = (v: string) => {
    onPeriode(PERIODE_VIDE);
    onChoix(choix.includes(v) ? choix.filter((x) => x !== v) : [...choix, v]);
  };
  return (
    <div
      className={`inline-flex h-8 items-center rounded-full border text-sm transition-colors ${
        actif ? "border-blue-600 bg-blue-600 text-white" : "border-border bg-background text-foreground hover:border-blue-300 hover:bg-blue-50"
      }`}
    >
      <Popover open={ouvert} onOpenChange={setOuvert}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`inline-flex h-full items-center gap-1.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${actif ? "pl-3 pr-1" : "px-3"}`}
          >
            <span className={actif ? "text-white/80" : ""}>Activité{actif ? " :" : ""}</span>
            {actif && <span className="font-medium">{resume}</span>}
            {!actif && <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <div className="p-2">
            {options.map((o) => {
              const coche = choix.includes(o.valeur);
              return (
                <button
                  key={o.valeur}
                  type="button"
                  onClick={() => basculer(o.valeur)}
                  className="flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  <span
                    aria-hidden
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      coche ? "border-blue-600 bg-blue-600 text-white" : "border-muted-foreground/40 bg-background"
                    }`}
                  >
                    {coche && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  <span className="flex-1">{o.texte}</span>
                  <span className="ml-4 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">{o.nombre}</span>
                </button>
              );
            })}
          </div>
          <p className="border-t px-3 pt-3 text-xs font-medium text-muted-foreground">Ou : dernière démarche entre le … et le …</p>
          <CalendrierPeriode
            valeur={periode}
            onChange={(p) => { onChoix([]); onPeriode(p); }}
            onFermer={() => setOuvert(false)}
          />
        </PopoverContent>
      </Popover>
      {actif && (
        <button
          type="button"
          aria-label="Retirer le filtre Activité"
          onClick={() => { onChoix([]); onPeriode(PERIODE_VIDE); }}
          className="mr-1 rounded-full p-1 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

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
  const [activite, setActivite] = useState<string[]>(enListe(memoire.activite));
  const [activitePeriode, setActivitePeriode] = useState<Periode>(lirePeriode(memoire.activitePeriode));
  const [solde, setSolde] = useState<string[]>(enListe(memoire.solde));
  const [offerte, setOfferte] = useState<string[]>(enListe(memoire.offerte));
  const [inscription, setInscription] = useState<Periode>(lirePeriode(memoire.inscription));
  const [departement, setDepartement] = useState<string[]>(enListe(memoire.departement));
  const [page, setPage] = useState<number>(memoire.page ?? 1);

  useEffect(() => {
    try {
      sessionStorage.setItem("gerer-garages", JSON.stringify({ onglet, recherche, tri, activite, activitePeriode, solde, offerte, inscription, departement, page }));
    } catch { /* navigation privée */ }
  }, [onglet, recherche, tri, activite, activitePeriode, solde, offerte, inscription, departement, page]);

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
        dossier_complet: !!t.dossier_complet,
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
  const etape = (g: Garage): Etape => {
    if (g.is_verified) return "valides";
    // À nous : toutes les pièces obligatoires sont là, aucune n'est refusée.
    if (stats[g.id]?.dossier_complet) return "a_verifier";
    // Au garage : une pièce obligatoire manque ou a été refusée.
    if (stats[g.id]?.a_des_documents) return "en_attente";
    return "sans_demande";
  };

  const departements = useMemo(
    () => Array.from(new Set(garages.map((g) => departementDe(g.code_postal)).filter(Boolean) as string[])).sort(),
    [garages],
  );

  const maintenant = Date.now();
  // Âge (en jours) de la dernière démarche payée, null si jamais.
  const ageDerniere = (g: Garage) => {
    const d = stats[g.id]?.derniere_demarche;
    return d ? (maintenant - new Date(d).getTime()) / JOUR : null;
  };
  const correspondActivite = (a: string, age: number | null) =>
    a === "jamais" ? age === null
      : a === "actif" ? age !== null && age <= 30
      : a === "ralenti" ? age !== null && age > 30 && age <= 90
      : a === "inactif" ? age !== null && age > 90
      : false;

  // Tous les filtres sauf l'activité : sert aussi à compter chaque choix d'activité.
  const horsActivite = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return garages.filter((g) => {
      if (q && ![g.raison_sociale, g.email, g.ville, g.siret, g.telephone].some((v) => (v || "").toLowerCase().includes(q))) return false;
      if (departement.length && !departement.includes(departementDe(g.code_postal) ?? "")) return false;
      if (solde.length) {
        const aDuSolde = Number(g.token_balance) > 0;
        if (!solde.includes(aDuSolde ? "avec" : "vide")) return false;
      }
      if (offerte.includes("non_utilisee") && !g.free_token_available) return false;
      if (inscription.du || inscription.au) {
        const inscrit = new Date(g.created_at).getTime();
        if (inscription.du && inscrit < depuisJour(inscription.du).getTime()) return false;
        if (inscription.au && inscrit >= depuisJour(inscription.au).getTime() + JOUR) return false;
      }
      return true;
    });
  }, [garages, recherche, departement, solde, offerte, inscription]);

  const filtres = useMemo(() => {
    return horsActivite.filter((g) => {
      if (activite.length && !activite.some((a) => correspondActivite(a, ageDerniere(g)))) return false;
      if (activitePeriode.du || activitePeriode.au) {
        const d = stats[g.id]?.derniere_demarche;
        if (!d) return false;
        const t = new Date(d).getTime();
        if (activitePeriode.du && t < depuisJour(activitePeriode.du).getTime()) return false;
        if (activitePeriode.au && t >= depuisJour(activitePeriode.au).getTime() + JOUR) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horsActivite, stats, activite, activitePeriode, maintenant]);

  const OPTIONS_ACTIVITE = [
    { valeur: "actif", texte: "Actif (moins de 30 j)" },
    { valeur: "ralenti", texte: "En perte de vitesse (30 à 90 j)" },
    { valeur: "inactif", texte: "Inactif (plus de 90 j)" },
    { valeur: "jamais", texte: "Jamais de démarche" },
  ].map((o) => ({ ...o, nombre: horsActivite.filter((g) => correspondActivite(o.valeur, ageDerniere(g))).length }));

  const comptes = useMemo(() => {
    const c: Record<Onglet, number> = { tous: filtres.length, a_verifier: 0, en_attente: 0, valides: 0, sans_demande: 0 };
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
      .filter((g) => onglet === "tous" || etape(g) === onglet)
      .sort((a, b) => (tri === "anciens" ? valeur(a) - valeur(b) : valeur(b) - valeur(a)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtres, onglet, tri, stats]);

  const PAR_PAGE = 50;
  const pages = Math.max(1, Math.ceil(liste.length / PAR_PAGE));
  const pageCourante = Math.min(page, pages);
  const visibles = liste.slice((pageCourante - 1) * PAR_PAGE, pageCourante * PAR_PAGE);

  const filtresActifs = [solde, offerte, departement].filter((v) => v.length > 0).length
    + (activite.length || activitePeriode.du || activitePeriode.au ? 1 : 0)
    + (inscription.du || inscription.au ? 1 : 0);
  const reinitialiser = () => {
    setActivite([]); setActivitePeriode(PERIODE_VIDE); setSolde([]); setOfferte([]); setInscription(PERIODE_VIDE); setDepartement([]); setRecherche("");
  };
  const changer = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(1); };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  // Dans l'ordre du parcours d'un garage : inscrit sans documents, dossier
  // incomplet, dossier complet à contrôler, validé.
  const ONGLETS: { cle: Onglet; texte: string; aide: string }[] = [
    { cle: "tous", texte: "Tous", aide: "Tous les garages inscrits" },
    { cle: "sans_demande", texte: "Aucun document envoyé", aide: "Inscrits, mais n'ont jamais envoyé leurs documents de vérification" },
    { cle: "en_attente", texte: "Documents à compléter", aide: "Une pièce obligatoire manque ou a été refusée : le garage doit compléter" },
    { cle: "a_verifier", texte: "À vérifier", aide: "Toutes les pièces obligatoires sont envoyées : à nous de contrôler et valider" },
    { cle: "valides", texte: "Validés", aide: "Compte vérifié" },
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
        <div role="tablist" className="mb-4 inline-flex flex-wrap gap-1 rounded-lg bg-muted p-1">
          {ONGLETS.map((o) => {
            const actif = onglet === o.cle;
            return (
              <button
                key={o.cle}
                type="button"
                role="tab"
                title={o.aide}
                aria-selected={actif}
                onClick={() => { setOnglet(o.cle); setPage(1); }}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  actif ? "bg-blue-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {o.texte}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
                    actif ? "bg-white/20 text-white" : "bg-background/60 text-muted-foreground"
                  }`}
                >
                  {comptes[o.cle]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Recherche, tri et filtres */}
        <div className="mb-4 space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9 bg-background"
                placeholder="Nom, email, ville, SIRET, téléphone…"
                value={recherche}
                onChange={(e) => { setRecherche(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={tri} onValueChange={(v) => { setTri(v as Tri); setPage(1); }}>
              <SelectTrigger className="w-[230px] bg-background">
                <ArrowUpDown className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recents">Plus récents</SelectItem>
                <SelectItem value="anciens">Plus anciens</SelectItem>
                <SelectItem value="depense">Plus grosse dépense</SelectItem>
                <SelectItem value="demarches">Plus de démarches</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" aria-hidden />
            <FiltreActivite
              choix={activite}
              periode={activitePeriode}
              options={OPTIONS_ACTIVITE}
              onChoix={changer(setActivite)}
              onPeriode={changer(setActivitePeriode)}
            />
            <FiltrePastille
              titre="Solde"
              valeurs={solde}
              onChange={changer(setSolde)}
              options={[
                { valeur: "avec", texte: "Avec du solde" },
                { valeur: "vide", texte: "Solde vide" },
              ]}
            />
            <FiltrePastille
              titre="Démarche offerte"
              valeurs={offerte}
              onChange={changer(setOfferte)}
              options={[{ valeur: "non_utilisee", texte: "Pas encore utilisée" }]}
            />
            <FiltrePeriode titre="Inscription" valeur={inscription} onChange={changer(setInscription)} />
            <FiltrePastille
              titre="Département"
              valeurs={departement}
              onChange={changer(setDepartement)}
              options={departements.map((d) => ({ valeur: d, texte: d }))}
              defilant
            />
            {(filtresActifs > 0 || recherche) && (
              <>
                <span className="ml-1 text-sm text-muted-foreground">
                  {filtres.length} garage{filtres.length > 1 ? "s" : ""}
                </span>
                <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground" onClick={() => { reinitialiser(); setPage(1); }}>
                  Tout effacer
                </Button>
              </>
            )}
          </div>
        </div>

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

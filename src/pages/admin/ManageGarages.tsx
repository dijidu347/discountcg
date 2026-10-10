import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
import { CALENDRIER_BLEU } from "@/components/admin/calendrierBleu";
import type { DateRange } from "react-day-picker";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/utils";
import { formatDateTimeParis } from "@/lib/dateFormat";
import { RetirerBadgesManquants } from "@/components/admin/RetirerBadgesManquants";
import { chargerDossiers, SANS_DOCUMENT, type DossierGarage } from "@/lib/etatDossierGarage";
import { chargerAttentesKbis, garagesSansPieceObligatoire, type AttenteKbis } from "@/lib/kbisADater";
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
// Cinq états, et un seul chemin pour y arriver : ils se déduisent des pièces.
// « Date Kbis à saisir » et « Kbis périmé » ne sont plus des onglets — le
// premier est un cas d'« à vérifier », le second d'« à compléter ; ils
// s'affichent en badge sur la ligne.
type Onglet = "tous" | "verifie" | "a_verifier" | "a_completer" | "aucun_document";
type Etape = Exclude<Onglet, "tous">;

// Les vues qui appellent un geste de notre part, par opposition à celles qui
// décrivent le parc. La liste vit ici, et non dans le composant, parce que le
// tri et les colonnes s'en servent avant que les libellés soient construits.
const CLES_TRAVAIL: Onglet[] = ["a_verifier", "a_completer"];
type Tri = "recents" | "anciens" | "depense" | "demarches";

interface Stats {
  total: number;
  nb_demarches: number;
  derniere_demarche: string | null;
  a_des_documents: boolean;
  dossier_complet: boolean;
}

const JOUR = 86_400_000;

// Chaque étape a sa couleur, la même partout : dans les onglets, dans la
// colonne « État » et dans « Ce qui attend ». Onze lignes de texte gris
// identique ne se distinguent pas ; onze pastilles de couleur, si.
// Bleu = à nous de jouer, ambre = au garage, orange = anomalie, vert = acquis.
const TEINTE_ETAPE: Record<string, { texte: string; classe: string }> = {
  verifie: { texte: "Vérifié", classe: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" },
  a_verifier: { texte: "Complet, à vérifier", classe: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" },
  a_completer: { texte: "Dossier incomplet", classe: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300" },
  aucun_document: { texte: "Aucun document", classe: "bg-muted text-muted-foreground" },
};

function Pastille({ texte, classe }: { texte: string; classe: string }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${classe}`}>
      {texte}
    </span>
  );
}

// Une date brute ne dit pas si l'on est en retard. « 03/12/2025 » se lit sans
// émotion ; « il y a 10 mois » se lit tout de suite.
const anciennete = (valeur: string | null | undefined) => {
  if (!valeur) return null;
  const jours = Math.floor((Date.now() - new Date(valeur).getTime()) / JOUR);
  const texte =
    jours < 1 ? "aujourd'hui"
      : jours < 31 ? `il y a ${jours} j`
      : jours < 365 ? `il y a ${Math.round(jours / 30)} mois`
      : `il y a ${Math.floor(jours / 365)} an${jours >= 730 ? "s" : ""}`;
  return {
    texte,
    classe: jours >= 90 ? "font-medium text-destructive"
      : jours >= 30 ? "font-medium text-orange-600 dark:text-orange-400"
      : "text-foreground",
  };
};

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
        classNames={CALENDRIER_BLEU}
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
  // Onglet imposé par la page qui nous envoie ici (bandeau « garages à
  // vérifier » du tableau de bord), sinon celui de la dernière visite.
  const ongletDemande = (useLocation().state as { onglet?: Onglet } | null)?.onglet;
  const [garages, setGarages] = useState<Garage[]>([]);
  const [stats, setStats] = useState<Record<string, Stats>>({});
  // Garages dont un Kbis attend sa date : la lecture automatique a bien ouvert
  // le fichier, mais n'y a pas trouve la date de delivrance. Rien dans les
  // etapes ci-dessous ne les signalait, et un garage deja verifie se retrouvait
  // dans « Valides » avec un document en attente que personne ne voyait.
  const [kbisADater, setKbisADater] = useState<Map<string, AttenteKbis>>(new Map());
  // Garages dont un Kbis attend notre approbation. Sert à distinguer, parmi
  // ceux dont le Kbis a expiré, qui a déjà redéposé (c'est à nous de jouer) de
  // qui n'a rien fait (c'est à lui).
  const [kbisEnAttente, setKbisEnAttente] = useState<Map<string, string>>(new Map());
  // Vérifiés, mais une pièce obligatoire manque : le badge et le dossier
  // étaient deux vérités indépendantes, et personne ne voyait l'écart.
  const [sansPiece, setSansPiece] = useState<Set<string>>(new Set());
  // L'état de chaque dossier, déduit des pièces plutôt que lu dans un drapeau.
  const [dossiers, setDossiers] = useState<Map<string, DossierGarage>>(new Map());
  const [loading, setLoading] = useState(true);
  const [requiredDocs, setRequiredDocs] = useState<RequiredDocument[]>([]);
  const [showManageDocsDialog, setShowManageDocsDialog] = useState(false);
  const [newDocForm, setNewDocForm] = useState({ nom_document: "", code: "", description: "", obligatoire: true });
  const [savingDoc, setSavingDoc] = useState(false);

  const [onglet, setOnglet] = useState<Onglet>(ongletDemande ?? memoire.onglet ?? "a_verifier");
  const enTravail = CLES_TRAVAIL.includes(onglet);
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

    const attentes = await chargerAttentesKbis();
    setKbisADater(attentes.aDater);
    setKbisEnAttente(attentes.enAttente);
    setSansPiece(await garagesSansPieceObligatoire());
    setDossiers(await chargerDossiers());

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
    // Les comptes de la maison ne passent par aucune vérification.
    if ((g as { compte_interne?: boolean }).compte_interne) return "verifie";
    return (dossiers.get(g.id) ?? SANS_DOCUMENT).etat;
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
    const c: Record<Onglet, number> = { tous: filtres.length, verifie: 0, a_verifier: 0, a_completer: 0, aucun_document: 0 };
    filtres.forEach((g) => { c[etape(g)]++; });
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtres, dossiers]);

  // Ce que la vue de travail doit dire de chaque ligne : la nature de
  // l'attente, et sa date de départ. Afficher ici la dépense et le solde,
  // comme le faisait la liste unique, ne renseignait pas sur le geste à faire.
  const attenteDe = (g: Garage): { texte: string; motifs: string[]; depuis: string | null } => {
    const d = dossiers.get(g.id) ?? SANS_DOCUMENT;
    return {
      texte: TEINTE_ETAPE[d.etat]?.texte ?? d.etat,
      motifs: d.motifs,
      depuis: d.enAttenteDepuis ?? g.verification_requested_at ?? g.created_at,
    };
  };

  const liste = useMemo(() => {
    // Dans une file, le plus ancien passe devant : trier par dépense faisait
    // attendre celui qui attend depuis le plus longtemps.
    if (enTravail) {
      return filtres
        .filter((g) => etape(g) === onglet)
        .sort((a, b) => {
          const da = attenteDe(a).depuis;
          const db = attenteDe(b).depuis;
          if (!da) return 1;
          if (!db) return -1;
          return new Date(da).getTime() - new Date(db).getTime();
        });
    }
    const valeur = (g: Garage) =>
      tri === "depense" ? stats[g.id]?.total || 0
        : tri === "demarches" ? stats[g.id]?.nb_demarches || 0
        : new Date(g.created_at).getTime();
    return filtres
      .filter((g) => onglet === "tous" || etape(g) === onglet)
      .sort((a, b) => (tri === "anciens" ? valeur(a) - valeur(b) : valeur(b) - valeur(a)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtres, onglet, tri, stats, kbisADater, kbisEnAttente, sansPiece]);

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

  // Huit onglets alignés disaient que « 467 garages n'ont rien envoyé » et
  // « 2 dossiers attendent notre contrôle » sont deux lignes d'une même liste.
  // Ce sont deux questions différentes : qu'est-ce qui m'attend, et qui sont
  // mes garages. La page les sépare donc en deux étages.

  // Ce qui attend un geste, par ordre d'urgence.
  // Les sept onglets, dans l'ordre du parcours d'un garage. Chacun porte sa
  // couleur : sur une rangée de sept, un libellé seul oblige à lire les sept
  // pour trouver celui qu'on cherche, alors qu'une couleur se repère d'un
  // coup d'œil. Elles disent aussi la nature de l'étape — ce qui nous revient
  // en bleu, ce qui revient au garage en ambre, ce qui est acquis en vert.
  // Dans l'ordre du parcours : tout le parc, ce qui est en règle, ce qui nous
  // revient, ce qui revient au garage, et ceux qui n'ont jamais rien envoyé.
  const ONGLETS: { cle: Onglet; texte: string; aide: string; fond: string; chiffre: string; label: string }[] = [
    { cle: "tous", texte: "Tous", aide: "Tous les garages inscrits",
      fond: "bg-muted", chiffre: "text-foreground", label: "text-muted-foreground" },
    { cle: "verifie", texte: "Vérifié", aide: "Pièce d'identité acceptée et Kbis accepté de moins de six mois",
      fond: "bg-green-100 dark:bg-green-950/50", chiffre: "text-green-800 dark:text-green-300", label: "text-green-700 dark:text-green-400" },
    { cle: "a_verifier", texte: "Complet, à vérifier", aide: "Des pièces sont arrivées et attendent notre contrôle",
      fond: "bg-blue-100 dark:bg-blue-950/50", chiffre: "text-blue-800 dark:text-blue-300", label: "text-blue-700 dark:text-blue-400" },
    { cle: "a_completer", texte: "Dossier incomplet", aide: "Une pièce manque, a été refusée, ou le Kbis a plus de six mois : au garage d'agir",
      fond: "bg-amber-100 dark:bg-amber-950/50", chiffre: "text-amber-900 dark:text-amber-300", label: "text-amber-800 dark:text-amber-400" },
    { cle: "aucun_document", texte: "Aucun document", aide: "Inscrits, n'ont jamais rien envoyé",
      fond: "bg-muted", chiffre: "text-muted-foreground", label: "text-muted-foreground" },
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
          <div className="flex flex-wrap gap-2">
            <RetirerBadgesManquants onTermine={loadGarages} />
            <Button variant="outline" onClick={() => setShowManageDocsDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Gérer les documents requis
            </Button>
          </div>
        </div>

        <h1 className="mb-4 text-3xl font-bold">Garages</h1>
        {/* Les cinq états, en tuiles : le chiffre d'abord, puisque c'est lui
            qu'on vient lire. Les sept onglets bordés d'avant alignaient trois
            mécanismes visuels contradictoires — une bordure par état, du texte
            coloré au repos, et un pavé gris pour l'actif, dont la couleur
            n'avait aucun rapport avec celle de l'onglet. */}
        <div role="tablist" className="mb-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
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
                className={`rounded-xl px-4 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${o.fond} ${
                  actif ? "ring-2 ring-foreground/70" : "opacity-85 hover:opacity-100"
                }`}
              >
                <p className={`text-2xl font-semibold tabular-nums ${o.chiffre}`}>{comptes[o.cle]}</p>
                <p className={`text-xs ${o.label}`}>{o.texte}</p>
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
            {/* En vue de travail le tri est imposé : le plus ancien d'abord. */}
            {!enTravail && (
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
            )}
            {enTravail && (
              <p className="self-center text-sm text-muted-foreground">Le plus ancien d'abord</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" aria-hidden />
            {(filtresActifs > 0 || recherche) && (
              <>
                <span className="text-sm text-muted-foreground">
                  {filtres.length} garage{filtres.length > 1 ? "s" : ""}
                </span>
                <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground" onClick={() => { reinitialiser(); setPage(1); }}>
                  Tout effacer
                </Button>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
                    {enTravail ? (
                      <>
                        <TableHead>Ce qui attend</TableHead>
                        <TableHead>Depuis</TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead>État</TableHead>
                        <TableHead>Inscrit le</TableHead>
                        <TableHead>Dernière démarche</TableHead>
                        <TableHead className="text-right">Dépensé</TableHead>
                        <TableHead className="text-right">Démarches</TableHead>
                        <TableHead className="text-right">Solde</TableHead>
                      </>
                    )}
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
                        {enTravail ? (
                          <>
                            <TableCell>
                              <Pastille
                                texte={attenteDe(g).texte}
                                classe={TEINTE_ETAPE[etape(g)]?.classe ?? "bg-muted text-muted-foreground"}
                              />
                              {/* Le détail sous la pastille : « Kbis périmé »
                                  et « date à saisir » étaient des onglets, ils
                                  sont désormais la précision d'un état. */}
                              {attenteDe(g).motifs.length > 0 && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {attenteDe(g).motifs.join(" · ")}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm">
                              {anciennete(attenteDe(g).depuis) ? (
                                <>
                                  <p className={anciennete(attenteDe(g).depuis)!.classe}>
                                    {anciennete(attenteDe(g).depuis)!.texte}
                                  </p>
                                  <p className="text-xs tabular-nums text-muted-foreground">
                                    {jour(attenteDe(g).depuis)}
                                  </p>
                                </>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell>
                              <Pastille
                                texte={TEINTE_ETAPE[etape(g)]?.texte ?? etape(g)}
                                classe={TEINTE_ETAPE[etape(g)]?.classe ?? "bg-muted text-muted-foreground"}
                              />
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm tabular-nums">{jour(g.created_at)}</TableCell>
                            <TableCell className="whitespace-nowrap text-sm tabular-nums">{jour(st?.derniere_demarche)}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatPrice(st?.total || 0)} €</TableCell>
                            <TableCell className="text-right tabular-nums">{st?.nb_demarches || 0}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatPrice(Number(g.token_balance) || 0)} €</TableCell>
                          </>
                        )}
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-muted-foreground"
                            onClick={(e) => { e.stopPropagation(); navigate(`/admin/garages/${g.id}`); }}
                          >
                            <Eye className="mr-1 h-4 w-4" />
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

import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStatusCategory } from "@/lib/demarcheStatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Plus, LogOut, Settings, UserCircle, Clock, CheckCircle, AlertCircle, Receipt, Gift, Coins, Menu, X, HelpCircle, LayoutDashboard, Archive, Sparkles, PenLine, Camera, FolderOpen, Download } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import AnnouncementBanner from "@/components/AnnouncementBanner";
import { CoffreWidget } from "@/components/coffre-fort/CoffreWidget";
import { useCoffreSubscription } from "@/hooks/useCoffreSubscription";
// MaJi Auto — recrutement d'agents à partir des signaux d'activité du garage
import { MajiTuileMiroir } from "@/components/maji/recrutement/MajiTuileMiroir";
import { MajiCandidature } from "@/components/maji/recrutement/MajiCandidature";
import { calculerSignaux, ciblerGarage, departementDepuisCodePostal } from "@/lib/majiCiblage";

export default function Dashboard() {
  const {
    user,
    signOut,
    loading: authLoading
  } = useAuth();
  const navigate = useNavigate();
  const [garage, setGarage] = useState<any>(null);
  // Même préalable que dans les paramètres : sans raison sociale ni SIRET, on
  // ne sait pas quelle pièce réclamer, et le dépôt n'a pas de sens.
  const ficheIncomplete = Boolean(
    garage
      && (!String(garage.raison_sociale ?? "").trim()
        || String(garage.siret ?? "").replace(/\D/g, "").length !== 14),
  );
  const [stats, setStats] = useState({
    totalDemarches: 0,
    enAttente: 0,
    validees: 0,
    brouillons: 0,
  });
  const [recentDemarches, setRecentDemarches] = useState<any[]>([]);
  // Toutes les démarches payées du garage — déjà chargées pour les statistiques,
  // réutilisées telles quelles pour le ciblage MaJi (aucune requête supplémentaire).
  const [toutesDemarches, setToutesDemarches] = useState<any[]>([]);
  const [majiOuvert, setMajiOuvert] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [actionsRapides, setActionsRapides] = useState<any[]>([]);
  const [missingDocsCount, setMissingDocsCount] = useState(0);
  const [requiredDocNames, setRequiredDocNames] = useState<string[]>([]);
  const aucunDocEnvoye = requiredDocNames.length > 0 && missingDocsCount === requiredDocNames.length;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { toast } = useToast();
  // La fiche se remplit dans le bandeau, pas ailleurs. Deux champs, et le
  // dépôt des pièces s'ouvre juste derrière.
  const [ficheSaisie, setFicheSaisie] = useState({ raison_sociale: "", siret: "" });
  const [enregistrementFiche, setEnregistrementFiche] = useState(false);
  const ficheSaisieValide =
    ficheSaisie.raison_sociale.trim().length > 1 && ficheSaisie.siret.length === 14;

  const enregistrerFiche = async () => {
    if (!garage?.id || !ficheSaisieValide) return;
    setEnregistrementFiche(true);
    const { error } = await supabase
      .from("garages")
      .update({
        raison_sociale: ficheSaisie.raison_sociale.trim(),
        siret: ficheSaisie.siret,
      })
      .eq("id", garage.id);
    setEnregistrementFiche(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Enregistrement impossible",
        description: "Vérifiez votre SIRET, puis réessayez.",
      });
      return;
    }

    // Le bandeau change sous les yeux du garage : il passe de « complétez
    // votre fiche » à « déposez vos pièces », sans rechargement.
    setGarage((g: any) =>
      g ? { ...g, raison_sociale: ficheSaisie.raison_sociale.trim(), siret: ficheSaisie.siret } : g,
    );
    navigate("/garage-settings?tab=verification");
  };
  const { isActive: coffreActive, isBetaAllowed: coffreBeta } = useCoffreSubscription();
  const coffreLink = coffreActive ? "/coffre-fort" : "/coffre-fort-sales";

  // Ciblage MaJi : recalculé quand les démarches ou l'abonnement Coffre-fort changent.
  const majiDepartement = useMemo(
    () => departementDepuisCodePostal(garage?.code_postal),
    [garage?.code_postal],
  );
  const majiSignaux = useMemo(
    () => calculerSignaux(toutesDemarches, { abonneCoffre: coffreActive, codePostal: garage?.code_postal }),
    [toutesDemarches, coffreActive, garage?.code_postal],
  );
  const majiCiblage = useMemo(() => ciblerGarage(majiSignaux), [majiSignaux]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
    // Redirect particulier users to their own dashboard
    // But DON'T redirect if user has a garage profile (even without 'garage' role yet)
    if (!authLoading && user) {
      Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("garages").select("id").eq("user_id", user.id).maybeSingle(),
      ]).then(([rolesResult, garageResult]) => {
        const roles = (rolesResult.data || []).map((r) => r.role);
        const hasGarage = !!garageResult.data;

        // Only redirect to /mon-espace if truly a particulier (no garage profile, no admin/garage role)
        if (roles.includes("particulier") && !roles.includes("admin") && !roles.includes("garage") && !hasGarage) {
          navigate("/mon-espace");
        }
      });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);



  const loadData = async () => {
    if (!user) return;

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    setIsAdmin(!!roleData);

    const { data: actionsData } = await supabase
      .from('actions_rapides')
      .select('*')
      .eq('actif', true)
      .order('ordre');
    if (actionsData) {
      setActionsRapides(actionsData);
    }

    const { data: garageData } = await supabase
      .from('garages')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!roleData && !garageData) {
      navigate("/complete-profile");
      return;
    }

    if (garageData) {
      setGarage(garageData);
      const { data: demarches } = await supabase
        .from('demarches')
        .select('*')
        .eq('garage_id', garageData.id)
        .eq('paye', true)
        .order('created_at', { ascending: false });

      // Les brouillons ne sont pas payés : ils ne figurent pas dans la requête
      // ci-dessus, qui ne ramène que les démarches parties.
      const { count: nbBrouillons } = await supabase
        .from('demarches')
        .select('*', { count: 'exact', head: true })
        .eq('garage_id', garageData.id)
        .eq('is_draft', true)
        .eq('paye', false);

      // Les comptes se font avec la MÊME fonction de catégorie que la page
      // « Mes démarches ». Sans cela, la carte annoncerait un nombre et la
      // liste filtrée en montrerait un autre — chaque carte étant désormais un
      // lien vers cette liste, l'écart se verrait au premier clic.
      setStats({
        totalDemarches: demarches?.length || 0,
        enAttente: demarches?.filter(d => getStatusCategory(d.status) === 'en_cours').length || 0,
        validees: demarches?.filter(d => getStatusCategory(d.status) === 'finalise').length || 0,
        brouillons: nbBrouillons || 0,
      });
      setRecentDemarches(demarches?.slice(0, 5) || []);
      setToutesDemarches(demarches || []);

      // Count missing verification documents
      if (!garageData.is_verified) {
        const { data: verificationDocs } = await supabase
          .from('verification_documents')
          .select('document_type')
          .eq('garage_id', garageData.id)
          .in('status', ['pending', 'approved']);
        
        // Pièces demandées : celles que l'admin a laissées actives et obligatoires
        // (le mandat n'est plus demandé depuis le 21/09/2026).
        const { data: requis } = await supabase
          .from('garage_verification_required_documents')
          .select('code, nom_document')
          .eq('actif', true)
          .eq('obligatoire', true)
          .order('ordre', { ascending: true });
        const uploadedTypes = new Set(verificationDocs?.map(d => d.document_type) || []);
        const liste = requis || [];
        setRequiredDocNames(liste.map(r => r.nom_document));
        setMissingDocsCount(liste.filter(r => !uploadedTypes.has(r.code)).length);
      }
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-france-red/5 to-background">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Tableau de bord | Discount Carte Grise</title>
      </Helmet>
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-france-red bg-clip-text text-transparent">
                DiscountCarteGrise
              </h1>
              <nav className="hidden md:flex items-center gap-2">
                <Button variant="default" size="sm">
                  Tableau de bord
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/mes-demarches")}>
                  Mes démarches
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/mes-factures")}>
                  <Receipt className="mr-2 h-4 w-4" />
                  Mes factures
                </Button>
                {coffreBeta && (
                  <Button variant="ghost" size="sm" onClick={() => navigate(coffreLink)} className="relative bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20">
                    <Archive className="mr-2 h-4 w-4" />
                    Coffre-fort
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => navigate("/support")}>
                  Support
                </Button>
                {isAdmin && (
                  <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
                    <Settings className="mr-2 h-4 w-4" />
                    Administration
                  </Button>
                )}
              </nav>
            </div>
            <div className="flex items-center gap-2">
              {garage && <NotificationBell garageId={garage.id} />}
              
              {/* Mobile menu button */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px]">
                  <SheetHeader>
                    <SheetTitle>Menu</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-2 mt-6">
                    <Button 
                      variant="default" 
                      className="w-full justify-start" 
                      onClick={() => { setMobileMenuOpen(false); }}
                    >
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Tableau de bord
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start" 
                      onClick={() => { setMobileMenuOpen(false); navigate("/mes-demarches"); }}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Mes démarches
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start" 
                      onClick={() => { setMobileMenuOpen(false); navigate("/mes-factures"); }}
                    >
                      <Receipt className="mr-2 h-4 w-4" />
                      Mes factures
                    </Button>
                    {coffreBeta && (
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => { setMobileMenuOpen(false); navigate(coffreLink); }}
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        Coffre-fort
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => { setMobileMenuOpen(false); navigate("/support"); }}
                    >
                      <HelpCircle className="mr-2 h-4 w-4" />
                      Support
                    </Button>
                    {isAdmin && (
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-primary" 
                        onClick={() => { setMobileMenuOpen(false); navigate("/admin"); }}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Administration
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start" 
                      onClick={() => { setMobileMenuOpen(false); navigate("/garage-settings"); }}
                    >
                      <UserCircle className="mr-2 h-4 w-4" />
                      Paramètres
                    </Button>
                    <div className="border-t my-2" />
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-destructive" 
                      onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Déconnexion
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
              
              <Button variant="outline" size="sm" onClick={handleLogout} className="hidden md:flex">
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Admin Announcements */}
        <AnnouncementBanner />

        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            {user?.email === 'contact@autotransfert.fr' && (
              <div className="bg-black rounded-lg p-2 shadow-sm">
                <img 
                  src="/assets/auto-transfert-logo.png" 
                  alt="Auto Transfert" 
                  className="h-14 w-auto"
                />
              </div>
            )}
            <h2 className="text-3xl font-bold mb-2">Tableau de bord</h2>
            {garage?.is_verified && (
              <Badge className="bg-green-500 mb-2">
                <CheckCircle className="h-3 w-3 mr-1" />
                Compte Vérifié
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">Bienvenue sur votre espace professionnel</p>
        </div>

        {/* Verification Alert */}
        {garage && !garage.is_verified && (missingDocsCount > 0 || ficheIncomplete) && (
          /* Le bouton était glissé à la suite du texte, à gauche, en contour
             pâle : l'action tenait la place d'un mot dans une phrase. Il passe
             à droite, plein, à la hauteur du titre — c'est la seule chose à
             faire sur cet écran tant que le dossier n'est pas complet.

             Le texte disait « pour bénéficier de tous les avantages », une
             promesse qui n'engage rien : la vérification ne débloque aucune
             fonction, un garage non vérifié dépose ses démarches comme les
             autres. La vraie raison est meilleure, et elle se dit : nous
             sommes habilités par la préfecture, et nous devons pouvoir
             justifier que chaque garage exerce bien une activité automobile. */
          <div className="mb-8 rounded-lg border-2 border-primary bg-primary/10 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="font-bold text-primary">
                    {ficheIncomplete
                      ? "Complétez votre fiche entreprise"
                      : aucunDocEnvoye
                      ? "Il reste une étape"
                      : `Il manque ${missingDocsCount} pièce${missingDocsCount > 1 ? 's' : ''}`}
                  </p>
                  <p className="mt-0.5 text-sm text-primary/90">
                    {ficheIncomplete
                      ? "Renseignez votre raison sociale et votre SIRET : c'est le SIRET qui nous dit quelle pièce vous devez fournir."
                      : aucunDocEnvoye
                      ? `Nous sommes habilités par la préfecture, et devons justifier que chaque garage exerce bien une activité automobile. Deux pièces suffisent : ${requiredDocNames.join(" et ")}.`
                      : `Déposez ${missingDocsCount > 1 ? 'les' : 'la'} dernière${missingDocsCount > 1 ? 's' : ''} pour que nous puissions contrôler votre dossier.`}
                  </p>
                </div>
              </div>
              {!ficheIncomplete && (
                <Button
                  className="shrink-0"
                  onClick={() => navigate("/garage-settings?tab=verification")}
                >
                  {aucunDocEnvoye ? "Déposer mes pièces" : "Compléter mon dossier"}
                </Button>
              )}
            </div>

            {/* Les deux champs se remplissent ici, dans le bandeau. Renvoyer le
                garage vers une autre page pour deux cases, puis le faire
                revenir, c'était trois écrans pour une minute de saisie — et
                autant d'occasions d'abandonner. Le bouton de dépôt reste fermé
                tant que les deux ne sont pas valables : sans eux, la pièce
                déposée ne se rattacherait à aucune entreprise. */}
            {ficheIncomplete && (
              <div className="mt-4 grid gap-3 border-t border-primary/25 pt-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <div>
                  <Label htmlFor="bandeau-raison-sociale" className="text-primary">
                    Raison sociale <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="bandeau-raison-sociale"
                    className="mt-1 bg-background"
                    value={ficheSaisie.raison_sociale}
                    onChange={(e) =>
                      setFicheSaisie((f) => ({ ...f, raison_sociale: e.target.value }))
                    }
                    placeholder="Nom de votre entreprise"
                  />
                </div>
                <div>
                  <Label htmlFor="bandeau-siret" className="text-primary">
                    SIRET <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="bandeau-siret"
                    className="mt-1 bg-background"
                    value={ficheSaisie.siret}
                    onChange={(e) =>
                      setFicheSaisie((f) => ({
                        ...f,
                        siret: e.target.value.replace(/\D/g, "").slice(0, 14),
                      }))
                    }
                    inputMode="numeric"
                    maxLength={14}
                    placeholder="14 chiffres"
                  />
                </div>
                <Button
                  className="sm:mb-px"
                  disabled={!ficheSaisieValide || enregistrementFiche}
                  onClick={enregistrerFiche}
                >
                  {enregistrementFiche ? "Enregistrement…" : "Déposer mes pièces"}
                </Button>
                <p className="text-xs text-primary/80 sm:col-span-3">
                  {ficheSaisie.siret.length > 0 && ficheSaisie.siret.length < 14
                    ? `${14 - ficheSaisie.siret.length} chiffre${14 - ficheSaisie.siret.length > 1 ? "s" : ""} manquant${14 - ficheSaisie.siret.length > 1 ? "s" : ""} au SIRET.`
                    : "Les deux champs sont nécessaires avant de déposer vos pièces."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Free Token Alert */}
        {garage?.free_token_available && (
          <Alert className="mb-8 border-2 border-green-500 bg-green-500/10">
            <Gift className="h-5 w-5 text-green-500" />
            <AlertTitle className="text-green-600 font-bold">
              🎁 Bienvenue ! Votre première démarche est offerte
            </AlertTitle>
            <AlertDescription className="text-green-600">
              En tant que nouveau client, vous bénéficiez d'une Déclaration de cession ou Déclaration d'achat gratuite.
              Cette offre est valable une seule fois.
            </AlertDescription>
          </Alert>
        )}

        {/* Solde Banner */}
        {garage && (
          <Card className="mb-8 bg-gradient-to-r from-primary/10 via-primary/5 to-france-red/10 border-primary/20">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Coins className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Solde disponible</p>
                    <p className="text-3xl font-bold">{garage.token_balance || 0}€</p>
                  </div>
                </div>
                <Button onClick={() => navigate("/acheter-jetons")} variant="default">
                  <Plus className="w-4 h-4 mr-2" />
                  Recharger
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* MaJi Auto — MODULE 01 : la tuile miroir.
            Ne s'affiche que si le garage a un volume de vente réel à se voir opposer
            (≥ 5 cessions sur 90 j) ET que son secteur est encore libre. */}
        {majiCiblage.afficherTuileMiroir && (
          <div className="mb-8">
            <MajiTuileMiroir
              cessions={majiCiblage.compteurMisEnAvant}
              onDecouvrir={() => setMajiOuvert(true)}
            />
          </div>
        )}

        {/* MaJi Auto — MODULES 03 + 04 : secteur et candidature pré-remplie */}
        <MajiCandidature
          open={majiOuvert}
          onOpenChange={setMajiOuvert}
          garage={garage}
          signaux={majiSignaux}
          departement={majiDepartement}
        />

        {/* Coffre-fort Widget — visible uniquement pour abonnés actifs */}
        {coffreBeta && coffreActive && (
          <div className="mb-8">
            <CoffreWidget />
          </div>
        )}

        {/* Les quatre états d'une démarche, et le chemin pour y aller.
            Chaque carte est un lien vers « Mes démarches » déjà filtré : le
            nombre affiché cessait d'être une information morte au moment où
            l'on pouvait cliquer dessus pour voir lesquelles. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { cle: "all", libelle: "Total des démarches", valeur: stats.totalDemarches, icone: FileText, teinte: "text-primary", bord: "border-l-primary" },
            { cle: "en_cours", libelle: "En attente", valeur: stats.enAttente, icone: Clock, teinte: "text-orange-500", bord: "border-l-orange-500" },
            { cle: "finalise", libelle: "Validées", valeur: stats.validees, icone: CheckCircle, teinte: "text-green-500", bord: "border-l-green-500" },
            { cle: "brouillon", libelle: "Brouillons", valeur: stats.brouillons, icone: PenLine, teinte: "text-muted-foreground", bord: "border-l-muted-foreground" },
          ].map((carte) => (
            <button
              key={carte.cle}
              type="button"
              onClick={() => navigate(`/mes-demarches?statut=${carte.cle}`)}
              className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
            >
              <Card className={`h-full border-l-4 ${carte.bord} transition-shadow hover:shadow-md`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <carte.icone className={`h-4 w-4 ${carte.teinte}`} />
                    {carte.libelle}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${carte.cle === "all" ? "" : carte.teinte}`}>
                    {carte.valeur}
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Actions rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {actionsRapides.map((action) => {
              const isFreeTokenEligible = garage?.free_token_available && (action.code === 'DA' || action.code === 'DC');
              const actionColor = action.couleur.startsWith('#') ? action.couleur : '#3b82f6';
              const priceDisplay = action.code === 'CG' ? `${action.prix}€ + CG` : `${action.prix}€`;

              return (
                <Card
                  key={action.id}
                  // Une démarche offerte portait un anneau vert PAR-DESSUS la
                  // bordure aux couleurs de la démarche : deux traits
                  // concentriques, dont un vert vif. La bordure prend
                  // simplement la couleur verte — un seul trait, le même que
                  // pour les autres cartes.
                  className="relative overflow-hidden border-2"
                  style={{
                    borderColor: isFreeTokenEligible ? "#22c55e" : `${actionColor}40`,
                  }}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${actionColor}20` }}
                      >
                        <FileText className="h-5 w-5" style={{ color: actionColor }} />
                      </div>
                      {action.titre}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-2xl font-bold" style={{ color: actionColor }}>
                        {isFreeTokenEligible ? (
                          <span className="text-green-500">Offert</span>
                        ) : (
                          priceDisplay
                        )}
                      </div>
                      {!isFreeTokenEligible && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <span>Payable avec le solde</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                    <Button
                      className="w-full"
                      style={{
                        backgroundColor: actionColor,
                        borderColor: actionColor,
                      }}
                      onClick={() => navigate(`/nouvelle-demarche?type=${action.code}`)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Créer
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>


        {/* Company Info & Recent Demarches - Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Company Information Card */}
          {garage && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Informations de l'entreprise
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/garage-settings")}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Modifier
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Raison sociale</p>
                  <p className="font-medium">{garage.raison_sociale}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">SIRET</p>
                  <p className="font-medium">{garage.siret}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{garage.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Téléphone</p>
                  <p className="font-medium">{garage.telephone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Adresse</p>
                  <p className="font-medium">{garage.adresse}, {garage.code_postal} {garage.ville}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Demarches */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Dernières démarches
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => navigate("/mes-demarches")}>
                  Voir tout
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentDemarches.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Aucune démarche pour le moment</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentDemarches.map((demarche) => {
                    const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
                      en_saisie: { label: "En saisie", color: "text-gray-500", icon: UserCircle },
                      en_attente: { label: "En attente", color: "text-orange-500", icon: Clock },
                      paye: { label: "Payée", color: "text-blue-500", icon: CheckCircle },
                      valide: { label: "Validée", color: "text-green-500", icon: CheckCircle },
                      finalise: { label: "Finalisée", color: "text-primary", icon: CheckCircle },
                      // Sans ces entrees, un dossier refuse s'affichait « En attente ».
                      refuse: { label: "Refusée", color: "text-red-500", icon: AlertCircle },
                      en_attente_paiement_client: { label: "Attente paiement client", color: "text-orange-500", icon: Clock },
                      en_attente_paiement_pro: { label: "Attente de votre paiement", color: "text-orange-500", icon: Clock },
                    };
                    const config = statusConfig[demarche.status] || { label: demarche.status, color: "text-gray-500", icon: Clock };
                    const StatusIcon = config.icon;

                    return (
                      <div
                        key={demarche.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/demarche/${demarche.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              config.color.includes('red')
                                ? 'bg-red-100'
                                : config.color.includes('blue')
                                ? 'bg-blue-100'
                                : config.color.includes('green')
                                ? 'bg-green-100'
                                : config.color.includes('orange')
                                ? 'bg-orange-100'
                                : 'bg-gray-100'
                            }`}
                          >
                            <StatusIcon className={`h-4 w-4 ${config.color}`} />
                          </div>
                          <div>
                            <div className="font-medium">{demarche.immatriculation}</div>
                            <div className="text-xs text-muted-foreground">
                              {demarche.type === 'CG'
                                ? 'Carte Grise'
                                : demarche.type === 'DA'
                                ? "Déclaration d'Achat"
                                : demarche.type === 'DC'
                                ? 'Déclaration de Cession'
                                : demarche.type}
                            </div>
                          </div>
                        </div>
                        <Badge className={config.color}>{config.label}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

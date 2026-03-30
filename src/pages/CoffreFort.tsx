import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Archive, Camera, Search, Download, Trash2, FileText,
  ArrowLeft, Plus, Eye, LayoutDashboard, Receipt, HelpCircle, Menu, LogOut, ChevronLeft, Loader2, Edit2, MoreVertical
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCoffreSubscription } from "@/hooks/useCoffreSubscription";
import { useCoffreDocuments, type CoffreDocument } from "@/hooks/useCoffreDocuments";
import { getCategoryInfo, COFFRE_CATEGORIES } from "@/lib/coffre-categories";
import { getSignedUrl, downloadPrivateFile } from "@/lib/storage-utils";
import { DocumentUploadWizard } from "@/components/coffre-fort/DocumentUploadWizard";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const CATEGORY_HEX_COLORS: Record<string, string> = {
  achats_vehicules: "#3b82f6",
  pieces_accessoires: "#f59e0b",
  carburant: "#ef4444",
  entretien: "#10b981",
  transport: "#6366f1",
  frais_divers: "#8b5cf6",
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  achats_vehicules: "Factures d'achat de véhicules",
  pieces_accessoires: "Pièces, accessoires et équipements",
  carburant: "Factures de carburant et d'énergie",
  entretien: "Entretien, réparations, garage",
  transport: "Transport et convoyage de véhicules",
  frais_divers: "Loyer, assurance, frais généraux...",
};

export default function CoffreFort() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isActive, isBetaAllowed, isLoading: subLoading, garageId } = useCoffreSubscription();

  const [homeView, setHomeView] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [initialCategory, setInitialCategory] = useState("");
  const [detailDoc, setDetailDoc] = useState<CoffreDocument | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<CoffreDocument | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");

  const filters = homeView ? {} : {
    category: selectedCategory || undefined,
    search: searchQuery || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const {
    documents, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage,
    uploadDocument, deleteDocument, updateDocument, countsByCategory,
  } = useCoffreDocuments(filters);

  // Redirect non-beta or non-subscribers
  useEffect(() => {
    if (subLoading) return;
    if (!isBetaAllowed) { navigate("/dashboard", { replace: true }); return; }
    if (!isActive) navigate("/coffre-fort-sales", { replace: true });
  }, [subLoading, isBetaAllowed, isActive, navigate]);

  // Infinite scroll observer
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!node) return;
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    });
    observerRef.current.observe(node);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Fetch preview URL for detail view
  useEffect(() => {
    if (!detailDoc) { setPreviewUrl(null); return; }
    getSignedUrl("coffre-fort-documents", detailDoc.file_path).then(setPreviewUrl);
  }, [detailDoc]);

  const handleExport = async (mode: "selection" | "all" | "year", year?: number) => {
    setIsExporting(true);
    try {
      const body: any = {};
      if (mode === "selection") body.ids = selectedDocs;
      else if (mode === "all") body.all = true;
      else if (mode === "year") body.year = year;

      const { data, error } = await supabase.functions.invoke("export-coffre-documents", { body });
      if (error) throw error;

      const blob = data instanceof Blob ? data : new Blob([data], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = mode === "year" ? `coffre-fort-${year}.zip` : "coffre-fort-documents.zip";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export terminé !");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'export");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async (doc: CoffreDocument) => {
    deleteDocument.mutate(doc, {
      onSuccess: () => {
        setDetailDoc(null);
        setDeleteConfirmDoc(null);
      },
    });
  };

  const handleRename = async () => {
    if (!detailDoc || !editTitle.trim()) return;
    updateDocument.mutate({ id: detailDoc.id, title: editTitle.trim() }, {
      onSuccess: () => {
        setDetailDoc({ ...detailDoc, title: editTitle.trim() });
        setEditingTitle(false);
      },
    });
  };

  const handleDownload = async (doc: CoffreDocument) => {
    try {
      await downloadPrivateFile("coffre-fort-documents", doc.file_path, doc.file_name);
    } catch {
      toast.error("Erreur lors du téléchargement");
    }
  };

  const toggleDocSelection = (id: string) => {
    setSelectedDocs(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  };

  const openAddModal = (catKey = "") => {
    setInitialCategory(catKey);
    setAddModalOpen(true);
  };

  const closeAddModal = () => {
    setAddModalOpen(false);
    setInitialCategory("");
  };

  if (subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isActive) return null;

  const NavBar = () => (
    <div className="bg-card border-b sticky top-0 z-10 shadow-sm">
      <div className="container mx-auto px-4 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent cursor-pointer" onClick={() => navigate("/dashboard")}>
              DiscountCarteGrise
            </h1>
            <nav className="hidden md:flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
                Tableau de bord
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/mes-demarches")}>
                Mes démarches
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/mes-factures")}>
                <Receipt className="mr-2 h-4 w-4" />
                Mes factures
              </Button>
              <Button variant="default" size="sm">
                <Archive className="mr-2 h-4 w-4" />
                Coffre-fort
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/support")}>
                Support
              </Button>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="h-11 w-11">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px]">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-2 mt-6">
                  <Button variant="ghost" className="w-full justify-start h-12" onClick={() => { setMobileMenuOpen(false); navigate("/dashboard"); }}>
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Tableau de bord
                  </Button>
                  <Button variant="ghost" className="w-full justify-start h-12" onClick={() => { setMobileMenuOpen(false); navigate("/mes-demarches"); }}>
                    <FileText className="mr-2 h-4 w-4" /> Mes démarches
                  </Button>
                  <Button variant="ghost" className="w-full justify-start h-12" onClick={() => { setMobileMenuOpen(false); navigate("/mes-factures"); }}>
                    <Receipt className="mr-2 h-4 w-4" /> Mes factures
                  </Button>
                  <Button variant="default" className="w-full justify-start h-12" onClick={() => setMobileMenuOpen(false)}>
                    <Archive className="mr-2 h-4 w-4" /> Coffre-fort
                  </Button>
                  <Button variant="ghost" className="w-full justify-start h-12" onClick={() => { setMobileMenuOpen(false); navigate("/support"); }}>
                    <HelpCircle className="mr-2 h-4 w-4" /> Support
                  </Button>
                  <div className="border-t my-2" />
                  <Button variant="outline" className="w-full justify-start h-12 text-destructive" onClick={() => signOut()}>
                    <LogOut className="mr-2 h-4 w-4" /> Déconnexion
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            <Button variant="outline" size="sm" className="hidden md:flex" onClick={() => signOut()}>
              <LogOut className="mr-2 h-4 w-4" /> Déconnexion
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // =================== DETAIL VIEW ===================
  if (detailDoc) {
    const cat = getCategoryInfo(detailDoc.category);
    const CatIcon = cat.icon;
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-accent/5 to-background">
        <Helmet><meta name="robots" content="noindex, nofollow" /><title>Document | Coffre-fort</title></Helmet>
        {NavBar()}
        <div className="container mx-auto px-4 py-4 md:py-6">
          <Button variant="ghost" size="sm" onClick={() => setDetailDoc(null)} className="mb-4 h-11">
            <ChevronLeft className="mr-1 h-4 w-4" /> Retour aux documents
          </Button>
          <div className="grid md:grid-cols-[1fr_350px] gap-4 md:gap-6">
            {/* Preview */}
            <Card className="overflow-hidden order-2 md:order-1">
              <div className="bg-muted/50 min-h-[300px] md:min-h-[400px] flex items-center justify-center p-4 md:p-8">
                {previewUrl ? (
                  detailDoc.file_type === "application/pdf" ? (
                    <iframe src={previewUrl} className="w-full h-[50vh] md:h-[600px] rounded-lg" title="Document preview" />
                  ) : (
                    <img src={previewUrl} alt={detailDoc.title} className="max-w-full max-h-[50vh] md:max-h-[600px] rounded-lg shadow-sm" />
                  )
                ) : (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                )}
              </div>
            </Card>

            {/* Sidebar */}
            <div className="space-y-3 order-1 md:order-2">
              <Card>
                <CardContent className="pt-4 md:pt-6">
                  <h3 className="font-bold mb-3 md:mb-4">Informations</h3>
                  <div className="space-y-0 text-sm">
                    <div className="flex justify-between py-3 border-b">
                      <span className="text-muted-foreground">Catégorie</span>
                      <Badge variant="secondary" className={cat.color}><CatIcon className="mr-1 h-3 w-3" />{cat.label}</Badge>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b">
                      <span className="text-muted-foreground">Fournisseur</span>
                      {editingTitle ? (
                        <div className="flex items-center gap-1">
                          <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-9 w-32 text-sm" autoFocus onKeyDown={(e) => e.key === "Enter" && handleRename()} />
                          <Button size="sm" variant="ghost" className="h-9 px-2" onClick={handleRename}>OK</Button>
                        </div>
                      ) : (
                        <span className="font-semibold cursor-pointer hover:text-primary text-right max-w-[180px]" onClick={() => { setEditTitle(detailDoc.title); setEditingTitle(true); }}>{detailDoc.title}</span>
                      )}
                    </div>
                    <div className="flex justify-between py-3 border-b">
                      <span className="text-muted-foreground">Date</span>
                      <span className="font-semibold">{new Date(detailDoc.document_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
                    </div>
                    {detailDoc.amount && (
                      <div className="flex justify-between py-3 border-b">
                        <span className="text-muted-foreground">Montant</span>
                        <span className="font-semibold text-destructive">{Number(detailDoc.amount).toFixed(2)} €</span>
                      </div>
                    )}
                    {detailDoc.note && (
                      <div className="flex justify-between py-3 border-b">
                        <span className="text-muted-foreground">Note</span>
                        <span className="font-semibold text-right max-w-[180px]">{detailDoc.note}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-3 border-b">
                      <span className="text-muted-foreground">Fichier</span>
                      <span className="font-semibold">{detailDoc.file_type === "application/pdf" ? "PDF" : "Image"} ({(detailDoc.file_size / 1024).toFixed(0)} Ko)</span>
                    </div>
                    <div className="flex justify-between py-3">
                      <span className="text-muted-foreground">Ajouté le</span>
                      <span className="font-semibold">{new Date(detailDoc.created_at).toLocaleDateString("fr-FR")}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="space-y-2">
                <Button className="w-full h-12" variant="default" onClick={() => handleDownload(detailDoc)}>
                  <Download className="mr-2 h-4 w-4" /> Télécharger
                </Button>
                <Button className="w-full h-12" variant="outline" onClick={() => { setEditTitle(detailDoc.title); setEditingTitle(true); }}>
                  <Edit2 className="mr-2 h-4 w-4" /> Renommer
                </Button>
                <Button variant="outline" className="w-full h-12 text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => setDeleteConfirmDoc(detailDoc)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                </Button>
              </div>
            </div>
          </div>
        </div>

        <AlertDialog open={!!deleteConfirmDoc} onOpenChange={(open) => !open && setDeleteConfirmDoc(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Le document "{deleteConfirmDoc?.title}" sera définitivement supprimé.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteConfirmDoc && handleDelete(deleteConfirmDoc)}>
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // =================== HOME + LIST VIEW ===================
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-accent/5 to-background">
      <Helmet><meta name="robots" content="noindex, nofollow" /><title>Coffre-fort factures | Discount Carte Grise</title></Helmet>
      {NavBar()}

      <div className="container mx-auto px-4 py-4 md:py-6">

        {homeView ? (
          // ===== HOME VIEW: Category Cards =====
          <>
            <div className="flex flex-col gap-3 mb-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <Archive className="h-5 w-5 md:h-6 md:w-6 text-primary flex-shrink-0" />
                <h2 className="text-xl md:text-2xl font-bold">Mes documents</h2>
                <Badge variant="secondary" className="text-muted-foreground text-xs">
                  {Object.values(countsByCategory).reduce((a, b) => a + b, 0)}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {COFFRE_CATEGORIES.map((cat) => {
                const CatIcon = cat.icon;
                const color = CATEGORY_HEX_COLORS[cat.key] || "#6366f1";
                const count = countsByCategory[cat.key] || 0;
                return (
                  <Card
                    key={cat.key}
                    className="relative overflow-hidden border-2"
                    style={{ borderColor: `${color}40` }}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${color}20` }}
                        >
                          <CatIcon className="h-5 w-5" style={{ color }} />
                        </div>
                        {cat.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="text-2xl font-bold" style={{ color }}>
                          {count} document{count !== 1 ? "s" : ""}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {CATEGORY_DESCRIPTIONS[cat.key]}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 h-11 text-sm font-medium"
                          style={{ borderColor: `${color}60`, color }}
                          onClick={() => { setSelectedCategory(cat.key); setHomeView(false); }}
                        >
                          <Eye className="w-4 h-4 mr-1.5" /> Voir
                        </Button>
                        <Button
                          className="flex-1 h-11 text-sm font-medium text-white"
                          style={{ backgroundColor: color, borderColor: color }}
                          onClick={() => openAddModal(cat.key)}
                        >
                          <Plus className="w-4 h-4 mr-1.5" /> Ajouter
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        ) : (
          // ===== LIST VIEW =====
          <>
            {/* Back to home */}
            <Button
              variant="ghost"
              size="sm"
              className="mb-4 h-10 -ml-2"
              onClick={() => { setHomeView(true); setSelectedCategory(""); setSearchQuery(""); setDateFrom(""); setDateTo(""); }}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Retour aux catégories
            </Button>

            {/* Header */}
            <div className="flex flex-col gap-3 mb-5 md:flex-row md:items-center md:justify-between md:gap-4 md:mb-6">
              <div className="flex items-center gap-3">
                {selectedCategory ? (() => {
                  const cat = getCategoryInfo(selectedCategory);
                  const CatIcon = cat.icon;
                  const color = CATEGORY_HEX_COLORS[selectedCategory] || "#6366f1";
                  return (
                    <>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
                        <CatIcon className="h-4 w-4" style={{ color }} />
                      </div>
                      <h2 className="text-xl md:text-2xl font-bold">{cat.label}</h2>
                    </>
                  );
                })() : (
                  <>
                    <Archive className="h-5 w-5 md:h-6 md:w-6 text-primary flex-shrink-0" />
                    <h2 className="text-xl md:text-2xl font-bold">Mes documents</h2>
                  </>
                )}
                <Badge variant="secondary" className="text-muted-foreground text-xs">{documents.length}</Badge>
              </div>
              <Button onClick={() => openAddModal(selectedCategory)} className="hidden md:flex h-11">
                <Plus className="mr-2 h-4 w-4" /> Ajouter un document
              </Button>
            </div>

            {/* Export bar */}
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant={selectMode ? "default" : "outline"}
                size="sm"
                className="h-11 flex-1 md:flex-none"
                onClick={() => { setSelectMode(!selectMode); setSelectedDocs([]); }}
              >
                {selectMode ? "Annuler" : "Sélectionner"}
              </Button>

              {selectMode && selectedDocs.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 flex-1 md:flex-none"
                  onClick={() => handleExport("selection")}
                  disabled={isExporting}
                >
                  {isExporting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Download className="mr-1 h-3 w-3" />}
                  Exporter ({selectedDocs.length})
                </Button>
              )}

              <div className="hidden md:flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-11" onClick={() => handleExport("all")} disabled={isExporting}>
                  {isExporting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Download className="mr-1 h-3 w-3" />}
                  Tout exporter (ZIP)
                </Button>
                <select
                  className="flex h-11 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                  defaultValue=""
                  onChange={(e) => { if (e.target.value) handleExport("year", parseInt(e.target.value)); e.target.value = ""; }}
                >
                  <option value="" disabled>Exporter par année...</option>
                  {Array.from({ length: new Date().getFullYear() - 2023 }, (_, i) => new Date().getFullYear() - i).map(y => (
                    <option key={y} value={y}>Exporter {y}</option>
                  ))}
                </select>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-11 w-11 md:hidden flex-shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={() => handleExport("all")} disabled={isExporting}>
                    <Download className="mr-2 h-4 w-4" /> Tout exporter (ZIP)
                  </DropdownMenuItem>
                  {Array.from({ length: new Date().getFullYear() - 2023 }, (_, i) => new Date().getFullYear() - i).map(y => (
                    <DropdownMenuItem key={y} onClick={() => handleExport("year", y)} disabled={isExporting}>
                      <Download className="mr-2 h-4 w-4" /> Exporter {y}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 mb-5 md:mb-6">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring md:max-w-[220px]"
              >
                <option value="">Toutes les catégories</option>
                {COFFRE_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>

              <div className="grid grid-cols-2 gap-3">
                <Input type="date" className="h-12 text-sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                <Input type="date" className="h-12 text-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par fournisseur, note..."
                  className="pl-10 h-12 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Document list */}
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-16">
                <Archive className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                <p className="text-lg font-semibold text-muted-foreground">Aucun document</p>
                <p className="text-sm text-muted-foreground mb-6">Ajoutez votre première facture dans cette catégorie</p>
                <Button onClick={() => openAddModal(selectedCategory)} className="h-12 px-6">
                  <Plus className="mr-2 h-4 w-4" /> Ajouter un document
                </Button>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-2 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-4">
                  {documents.map(doc => {
                    const cat = getCategoryInfo(doc.category);
                    const CatIcon = cat.icon;
                    const isSelected = selectedDocs.includes(doc.id);
                    return (
                      <div key={doc.id}>
                        {/* Mobile card */}
                        <div
                          className={`flex items-center gap-3 p-3 rounded-xl border bg-card active:bg-muted/50 cursor-pointer transition-colors md:hidden relative ${isSelected ? 'ring-2 ring-primary border-primary' : ''}`}
                          onClick={() => selectMode ? toggleDocSelection(doc.id) : setDetailDoc(doc)}
                        >
                          {selectMode && (
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs flex-shrink-0 ${isSelected ? 'bg-primary border-primary text-white' : 'border-muted-foreground/30 bg-white'}`}>
                              {isSelected && "✓"}
                            </div>
                          )}
                          <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${cat.bgGradient}`}>
                            {doc.file_type === "application/pdf" ? <FileText className="h-5 w-5 text-muted-foreground/60" /> : <Camera className="h-5 w-5 text-muted-foreground/60" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold text-sm truncate leading-tight">{doc.title}</p>
                              {doc.amount && <span className="text-destructive font-bold text-sm whitespace-nowrap flex-shrink-0">{Number(doc.amount).toFixed(2)} €</span>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{new Date(doc.document_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</p>
                            <Badge variant="secondary" className={`text-xs mt-1 ${cat.color}`}>
                              <CatIcon className="mr-1 h-3 w-3" />{cat.label}
                            </Badge>
                          </div>
                          <ChevronLeft className="h-4 w-4 text-muted-foreground/40 rotate-180 flex-shrink-0" />
                        </div>

                        {/* Desktop card */}
                        <Card
                          className={`overflow-hidden cursor-pointer hover:shadow-md transition-shadow relative hidden md:block ${isSelected ? 'ring-2 ring-primary' : ''}`}
                          onClick={() => selectMode ? toggleDocSelection(doc.id) : setDetailDoc(doc)}
                        >
                          <div className={`h-32 flex items-center justify-center bg-gradient-to-br ${cat.bgGradient}`}>
                            {selectMode && (
                              <div className={`absolute top-2 left-2 w-5 h-5 rounded border-2 flex items-center justify-center text-xs ${isSelected ? 'bg-primary border-primary text-white' : 'border-muted-foreground/30 bg-white'}`}>
                                {isSelected && "✓"}
                              </div>
                            )}
                            {doc.file_type === "application/pdf" ? <FileText className="h-12 w-12 text-muted-foreground/40" /> : <Camera className="h-12 w-12 text-muted-foreground/40" />}
                          </div>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-1">
                              <p className="font-semibold text-sm truncate">{doc.title}</p>
                              {doc.amount && <span className="text-destructive font-bold text-sm whitespace-nowrap ml-2">{Number(doc.amount).toFixed(2)} €</span>}
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{new Date(doc.document_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
                            <Badge variant="secondary" className={`text-xs ${cat.color}`}>
                              <CatIcon className="mr-1 h-3 w-3" />{cat.label}
                            </Badge>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                </div>

                {hasNextPage && (
                  <div ref={loadMoreRef} className="flex justify-center py-6">
                    {isFetchingNextPage && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* FAB mobile (list view only) */}
      {!homeView && (
        <div className="fixed bottom-6 right-5 md:hidden z-30">
          <Button
            size="lg"
            onClick={() => openAddModal(selectedCategory)}
            className="rounded-full h-16 w-16 shadow-xl"
          >
            <Plus className="h-7 w-7" />
          </Button>
        </div>
      )}

      {/* Padding bottom mobile */}
      {!homeView && <div className="h-24 md:hidden" />}

      {/* Upload wizard */}
      {garageId && (
        <DocumentUploadWizard
          open={addModalOpen}
          onOpenChange={(o) => { if (!o) closeAddModal(); else setAddModalOpen(true); }}
          garageId={garageId}
          initialCategory={initialCategory}
          onUpload={(params) => uploadDocument.mutate(params, { onSuccess: () => closeAddModal() })}
          isUploading={uploadDocument.isPending}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirmDoc} onOpenChange={(open) => !open && setDeleteConfirmDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le document "{deleteConfirmDoc?.title}" sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteConfirmDoc && handleDelete(deleteConfirmDoc)}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

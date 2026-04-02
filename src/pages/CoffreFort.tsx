import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Archive, Camera, Search, Download, Trash2, FileText,
  ArrowLeft, Plus, Eye, LayoutDashboard, Receipt, HelpCircle, Menu, LogOut, ChevronLeft, Loader2, Edit2, MoreVertical, ChevronDown, Shield, CalendarIcon, X
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { fr } from "date-fns/locale";
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
import { CoffreManageSubscription } from "@/components/coffre-fort/CoffreManageSubscription";
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
  const [searchParams] = useSearchParams();
  const { signOut } = useAuth();
  const { isActive, isBetaAllowed, isLoading: subLoading, garageId } = useCoffreSubscription();
  const [isSyncing, setIsSyncing] = useState(false);

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
  const [editingAmount, setEditingAmount] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const [editingNote, setEditingNote] = useState(false);
  const [editNote, setEditNote] = useState("");
  const [manageSubOpen, setManageSubOpen] = useState(false);

  const filters = homeView ? {} : {
    category: selectedCategory || undefined,
    search: searchQuery || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const {
    documents, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage,
    uploadDocument, deleteDocument, updateDocument, countsByCategory, monthlyAmountsByCategory,
  } = useCoffreDocuments(filters);

  // Navigate directly to a category if ?category= param is present
  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) {
      setHomeView(false);
      setSelectedCategory(cat);
    }
  }, []);

  // When Stripe redirects back with ?subscribed=true, sync subscription from Stripe
  useEffect(() => {
    if (!searchParams.get("subscribed")) return;
    setIsSyncing(true);
    supabase.functions.invoke("sync-coffre-subscription").then(() => {
      setIsSyncing(false);
      navigate("/coffre-fort", { replace: true });
    }).catch(() => {
      setIsSyncing(false);
      navigate("/coffre-fort", { replace: true });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect non-subscribers (but not while syncing)
  useEffect(() => {
    if (subLoading || isSyncing) return;
    if (!isBetaAllowed) { navigate("/dashboard", { replace: true }); return; }
    if (!isActive) navigate("/coffre-fort-sales", { replace: true });
  }, [subLoading, isSyncing, isBetaAllowed, isActive, navigate]);

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

  const handleExport = async (mode: "selection" | "all" | "year" | "month", year?: number, monthStr?: string) => {
    setIsExporting(true);
    try {
      const body: any = {};
      if (mode === "selection") body.ids = selectedDocs;
      else if (mode === "all") body.all = true;
      else if (mode === "year") body.year = year;
      else if (mode === "month" && monthStr) {
        const [y, m] = monthStr.split("-");
        const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
        body.dateFrom = `${y}-${m}-01`;
        body.dateTo = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
      }

      const { data, error } = await supabase.functions.invoke("export-coffre-documents", { body });
      if (error) throw error;
      if (!data) throw new Error("Aucune donnée reçue");

      // supabase-js returns a Blob for application/octet-stream responses
      const blob = data instanceof Blob
        ? new Blob([data], { type: "application/zip" })
        : new Blob([data], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = mode === "year" ? `coffre-fort-${year}.zip`
        : mode === "month" ? `coffre-fort-${monthStr}.zip`
        : "coffre-fort-documents.zip";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export terminé !");
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("Aucun document") || msg.includes("404")) {
        toast.info("Aucun document disponible pour cette période");
      } else {
        toast.error(msg || "Erreur lors de l'export");
      }
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

  // Lazy thumbnail for document cards
  const DocThumb = ({ doc }: { doc: CoffreDocument }) => {
    const [src, setThumbSrc] = useState<string | null>(null);
    useEffect(() => {
      if (doc.file_type !== "application/pdf") {
        getSignedUrl("coffre-fort-documents", doc.file_path).then(setThumbSrc);
      }
    }, [doc.file_path]);
    if (doc.file_type === "application/pdf") {
      return <FileText className="h-10 w-10 text-muted-foreground/40" />;
    }
    if (src) {
      return <img src={src} alt={doc.title} className="absolute inset-0 w-full h-full object-cover" />;
    }
    return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />;
  };

  if (subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // While syncing after Stripe redirect, show a simple loading screen
  if (isSyncing || (searchParams.get("subscribed") && subLoading)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-primary/5 via-accent/5 to-background">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Archive className="h-7 w-7 text-primary animate-pulse" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-lg">Activation en cours…</p>
          <p className="text-sm text-muted-foreground mt-1">Nous confirmons votre abonnement avec Stripe</p>
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-primary/60" />
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
                    <div className="flex justify-between items-center py-3 border-b">
                      <span className="text-muted-foreground">Montant</span>
                      {editingAmount ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.01"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="h-8 w-28 text-sm text-right"
                            autoFocus
                            placeholder="0.00"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const val = parseFloat(editAmount);
                                updateDocument.mutate({ id: detailDoc.id, amount: isNaN(val) ? null : val }, {
                                  onSuccess: () => { setDetailDoc({ ...detailDoc, amount: isNaN(val) ? null : val }); setEditingAmount(false); }
                                });
                              }
                              if (e.key === "Escape") setEditingAmount(false);
                            }}
                          />
                          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => {
                            const val = parseFloat(editAmount);
                            updateDocument.mutate({ id: detailDoc.id, amount: isNaN(val) ? null : val }, {
                              onSuccess: () => { setDetailDoc({ ...detailDoc, amount: isNaN(val) ? null : val }); setEditingAmount(false); }
                            });
                          }}>OK</Button>
                        </div>
                      ) : (
                        <span
                          className={`font-semibold cursor-pointer hover:text-primary ${detailDoc.amount ? "text-destructive" : "text-muted-foreground/50 italic text-xs"}`}
                          onClick={() => { setEditAmount(detailDoc.amount ? String(detailDoc.amount) : ""); setEditingAmount(true); }}
                        >
                          {detailDoc.amount ? `${Number(detailDoc.amount).toFixed(2)} €` : "— Ajouter"}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-start py-3 border-b">
                      <span className="text-muted-foreground flex-shrink-0">Note</span>
                      {editingNote ? (
                        <div className="flex items-start gap-1 ml-4 flex-1">
                          <textarea
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                            className="flex-1 text-sm border rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary resize-none min-h-[60px]"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Escape") setEditingNote(false);
                            }}
                          />
                          <Button size="sm" variant="ghost" className="h-8 px-2 flex-shrink-0" onClick={() => {
                            updateDocument.mutate({ id: detailDoc.id, note: editNote.trim() || null } as any, {
                              onSuccess: () => { setDetailDoc({ ...detailDoc, note: editNote.trim() || null }); setEditingNote(false); }
                            });
                          }}>OK</Button>
                        </div>
                      ) : (
                        <span
                          className={`cursor-pointer hover:text-primary text-right max-w-[180px] ${detailDoc.note ? "font-semibold" : "text-muted-foreground/50 italic text-xs"}`}
                          onClick={() => { setEditNote(detailDoc.note || ""); setEditingNote(true); }}
                        >
                          {detailDoc.note || "— Ajouter une note"}
                        </span>
                      )}
                    </div>
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
            {/* Header avec titre + sous-titre + exports */}
            <div className="mb-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <Archive className="h-5 w-5 md:h-6 md:w-6 text-primary flex-shrink-0" />
                    <h2 className="text-xl md:text-2xl font-bold">Mon coffre-fort</h2>
                    {(() => {
                      const total = Object.values(countsByCategory).reduce((a, b) => a + b, 0);
                      return (
                        <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
                          <span className="text-sm font-bold leading-none">{total}</span>
                          <span className="opacity-70">{total !== 1 ? "docs" : "doc"}</span>
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-sm text-muted-foreground/80 flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-primary/50 flex-shrink-0" />
                    Bienvenue dans votre espace coffre-fort — sauvegardez vos factures en toute sécurité.
                  </p>
                  <button
                    onClick={() => setManageSubOpen(true)}
                    className="text-xs text-muted-foreground/60 hover:text-primary underline underline-offset-2 mt-1 transition-colors w-fit"
                  >
                    Gérer mon abonnement
                  </button>
                </div>

                {/* Boutons export */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Tout exporter — CTA principal */}
                  <button
                    onClick={() => handleExport("all")}
                    disabled={isExporting}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    Tout exporter
                  </button>

                  {/* Par année */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        disabled={isExporting}
                        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-primary/30 bg-primary/5 text-primary text-xs font-medium hover:bg-primary/10 transition-colors disabled:opacity-50"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Par année
                        <ChevronDown className="h-3 w-3 opacity-60" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      {Array.from({ length: new Date().getFullYear() - 2023 }, (_, i) => new Date().getFullYear() - i).map(y => (
                        <DropdownMenuItem key={y} onClick={() => handleExport("year", y)}>
                          <Download className="mr-2 h-3.5 w-3.5" /> {y}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Par mois */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        disabled={isExporting}
                        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-primary/30 bg-primary/5 text-primary text-xs font-medium hover:bg-primary/10 transition-colors disabled:opacity-50"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Par mois
                        <ChevronDown className="h-3 w-3 opacity-60" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      {Array.from({ length: 12 }, (_, i) => {
                        const d = new Date();
                        d.setDate(1);
                        d.setMonth(d.getMonth() - i);
                        const y = d.getFullYear();
                        const m = String(d.getMonth() + 1).padStart(2, "0");
                        const label = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
                        return { key: `${y}-${m}`, label };
                      }).map(({ key, label }) => (
                        <DropdownMenuItem key={key} onClick={() => handleExport("month", undefined, key)}>
                          <Download className="mr-2 h-3.5 w-3.5" />
                          <span className="capitalize">{label}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
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
                    {/* Archive icon top-right */}
                    <Archive className="absolute top-3 right-3 h-4 w-4 opacity-20" style={{ color }} />
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
                        {/* Monthly spend */}
                        {(() => {
                          const monthlyTotal = monthlyAmountsByCategory[cat.key] || 0;
                          const monthLabel = new Date().toLocaleDateString("fr-FR", { month: "long" });
                          return (
                            <div className="mt-2.5 pt-2.5 border-t border-dashed" style={{ borderColor: `${color}30` }}>
                              {monthlyTotal > 0 ? (
                                <p className="text-sm font-medium text-foreground/80">
                                  Dépensé en <span className="capitalize">{monthLabel}</span>{" "}:{" "}
                                  <span className="font-bold" style={{ color }}>{monthlyTotal.toFixed(2)} €</span>
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground/60">Aucune dépense en <span className="capitalize">{monthLabel}</span></p>
                              )}
                            </div>
                          );
                        })()}
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
            <div className="flex items-center gap-3 mb-5">
              {selectedCategory ? (() => {
                const cat = getCategoryInfo(selectedCategory);
                const CatIcon = cat.icon;
                const color = CATEGORY_HEX_COLORS[selectedCategory] || "#6366f1";
                return (
                  <>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}15` }}>
                      <CatIcon className="h-5 w-5" style={{ color }} />
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold">{cat.label}</h2>
                    <span
                      className="inline-flex items-center font-bold text-xs px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: `${color}18`, color }}
                    >
                      {documents.length}
                    </span>
                  </>
                );
              })() : (
                <>
                  <Archive className="h-5 w-5 md:h-6 md:w-6 text-primary flex-shrink-0" />
                  <h2 className="text-xl md:text-2xl font-bold">Mes documents</h2>
                  <span className="inline-flex items-center font-bold text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                    {documents.length}
                  </span>
                </>
              )}
            </div>

            {/* ── Toolbar ── */}
            <div className="rounded-xl border border-border/60 bg-card shadow-sm mb-6 overflow-hidden">

              {/* Ligne 1 : search + actions */}
              <div className="flex items-center gap-0 border-b border-border/60">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    placeholder="Rechercher un fournisseur, une note..."
                    className="w-full pl-10 pr-4 h-12 text-sm bg-transparent outline-none placeholder:text-muted-foreground/60"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-1.5 px-4 border-l border-border/60 text-xs text-muted-foreground whitespace-nowrap h-12">
                  <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium text-foreground/70">Période</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className={`h-7 px-2.5 rounded-lg border text-xs font-medium transition-colors ${dateFrom ? "border-primary/40 bg-primary/5 text-primary" : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"}`}>
                        {dateFrom ? new Date(dateFrom).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "Début"}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFrom ? new Date(dateFrom) : undefined}
                        onSelect={(d) => setDateFrom(d ? d.toISOString().split("T")[0] : "")}
                        locale={fr}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-muted-foreground">→</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className={`h-7 px-2.5 rounded-lg border text-xs font-medium transition-colors ${dateTo ? "border-primary/40 bg-primary/5 text-primary" : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"}`}>
                        {dateTo ? new Date(dateTo).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "Fin"}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateTo ? new Date(dateTo) : undefined}
                        onSelect={(d) => setDateTo(d ? d.toISOString().split("T")[0] : "")}
                        locale={fr}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {(dateFrom || dateTo) && (
                    <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="flex items-center border-l border-border/60 divide-x divide-border/60">
                  <button
                    onClick={() => openAddModal(selectedCategory)}
                    className="inline-flex items-center gap-2 h-12 px-5 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="h-4 w-4" /> Ajouter
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button disabled={isExporting} className="inline-flex items-center gap-1.5 h-12 px-4 text-sm text-foreground/70 hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50">
                        {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        <span className="hidden md:inline">Exporter</span>
                        <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem onClick={() => handleExport("all")} disabled={isExporting}>
                        <Download className="mr-2 h-3.5 w-3.5" /> Tout exporter (ZIP)
                      </DropdownMenuItem>
                      {selectMode && selectedDocs.length > 0 && (
                        <DropdownMenuItem onClick={() => handleExport("selection")} disabled={isExporting}>
                          <Download className="mr-2 h-3.5 w-3.5" /> Sélection ({selectedDocs.length})
                        </DropdownMenuItem>
                      )}
                      <div className="h-px bg-border my-1" />
                      {Array.from({ length: new Date().getFullYear() - 2023 }, (_, i) => new Date().getFullYear() - i).map(y => (
                        <DropdownMenuItem key={y} onClick={() => handleExport("year", y)} disabled={isExporting}>
                          <Download className="mr-2 h-3.5 w-3.5" /> {y}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <button
                    onClick={() => { setSelectMode(!selectMode); setSelectedDocs([]); }}
                    className={`inline-flex items-center gap-1.5 h-12 px-4 text-sm font-medium transition-colors ${
                      selectMode ? "text-primary bg-primary/5" : "text-foreground/60 hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {selectMode ? "Annuler" : "Sélectionner"}
                  </button>
                </div>
              </div>

              {/* Ligne 2 : catégories + date */}
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/60 flex-wrap">
                {[{ key: "", label: "Toutes" }, ...COFFRE_CATEGORIES.map(c => ({ key: c.key, label: c.label }))].map(c => (
                  <button
                    key={c.key}
                    onClick={() => setSelectedCategory(c.key === selectedCategory ? "" : c.key)}
                    className={`h-7 px-3 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                      selectedCategory === c.key || (!c.key && !selectedCategory)
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground/60 hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Ligne 3 : sélection active */}
              {selectMode && selectedDocs.length > 0 && (
                <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/5 border-b border-primary/15">
                  <span className="text-sm text-primary font-medium">{selectedDocs.length} document{selectedDocs.length > 1 ? "s" : ""} sélectionné{selectedDocs.length > 1 ? "s" : ""}</span>
                  <button onClick={() => handleExport("selection")} disabled={isExporting} className="ml-auto inline-flex items-center gap-1.5 h-7 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
                    {isExporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} Exporter ZIP
                  </button>
                </div>
              )}
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
                          <div className={`h-36 relative flex items-center justify-center bg-gradient-to-br ${cat.bgGradient} overflow-hidden`}>
                            {selectMode && (
                              <div className={`absolute top-2 left-2 z-10 w-5 h-5 rounded border-2 flex items-center justify-center text-xs ${isSelected ? 'bg-primary border-primary text-white' : 'border-muted-foreground/30 bg-white'}`}>
                                {isSelected && "✓"}
                              </div>
                            )}
                            <DocThumb doc={doc} />
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

      {/* Manage subscription dialog */}
      <CoffreManageSubscription open={manageSubOpen} onClose={() => setManageSubOpen(false)} />

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

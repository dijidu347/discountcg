import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Camera, Upload, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { COFFRE_CATEGORIES, getCategoryInfo } from "@/lib/coffre-categories";
import { isAcceptedFileType, isFileTooLarge, compressFile, type CompressedFile } from "@/lib/coffre-compression";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  garageId: string;
  onUpload: (params: {
    file: File;
    category: string;
    title: string;
    documentDate: string;
    amount?: number;
    note?: string;
    garageId: string;
  }) => void;
  isUploading: boolean;
}

export function DocumentUploadWizard({ open, onOpenChange, garageId, onUpload, isUploading }: Props) {
  const [step, setStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [compressed, setCompressed] = useState<CompressedFile | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep(1);
    setSelectedFile(null);
    setCompressed(null);
    setCategory("");
    setTitle("");
    setDocumentDate(new Date().toISOString().split("T")[0]);
    setAmount("");
    setNote("");
    setIsCompressing(false);
  };

  const handleFileSelect = async (file: File) => {
    if (!isAcceptedFileType(file)) {
      toast.error("Format non supporté. Utilisez une image ou un PDF.");
      return;
    }
    if (isFileTooLarge(file)) {
      toast.error("Le fichier dépasse la taille maximale de 20 Mo.");
      return;
    }

    setSelectedFile(file);
    setIsCompressing(true);

    try {
      const result = await compressFile(file);
      setCompressed(result);
      setStep(2);
    } catch (err) {
      toast.error("Erreur lors de la compression. Réessayez.");
      setSelectedFile(null);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = () => {
    if (!compressed || !category || !title) return;

    onUpload({
      file: compressed.file,
      category,
      title,
      documentDate,
      amount: amount ? parseFloat(amount.replace(",", ".")) : undefined,
      note: note || undefined,
      garageId,
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      {/*
        Sur mobile: full-screen avec arrondi uniquement en haut.
        Sur desktop: dialog classique centré.
      */}
      <DialogContent className="
        p-0 gap-0 overflow-hidden
        w-full max-w-full h-[100dvh] rounded-none
        sm:h-auto sm:max-w-[520px] sm:rounded-xl
        flex flex-col
      ">
        <div className="px-5 pt-5 pb-0 flex-shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Ajouter un document</span>
              <span className="text-xs font-normal text-muted-foreground">Étape {step}/4</span>
            </DialogTitle>
          </DialogHeader>

          {/* Progress bar */}
          <div className="flex gap-1.5 mt-4 mb-1">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
        </div>

        {/* Scrollable content zone */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {/* Step 1: Upload */}
          {step === 1 && (
            <div>
              {isCompressing ? (
                <div className="flex flex-col items-center gap-3 py-16">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Compression en cours...</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-5">Choisissez comment ajouter votre document</p>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex flex-col items-center gap-3 p-6 border-2 border-dashed rounded-xl active:bg-primary/5 hover:border-primary hover:bg-primary/5 transition-colors min-h-[140px] justify-center"
                    >
                      <Camera className="h-12 w-12 text-primary/70" />
                      <span className="font-semibold text-sm">Prendre une photo</span>
                      <span className="text-xs text-muted-foreground text-center">Caméra du téléphone</span>
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center gap-3 p-6 border-2 border-dashed rounded-xl active:bg-primary/5 hover:border-primary hover:bg-primary/5 transition-colors min-h-[140px] justify-center"
                    >
                      <Upload className="h-12 w-12 text-primary/70" />
                      <span className="font-semibold text-sm">Importer un fichier</span>
                      <span className="text-xs text-muted-foreground text-center">Image ou PDF</span>
                    </button>
                  </div>
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); e.target.value = ""; }}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/heic,image/heif,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); e.target.value = ""; }}
                  />
                </>
              )}
            </div>
          )}

          {/* Step 2: Category */}
          {step === 2 && compressed && (
            <div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border mb-5">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{selectedFile?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(compressed.originalSize)} → {formatSize(compressed.compressedSize)} (compressé)
                  </p>
                </div>
              </div>

              <p className="text-sm font-semibold mb-3">Dans quelle catégorie ?</p>
              <div className="grid grid-cols-3 gap-2">
                {COFFRE_CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.key}
                      onClick={() => { setCategory(cat.key); setStep(3); }}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-xs font-semibold transition-all active:scale-95 border-muted hover:border-primary/50 min-h-[80px] justify-center"
                    >
                      <Icon className="h-6 w-6" />
                      <span className="text-center leading-tight">{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              <Button variant="ghost" size="sm" className="mt-4 h-11" onClick={() => setStep(1)}>
                ← Retour
              </Button>
            </div>
          )}

          {/* Step 3: Supplier + Date */}
          {step === 3 && (
            <div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border mb-5">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{selectedFile?.name}</p>
                  <Badge variant="secondary" className={`text-xs ${getCategoryInfo(category).color}`}>
                    {getCategoryInfo(category).label}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold mb-2 block">Fournisseur</label>
                  <Input
                    placeholder="Ex: Autodistribution, TotalEnergies..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    autoFocus
                    className="h-12 text-base"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block">Date du document</label>
                  <Input
                    type="date"
                    value={documentDate}
                    onChange={(e) => setDocumentDate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    className="h-12 text-base"
                  />
                </div>
              </div>

              <div className="flex justify-between mt-6 gap-3">
                <Button variant="ghost" size="sm" className="h-12" onClick={() => setStep(2)}>← Retour</Button>
                <Button className="h-12 flex-1" onClick={() => setStep(4)} disabled={!title.trim()}>Continuer →</Button>
              </div>
            </div>
          )}

          {/* Step 4: Optional fields + Save */}
          {step === 4 && (
            <div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border mb-5">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{selectedFile?.name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="secondary" className={`text-xs ${getCategoryInfo(category).color}`}>
                      {getCategoryInfo(category).label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">· {new Date(documentDate).toLocaleDateString("fr-FR")}</span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4">Informations complémentaires (optionnel)</p>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold mb-2 block">
                    Montant <span className="font-normal text-muted-foreground">(optionnel)</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00 €"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-12 text-base"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block">
                    Note <span className="font-normal text-muted-foreground">(optionnel)</span>
                  </label>
                  <Textarea
                    placeholder="Ajouter une note..."
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="text-base resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-between mt-6 gap-3">
                <Button variant="ghost" size="sm" className="h-12" onClick={() => setStep(3)}>← Retour</Button>
                <Button
                  className="h-12 flex-1"
                  onClick={handleSubmit}
                  disabled={isUploading}
                >
                  {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isUploading ? "Envoi..." : "Enregistrer"}
                </Button>
              </div>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}

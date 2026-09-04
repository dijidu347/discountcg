import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Undo2, Trash2, Loader2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { compressFile, isAcceptedFileType, isFileTooLarge, isHeicFile } from "@/lib/file-compression";

interface SignaturePadProps {
  // Reçoit le PNG en dataURL, ou null quand la zone est vidée.
  onChange: (dataUrl: string | null) => void;
  // Signature déjà enregistrée, affichée à l'ouverture.
  initialDataUrl?: string | null;
  label?: string;
  // Autorise l'import d'une image à la place du tracé (signature scannée).
  allowUpload?: boolean;
  // "upload" retire la zone de tracé : un tampon d'entreprise se photographie ou
  // se scanne, il ne se dessine pas au doigt.
  mode?: "draw" | "upload";
  heightClass?: string;
}

// Résolution de rendu du PNG produit. Suffisante pour une impression correcte
// du mandat sans alourdir le stockage (~10 à 20 Ko).
const EXPORT_WIDTH = 600;
const EXPORT_HEIGHT = 200;
// Au-dela de ce poids, l'image passe par la compression maison : conversion
// HEIC comprise, elle ramene une photo de telephone a environ 1 Mo. En dessous,
// le fichier est pris tel quel — un PNG leger garde ainsi sa transparence, ce
// qui compte pour une signature scannee et detouree.
const SEUIL_COMPRESSION = 1.5 * 1024 * 1024;

export const SignaturePad = ({
  onChange,
  initialDataUrl = null,
  label = "Signature",
  allowUpload = true,
  mode = "draw",
  heightClass = "h-40",
}: SignaturePadProps) => {
  const uploadSeul = mode === "upload";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  // Traits accumulés, en coordonnées normalisées (0-1) : le canvas est
  // redimensionné par le navigateur selon l'écran, on ne peut pas mémoriser des
  // pixels sans déformer le tracé au redimensionnement ou en rotation mobile.
  const strokesRef = useRef<Array<Array<{ x: number; y: number }>>>([]);
  const drawingRef = useRef(false);
  const [isEmpty, setIsEmpty] = useState(!initialDataUrl);
  const [compression, setCompression] = useState(false);
  // Une image importée remplace le tracé : les deux modes ne se mélangent pas.
  const [uploaded, setUploaded] = useState<string | null>(initialDataUrl);
  // Un PDF ne s'affiche pas dans une balise image : on montre son nom.
  const [nomFichier, setNomFichier] = useState<string | null>(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * ratio || canvas.height !== rect.height * ratio) {
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
    for (const stroke of strokesRef.current) {
      if (stroke.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x * rect.width, stroke[0].y * rect.height);
      for (const p of stroke.slice(1)) ctx.lineTo(p.x * rect.width, p.y * rect.height);
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    redraw();
    window.addEventListener("resize", redraw);
    return () => window.removeEventListener("resize", redraw);
  }, [redraw]);

  // Export à résolution fixe, indépendante de la taille d'affichage.
  const exportPng = useCallback((): string | null => {
    if (!strokesRef.current.length) return null;
    const out = document.createElement("canvas");
    out.width = EXPORT_WIDTH;
    out.height = EXPORT_HEIGHT;
    const ctx = out.getContext("2d");
    if (!ctx) return null;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
    for (const stroke of strokesRef.current) {
      if (stroke.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x * EXPORT_WIDTH, stroke[0].y * EXPORT_HEIGHT);
      for (const p of stroke.slice(1)) ctx.lineTo(p.x * EXPORT_WIDTH, p.y * EXPORT_HEIGHT);
      ctx.stroke();
    }
    return out.toDataURL("image/png");
  }, []);

  const pointFrom = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  // Les pointer events couvrent souris, doigt et stylet avec le même code.
  const handleDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (uploaded) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    strokesRef.current.push([pointFrom(e)]);
  };

  const handleMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || uploaded) return;
    strokesRef.current[strokesRef.current.length - 1].push(pointFrom(e));
    redraw();
  };

  const handleUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    setIsEmpty(false);
    onChange(exportPng());
  };

  const clear = () => {
    strokesRef.current = [];
    setUploaded(null);
    setNomFichier(null);
    setIsEmpty(true);
    redraw();
    onChange(null);
  };

  const undo = () => {
    strokesRef.current.pop();
    redraw();
    const png = exportPng();
    setIsEmpty(!png);
    onChange(png);
  };

  const handleFile = async (file: File) => {
    if (!isAcceptedFileType(file)) {
      toast({
        title: "Format non pris en charge",
        description: "Choisissez une photo, une image ou un PDF : JPEG, PNG, HEIC ou PDF.",
        variant: "destructive",
      });
      return;
    }
    if (isFileTooLarge(file)) {
      toast({
        title: "Fichier trop lourd",
        description: "Choisissez une image de moins de 50 Mo.",
        variant: "destructive",
      });
      return;
    }

    const estPdf = file.type === "application/pdf";
    // Une HEIC passe toujours par la conversion, meme legere : ni le navigateur
    // ni le PDF ne savent l'afficher. Sans cela une photo iPhone d'un mega
    // disparaissait silencieusement du mandat.
    const aConvertir = !estPdf && (isHeicFile(file) || file.size > SEUIL_COMPRESSION);
    let aLire = file;
    if (aConvertir) {
      setCompression(true);
      try {
        aLire = (await compressFile(file)).file;
      } catch (e) {
        console.error("Compression de l'image échouée:", e);
        toast({
          title: "Image illisible",
          description: "La compression a échoué. Réessayez avec une autre photo.",
          variant: "destructive",
        });
        return;
      } finally {
        setCompression(false);
      }
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      strokesRef.current = [];
      redraw();
      setUploaded(dataUrl);
      setNomFichier(estPdf ? file.name : null);
      setIsEmpty(false);
      onChange(dataUrl);
    };
    reader.readAsDataURL(aLire);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex gap-1">
          {!uploaded && !uploadSeul && (
            <Button type="button" variant="ghost" size="sm" onClick={undo} disabled={isEmpty} className="h-8">
              <Undo2 className="h-4 w-4 mr-1" />
              Annuler
            </Button>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={isEmpty} className="h-8">
            <Trash2 className="h-4 w-4 mr-1" />
            Effacer
          </Button>
        </div>
      </div>

      <div className={`relative rounded-lg border-2 border-dashed bg-background ${heightClass}`}>
        {uploaded && nomFichier ? (
          <div className="h-full w-full flex flex-col items-center justify-center gap-1 px-3 text-center">
            <FileText className="h-6 w-6 text-primary" />
            <span className="text-sm font-medium break-all">{nomFichier}</span>
            <span className="text-xs text-muted-foreground">PDF importé — il sera repris tel quel</span>
          </div>
        ) : uploaded ? (
          <img src={uploaded} alt={label} className="h-full w-full object-contain p-2" />
        ) : compression ? (
          <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Optimisation de l'image...
          </div>
        ) : uploadSeul ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="h-full w-full flex flex-col items-center justify-center gap-1 text-sm text-foreground/70 hover:bg-muted/50 transition-colors"
          >
            <Upload className="h-5 w-5" />
            Importer l'image de votre tampon
            <span className="text-xs text-muted-foreground">Photo, scan ou PDF — les gros fichiers sont réduits automatiquement</span>
          </button>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              // touch-none : sans ça le geste fait défiler la page au lieu de tracer.
              className="h-full w-full touch-none cursor-crosshair"
              onPointerDown={handleDown}
              onPointerMove={handleMove}
              onPointerUp={handleUp}
              onPointerLeave={handleUp}
              onPointerCancel={handleUp}
            />
            {isEmpty && (
              <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                Signez ici avec votre doigt ou votre souris
              </p>
            )}
          </>
        )}
      </div>

      {(allowUpload || uploadSeul) && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          {!uploadSeul && (
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="w-full">
              <Upload className="h-4 w-4 mr-2" />
              Importer une image à la place
            </Button>
          )}
        </>
      )}
    </div>
  );
};

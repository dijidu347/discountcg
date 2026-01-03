import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  getSignedUrl, 
  downloadFromSignedUrl, 
  extractBucketFromUrl, 
  extractPathFromUrl,
  type StorageBucket 
} from "@/lib/storage-utils";

interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  documentName: string;
  trackingNumber?: string;
  // New approach: bucket + path
  bucket?: StorageBucket;
  path?: string;
  // Legacy approach: documentUrl (will extract bucket/path from it)
  documentUrl?: string;
  documentType?: string;
}

export function DocumentViewer({ 
  isOpen, 
  onClose, 
  bucket: propBucket,
  path: propPath,
  documentUrl,
  documentName,
  documentType,
  trackingNumber 
}: DocumentViewerProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Determine if PDF from name, path, or type
  const isPdf = documentName?.toLowerCase().endsWith('.pdf') || 
                propPath?.toLowerCase().endsWith('.pdf') ||
                documentUrl?.toLowerCase().endsWith('.pdf') ||
                documentType?.toLowerCase().includes('pdf');

  // Resolve bucket and path from props or documentUrl
  const resolvedBucket = propBucket || (documentUrl ? extractBucketFromUrl(documentUrl) : null);
  const resolvedPath = propPath || (documentUrl ? extractPathFromUrl(documentUrl) : null);

  // Get signed URL when dialog opens
  useEffect(() => {
    if (isOpen && resolvedBucket && resolvedPath) {
      loadSignedUrl();
    } else if (isOpen && !resolvedBucket) {
      setError("Bucket non reconnu");
    } else {
      setSignedUrl(null);
      setError(null);
    }
  }, [isOpen, resolvedBucket, resolvedPath, trackingNumber]);

  const loadSignedUrl = async () => {
    if (!resolvedBucket || !resolvedPath) {
      setError("Informations du document manquantes");
      return;
    }
    
    setIsLoadingUrl(true);
    setError(null);
    
    try {
      console.log(`📄 DocumentViewer: Loading signed URL for bucket="${resolvedBucket}", path="${resolvedPath}"`);
      const url = await getSignedUrl(resolvedBucket, resolvedPath, trackingNumber);
      
      if (url) {
        setSignedUrl(url);
        console.log("✅ DocumentViewer: Got signed URL");
      } else {
        setError("Impossible de charger le document");
        console.error("❌ DocumentViewer: Failed to get signed URL");
      }
    } catch (err) {
      console.error("❌ DocumentViewer: Error loading signed URL:", err);
      setError("Erreur lors du chargement du document");
    } finally {
      setIsLoadingUrl(false);
    }
  };

  const handleDownload = async () => {
    if (!signedUrl) {
      toast({
        title: "Erreur",
        description: "Le lien du document n'est pas disponible",
        variant: "destructive",
      });
      return;
    }
    
    setIsDownloading(true);
    try {
      await downloadFromSignedUrl(signedUrl, documentName);
      
      toast({
        title: "Téléchargement lancé",
        description: `${documentName} est en cours de téléchargement`,
      });
    } catch (err) {
      console.error("Download error:", err);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger le fichier",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{documentName}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownload}
              disabled={isDownloading || isLoadingUrl || !signedUrl}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Téléchargement...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger
                </>
              )}
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto">
          {isLoadingUrl ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Chargement du document...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-destructive">
              <AlertCircle className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">{error}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={loadSignedUrl}
              >
                Réessayer
              </Button>
            </div>
          ) : signedUrl ? (
            isPdf ? (
              <iframe
                src={signedUrl}
                className="w-full h-full border-0"
                title={documentName}
              />
            ) : (
              <img
                src={signedUrl}
                alt={documentName}
                className="w-full h-auto object-contain"
                onError={() => setError("Impossible d'afficher l'image")}
              />
            )
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

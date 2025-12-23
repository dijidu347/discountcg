import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSignedUrl, extractBucketFromUrl, extractPathFromUrl } from "@/lib/storage-utils";

interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  documentUrl: string;
  documentName: string;
  documentType: string;
  trackingNumber?: string;
}

export function DocumentViewer({ 
  isOpen, 
  onClose, 
  documentUrl, 
  documentName, 
  documentType,
  trackingNumber 
}: DocumentViewerProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const isPdf = documentType.toLowerCase().includes('pdf') || documentUrl.toLowerCase().endsWith('.pdf');

  // Get signed URL when dialog opens
  useEffect(() => {
    if (isOpen && documentUrl) {
      loadSignedUrl();
    } else {
      setSignedUrl(null);
    }
  }, [isOpen, documentUrl]);

  const loadSignedUrl = async () => {
    setIsLoadingUrl(true);
    try {
      const bucket = extractBucketFromUrl(documentUrl);
      
      // If it's a private bucket, get signed URL
      if (bucket) {
        const path = extractPathFromUrl(documentUrl);
        const url = await getSignedUrl(bucket, path, trackingNumber);
        setSignedUrl(url || documentUrl);
      } else {
        // Not a known private bucket, use original URL
        setSignedUrl(documentUrl);
      }
    } catch (error) {
      console.error('Error loading signed URL:', error);
      // Fallback to original URL
      setSignedUrl(documentUrl);
    } finally {
      setIsLoadingUrl(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const urlToUse = signedUrl || documentUrl;
      // Fetch the file as a blob to force direct download
      const response = await fetch(urlToUse);
      if (!response.ok) throw new Error('Failed to fetch file');
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = documentName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(blobUrl);
      
      toast({
        title: "Téléchargement lancé",
        description: `${documentName} est en cours de téléchargement`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger le fichier",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const displayUrl = signedUrl || documentUrl;

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
              disabled={isDownloading || isLoadingUrl}
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
          ) : isPdf ? (
            <iframe
              src={displayUrl}
              className="w-full h-full border-0"
              title={documentName}
            />
          ) : (
            <img
              src={displayUrl}
              alt={documentName}
              className="w-full h-auto object-contain"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

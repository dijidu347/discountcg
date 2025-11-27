import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  documentUrl: string;
  documentName: string;
  documentType: string;
}

export function DocumentViewer({ isOpen, onClose, documentUrl, documentName, documentType }: DocumentViewerProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();
  const isPdf = documentType.toLowerCase().includes('pdf') || documentUrl.toLowerCase().endsWith('.pdf');

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // Fetch the file as a blob to force direct download
      const response = await fetch(documentUrl);
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
              disabled={isDownloading}
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
          {isPdf ? (
            <iframe
              src={documentUrl}
              className="w-full h-full border-0"
              title={documentName}
            />
          ) : (
            <img
              src={documentUrl}
              alt={documentName}
              className="w-full h-auto object-contain"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

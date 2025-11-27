import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { extractBucketFromUrl, extractPathFromUrl } from "@/lib/storage-utils";

interface SimpleDownloadButtonProps {
  url: string;
  filename: string;
  trackingNumber?: string;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  children?: React.ReactNode;
}

export const SimpleDownloadButton = ({
  url,
  filename,
  trackingNumber,
  className,
  variant = "default",
  size = "default",
  children,
}: SimpleDownloadButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    try {
      setIsLoading(true);
      
      const bucket = extractBucketFromUrl(url);
      const path = extractPathFromUrl(url);
      
      if (!bucket) {
        throw new Error("Could not determine bucket");
      }

      // Build the download URL
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const downloadUrl = `${supabaseUrl}/functions/v1/download-file?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}${trackingNumber ? `&tracking=${encodeURIComponent(trackingNumber)}` : ''}`;

      // Fetch the file
      const response = await fetch(downloadUrl, {
        headers: trackingNumber ? { "x-tracking-number": trackingNumber } : {},
      });

      if (!response.ok) {
        throw new Error("Download failed");
      }

      // Get the blob and trigger download
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      toast({
        title: "Téléchargement réussi",
        description: `${filename} a été téléchargé`,
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Erreur de téléchargement",
        description: "Impossible de télécharger le fichier",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={isLoading}
      variant={variant}
      size={size}
      className={className}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : children ? (
        children
      ) : (
        <Download className="w-4 h-4" />
      )}
    </Button>
  );
};

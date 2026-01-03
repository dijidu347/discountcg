import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  downloadPrivateFile, 
  downloadPrivateFileFromUrl,
  extractBucketFromUrl, 
  extractPathFromUrl,
  type StorageBucket 
} from "@/lib/storage-utils";
import { useToast } from "@/hooks/use-toast";

interface SecureDownloadButtonProps {
  url: string;
  filename: string;
  trackingNumber?: string;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  children?: React.ReactNode;
}

export const SecureDownloadButton = ({
  url,
  filename,
  trackingNumber,
  className,
  variant = "ghost",
  size = "icon",
  children,
}: SecureDownloadButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    try {
      setIsLoading(true);
      await downloadPrivateFileFromUrl(url, filename, trackingNumber);
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

  if (children) {
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
        ) : (
          children
        )}
      </Button>
    );
  }

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
      ) : (
        <Download className="w-4 h-4" />
      )}
    </Button>
  );
};

// Inline version for use in links/text
export const SecureDownloadLink = ({
  url,
  filename,
  trackingNumber,
  className,
  children,
}: Omit<SecureDownloadButtonProps, "variant" | "size">) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await downloadPrivateFileFromUrl(url, filename, trackingNumber);
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
    <button
      onClick={handleDownload}
      disabled={isLoading}
      className={className || "inline-flex items-center gap-2 text-primary hover:underline cursor-pointer"}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        children || <Download className="w-4 h-4" />
      )}
    </button>
  );
};

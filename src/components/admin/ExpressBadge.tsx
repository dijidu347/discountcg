import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";

export const ExpressBadge = ({ express }: { express?: boolean }) => {
  if (!express) return null;
  return (
    <Badge className="bg-orange-500 text-white hover:bg-orange-600 gap-1">
      <Zap className="w-3 h-3" />
      Prioritaire
    </Badge>
  );
};

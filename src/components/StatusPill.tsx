import { Badge } from "@/components/ui/badge";
import { getDemarcheStatusBadge } from "@/lib/demarcheStatusBadge";

export function StatusPill({
  statut,
  hasActiveRejectedDoc = false,
}: {
  statut: string | null | undefined;
  hasActiveRejectedDoc?: boolean;
}) {
  const { color, label } = getDemarcheStatusBadge({ statut, hasActiveRejectedDoc });
  return <Badge className={color}>{label}</Badge>;
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Info, AlertTriangle, X } from "lucide-react";

interface Announcement {
  id: string;
  message: string;
  type: string;
  ends_at: string;
}

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    const { data } = await supabase
      .from("admin_announcements")
      .select("id, message, type, ends_at")
      .eq("active", true)
      .gte("ends_at", new Date().toISOString())
      .lte("starts_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (data) setAnnouncements(data as Announcement[]);
  };

  const visible = announcements.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  const styles: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
    info: {
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-300 dark:border-blue-700",
      text: "text-blue-800 dark:text-blue-200",
      icon: <Info className="h-5 w-5 text-blue-500 shrink-0" />,
    },
    warning: {
      bg: "bg-orange-50 dark:bg-orange-950/30",
      border: "border-orange-300 dark:border-orange-700",
      text: "text-orange-800 dark:text-orange-200",
      icon: <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />,
    },
    error: {
      bg: "bg-red-50 dark:bg-red-950/30",
      border: "border-red-300 dark:border-red-700",
      text: "text-red-800 dark:text-red-200",
      icon: <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />,
    },
  };

  return (
    <div className="space-y-2 mb-4">
      {visible.map((a) => {
        const s = styles[a.type] || styles.info;
        return (
          <div
            key={a.id}
            className={`flex items-start gap-3 p-3 rounded-lg border ${s.bg} ${s.border}`}
          >
            {s.icon}
            <p className={`text-sm flex-1 ${s.text}`}>{a.message}</p>
            <button
              onClick={() => setDismissed((prev) => new Set(prev).add(a.id))}
              className={`shrink-0 ${s.text} hover:opacity-70`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

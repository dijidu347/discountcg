import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Megaphone, Plus, Trash2, Power, PowerOff, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Announcement {
  id: string;
  message: string;
  type: string;
  starts_at: string;
  ends_at: string;
  active: boolean;
  created_at: string;
}

export default function AnnouncementManager() {
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Form state
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [durationHours, setDurationHours] = useState("24");

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    const { data, error } = await supabase
      .from("admin_announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setAnnouncements(data as Announcement[]);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!message.trim()) {
      toast({ title: "Erreur", description: "Le message est obligatoire", variant: "destructive" });
      return;
    }

    setCreating(true);
    const hours = parseInt(durationHours) || 24;
    const endsAt = new Date();
    endsAt.setHours(endsAt.getHours() + hours);

    const { error } = await supabase.from("admin_announcements").insert({
      message: message.trim(),
      type,
      starts_at: new Date().toISOString(),
      ends_at: endsAt.toISOString(),
      active: true,
    });

    if (error) {
      toast({ title: "Erreur", description: "Impossible de créer l'annonce", variant: "destructive" });
    } else {
      toast({ title: "Succès", description: "Annonce créée et visible par tous les garages" });
      setMessage("");
      setDurationHours("24");
      setType("info");
      loadAnnouncements();
    }
    setCreating(false);
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    await supabase.from("admin_announcements").update({ active: !currentActive }).eq("id", id);
    loadAnnouncements();
  };

  const deleteAnnouncement = async (id: string) => {
    await supabase.from("admin_announcements").delete().eq("id", id);
    loadAnnouncements();
  };

  const isExpired = (endsAt: string) => new Date(endsAt) < new Date();
  const isActive = (a: Announcement) => a.active && !isExpired(a.ends_at);

  const typeStyles: Record<string, { label: string; color: string }> = {
    info: { label: "Info", color: "bg-blue-500" },
    warning: { label: "Attention", color: "bg-orange-500" },
    error: { label: "Urgent", color: "bg-red-500" },
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          <CardTitle>Annonces générales</CardTitle>
        </div>
        <CardDescription>
          Envoyez des messages affichés en haut du tableau de bord de tous les garages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create form */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
          <h3 className="font-semibold flex items-center gap-2">
            <Plus className="h-4 w-4" /> Nouvelle annonce
          </h3>
          <div className="space-y-3">
            <div>
              <Label>Message</Label>
              <Textarea
                placeholder="Écrivez votre message ici..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">ℹ️ Info</SelectItem>
                    <SelectItem value="warning">⚠️ Attention</SelectItem>
                    <SelectItem value="error">🚨 Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Durée d'affichage</Label>
                <Select value={durationHours} onValueChange={setDurationHours}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 heure</SelectItem>
                    <SelectItem value="6">6 heures</SelectItem>
                    <SelectItem value="12">12 heures</SelectItem>
                    <SelectItem value="24">24 heures</SelectItem>
                    <SelectItem value="48">2 jours</SelectItem>
                    <SelectItem value="72">3 jours</SelectItem>
                    <SelectItem value="168">1 semaine</SelectItem>
                    <SelectItem value="720">1 mois</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleCreate} disabled={creating || !message.trim()} className="w-full">
              <Megaphone className="h-4 w-4 mr-2" />
              {creating ? "Envoi..." : "Publier l'annonce"}
            </Button>
          </div>
        </div>

        {/* List */}
        <div className="space-y-3">
          <h3 className="font-semibold">Historique des annonces</h3>
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune annonce</p>
          ) : (
            announcements.map((a) => {
              const active = isActive(a);
              const expired = isExpired(a.ends_at);
              const ts = typeStyles[a.type] || typeStyles.info;

              return (
                <div
                  key={a.id}
                  className={`p-3 border rounded-lg flex items-start justify-between gap-3 ${
                    active ? "bg-card" : "bg-muted/50 opacity-70"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge className={`${ts.color} text-white text-xs`}>{ts.label}</Badge>
                      {active && <Badge variant="outline" className="text-green-600 border-green-600 text-xs">Actif</Badge>}
                      {expired && <Badge variant="outline" className="text-muted-foreground text-xs">Expiré</Badge>}
                      {!a.active && !expired && <Badge variant="outline" className="text-red-500 border-red-500 text-xs">Désactivé</Badge>}
                    </div>
                    <p className="text-sm">{a.message}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Jusqu'au {format(new Date(a.ends_at), "dd MMM yyyy HH:mm", { locale: fr })}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleActive(a.id, a.active)}
                      title={a.active ? "Désactiver" : "Activer"}
                    >
                      {a.active ? <PowerOff className="h-4 w-4 text-orange-500" /> : <Power className="h-4 w-4 text-green-500" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteAnnouncement(a.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}

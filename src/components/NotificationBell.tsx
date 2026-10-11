// La cloche du tableau de bord garage.
//
// Elle annonçait douze notifications qui ne partaient jamais. Deux défauts,
// aucun lié au clic lui-même.
//
// Les refus de pièces (`garage_verification_notifications`) n'avaient pas
// d'état « lue » en base. L'écran le remplaçait par un ensemble d'identifiants
// gardé en mémoire React — perdu au rechargement, et inopérant de toute façon :
// `loadNotifications()` était rappelé dans la foulée du `setState`, donc avec
// l'ancienne valeur, et le clic naviguait ensuite vers la page des pièces, ce
// qui démontait le composant. Le compteur ne bougeait pas d'un pouce.
//
// Le compteur mentait par ailleurs : il comptait les non-lues parmi les quinze
// lignes affichées, pas celles qui existent. Douze à l'écran, quatre cent
// quarante et une en base pour ce compte-là.
//
// Désormais le compteur compte ce qui est non lu, le clic écrit la lecture en
// base par `marquer_notifications_lues`, et un bouton solde tout d'un coup —
// sans quoi il faudrait sept cent soixante-huit clics au garage le plus chargé.

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  source?: 'notification' | 'verification';
  subject?: string;
  demarche_id?: string;
}

export function NotificationBell({ garageId }: { garageId: string }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [soldeEnCours, setSoldeEnCours] = useState(false);

  const loadNotifications = useCallback(async () => {
    // Load regular notifications
    const { data: regularNotifs } = await supabase
      .from('notifications')
      .select('*, demarches(numero_demarche)')
      .eq('garage_id', garageId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Load verification notifications
    const { data: verificationNotifs } = await supabase
      // `lu_le` est plus récent que les types générés depuis la base.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('garage_verification_notifications' as any)
      .select('*')
      .eq('garage_id', garageId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Load unread messages from admin
    const { data: adminMessages } = await supabase
      .from('messages')
      .select('*, demarches(numero_demarche)')
      .eq('garage_id', garageId)
      .eq('sender_type', 'admin')
      .not('is_read', 'is', true)
      .order('created_at', { ascending: false })
      .limit(5);

    // Combine and sort
    const combined: Notification[] = [
      ...(regularNotifs || []).map((n: any) => ({
        ...n,
        is_read: n.is_read === true,
        source: 'notification' as const,
      })),
      ...(verificationNotifs || []).map((n: any) => ({
        id: n.id,
        type: 'verification',
        message: n.subject,
        is_read: Boolean(n.lu_le),
        created_at: n.created_at,
        source: 'verification' as const,
        subject: n.subject
      })),
      ...(adminMessages || []).map((n: any) => ({
        id: n.id,
        type: 'new_message',
        message: `Message admin: ${n.content.substring(0, 80)}${n.content.length > 80 ? '...' : ''}`,
        is_read: false,
        created_at: n.created_at,
        source: 'notification' as const,
        demarche_id: n.demarche_id,
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
     .slice(0, 15);

    setNotifications(combined);

    // Le compteur se lit en base, et non sur les quinze lignes ci-dessus : une
    // cloche qui annonce douze alors que quatre cent quarante et une attendent
    // ne se vide jamais, quoi qu'on clique.
    const compter = (requete: any) => requete.then((r: any) => r.count ?? 0);
    const [nNotifs, nVerifs, nMessages] = await Promise.all([
      compter(
        supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('garage_id', garageId)
          .not('is_read', 'is', true),
      ),
      compter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from('garage_verification_notifications')
          .select('*', { count: 'exact', head: true })
          .eq('garage_id', garageId)
          .is('lu_le', null),
      ),
      compter(
        supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('garage_id', garageId)
          .eq('sender_type', 'admin')
          .not('is_read', 'is', true),
      ),
    ]);
    setUnreadCount(nNotifs + nVerifs + nMessages);
  }, [garageId]);

  useEffect(() => {
    loadNotifications();

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `garage_id=eq.${garageId}`
        },
        () => {
          loadNotifications();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'garage_verification_notifications',
          filter: `garage_id=eq.${garageId}`
        },
        () => {
          loadNotifications();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `garage_id=eq.${garageId}`
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [garageId, loadNotifications]);

  // Une seule fonction pour les trois sources : la fonction en base ne touche
  // qu'aux lignes du garage de l'appelant, et seulement à leur état de lecture.
  // `ids` à undefined solde tout ce qui attend.
  const marquerLu = async (ids?: string[]): Promise<boolean> => {
    const { error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .rpc('marquer_notifications_lues' as any, { p_ids: ids ?? null });

    if (error) {
      // L'échec était muet jusqu'ici : le compteur restait, sans un mot.
      console.error('marquer_notifications_lues', error);
      toast({
        title: "Notification non marquée comme lue",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
    await loadNotifications();
    return true;
  };

  const toutMarquerLu = async () => {
    setSoldeEnCours(true);
    const ok = await marquerLu();
    setSoldeEnCours(false);
    if (ok) setOpen(false);
  };

  const handleNotificationClick = async (notification: Notification) => {
    // La lecture s'écrit avant de naviguer : la navigation démonte ce
    // composant, et un appel laissé en vol derrière elle n'avait plus personne
    // pour rafraîchir le compteur.
    if (!notification.is_read) {
      await marquerLu([notification.id]);
    }

    setOpen(false);

    if (notification.source === 'verification' || notification.type === 'verification') {
      navigate('/garage-settings?tab=verification');
    } else if (notification.demarche_id) {
      navigate(`/mes-demarches?demarche=${notification.demarche_id}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment_confirmed':
      case 'client_payment_confirmed':
        return '💰';
      case 'client_payment_link_sent':
        return '🔗';
      case 'document_request':
        return '📄';
      case 'document_ready':
        return '✅';
      case 'review_request':
        return '⭐';
      case 'verification':
        return '🔐';
      case 'new_message':
        return '💬';
      default:
        return '📢';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-1 text-xs"
                disabled={soldeEnCours}
                onClick={toutMarquerLu}
              >
                {soldeEnCours ? "…" : "Tout marquer comme lu"}
              </Button>
            )}
          </div>
          <ScrollArea className="h-[300px]">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune notification
              </p>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div
                    key={`${notification.source}-${notification.id}`}
                    className={`p-3 rounded-lg border cursor-pointer hover:bg-muted/50 ${
                      !notification.is_read ? 'bg-primary/10 border-primary/30' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xl">{getNotificationIcon(notification.type)}</span>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">{notification.message}</p>
                        {notification.demarche_id && (
                          <p className="text-xs text-primary">Voir la demarche →</p>
                        )}
                        {notification.source === 'verification' && (
                          <p className="text-xs text-primary">Cliquez pour voir les details</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(notification.created_at).toLocaleString('fr-FR')}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <Badge variant="destructive" className="h-2 w-2 p-0 rounded-full" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}

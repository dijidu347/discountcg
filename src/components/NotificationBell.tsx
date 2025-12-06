import { useEffect, useState } from "react";
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

interface Notification {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  source?: 'notification' | 'verification';
  subject?: string;
}

export function NotificationBell({ garageId }: { garageId: string }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [readVerificationIds, setReadVerificationIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadNotifications();

    // Subscribe to new notifications
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [garageId]);

  const loadNotifications = async () => {
    // Load regular notifications
    const { data: regularNotifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('garage_id', garageId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Load verification notifications
    const { data: verificationNotifs } = await supabase
      .from('garage_verification_notifications')
      .select('*')
      .eq('garage_id', garageId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Combine and sort
    const combined: Notification[] = [
      ...(regularNotifs || []).map(n => ({ ...n, source: 'notification' as const })),
      ...(verificationNotifs || []).map(n => ({
        id: n.id,
        type: 'verification',
        message: n.subject,
        is_read: readVerificationIds.has(n.id),
        created_at: n.created_at,
        source: 'verification' as const,
        subject: n.subject
      }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
     .slice(0, 10);

    setNotifications(combined);
    setUnreadCount(combined.filter(n => !n.is_read).length);
  };

  const markAsRead = async (notification: Notification) => {
    if (notification.source === 'notification') {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id);
    } else {
      // For verification notifications, track locally and navigate
      setReadVerificationIds(prev => new Set([...prev, notification.id]));
    }
    
    loadNotifications();
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification);
    }
    
    if (notification.source === 'verification' || notification.type === 'verification') {
      navigate('/garage-settings?tab=verification');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment_confirmed':
        return '💰';
      case 'document_request':
        return '📄';
      case 'document_ready':
        return '✅';
      case 'review_request':
        return '⭐';
      case 'verification':
        return '🔐';
      default:
        return '📢';
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-2">
          <h3 className="font-semibold">Notifications</h3>
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
                        {notification.source === 'verification' && (
                          <p className="text-xs text-primary">Cliquez pour voir les détails</p>
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

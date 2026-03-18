import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Bell, Eye } from "lucide-react";

export default function AdminNotifications() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      checkAdminAccess();
    }
  }, [user, authLoading]);

  const checkAdminAccess = async () => {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user?.id)
      .single();

    if (!roles || roles.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    loadNotifications();
  };

  const loadNotifications = async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        demarches (
          numero_demarche,
          type,
          immatriculation,
          status,
          montant_ttc
        ),
        garages (
          raison_sociale,
          siret
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotifications(data);
    }
    setLoading(false);
  };

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    loadNotifications();
  };

  const handleViewDemarche = (demarcheId: string) => {
    navigate(`/admin/demarche/${demarcheId}`);
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Admin notifications | Discount Carte Grise</title>
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/admin")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">Notifications</h1>
            <p className="text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} notification(s) non lue(s)` : 'Toutes les notifications ont été lues'}
            </p>
          </div>
          <Bell className="h-8 w-8 text-primary" />
        </div>

        <Card className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Statut</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Garage</TableHead>
                <TableHead>Démarche</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.map((notification) => (
                <TableRow 
                  key={notification.id}
                  className={!notification.is_read ? "bg-muted/50" : ""}
                >
                  <TableCell>
                    {!notification.is_read && (
                      <Badge variant="default">Nouveau</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{notification.type}</Badge>
                  </TableCell>
                  <TableCell className="max-w-md">
                    {notification.message}
                  </TableCell>
                  <TableCell>
                    {notification.garages?.raison_sociale || '-'}
                  </TableCell>
                  <TableCell>
                    {notification.demarches?.numero_demarche || '-'}
                    {notification.demarches?.immatriculation && (
                      <div className="text-sm text-muted-foreground">
                        {notification.demarches.immatriculation}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(notification.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {notification.demarche_id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDemarche(notification.demarche_id)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Voir
                        </Button>
                      )}
                      {!notification.is_read && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => markAsRead(notification.id)}
                        >
                          Marquer lu
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {notifications.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Aucune notification
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

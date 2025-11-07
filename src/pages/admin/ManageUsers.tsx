import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, UserPlus, Trash2, Shield } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserWithRole {
  id: string;
  email: string;
  created_at: string;
  role?: string;
}

export default function ManageUsers() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      checkAdminAndLoadData();
    }
  }, [user]);

  const checkAdminAndLoadData = async () => {
    if (!user) return;

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      navigate("/dashboard");
      return;
    }

    setIsAdmin(true);
    await loadUsers();
    setLoading(false);
  };

  const loadUsers = async () => {
    // Get all user_roles with email info
    const { data: rolesData, error } = await supabase
      .from('user_roles')
      .select('user_id, role, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading users:', error);
      return;
    }

    // For now, we can only display users who have roles
    // We cannot access auth.users from client-side
    setUsers(rolesData?.map(r => ({
      id: r.user_id,
      email: 'Utilisateur ' + r.user_id.substring(0, 8),
      created_at: r.created_at,
      role: r.role
    })) || []);
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newAdminEmail.trim()) {
      toast.error("Veuillez entrer un email");
      return;
    }

    setIsCreating(true);

    try {
      // Get user ID from garages table (assuming users must have a garage)
      const { data: garageData } = await supabase
        .from('garages')
        .select('user_id')
        .eq('email', newAdminEmail)
        .maybeSingle();

      if (!garageData) {
        toast.error("Cet utilisateur n'existe pas ou n'a pas de garage associé");
        setIsCreating(false);
        return;
      }

      // Check if already admin
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', garageData.user_id)
        .eq('role', 'admin')
        .maybeSingle();

      if (existingRole) {
        toast.error("Cet utilisateur est déjà administrateur");
        setIsCreating(false);
        return;
      }

      // Add admin role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: garageData.user_id,
          role: 'admin'
        });

      if (roleError) throw roleError;

      toast.success("Administrateur ajouté avec succès");
      setNewAdminEmail("");
      await loadUsers();
    } catch (error: any) {
      console.error('Error creating admin:', error);
      toast.error("Erreur lors de l'ajout de l'administrateur");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteRole = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) throw error;

      toast.success("Rôle admin supprimé");
      await loadUsers();
      setUserToDelete(null);
    } catch (error: any) {
      console.error('Error deleting admin role:', error);
      toast.error("Erreur lors de la suppression du rôle");
    }
  };

  if (authLoading || loading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-accent/5 to-background py-8">
      <div className="container mx-auto px-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/admin")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour au dashboard admin
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Gestion des utilisateurs</h1>
          <p className="text-muted-foreground">Gérer les rôles administrateurs</p>
        </div>

        {/* Add Admin Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Ajouter un administrateur
            </CardTitle>
            <CardDescription>
              Entrez l'email du compte garage à promouvoir administrateur
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="email">Email du garage</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="garage@example.com"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    disabled={isCreating}
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? "Ajout..." : "Ajouter admin"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Administrateurs</CardTitle>
            <CardDescription>
              Liste des utilisateurs avec le rôle admin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Utilisateur</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Date d'ajout</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.filter(u => u.role === 'admin').map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium font-mono text-sm">{u.id}</TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-primary">
                        <Shield className="mr-1 h-3 w-3" />
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(u.created_at).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell className="text-right">
                      {u.id !== user?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUserToDelete(u.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {users.filter(u => u.role === 'admin').length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Aucun administrateur
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer le rôle admin ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action retirera le rôle administrateur de cet utilisateur. Il pourra toujours accéder à son compte en tant qu'utilisateur normal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => userToDelete && handleDeleteRole(userToDelete)}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

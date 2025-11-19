import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Loader2, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  Search,
  FileText
} from "lucide-react";
import Navbar from "@/components/Navbar";

const GuestOrders = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [comment, setComment] = useState("");

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("guest_orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les commandes",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    setOrders(data || []);
    setIsLoading(false);
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from("guest_orders")
      .update({ 
        status: newStatus,
        validated_at: newStatus === "valide" ? new Date().toISOString() : null,
      })
      .eq("id", orderId);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Statut mis à jour",
      description: "Le statut de la commande a été modifié",
    });

    loadOrders();
  };

  const handleSaveComment = async () => {
    if (!selectedOrder) return;

    const { error } = await supabase
      .from("guest_orders")
      .update({ commentaire: comment })
      .eq("id", selectedOrder.id);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le commentaire",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Commentaire sauvegardé",
      description: "Le commentaire a été ajouté à la commande",
    });

    setSelectedOrder(null);
    setComment("");
    loadOrders();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: any }> = {
      en_attente: { label: "En attente", variant: "secondary" },
      paye: { label: "Payé", variant: "default" },
      en_traitement: { label: "En traitement", variant: "default" },
      valide: { label: "Validé", variant: "default" },
      finalise: { label: "Finalisé", variant: "default" },
      refuse: { label: "Refusé", variant: "destructive" },
    };

    const config = statusConfig[status] || { label: status, variant: "secondary" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.tracking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.immatriculation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Commandes sans compte</span>
              <Button onClick={loadOrders} variant="outline" size="sm">
                Actualiser
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher (tracking, plaque, nom, email)..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="en_attente">En attente</SelectItem>
                    <SelectItem value="paye">Payé</SelectItem>
                    <SelectItem value="en_traitement">En traitement</SelectItem>
                    <SelectItem value="valide">Validé</SelectItem>
                    <SelectItem value="finalise">Finalisé</SelectItem>
                    <SelectItem value="refuse">Refusé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N° Suivi</TableHead>
                      <TableHead>Immat</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Aucune commande trouvée
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-sm">
                            {order.tracking_number}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {order.immatriculation}
                          </TableCell>
                          <TableCell>
                            {order.nom} {order.prenom}
                          </TableCell>
                          <TableCell className="text-sm">{order.email}</TableCell>
                          <TableCell className="font-semibold">
                            {order.montant_ttc.toFixed(2)}€
                          </TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell className="text-sm">
                            {new Date(order.created_at).toLocaleDateString("fr-FR")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  window.open(`/suivi/${order.tracking_number}`, "_blank")
                                }
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setSelectedOrder(order);
                                      setComment(order.commentaire || "");
                                    }}
                                  >
                                    <FileText className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>
                                      Gérer la commande {order.tracking_number}
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <label className="text-sm font-semibold mb-2 block">
                                        Changer le statut
                                      </label>
                                      <Select
                                        value={order.status}
                                        onValueChange={(value) =>
                                          handleStatusChange(order.id, value)
                                        }
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="en_attente">
                                            En attente
                                          </SelectItem>
                                          <SelectItem value="paye">Payé</SelectItem>
                                          <SelectItem value="en_traitement">
                                            En traitement
                                          </SelectItem>
                                          <SelectItem value="valide">Validé</SelectItem>
                                          <SelectItem value="finalise">Finalisé</SelectItem>
                                          <SelectItem value="refuse">Refusé</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div>
                                      <label className="text-sm font-semibold mb-2 block">
                                        Commentaire pour le client
                                      </label>
                                      <Textarea
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        placeholder="Message visible par le client..."
                                        rows={4}
                                      />
                                    </div>
                                    <Button onClick={handleSaveComment} className="w-full">
                                      Sauvegarder le commentaire
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GuestOrders;

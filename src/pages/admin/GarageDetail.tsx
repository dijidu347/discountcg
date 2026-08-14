import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Eye, Pencil, ShieldCheck, Coins } from "lucide-react";
import { DocumentViewer } from "@/components/DocumentViewer";
import { StatusPill } from "@/components/StatusPill";
import { formatDateTimeParis } from "@/lib/dateFormat";
import {
  GarageEditDialog,
  EDITABLE_GARAGE_FIELDS,
  GARAGE_FIELD_LABELS,
} from "@/components/admin/GarageEditDialog";

interface RequiredDocument {
  id: string;
  code: string;
  nom_document: string;
  description: string;
  obligatoire: boolean;
  ordre: number;
  actif: boolean;
}

/** Nombre de démarches récentes affichées. Appliqué CÔTÉ BASE via .limit(). */
const RECENT_DEMARCHES_LIMIT = 20;

const docStatusBadge = (status: string) => {
  if (status === "approved") return { variant: "default" as const, className: "bg-green-500", label: "Approuvé" };
  if (status === "rejected") return { variant: "destructive" as const, className: "", label: "Refusé" };
  return { variant: "secondary" as const, className: "", label: "En attente" };
};

export default function GarageDetail() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [garage, setGarage] = useState<any>(null);
  const [requiredDocs, setRequiredDocs] = useState<RequiredDocument[]>([]);
  const [verificationDocs, setVerificationDocs] = useState<any[]>([]);
  const [demarches, setDemarches] = useState<any[]>([]);
  const [viewerDoc, setViewerDoc] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && id) checkAdminAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  const checkAdminAndLoad = async () => {
    // Même garde que les autres écrans admin : filtre sur le rôle admin, sinon
    // .single() casse pour les utilisateurs ayant plusieurs rôles.
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user?.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roles) {
      navigate("/dashboard");
      return;
    }

    await loadAll();
  };

  const loadAll = async () => {
    if (!id) return;

    const { data: garageData } = await supabase
      .from("garages")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!garageData) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setGarage(garageData);

    // Catalogue global des documents exigés (aucun garage_id : il est commun
    // à tous les garages), puis les fichiers réellement déposés par CE garage.
    // L'affichage croise les deux, exactement comme "Gérer les garages".
    const [{ data: reqDocs }, { data: docs }, { data: recentes }] = await Promise.all([
      supabase
        .from("garage_verification_required_documents")
        .select("*")
        .order("ordre", { ascending: true }),
      supabase
        .from("verification_documents")
        .select("*")
        .eq("garage_id", id)
        .order("created_at", { ascending: false }),
      // Tri ET limite CÔTÉ BASE : on ne rapatrie que 20 lignes, jamais la table
      // entière. Aucun risque de buter sur le plafond de 1000 lignes de PostgREST.
      supabase
        .from("demarches")
        .select("id, numero_demarche, immatriculation, status, created_at, is_draft")
        .eq("garage_id", id)
        .order("created_at", { ascending: false })
        .limit(RECENT_DEMARCHES_LIMIT),
    ]);

    setRequiredDocs(reqDocs || []);
    setVerificationDocs(docs || []);
    setDemarches(recentes || []);
    setLoading(false);
  };

  const getDocumentsByType = (docType: string) =>
    verificationDocs.filter((d) => d.document_type === docType);

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Garage introuvable.</p>
        <Button variant="outline" onClick={() => navigate("/admin/manage-garages")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à la liste
        </Button>
      </div>
    );
  }

  if (!garage) return null;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{garage.raison_sociale} — Fiche garage</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate("/admin/manage-garages")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux garages
        </Button>

        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{garage.raison_sociale}</h1>
            {garage.is_verified && (
              <Badge className="bg-green-500">
                <ShieldCheck className="h-3 w-3 mr-1" />
                Vérifié
              </Badge>
            )}
          </div>
          <Button onClick={() => setShowEditDialog(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Modifier
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Coordonnées — éditables via le dialogue partagé */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Coordonnées</h2>
            <dl className="space-y-3 text-sm">
              {EDITABLE_GARAGE_FIELDS.map((field) => (
                <div key={field} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{GARAGE_FIELD_LABELS[field]}</dt>
                  <dd className="font-medium text-right break-all">{garage[field] || "—"}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {/* Infos compte — LECTURE SEULE, aucune de ces valeurs n'est éditable ici */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Compte</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Solde de jetons</dt>
                <dd className="font-medium flex items-center gap-1">
                  <Coins className="h-4 w-4 text-muted-foreground" />
                  {garage.token_balance ?? 0}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Vérifié</dt>
                <dd>
                  {garage.is_verified ? (
                    <Badge className="bg-green-500">Oui</Badge>
                  ) : (
                    <Badge variant="secondary">Non</Badge>
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Gold</dt>
                <dd>
                  {garage.is_gold ? (
                    <Badge className="bg-amber-500">Oui</Badge>
                  ) : (
                    <Badge variant="secondary">Non</Badge>
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Jetons gratuits illimités</dt>
                <dd>
                  {garage.unlimited_free_tokens ? (
                    <Badge className="bg-blue-500">Oui</Badge>
                  ) : (
                    <Badge variant="secondary">Non</Badge>
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Réseau</dt>
                <dd className="font-medium">{garage.reseau || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Inscrit le</dt>
                <dd className="font-medium">{formatDateTimeParis(garage.created_at) ?? "—"}</dd>
              </div>
            </dl>
            <p className="text-xs text-muted-foreground mt-4 pt-3 border-t">
              Ces informations sont en lecture seule. Elles se pilotent depuis les actions
              dédiées de l'écran « Gérer les garages ».
            </p>
          </Card>
        </div>

        {/* Documents de vérification : catalogue requis × fichiers déposés */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Documents de vérification</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin/manage-garages")}
            >
              Gérer la vérification
            </Button>
          </div>

          {requiredDocs.filter((d) => d.actif).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun document requis configuré.</p>
          ) : (
            <div className="space-y-4">
              {requiredDocs
                .filter((d) => d.actif)
                .map((reqDoc) => {
                  const docs = getDocumentsByType(reqDoc.code);
                  const latestDoc = docs[0];
                  const badge = latestDoc ? docStatusBadge(latestDoc.status) : null;

                  return (
                    <Card key={reqDoc.id} className="p-4">
                      <div className="flex items-center justify-between mb-3 gap-4">
                        <div>
                          <h3 className="font-medium flex items-center gap-2">
                            {reqDoc.nom_document}
                            {reqDoc.obligatoire ? (
                              <Badge variant="outline" className="text-xs">Obligatoire</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Optionnel</Badge>
                            )}
                          </h3>
                          {reqDoc.description && (
                            <p className="text-sm text-muted-foreground">{reqDoc.description}</p>
                          )}
                        </div>
                        {badge && (
                          <Badge variant={badge.variant} className={badge.className}>
                            {badge.label}
                          </Badge>
                        )}
                      </div>

                      {docs.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">
                          Aucun document soumis
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {docs.map((doc) => (
                            <div
                              key={doc.id}
                              className={`flex items-center justify-between p-2 rounded border ${
                                doc.status === "rejected"
                                  ? "bg-red-50 border-red-200 dark:bg-red-950/20"
                                  : doc.status === "approved"
                                  ? "bg-green-50 border-green-200 dark:bg-green-950/20"
                                  : "bg-muted/50"
                              }`}
                            >
                              <div>
                                <p className="text-sm font-medium">{doc.nom_fichier}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDateTimeParis(doc.created_at) ?? "—"}
                                </p>
                                {doc.rejection_reason && (
                                  <p className="text-xs text-destructive mt-1">
                                    Refus : {doc.rejection_reason}
                                  </p>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setViewerDoc(doc)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  );
                })}
            </div>
          )}
        </Card>

        {/* Démarches récentes */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Démarches récentes</h2>
            <Badge variant="outline">
              {demarches.length} dernière{demarches.length > 1 ? "s" : ""}
            </Badge>
          </div>

          {demarches.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune démarche pour ce garage.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° démarche</TableHead>
                  <TableHead>Immatriculation</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demarches.map((d) => (
                  <TableRow
                    key={d.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/admin/demarche/${d.id}`)}
                  >
                    <TableCell className="font-mono text-xs font-semibold">
                      {d.numero_demarche || "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {d.immatriculation}
                      {d.is_draft && (
                        <Badge variant="secondary" className="ml-2 text-xs">Brouillon</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusPill statut={d.status} />
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDateTimeParis(d.created_at) ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      <GarageEditDialog
        garage={garage}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSaved={(updated) => setGarage((prev: any) => ({ ...prev, ...updated }))}
      />

      <DocumentViewer
        isOpen={!!viewerDoc}
        onClose={() => setViewerDoc(null)}
        documentUrl={viewerDoc?.url || ""}
        documentName={viewerDoc?.nom_fichier || ""}
        documentType={viewerDoc?.document_type || ""}
      />
    </div>
  );
}

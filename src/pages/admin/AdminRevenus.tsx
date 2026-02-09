import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft, DollarSign, TrendingUp, TrendingDown, Minus,
  CreditCard, Coins, Calendar, BarChart3, Users, FileText,
  ArrowUpRight, ArrowDownRight, Activity, Euro
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts";
import { format, startOfMonth, endOfMonth, subMonths, subDays, startOfDay, eachDayOfInterval, eachMonthOfInterval, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface RawPaiement {
  montant: number;
  status: string;
  created_at: string;
  demarches: {
    paid_with_tokens: boolean | null;
    is_free_token: boolean | null;
    frais_dossier: number | null;
    type: string;
    garage_id: string;
  } | null;
}

interface RawTokenPurchase {
  amount: number;
  created_at: string;
  garage_id: string;
  quantity: number;
}

interface RawDemarche {
  type: string;
  created_at: string;
  paye: boolean | null;
  is_free_token: boolean | null;
  paid_with_tokens: boolean | null;
  frais_dossier: number | null;
  montant_ttc: number | null;
  garage_id: string;
}

interface DailyData {
  date: string;
  label: string;
  paiements: number;
  tokens: number;
  total: number;
  count: number;
}

interface TypeBreakdown {
  type: string;
  label: string;
  count: number;
  revenue: number;
  color: string;
}

const TYPE_LABELS: Record<string, string> = {
  DA: "Déclaration d'achat",
  DC: "Déclaration de cession",
  CG: "Carte Grise",
  CG_DA: "CG + DA",
  DA_DC: "DA + DC",
  CG_IMPORT: "CG Import",
  WW_PROVISOIRE_PRO: "WW Provisoire",
  W_GARAGE_PRO: "W Garage",
  QUITUS_FISCAL_PRO: "Quitus Fiscal",
  CHANGEMENT_ADRESSE_PRO: "Changement Adresse",
  DUPLICATA_CG_PRO: "Duplicata CG",
  FIV_PRO: "FIV",
};

const CHART_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1", "#14b8a6"];

export default function AdminRevenus() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [paiements, setPaiements] = useState<RawPaiement[]>([]);
  const [tokenPurchases, setTokenPurchases] = useState<RawTokenPurchase[]>([]);
  const [demarches, setDemarches] = useState<RawDemarche[]>([]);
  const [garageNames, setGarageNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<string>("30");
  const [viewMode, setViewMode] = useState<string>("daily");

  useEffect(() => {
    if (!authLoading && user) checkAccessAndLoad();
  }, [user, authLoading]);

  const checkAccessAndLoad = async () => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user!.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roles) { navigate("/dashboard"); return; }
    await loadData();
  };

  const loadData = async () => {
    const [pRes, tRes, dRes, gRes] = await Promise.all([
      supabase
        .from("paiements")
        .select("montant, status, created_at, demarches!inner(paid_with_tokens, is_free_token, frais_dossier, type, garage_id)")
        .eq("status", "valide"),
      supabase
        .from("token_purchases")
        .select("amount, created_at, garage_id, quantity"),
      supabase
        .from("demarches")
        .select("type, created_at, paye, is_free_token, paid_with_tokens, frais_dossier, montant_ttc, garage_id")
        .eq("is_draft", false),
      supabase
        .from("garages")
        .select("id, raison_sociale, ville"),
    ]);

    setPaiements((pRes.data as any) || []);
    setTokenPurchases((tRes.data as any) || []);
    setDemarches((dRes.data as any) || []);
    
    const names: Record<string, string> = {};
    (gRes.data || []).forEach((g: any) => {
      names[g.id] = `${g.raison_sociale}${g.ville ? ` (${g.ville})` : ''}`;
    });
    setGarageNames(names);
    setLoading(false);
  };

  const dateRange = useMemo(() => {
    const now = new Date();
    if (period === "7") return { start: subDays(now, 7), end: now };
    if (period === "30") return { start: subDays(now, 30), end: now };
    if (period === "90") return { start: subDays(now, 90), end: now };
    if (period === "365") return { start: subDays(now, 365), end: now };
    // All time
    return { start: new Date("2024-01-01"), end: now };
  }, [period]);

  const getRevenueAmount = (p: RawPaiement): number => {
    if (p.demarches?.paid_with_tokens || p.demarches?.is_free_token) return 0;
    if (["CG", "CG_DA", "CG_IMPORT"].includes(p.demarches?.type || "")) {
      return Number(p.demarches?.frais_dossier || 20);
    }
    return Number(p.montant);
  };

  // Filter data by period
  const filteredPaiements = useMemo(() =>
    paiements.filter(p => {
      const d = new Date(p.created_at);
      return d >= dateRange.start && d <= dateRange.end && getRevenueAmount(p) > 0;
    }),
    [paiements, dateRange]
  );

  const filteredTokens = useMemo(() =>
    tokenPurchases.filter(t => {
      const d = new Date(t.created_at);
      return d >= dateRange.start && d <= dateRange.end;
    }),
    [tokenPurchases, dateRange]
  );

  const filteredDemarches = useMemo(() =>
    demarches.filter(d => {
      const date = new Date(d.created_at);
      return date >= dateRange.start && date <= dateRange.end;
    }),
    [demarches, dateRange]
  );

  // KPIs
  const totalServiceFees = filteredPaiements.reduce((s, p) => s + getRevenueAmount(p), 0);
  const totalTokenRevenue = filteredTokens.reduce((s, t) => s + Number(t.amount), 0);
  const totalRevenue = totalServiceFees + totalTokenRevenue;
  const totalDemarches = filteredDemarches.length;
  const paidDemarches = filteredDemarches.filter(d => d.paye || d.is_free_token || d.paid_with_tokens).length;
  const avgRevenuePerDemarche = paidDemarches > 0 ? totalServiceFees / paidDemarches : 0;

  // Previous period for trend
  const prevRange = useMemo(() => {
    const diff = dateRange.end.getTime() - dateRange.start.getTime();
    return { start: new Date(dateRange.start.getTime() - diff), end: dateRange.start };
  }, [dateRange]);

  const prevPaiements = paiements.filter(p => {
    const d = new Date(p.created_at);
    return d >= prevRange.start && d < prevRange.end && getRevenueAmount(p) > 0;
  });
  const prevTokens = tokenPurchases.filter(t => {
    const d = new Date(t.created_at);
    return d >= prevRange.start && d < prevRange.end;
  });
  const prevTotal = prevPaiements.reduce((s, p) => s + getRevenueAmount(p), 0) + prevTokens.reduce((s, t) => s + Number(t.amount), 0);
  const trendPct = prevTotal > 0 ? ((totalRevenue - prevTotal) / prevTotal) * 100 : 0;

  // Daily/Monthly chart data
  const chartData = useMemo(() => {
    if (viewMode === "monthly") {
      const months = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });
      return months.map(month => {
        const key = format(month, "yyyy-MM");
        const pSum = filteredPaiements
          .filter(p => format(new Date(p.created_at), "yyyy-MM") === key)
          .reduce((s, p) => s + getRevenueAmount(p), 0);
        const tSum = filteredTokens
          .filter(t => format(new Date(t.created_at), "yyyy-MM") === key)
          .reduce((s, t) => s + Number(t.amount), 0);
        return {
          date: key,
          label: format(month, "MMM yy", { locale: fr }),
          paiements: Math.round(pSum * 100) / 100,
          tokens: Math.round(tSum * 100) / 100,
          total: Math.round((pSum + tSum) * 100) / 100,
        };
      });
    }
    // Daily
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    return days.map(day => {
      const key = format(day, "yyyy-MM-dd");
      const pSum = filteredPaiements
        .filter(p => format(new Date(p.created_at), "yyyy-MM-dd") === key)
        .reduce((s, p) => s + getRevenueAmount(p), 0);
      const tSum = filteredTokens
        .filter(t => format(new Date(t.created_at), "yyyy-MM-dd") === key)
        .reduce((s, t) => s + Number(t.amount), 0);
      return {
        date: key,
        label: format(day, "dd/MM", { locale: fr }),
        paiements: Math.round(pSum * 100) / 100,
        tokens: Math.round(tSum * 100) / 100,
        total: Math.round((pSum + tSum) * 100) / 100,
      };
    });
  }, [filteredPaiements, filteredTokens, dateRange, viewMode]);

  // Revenue by demarche type
  const typeBreakdown = useMemo((): TypeBreakdown[] => {
    const map = new Map<string, { count: number; revenue: number }>();
    
    filteredPaiements.forEach(p => {
      const type = p.demarches?.type || "Autre";
      const current = map.get(type) || { count: 0, revenue: 0 };
      current.count++;
      current.revenue += getRevenueAmount(p);
      map.set(type, current);
    });

    return Array.from(map.entries())
      .map(([type, data], i) => ({
        type,
        label: TYPE_LABELS[type] || type,
        count: data.count,
        revenue: Math.round(data.revenue * 100) / 100,
        color: CHART_COLORS[i % CHART_COLORS.length],
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredPaiements]);

  // Payment method breakdown
  const paymentMethodBreakdown = useMemo(() => {
    const tokenPaid = filteredDemarches.filter(d => d.paid_with_tokens).length;
    const freePaid = filteredDemarches.filter(d => d.is_free_token).length;
    const stripePaid = filteredDemarches.filter(d => d.paye && !d.paid_with_tokens && !d.is_free_token).length;
    const unpaid = filteredDemarches.filter(d => !d.paye && !d.is_free_token && !d.paid_with_tokens).length;

    return [
      { name: "Carte bancaire", value: stripePaid, color: "#3b82f6" },
      { name: "Solde jetons", value: tokenPaid, color: "#8b5cf6" },
      { name: "Jeton gratuit", value: freePaid, color: "#10b981" },
      { name: "Non payé", value: unpaid, color: "#94a3b8" },
    ].filter(d => d.value > 0);
  }, [filteredDemarches]);

  // Top garages by revenue
  const topGarages = useMemo(() => {
    const garageMap = new Map<string, { serviceFees: number; tokenPurchases: number; demarcheCount: number }>();
    
    filteredPaiements.forEach(p => {
      const gid = p.demarches?.garage_id || "unknown";
      const cur = garageMap.get(gid) || { serviceFees: 0, tokenPurchases: 0, demarcheCount: 0 };
      cur.serviceFees += getRevenueAmount(p);
      cur.demarcheCount++;
      garageMap.set(gid, cur);
    });
    filteredTokens.forEach(t => {
      const cur = garageMap.get(t.garage_id) || { serviceFees: 0, tokenPurchases: 0, demarcheCount: 0 };
      cur.tokenPurchases += Number(t.amount);
      garageMap.set(t.garage_id, cur);
    });

    return Array.from(garageMap.entries())
      .map(([id, data]) => ({
        id,
        name: garageNames[id] || id.slice(0, 8) + "...",
        serviceFees: Math.round(data.serviceFees * 100) / 100,
        tokenPurchases: Math.round(data.tokenPurchases * 100) / 100,
        total: Math.round((data.serviceFees + data.tokenPurchases) * 100) / 100,
        demarcheCount: data.demarcheCount,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filteredPaiements, filteredTokens, garageNames]);

  // Recent transactions
  const recentTransactions = useMemo(() => {
    const all: { date: string; type: string; amount: number; source: string }[] = [];
    filteredPaiements.slice(0, 50).forEach(p => {
      all.push({
        date: p.created_at,
        type: p.demarches?.type || "?",
        amount: getRevenueAmount(p),
        source: "Paiement CB",
      });
    });
    filteredTokens.slice(0, 50).forEach(t => {
      all.push({
        date: t.created_at,
        type: `${t.quantity}€ crédits`,
        amount: Number(t.amount),
        source: "Achat jetons",
      });
    });
    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20);
  }, [filteredPaiements, filteredTokens]);

  const renderTrend = (value: number) => {
    if (Math.abs(value) < 0.1) return null;
    return (
      <div className={`flex items-center gap-1 text-sm ${value > 0 ? "text-emerald-600" : "text-red-500"}`}>
        {value > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
        {Math.abs(value).toFixed(1)}%
      </div>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Button variant="ghost" onClick={() => navigate("/admin")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour
        </Button>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-emerald-600" />
              Analyse des Revenus
            </h1>
            <p className="text-muted-foreground mt-1">Statistiques détaillées et suivi financier</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={viewMode} onValueChange={setViewMode}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Par jour</SelectItem>
                <SelectItem value="monthly">Par mois</SelectItem>
              </SelectContent>
            </Select>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 derniers jours</SelectItem>
                <SelectItem value="30">30 derniers jours</SelectItem>
                <SelectItem value="90">3 derniers mois</SelectItem>
                <SelectItem value="365">12 derniers mois</SelectItem>
                <SelectItem value="all">Tout</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Revenu total</p>
                  <p className="text-3xl font-bold text-emerald-600 mt-1">{totalRevenue.toFixed(2)} €</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Euro className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
              <div className="mt-3">{renderTrend(trendPct)}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Frais de service</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">{totalServiceFees.toFixed(2)} €</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">{filteredPaiements.length} paiements</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Ventes jetons</p>
                  <p className="text-3xl font-bold text-purple-600 mt-1">{totalTokenRevenue.toFixed(2)} €</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Coins className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">{filteredTokens.length} achats</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Revenu moyen / démarche</p>
                  <p className="text-3xl font-bold text-amber-600 mt-1">{avgRevenuePerDemarche.toFixed(2)} €</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-amber-600" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">{paidDemarches} démarches payées</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="evolution" className="mb-8">
          <TabsList className="mb-4">
            <TabsTrigger value="evolution">📈 Évolution</TabsTrigger>
            <TabsTrigger value="types">📊 Par type</TabsTrigger>
            <TabsTrigger value="payment">💳 Modes de paiement</TabsTrigger>
          </TabsList>

          <TabsContent value="evolution">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Évolution des revenus ({viewMode === "daily" ? "jour" : "mois"})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorPaiements" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value: number) => `${value.toFixed(2)} €`}
                        labelFormatter={(label) => `${label}`}
                        contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="paiements" name="Frais de service" stroke="#3b82f6" strokeWidth={2} fill="url(#colorPaiements)" />
                      <Area type="monotone" dataKey="tokens" name="Ventes jetons" stroke="#8b5cf6" strokeWidth={2} fill="url(#colorTokens)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="types">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Revenus par type de démarche</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={typeBreakdown} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis type="number" tick={{ fontSize: 12 }} />
                        <YAxis dataKey="label" type="category" width={120} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(value: number) => `${value.toFixed(2)} €`} />
                        <Bar dataKey="revenue" name="Revenu" radius={[0, 4, 4, 0]}>
                          {typeBreakdown.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Détail par type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[350px] overflow-y-auto">
                    {typeBreakdown.map((t) => (
                      <div key={t.type} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                          <div>
                            <p className="font-medium text-sm">{t.label}</p>
                            <p className="text-xs text-muted-foreground">{t.count} démarche{t.count > 1 ? "s" : ""}</p>
                          </div>
                        </div>
                        <p className="font-bold">{t.revenue.toFixed(2)} €</p>
                      </div>
                    ))}
                    {typeBreakdown.length === 0 && (
                      <p className="text-muted-foreground text-center py-8">Aucune donnée</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="payment">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Répartition des modes de paiement</CardTitle>
                  <CardDescription>Sur {totalDemarches} démarches</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentMethodBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={120}
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={true}
                        >
                          {paymentMethodBreakdown.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `${value} démarches`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Statistiques de paiement</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {paymentMethodBreakdown.map((pm) => (
                      <div key={pm.name} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pm.color }} />
                            <span className="text-sm font-medium">{pm.name}</span>
                          </div>
                          <span className="font-bold">{pm.value}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${totalDemarches > 0 ? (pm.value / totalDemarches) * 100 : 0}%`,
                              backgroundColor: pm.color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Top Garages */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Top garages par revenus générés
            </CardTitle>
            <CardDescription>Les garages qui dépensent le plus sur la période sélectionnée</CardDescription>
          </CardHeader>
          <CardContent>
            {topGarages.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Aucune donnée</p>
            ) : (
              <div className="space-y-3">
                {topGarages.map((g, i) => {
                  const maxTotal = topGarages[0]?.total || 1;
                  const pct = (g.total / maxTotal) * 100;
                  return (
                    <div key={g.id} className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        i === 1 ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' :
                        i === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm truncate">{g.name}</p>
                          <p className="font-bold text-sm shrink-0 ml-2">{g.total.toFixed(2)} €</p>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{g.demarcheCount} démarche{g.demarcheCount > 1 ? 's' : ''}</span>
                          {g.serviceFees > 0 && <span>CB: {g.serviceFees.toFixed(2)} €</span>}
                          {g.tokenPurchases > 0 && <span>Jetons: {g.tokenPurchases.toFixed(2)} €</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Dernières transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Aucune transaction</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTransactions.map((tx, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm">
                          {format(new Date(tx.date), "dd/MM/yyyy HH:mm", { locale: fr })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={tx.source === "Achat jetons" ? "secondary" : "outline"}>
                            {tx.source}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {TYPE_LABELS[tx.type] || tx.type}
                        </TableCell>
                        <TableCell className="text-right font-bold text-emerald-600">
                          +{tx.amount.toFixed(2)} €
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

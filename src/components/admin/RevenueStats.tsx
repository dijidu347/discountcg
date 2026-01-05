import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, TrendingUp, TrendingDown, Minus, CreditCard, Coins } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";

interface MonthlyRevenue {
  month: string;
  label: string;
  paiements: number;
  tokens: number;
  total: number;
}

export default function RevenueStats() {
  const [monthlyData, setMonthlyData] = useState<MonthlyRevenue[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRevenueData();
  }, []);

  const loadRevenueData = async () => {
    try {
      // Fetch paiements with dates
      const { data: paiements } = await supabase
        .from('paiements')
        .select(`
          montant, 
          status,
          created_at,
          demarches!inner(
            paid_with_tokens, 
            is_free_token, 
            frais_dossier,
            type
          )
        `)
        .eq('status', 'valide');

      // Fetch token purchases with dates
      const { data: tokenPurchases } = await supabase
        .from('token_purchases')
        .select('amount, created_at');

      // Group by month
      const monthlyMap = new Map<string, { paiements: number; tokens: number }>();

      // Process paiements
      paiements?.forEach(p => {
        if (p.demarches?.paid_with_tokens || p.demarches?.is_free_token) return;
        
        const date = new Date(p.created_at);
        const monthKey = format(date, 'yyyy-MM');
        
        let amount = 0;
        if (p.demarches?.type === 'CG' || p.demarches?.type === 'CG_DA' || p.demarches?.type === 'CG_IMPORT') {
          amount = Number(p.demarches.frais_dossier || 20);
        } else {
          amount = Number(p.montant);
        }

        const current = monthlyMap.get(monthKey) || { paiements: 0, tokens: 0 };
        current.paiements += amount;
        monthlyMap.set(monthKey, current);
      });

      // Process token purchases
      tokenPurchases?.forEach(t => {
        const date = new Date(t.created_at);
        const monthKey = format(date, 'yyyy-MM');
        
        const current = monthlyMap.get(monthKey) || { paiements: 0, tokens: 0 };
        current.tokens += Number(t.amount);
        monthlyMap.set(monthKey, current);
      });

      // Convert to array and sort by date
      const monthlyArray: MonthlyRevenue[] = Array.from(monthlyMap.entries())
        .map(([month, data]) => ({
          month,
          label: format(new Date(month + '-01'), 'MMMM yyyy', { locale: fr }),
          paiements: data.paiements,
          tokens: data.tokens,
          total: data.paiements + data.tokens
        }))
        .sort((a, b) => b.month.localeCompare(a.month));

      setMonthlyData(monthlyArray);
    } catch (error) {
      console.error('Error loading revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredData = () => {
    if (selectedPeriod === "all") return monthlyData;
    
    const now = new Date();
    let startDate: Date;
    
    switch (selectedPeriod) {
      case "1":
        startDate = startOfMonth(now);
        break;
      case "3":
        startDate = startOfMonth(subMonths(now, 2));
        break;
      case "6":
        startDate = startOfMonth(subMonths(now, 5));
        break;
      case "12":
        startDate = startOfMonth(subMonths(now, 11));
        break;
      default:
        return monthlyData;
    }

    return monthlyData.filter(d => new Date(d.month + '-01') >= startDate);
  };

  const filteredData = getFilteredData();
  const totalRevenue = filteredData.reduce((sum, d) => sum + d.total, 0);
  const totalPaiements = filteredData.reduce((sum, d) => sum + d.paiements, 0);
  const totalTokens = filteredData.reduce((sum, d) => sum + d.tokens, 0);

  // Calculate trend (compare current month with previous)
  const currentMonthData = monthlyData[0];
  const previousMonthData = monthlyData[1];
  const trend = currentMonthData && previousMonthData 
    ? ((currentMonthData.total - previousMonthData.total) / previousMonthData.total) * 100 
    : 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            <CardTitle>Revenus</CardTitle>
          </div>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Ce mois</SelectItem>
              <SelectItem value="3">3 derniers mois</SelectItem>
              <SelectItem value="6">6 derniers mois</SelectItem>
              <SelectItem value="12">12 derniers mois</SelectItem>
              <SelectItem value="all">Tout</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <CardDescription>
          Détail des revenus par source et par mois
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <p className="text-sm text-green-700 dark:text-green-400 font-medium">Total</p>
              {trend !== 0 && (
                <div className={`flex items-center gap-1 text-xs ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(trend).toFixed(1)}%
                </div>
              )}
            </div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">
              {totalRevenue.toFixed(2)} €
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">Frais de service</p>
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
              {totalPaiements.toFixed(2)} €
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <p className="text-sm text-purple-700 dark:text-purple-400 font-medium">Achats jetons</p>
            </div>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1">
              {totalTokens.toFixed(2)} €
            </p>
          </div>
        </div>

        {/* Monthly Breakdown */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Détail par mois</p>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {filteredData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune donnée pour cette période
              </p>
            ) : (
              filteredData.map((month, index) => {
                const prevMonth = filteredData[index + 1];
                const monthTrend = prevMonth 
                  ? ((month.total - prevMonth.total) / prevMonth.total) * 100 
                  : 0;
                
                return (
                  <div
                    key={month.month}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium capitalize">{month.label}</div>
                      {prevMonth && monthTrend !== 0 && (
                        <div className={`flex items-center gap-1 text-xs ${monthTrend > 0 ? 'text-green-600' : monthTrend < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                          {monthTrend > 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : monthTrend < 0 ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : (
                            <Minus className="h-3 w-3" />
                          )}
                          {Math.abs(monthTrend).toFixed(0)}%
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-xs text-muted-foreground">
                        <span className="text-blue-600">{month.paiements.toFixed(0)}€</span>
                        {" + "}
                        <span className="text-purple-600">{month.tokens.toFixed(0)}€</span>
                      </div>
                      <div className="text-sm font-bold text-green-600 min-w-[80px] text-right">
                        {month.total.toFixed(2)} €
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

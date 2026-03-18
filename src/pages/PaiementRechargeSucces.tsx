import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Euro, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";

export default function PaiementRechargeSucces() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [countdown, setCountdown] = useState(5);
  
  const amount = parseInt(searchParams.get("amount") || "0");
  const newBalance = parseInt(searchParams.get("balance") || "0");

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/dashboard");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/20 dark:via-emerald-950/20 dark:to-teal-950/20 flex items-center justify-center p-4">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Recharge réussie | Discount Carte Grise</title>
      </Helmet>
      <Card className="max-w-md w-full border-2 border-green-200 dark:border-green-800 shadow-xl">
        <CardContent className="pt-8 pb-6 px-6 text-center space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="w-20 h-20 mx-auto bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center"
          >
            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <h1 className="text-2xl font-bold text-green-700 dark:text-green-400">
              Recharge effectuée !
            </h1>
            <p className="text-muted-foreground">
              Votre solde a été rechargé avec succès
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-3"
          >
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Montant rechargé</span>
              <span className="font-bold text-lg text-green-600 dark:text-green-400">
                +{formatPrice(amount)}€
              </span>
            </div>
            <div className="border-t border-green-200 dark:border-green-800 pt-3">
              <div className="flex justify-between items-center">
                <span className="font-medium flex items-center gap-2">
                  <Euro className="w-4 h-4" />
                  Nouveau solde
                </span>
                <span className="font-bold text-xl text-primary">
                  {formatPrice(newBalance)}€
                </span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="space-y-3"
          >
            <p className="text-sm text-muted-foreground">
              Redirection dans {countdown} secondes...
            </p>
            <Button 
              onClick={() => navigate("/dashboard")}
              className="w-full"
            >
              Retour au tableau de bord
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </div>
  );
}

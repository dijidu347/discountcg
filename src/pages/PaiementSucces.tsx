import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

const PaiementSucces = () => {
  const navigate = useNavigate();
  const { demarcheId } = useParams();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate(`/demarche/${demarcheId}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate, demarcheId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Paiement réussi | Discount Carte Grise</title>
      </Helmet>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center space-y-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mx-auto w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30"
        >
          <CheckCircle className="w-14 h-14 text-white" />
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-2"
        >
          <h1 className="text-3xl font-bold text-green-800">
            Paiement validé !
          </h1>
          <p className="text-green-600 text-lg">
            Votre paiement a été accepté avec succès
          </p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-green-700/70"
        >
          Redirection dans {countdown} seconde{countdown > 1 ? "s" : ""}...
        </motion.p>
      </motion.div>
    </div>
  );
};

export default PaiementSucces;

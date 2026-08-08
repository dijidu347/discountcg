import { formatTransactionDate, type TransactionDateFields } from "@/lib/dateFormat";

/**
 * Cellule "Date" de la file admin : date + heure du PAIEMENT à l'heure de Paris.
 * Composant partagé pour que l'affichage soit strictement identique entre une
 * démarche pro (table `demarches`) et une commande particulier (`guest_orders`),
 * dont les colonnes de date ne portent pas le même nom.
 *
 * Quand aucun horodatage de paiement n'existe (cas majoritaire côté pro, cf.
 * lib/dateFormat.ts), on affiche la date de création avec une étiquette explicite
 * plutôt qu'un tiret : l'information reste utile pour trier la file, mais ne peut
 * pas être confondue avec une heure de transaction.
 */
export function TransactionDate({ row }: { row: TransactionDateFields }) {
  const { text, isFallback } = formatTransactionDate(row);

  if (!text) return <span className="text-muted-foreground">—</span>;

  return (
    <span className="whitespace-nowrap">
      {text}
      {isFallback && (
        <span className="block text-[10px] font-normal text-muted-foreground">
          création
        </span>
      )}
    </span>
  );
}

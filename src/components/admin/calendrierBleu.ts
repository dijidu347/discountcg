// Couleurs du calendrier de période dans l'admin : bleu au survol et pour la
// sélection (le rouge du thème reste réservé aux alertes).
export const CALENDRIER_BLEU = {
  cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-blue-50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md [&:has([aria-selected].day-range-end)]:rounded-r-md focus-within:relative focus-within:z-20",
  day: "inline-flex h-9 w-9 items-center justify-center rounded-md p-0 text-sm font-normal hover:bg-blue-100 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 aria-selected:opacity-100",
  day_selected: "bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white",
  day_range_middle: "aria-selected:bg-blue-50 aria-selected:text-blue-900 rounded-none",
  day_today: "font-semibold underline underline-offset-4",
  day_outside: "day-outside text-muted-foreground opacity-40 aria-selected:bg-transparent",
};

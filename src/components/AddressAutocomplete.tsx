import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddressAutocompleteProps {
  /** Adresse actuellement retenue (chaîne vide si aucune sélection). */
  value: string;
  /** Appelé UNIQUEMENT avec le libellé d'une suggestion sélectionnée. */
  onChange: (address: string) => void;
  label?: string;
  placeholder?: string;
  id?: string;
}

/**
 * Autocomplétion d'adresse française via la Base Adresse Nationale
 * (https://api-adresse.data.gouv.fr/search). Champ OPTIONNEL et non bloquant :
 * l'adresse retenue est uniquement une suggestion sélectionnée ; taper sans
 * sélectionner ne vaut pas adresse. Dégrade proprement si l'API est injoignable.
 */
export function AddressAutocomplete({
  value,
  onChange,
  label,
  placeholder = "Rechercher une adresse…",
  id,
}: AddressAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Appels débouncés (300 ms), à partir de 3 caractères.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=5`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const labels: string[] = (data?.features ?? [])
          .map((f: { properties?: { label?: string } }) => f?.properties?.label)
          .filter((l: unknown): l is string => typeof l === "string");
        setSuggestions(labels);
      } catch (e) {
        // API injoignable / bloquée (CSP) → aucune suggestion, champ laissé libre.
        console.error("AddressAutocomplete: échec API adresse", e);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const handleSelect = (address: string) => {
    onChange(address); // adresse retenue = UNIQUEMENT la suggestion cliquée
    setOpen(false);
    setQuery("");
    setSuggestions([]);
  };

  return (
    <div className="space-y-2">
      {label && <Label htmlFor={id}>{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className={cn("flex items-center gap-2 truncate", !value && "text-muted-foreground")}>
              <MapPin className="h-4 w-4 shrink-0 opacity-50" />
              {value || placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-background" align="start">
          {/* shouldFilter=false : les résultats sont déjà filtrés côté API. */}
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Commencez à taper (n° et rue, ville)…"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>
                {loading
                  ? "Recherche…"
                  : query.trim().length < 3
                    ? "Saisissez au moins 3 caractères"
                    : "Aucune adresse trouvée"}
              </CommandEmpty>
              {suggestions.length > 0 && (
                <CommandGroup>
                  {suggestions.map((s, i) => (
                    <CommandItem key={`${s}-${i}`} value={`${s}-${i}`} onSelect={() => handleSelect(s)}>
                      <Check className={cn("mr-2 h-4 w-4", value === s ? "opacity-100" : "opacity-0")} />
                      {s}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

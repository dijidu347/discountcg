import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface Requirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: Requirement[] = [
  { label: "Au moins 8 caractères", test: (p) => p.length >= 8 },
  { label: "Une lettre majuscule", test: (p) => /[A-Z]/.test(p) },
  { label: "Une lettre minuscule", test: (p) => /[a-z]/.test(p) },
  { label: "Un chiffre", test: (p) => /\d/.test(p) },
  { label: "Un caractère spécial (!@#$...)", test: (p) => /[!@#$%^&*(),.?":{}|<>_\-+=]/.test(p) },
];

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const { score, passedRequirements } = useMemo(() => {
    const passed = requirements.map((req) => req.test(password));
    const score = passed.filter(Boolean).length;
    return { score, passedRequirements: passed };
  }, [password]);

  const getStrengthLabel = () => {
    if (score === 0) return { label: "", color: "" };
    if (score <= 2) return { label: "Faible", color: "bg-red-500" };
    if (score <= 3) return { label: "Moyen", color: "bg-yellow-500" };
    if (score <= 4) return { label: "Bon", color: "bg-blue-500" };
    return { label: "Excellent", color: "bg-green-500" };
  };

  const strength = getStrengthLabel();

  if (!password) return null;

  return (
    <div className="mt-2 space-y-3">
      {/* Barre de force */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Force du mot de passe</span>
          <span className={cn(
            "font-medium",
            score <= 2 && "text-red-600",
            score === 3 && "text-yellow-600",
            score === 4 && "text-blue-600",
            score === 5 && "text-green-600"
          )}>
            {strength.label}
          </span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                level <= score ? strength.color : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      {/* Liste des critères */}
      <div className="space-y-1">
        {requirements.map((req, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center gap-2 text-xs transition-colors",
              passedRequirements[index] ? "text-green-600" : "text-muted-foreground"
            )}
          >
            {passedRequirements[index] ? (
              <Check className="h-3 w-3" />
            ) : (
              <X className="h-3 w-3" />
            )}
            <span>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

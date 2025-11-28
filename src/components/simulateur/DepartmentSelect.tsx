import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface DepartmentTariff {
  id: string;
  code: string;
  label: string;
  tarif: number;
}

interface DepartmentSelectProps {
  value: string;
  onChange: (value: string, tarif?: number) => void;
}

export const DepartmentSelect = ({ value, onChange }: DepartmentSelectProps) => {
  const [departments, setDepartments] = useState<DepartmentTariff[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDepartments = async () => {
      const { data, error } = await supabase
        .from("department_tariffs")
        .select("*")
        .order("code");

      if (!error && data) {
        // Trier numériquement, mettre les départements DOM-TOM à la fin
        const sorted = data.sort((a, b) => {
          const aNum = a.code.length === 3 ? 1000 + parseInt(a.code) : parseInt(a.code) || 0;
          const bNum = b.code.length === 3 ? 1000 + parseInt(b.code) : parseInt(b.code) || 0;
          return aNum - bNum;
        });
        setDepartments(sorted);
      }
      setLoading(false);
    };

    fetchDepartments();
  }, []);

  const handleChange = (code: string) => {
    const dept = departments.find(d => d.code === code);
    onChange(code, dept?.tarif);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">Département</label>
        <Select disabled>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Chargement..." />
          </SelectTrigger>
        </Select>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Département</label>
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Sélectionnez un département" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {departments.map((dept) => (
            <SelectItem key={dept.code} value={dept.code}>
              {dept.code} - {dept.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

// Hook pour récupérer les tarifs départementaux
export const useDepartmentTariffs = () => {
  const [tariffs, setTariffs] = useState<Record<string, number>>({});
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTariffs = async () => {
      const { data, error } = await supabase
        .from("department_tariffs")
        .select("*");

      if (!error && data) {
        const tariffsMap: Record<string, number> = {};
        const labelsMap: Record<string, string> = {};
        data.forEach(d => {
          tariffsMap[d.code] = d.tarif;
          labelsMap[d.code] = d.label;
        });
        setTariffs(tariffsMap);
        setLabels(labelsMap);
      }
      setLoading(false);
    };

    fetchTariffs();
  }, []);

  return { tariffs, labels, loading };
};

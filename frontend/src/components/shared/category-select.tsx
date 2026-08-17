"use client";

import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { budgetCategoriesApi } from "@/lib/api/endpoints";

export function CategorySelect({
  projectId,
  value,
  onChange,
  includeAll,
  placeholder = "เลือกหมวดงบประมาณ",
  className,
}: {
  projectId?: string;
  value?: string;
  onChange: (value: string) => void;
  includeAll?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const query = useQuery({
    queryKey: ["budget-categories", projectId],
    queryFn: () => budgetCategoriesApi.list(projectId!),
    enabled: !!projectId,
  });

  return (
    <Select value={value} onValueChange={onChange} disabled={!projectId}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={projectId ? placeholder : "เลือกโครงการก่อน"} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && <SelectItem value="all">ทุกหมวด</SelectItem>}
        {query.data?.items.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

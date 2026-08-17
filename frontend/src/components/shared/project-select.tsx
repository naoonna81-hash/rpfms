"use client";

import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { projectsApi } from "@/lib/api/endpoints";

export function ProjectSelect({
  value,
  onChange,
  includeAll,
  placeholder = "เลือกโครงการ",
  className,
}: {
  value?: string;
  onChange: (value: string) => void;
  includeAll?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const query = useQuery({
    queryKey: ["projects", "select-all"],
    queryFn: () => projectsApi.list({ limit: 100, sort: "code" }),
  });

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && <SelectItem value="all">ทุกโครงการ</SelectItem>}
        {query.data?.items.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.code} — {p.nameTh}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { LoadingState, EmptyState, ErrorState } from "@/components/shared/states";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  total?: number;
  sort?: string;
  onSortChange?: (sort: string) => void;
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading,
  isError,
  onRetry,
  emptyTitle,
  emptyDescription,
  page = 1,
  totalPages = 1,
  onPageChange,
  total,
  sort,
  onSortChange,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const sortKey = (header.column.columnDef.meta as { sortKey?: string } | undefined)?.sortKey;
                const isSorted = sortKey && sort?.replace("-", "") === sortKey;
                const isDesc = sort?.startsWith("-");
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : sortKey && onSortChange ? (
                      <button
                        className="flex items-center gap-1 hover:text-foreground"
                        onClick={() => onSortChange(isSorted && !isDesc ? `-${sortKey}` : sortKey)}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {isSorted ? (
                          isDesc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={columns.length}>
                <LoadingState />
              </TableCell>
            </TableRow>
          ) : isError ? (
            <TableRow>
              <TableCell colSpan={columns.length}>
                <ErrorState onRetry={onRetry} />
              </TableCell>
            </TableRow>
          ) : table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length}>
                <EmptyState title={emptyTitle} description={emptyDescription} />
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={onRowClick ? "cursor-pointer" : undefined}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {onPageChange && !isLoading && !isError && data.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <p>
            หน้า {page} จาก {Math.max(totalPages, 1)} {total !== undefined && `(ทั้งหมด ${total.toLocaleString("th-TH")} รายการ)`}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

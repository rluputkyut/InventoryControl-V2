import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { inventoryApi, masterDataApi } from '../api/endpoints';
import type { StockDocumentDto, Warehouse } from '../api/types';
import dayjs from 'dayjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';

export type DocumentKind = 'purchases' | 'sales' | 'transfers';

export function DocumentsPage({ kind, title }: { kind: DocumentKind; title: string }) {
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', kind],
    queryFn: () => inventoryApi.documents(kind),
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['master-data', 'warehouses'],
    queryFn: () => masterDataApi.list<Warehouse>('warehouses'),
  });

  const warehouseName = (id?: number | null) => (id ? (warehouses.find((w) => w.id === id)?.name ?? `#${id}`) : '-');

  interface Row {
    key: number;
    referenceNo?: string | null;
    notes?: string | null;
    occurred: string;
    totalAmount: number;
    lines: number;
    location: string;
  }

  const rows: Row[] = documents.map((d: StockDocumentDto) => ({
    key: d.id,
    referenceNo: d.referenceNo,
    notes: d.notes,
    occurred: dayjs(d.occurredAtUtc).format('YYYY-MM-DD HH:mm'),
    totalAmount: d.totalAmount,
    lines: d.lines?.length ?? 0,
    location: kind === 'transfers'
      ? `${warehouseName(d.fromWarehouseId)} → ${warehouseName(d.toWarehouseId)}`
      : warehouseName(d.warehouseId),
  }));

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const paged = rows.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <Button asChild>
            <Link to={`/${kind}/new`}>
              <Plus className="size-4" />
              New {title.toLowerCase().replace(/s$/, '')}
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 w-full animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Id</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Lines</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No documents found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paged.map((row) => (
                      <TableRow
                        key={row.key}
                        className="cursor-pointer"
                        onClick={() => window.location.assign(`/${kind}/${row.key}`)}
                      >
                        <TableCell>{row.key}</TableCell>
                        <TableCell>{row.referenceNo ?? '-'}</TableCell>
                        <TableCell>{row.occurred}</TableCell>
                        <TableCell>{row.location}</TableCell>
                        <TableCell>{row.lines}</TableCell>
                        <TableCell className="text-right">{row.totalAmount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="cursor-pointer">
                            <Link to={`/${kind}/${row.key}`} onClick={(e) => e.stopPropagation()}>
                              View
                            </Link>
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Prev
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {page + 1} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

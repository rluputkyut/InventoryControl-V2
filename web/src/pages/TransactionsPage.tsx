import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { inventoryApi, masterDataApi } from '../api/endpoints';
import type { TransactionType, Warehouse } from '../api/types';
import dayjs from 'dayjs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const PAGE_SIZE = 10;

export function TransactionsPage() {
  const [warehouseId, setWarehouseId] = useState<number | undefined>(undefined);
  const [documentId, setDocumentId] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);

  const { data: warehouses = [] } = useQuery({
    queryKey: ['master-data', 'warehouses'],
    queryFn: () => masterDataApi.list<Warehouse>('warehouses'),
  });
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', warehouseId, documentId],
    queryFn: () => inventoryApi.transactions({ warehouseId, documentId }),
  });

  const rows = transactions.map((t) => ({
    id: t.id,
    occurred: dayjs(t.occurredAtUtc).format('YYYY-MM-DD HH:mm'),
    type: t.type,
    referenceNo: t.referenceNo,
    product: t.product?.name ?? `#${t.productId}`,
    warehouse: t.warehouse?.name ?? `#${t.warehouseId}`,
    quantity: t.quantity,
    unitPrice: t.unitPrice,
    documentId: t.stockDocumentId,
  }));

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagedRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Transaction history</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="warehouse-filter">Warehouse:</Label>
              <Select
                value={warehouseId === undefined ? 'all' : String(warehouseId)}
                onValueChange={(v) => setWarehouseId(v === 'all' ? undefined : Number(v))}
              >
                <SelectTrigger id="warehouse-filter" className="h-9 w-[220px]">
                  <SelectValue placeholder="All warehouses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All warehouses</SelectItem>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="document-filter">Document id:</Label>
              <Input
                id="document-filter"
                type="number"
                min={1}
                placeholder="Any"
                className="h-9 w-[140px]"
                value={documentId === undefined ? '' : documentId}
                onChange={(e) => {
                  const v = e.target.value;
                  setDocumentId(v === '' ? undefined : Number(v));
                }}
              />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit price</TableHead>
                <TableHead>Document</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : pagedRows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.occurred}</TableCell>
                      <TableCell>
                        <Badge className={typeColor(r.type)}>{r.type}</Badge>
                      </TableCell>
                      <TableCell>{r.referenceNo ?? '-'}</TableCell>
                      <TableCell>{r.product}</TableCell>
                      <TableCell>{r.warehouse}</TableCell>
                      <TableCell className="text-right">{r.quantity}</TableCell>
                      <TableCell className="text-right">{r.unitPrice.toFixed(2)}</TableCell>
                      <TableCell>{r.documentId ? `#${r.documentId}` : '-'}</TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
          {!isLoading && rows.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {pageCount}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-4" />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function typeColor(type: TransactionType): string {
  switch (type) {
    case 'Purchase':
      return 'bg-green-600 text-white';
    case 'Sale':
      return 'bg-red-600 text-white';
    case 'TransferOut':
      return 'bg-amber-500 text-white';
    default:
      return 'bg-blue-600 text-white';
  }
}
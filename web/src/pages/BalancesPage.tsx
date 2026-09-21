import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { inventoryApi, masterDataApi } from '../api/endpoints';
import type { Warehouse } from '../api/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PAGE_SIZE = 10;

export function BalancesPage() {
  const [warehouseId, setWarehouseId] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(0);

  const { data: warehouses = [] } = useQuery({
    queryKey: ['master-data', 'warehouses'],
    queryFn: () => masterDataApi.list<Warehouse>('warehouses'),
  });
  const { data: balances = [], isLoading } = useQuery({
    queryKey: ['balances', warehouseId],
    queryFn: () => inventoryApi.balances(warehouseId),
  });

  const rows = balances.map((b) => ({
    key: b.id,
    product: b.product?.name ?? `#${b.productId}`,
    sku: b.product?.sku ?? '-',
    warehouse: b.warehouse?.name ?? `#${b.warehouseId}`,
    quantity: b.quantity,
  }));

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Stock balances
      </h1>
      <Card>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Label htmlFor="warehouse-select">Warehouse:</Label>
            <Select
              value={warehouseId == null ? 'all' : String(warehouseId)}
              onValueChange={(value) => {
                setWarehouseId(value === 'all' ? undefined : Number(value));
                setPage(0);
              }}
            >
              <SelectTrigger id="warehouse-select" className="w-60">
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

          <Separator />

          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No balances found
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell>{row.product}</TableCell>
                      <TableCell>{row.sku}</TableCell>
                      <TableCell>{row.warehouse}</TableCell>
                      <TableCell className="text-right">{row.quantity}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {safePage + 1} of {totalPages} ({rows.length} {rows.length === 1 ? 'row' : 'rows'})
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
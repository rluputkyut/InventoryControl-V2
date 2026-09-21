import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { inventoryApi, masterDataApi, productsApi } from '../api/endpoints';
import type { InventoryTransaction } from '../api/types';
import dayjs from 'dayjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { HelpCircle, TrendingUp } from 'lucide-react';

const RECENT = 10;

const TYPE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Purchase: 'default',
  Sale: 'destructive',
  TransferOut: 'secondary',
  TransferIn: 'outline',
};

export function DashboardPage() {
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: productsApi.list, staleTime: 60_000 });
  const { data: warehouses = [] } = useQuery({
    queryKey: ['master-data', 'warehouses'],
    queryFn: () => masterDataApi.list('warehouses'),
    staleTime: 60_000,
  });
  const { data: balances = [] } = useQuery({ queryKey: ['balances'], queryFn: () => inventoryApi.balances() });
  const { data: transactions = [] } = useQuery({ queryKey: ['transactions'], queryFn: () => inventoryApi.transactions() });
  const { data: purchases = [] } = useQuery({
    queryKey: ['documents', 'purchases'],
    queryFn: () => inventoryApi.documents('purchases'),
  });

  const [rangeStartStr, setRangeStartStr] = useState('');
  const [rangeEndStr, setRangeEndStr] = useState('');

  const hasRange = rangeStartStr !== '' || rangeEndStr !== '';
  const rangeStart = rangeStartStr ? dayjs(rangeStartStr).startOf('day') : null;
  const rangeEnd = rangeEndStr ? dayjs(rangeEndStr).endOf('day') : null;

  const onHand = balances.reduce((sum, b) => sum + b.quantity, 0);
  const today = dayjs().startOf('day');

  const inRange = (t: InventoryTransaction) => {
    const d = dayjs(t.occurredAtUtc);
    return (!rangeStart || !d.isBefore(rangeStart)) && (!rangeEnd || !d.isAfter(rangeEnd));
  };
  const filtered = transactions.filter(inRange);

  const movementsTitle = hasRange ? 'Movements in range' : "Today's movements";
  const movementCount = hasRange
    ? filtered.length
    : transactions.filter((t) => dayjs(t.occurredAtUtc).isAfter(today)).length;

  const buyPriceByProduct = new Map(products.map((p) => [p.id, p.buyPrice]));
  const saleProfit = (hasRange ? filtered : transactions)
    .filter((t) => t.type === 'Sale')
    .reduce((sum, t) => sum + (t.unitPrice - (buyPriceByProduct.get(t.productId) ?? 0)) * t.quantity, 0);

  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(0);
  };

  const source = hasRange ? filtered : transactions;

  interface TransactionRow {
    key: number;
    occurred: string;
    type: string;
    referenceNo?: string | null;
    product: string;
    warehouse: string;
    quantity: number;
  }

  const allRows: TransactionRow[] = source.map((t: InventoryTransaction) => ({
    key: t.id,
    occurred: dayjs(t.occurredAtUtc).format('YYYY-MM-DD HH:mm'),
    type: t.type,
    referenceNo: t.referenceNo,
    product: t.product?.name ?? `#${t.productId}`,
    warehouse: t.warehouse?.name ?? `#${t.warehouseId}`,
    quantity: t.quantity,
  }));

  const sortedRows = [...allRows].sort((a, b) => {
    if (!sortField) return 0;
    const aVal = a[sortField as keyof TransactionRow] ?? '';
    const bVal = b[sortField as keyof TransactionRow] ?? '';
    const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const pageSize = RECENT;
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const pagedRows = sortedRows.slice(page * pageSize, (page + 1) * pageSize);

  const clearRange = () => {
    setRangeStartStr('');
    setRangeEndStr('');
    setPage(0);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">From</label>
          <input
            type="date"
            value={rangeStartStr}
            onChange={(e) => { setRangeStartStr(e.target.value); setPage(0); }}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">To</label>
          <input
            type="date"
            value={rangeEndStr}
            onChange={(e) => { setRangeEndStr(e.target.value); setPage(0); }}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
          />
        </div>
        {hasRange && (
          <Button variant="ghost" size="sm" onClick={clearRange}>
            Clear filter
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard title="Products" value={products.length} />
        <StatCard title="Warehouses" value={warehouses.length} />
        <StatCard
          title="Units on hand"
          value={onHand}
          tooltip="Total stock units across all warehouses (sum of every inventory balance)."
        />
        <StatCard title={movementsTitle} value={movementCount} />
        <StatCard
          title="Sale profit"
          value={saleProfit}
          tooltip="Estimated profit from sales (full price minus the product's buy price), for sales in the selected range."
          prefix="$"
          decimals={2}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader field="occurred" label="When" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortHeader field="type" label="Type" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortHeader field="referenceNo" label="Reference" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortHeader field="product" label="Product" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortHeader field="warehouse" label="Warehouse" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortHeader field="quantity" label="Qty" sortField={sortField} sortDir={sortDir} onSort={handleSort} className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedRows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell>{row.occurred}</TableCell>
                  <TableCell>
                    <Badge variant={TYPE_VARIANT[row.type] ?? 'secondary'}>{row.type}</Badge>
                  </TableCell>
                  <TableCell>{row.referenceNo ?? '-'}</TableCell>
                  <TableCell>{row.product}</TableCell>
                  <TableCell>{row.warehouse}</TableCell>
                  <TableCell className="text-right">{row.quantity}</TableCell>
                </TableRow>
              ))}
              {pagedRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">No transactions</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Page {page + 1} of {totalPages} ({sortedRows.length} rows)
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  Prev
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}

          <p className="mt-3 text-sm text-muted-foreground">{purchases.length} purchase document(s) posted.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  tooltip,
  prefix,
  decimals = 0,
}: {
  title: string;
  value: number;
  tooltip?: string;
  prefix?: string;
  decimals?: number;
}) {
  const formatted = prefix
    ? `${prefix}${value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
    : value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1 pt-4">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>{title}</span>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="size-3.5 cursor-help text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="top">{tooltip}</TooltipContent>
            </Tooltip>
          )}
        </div>
        <span className="text-2xl font-bold tabular-nums">{formatted}</span>
      </CardContent>
    </Card>
  );
}

function SortHeader({
  field,
  label,
  sortField,
  sortDir,
  onSort,
  className,
}: {
  field: string;
  label: string;
  sortField: string | null;
  sortDir: 'asc' | 'desc';
  onSort: (field: string) => void;
  className?: string;
}) {
  const active = sortField === field;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 cursor-pointer select-none hover:text-foreground"
      >
        {label}
        {active && (
          <span className="text-xs">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>
        )}
      </button>
    </TableHead>
  );
}

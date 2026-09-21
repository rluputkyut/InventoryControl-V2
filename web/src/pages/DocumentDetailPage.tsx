import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { inventoryApi, masterDataApi } from '../api/endpoints';
import type { StockDocumentDto, Warehouse } from '../api/types';
import dayjs from 'dayjs';
import type { DocumentKind } from './DocumentsPage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { ArrowLeft } from 'lucide-react';

export function DocumentDetailPage({ kind }: { kind: DocumentKind }) {
  const { id } = useParams();
  const documentId = Number(id);

  const {
    data: document,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['documents', kind, documentId],
    queryFn: () => inventoryApi.document(kind, documentId),
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['master-data', 'warehouses'],
    queryFn: () => masterDataApi.list<Warehouse>('warehouses'),
  });

  if (error) {
    return (
      <div className="mt-6">
        <Alert variant="destructive">{(error as Error).message}</Alert>
      </div>
    );
  }

  if (!document && !isLoading) {
    return (
      <div className="mt-6">
        <Alert>Document not found.</Alert>
      </div>
    );
  }

  const warehouseName = (idVal?: number | null) =>
    idVal
      ? warehouses.find((w) => w.id === idVal)?.name ?? `#${idVal}`
      : '-';

  const d: StockDocumentDto | undefined = document;

  const rows = (d?.lines ?? []).map((line) => ({
    key: line.id,
    line: line.lineNumber,
    product: line.productName ?? `#${line.productId}`,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    lineTotal: line.lineTotal,
  }));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-2xl font-bold">
          {kind === 'purchases'
            ? 'Purchase'
            : kind === 'sales'
              ? 'Sale'
              : 'Transfer'}{' '}
          #{documentId}
        </h3>
        <Button variant="outline" asChild>
          <Link to={`/${kind}`}>
            <ArrowLeft className="mr-1 size-4" />
            Back to list
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Document</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                ))}
              </div>
            )}
            {d && (
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted-foreground">Type</dt>
                  <dd className="text-sm font-medium">
                    <Badge variant={badgeVariantForType(d.type)}>{d.type}</Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Reference</dt>
                  <dd className="text-sm font-medium">{d.referenceNo ?? '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Notes</dt>
                  <dd className="text-sm font-medium">{d.notes ?? '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Posted at</dt>
                  <dd className="text-sm font-medium">
                    {dayjs(d.occurredAtUtc).format('YYYY-MM-DD HH:mm:ss')}
                  </dd>
                </div>
                {d.type === 'Transfer' ? (
                  <>
                    <div>
                      <dt className="text-sm text-muted-foreground">From</dt>
                      <dd className="text-sm font-medium">
                        {warehouseName(d.fromWarehouseId)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">To</dt>
                      <dd className="text-sm font-medium">
                        {warehouseName(d.toWarehouseId)}
                      </dd>
                    </div>
                  </>
                ) : (
                  <div>
                    <dt className="text-sm text-muted-foreground">Warehouse</dt>
                    <dd className="text-sm font-medium">
                      {warehouseName(d.warehouseId)}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm text-muted-foreground">
                    Posted by user
                  </dt>
                  <dd className="text-sm font-medium">
                    {d.postedByUserId ?? '-'}
                  </dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Totals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Total amount</p>
              <p className="text-2xl font-bold">
                ${(d?.totalAmount ?? 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lines</p>
              <p className="text-2xl font-bold">{d?.lines?.length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Lines</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">#</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                  <TableHead className="text-right">Line total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell>{row.line}</TableCell>
                    <TableCell>{row.product}</TableCell>
                    <TableCell className="text-right">{row.quantity}</TableCell>
                    <TableCell className="text-right">
                      {row.unitPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.lineTotal.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {d?.balances && d.balances.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Resulting balances</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product id</TableHead>
                  <TableHead>Warehouse id</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.balances.map((r) => (
                  <TableRow key={`${r.productId}-${r.warehouseId}`}>
                    <TableCell>{r.productId}</TableCell>
                    <TableCell>{r.warehouseId}</TableCell>
                    <TableCell className="text-right">{r.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function badgeVariantForType(
  type: string,
): 'secondary' | 'destructive' | 'default' {
  switch (type) {
    case 'Purchase':
      return 'secondary';
    case 'Sale':
      return 'destructive';
    default:
      return 'default';
  }
}

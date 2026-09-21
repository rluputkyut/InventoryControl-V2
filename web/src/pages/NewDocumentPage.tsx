import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { inventoryApi, masterDataApi, productsApi } from '../api/endpoints';
import type { Product, Warehouse } from '../api/types';
import type { DocumentKind } from './DocumentsPage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import * as React from 'react';

interface LineValues {
  productId: number | null;
  quantity: number;
  unitPrice: number;
}

export function NewDocumentPage({ kind }: { kind: DocumentKind }) {
  const navigate = useNavigate();

  const { data: warehouses = [] } = useQuery({
    queryKey: ['master-data', 'warehouses'],
    queryFn: () => masterDataApi.list<Warehouse>('warehouses'),
  });
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: productsApi.list,
  });

  const isTransfer = kind === 'transfers';
  const title = isTransfer
    ? 'New transfer'
    : kind === 'purchases'
      ? 'New purchase'
      : 'New sale';

  const [referenceNo, setReferenceNo] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [warehouseId, setWarehouseId] = React.useState<string>('');
  const [fromWarehouseId, setFromWarehouseId] = React.useState<string>('');
  const [toWarehouseId, setToWarehouseId] = React.useState<string>('');
  const [lines, setLines] = React.useState<LineValues[]>([
    { productId: null, quantity: 1, unitPrice: 0 },
  ]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const productOptions = products.map((p: Product) => ({
    value: String(p.id),
    label: `${p.sku} - ${p.name}`,
  }));

  const warehouseOptions = warehouses.map((w: Warehouse) => ({
    value: String(w.id),
    label: w.name,
  }));

  const filteredFromOptions = warehouses
    .filter((w: Warehouse) => String(w.id) !== toWarehouseId)
    .map((w: Warehouse) => ({ value: String(w.id), label: w.name }));

  const filteredToOptions = warehouses
    .filter((w: Warehouse) => String(w.id) !== fromWarehouseId)
    .map((w: Warehouse) => ({ value: String(w.id), label: w.name }));

  const lineTotal = (line: LineValues) =>
    (line.quantity || 0) * (line.unitPrice || 0);

  const grandTotal = lines.reduce((sum, l) => sum + lineTotal(l), 0);

  const updateLine = (
    index: number,
    field: keyof LineValues,
    value: string | number,
  ) => {
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== index) return l;
        if (field === 'productId') {
          return { ...l, productId: value === '' ? null : Number(value) };
        }
        if (field === 'quantity') {
          return { ...l, quantity: value === '' ? 0 : Number(value) };
        }
        if (field === 'unitPrice') {
          return { ...l, unitPrice: value === '' ? 0 : Number(value) };
        }
        return l;
      }),
    );
  };

  const addLine = () =>
    setLines((prev) => [...prev, { productId: null, quantity: 1, unitPrice: 0 }]);

  const removeLine = (index: number) =>
    setLines((prev) => prev.filter((_, i) => i !== index));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (isTransfer) {
      if (!fromWarehouseId) e.fromWarehouseId = 'From is required';
      if (!toWarehouseId) e.toWarehouseId = 'To is required';
    } else {
      if (!warehouseId) e.warehouseId = 'Warehouse is required';
    }
    if (lines.length === 0) {
      e.lines = 'At least one line is required.';
    }
    lines.forEach((l, i) => {
      if (l.productId == null) e[`line_${i}_productId`] = 'Product is required';
      if (!l.quantity || l.quantity <= 0) e[`line_${i}_quantity`] = 'Qty required';
      if (!isTransfer && (l.unitPrice == null || l.unitPrice < 0))
        e[`line_${i}_unitPrice`] = 'Price required';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = lines.map((l) => ({
        productId: Number(l.productId),
        quantity: Number(l.quantity),
        unitPrice: l.unitPrice == null ? 0 : Number(l.unitPrice),
      }));
      if (isTransfer) {
        return inventoryApi.postTransfer({
          fromWarehouseId: Number(fromWarehouseId),
          toWarehouseId: Number(toWarehouseId),
          referenceNo: referenceNo || null,
          notes: notes || null,
          lines: payload,
        });
      }
      return kind === 'purchases'
        ? inventoryApi.postPurchase({
            warehouseId: Number(warehouseId),
            referenceNo: referenceNo || null,
            notes: notes || null,
            lines: payload,
          })
        : inventoryApi.postSale({
            warehouseId: Number(warehouseId),
            referenceNo: referenceNo || null,
            notes: notes || null,
            lines: payload,
          });
    },
    onSuccess: (doc) => {
      toast.success(
        kind === 'purchases'
          ? 'Purchase posted.'
          : kind === 'sales'
            ? 'Sale posted.'
            : 'Transfer completed.',
      );
      navigate(`/${kind}/${doc.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!validate()) return;
    mutation.mutate();
  };

  const resetForm = () => {
    setReferenceNo('');
    setNotes('');
    setWarehouseId('');
    setFromWarehouseId('');
    setToWarehouseId('');
    setLines([{ productId: null, quantity: 1, unitPrice: 0 }]);
    setErrors({});
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Reference no.</Label>
              <Input
                placeholder="e.g. PO-100"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
              />
            </div>

            {isTransfer ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label>From</Label>
                  <Select value={fromWarehouseId} onValueChange={setFromWarehouseId}>
                    <SelectTrigger
                      className="w-full"
                      aria-invalid={!!errors.fromWarehouseId}
                    >
                      <SelectValue placeholder="Source warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredFromOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.fromWarehouseId && (
                    <p className="text-sm text-destructive">{errors.fromWarehouseId}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>To</Label>
                  <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
                    <SelectTrigger
                      className="w-full"
                      aria-invalid={!!errors.toWarehouseId}
                    >
                      <SelectValue placeholder="Destination warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredToOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.toWarehouseId && (
                    <p className="text-sm text-destructive">{errors.toWarehouseId}</p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label>Warehouse</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger
                    className="w-full"
                    aria-invalid={!!errors.warehouseId}
                  >
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouseOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.warehouseId && (
                  <p className="text-sm text-destructive">{errors.warehouseId}</p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label>Notes</Label>
              <Input
                placeholder="Optional notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-2">
            <h3 className="text-base font-medium">Lines</h3>
          </div>
          {errors.lines && (
            <Alert variant="destructive">
              <AlertDescription>{errors.lines}</AlertDescription>
            </Alert>
          )}

          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="w-40">Quantity</TableHead>
                  {!isTransfer && (
                    <TableHead className="w-44">Unit price</TableHead>
                  )}
                  {!isTransfer && (
                    <TableHead className="w-36 text-right">Line total</TableHead>
                  )}
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Select
                        value={line.productId != null ? String(line.productId) : ''}
                        onValueChange={(v) => updateLine(idx, 'productId', v)}
                      >
                        <SelectTrigger
                          className="w-full min-w-[240px]"
                          aria-invalid={!!errors[`line_${idx}_productId`]}
                        >
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {productOptions.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors[`line_${idx}_productId`] && (
                        <p className="text-sm text-destructive">
                          {errors[`line_${idx}_productId`]}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0.001}
                        step={0.001}
                        value={line.quantity}
                        onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                        aria-invalid={!!errors[`line_${idx}_quantity`]}
                      />
                      {errors[`line_${idx}_quantity`] && (
                        <p className="text-sm text-destructive">
                          {errors[`line_${idx}_quantity`]}
                        </p>
                      )}
                    </TableCell>
                    {!isTransfer && (
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={line.unitPrice}
                          onChange={(e) => updateLine(idx, 'unitPrice', e.target.value)}
                          aria-invalid={!!errors[`line_${idx}_unitPrice`]}
                        />
                        {errors[`line_${idx}_unitPrice`] && (
                          <p className="text-sm text-destructive">
                            {errors[`line_${idx}_unitPrice`]}
                          </p>
                        )}
                      </TableCell>
                    )}
                    {!isTransfer && (
                      <TableCell className="text-right tabular-nums">
                        {lineTotal(line).toFixed(2)}
                      </TableCell>
                    )}
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={lines.length <= 1}
                        onClick={() => removeLine(idx)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Button variant="outline" className="w-fit" onClick={addLine}>
            <Plus className="size-4" />
            Add line
          </Button>

          {!isTransfer && (
            <div className="flex items-center justify-end gap-2 text-sm font-medium">
              <span className="text-muted-foreground">Total:</span>
              <span className="tabular-nums">{grandTotal.toFixed(2)}</span>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={resetForm}>
            Reset
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending
              ? 'Posting…'
              : `Post ${isTransfer ? 'transfer' : kind === 'purchases' ? 'purchase' : 'sale'}`}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

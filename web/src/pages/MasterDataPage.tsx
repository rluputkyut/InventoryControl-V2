import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { masterDataApi, shopsApi } from '../api/endpoints';
import type { NamedEntity, Shop } from '../api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';

interface FieldSpec {
  name: string;
  label: string;
}

interface MasterDataKind {
  key: string;
  label: string;
  endpoint: string;
  fields: FieldSpec[];
  shopScoped?: boolean;
}

const KINDS: MasterDataKind[] = [
  { key: 'units', label: 'Units of measurement', endpoint: 'units', fields: [{ name: 'symbol', label: 'Symbol' }] },
  { key: 'countries', label: 'Countries', endpoint: 'countries', fields: [{ name: 'code', label: 'Code' }, { name: 'phoneCode', label: 'Phone code' }, { name: 'currencyCode', label: 'Currency code' }] },
  {
    key: 'types',
    label: 'Product types',
    endpoint: 'product-types',
    shopScoped: true,
    fields: [{ name: 'description', label: 'Description' }],
  },
  {
    key: 'groups',
    label: 'Product groups',
    endpoint: 'product-groups',
    shopScoped: true,
    fields: [{ name: 'description', label: 'Description' }],
  },
  {
    key: 'warehouses',
    label: 'Warehouses',
    endpoint: 'warehouses',
    shopScoped: true,
    fields: [
      { name: 'code', label: 'Code' },
      { name: 'address', label: 'Address' },
    ],
  },
];

const PAGE_SIZE = 10;

export function MasterDataPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Master data</h1>
      <Tabs defaultValue={KINDS[0].key}>
        <TabsList>
          {KINDS.map((kind) => (
            <TabsTrigger key={kind.key} value={kind.key}>
              {kind.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {KINDS.map((kind) => (
          <TabsContent key={kind.key} value={kind.key}>
            <MasterDataCrud kind={kind} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function MasterDataCrud({ kind }: { kind: MasterDataKind }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<NamedEntity | null>(null);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({ name: '', isActive: true });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<NamedEntity | null>(null);
  const [page, setPage] = useState(1);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['master-data', kind.endpoint],
    queryFn: () => masterDataApi.list<NamedEntity>(kind.endpoint),
  });
  const { data: shops = [] } = useQuery({
    queryKey: ['shops'],
    queryFn: shopsApi.list,
    enabled: kind.shopScoped,
  });

  const queryKey = ['master-data', kind.endpoint];

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey });
  };

  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      if (editing) {
        const payload = { ...values, id: editing.id };
        await masterDataApi.update(kind.endpoint, editing.id, payload);
      } else {
        await masterDataApi.create(kind.endpoint, values);
      }
    },
    onSuccess: async () => {
      await invalidate();
      setDialogOpen(false);
      toast.success(editing ? 'Updated.' : 'Created.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => masterDataApi.remove(kind.endpoint, id),
    onSuccess: async () => {
      await invalidate();
      setDeleteTarget(null);
      toast.success('Deleted.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditing(null);
    setFormValues({ name: '', isActive: true });
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEdit = (item: NamedEntity) => {
    setEditing(item);
    setFormValues({ ...item });
    setFormErrors({});
    setDialogOpen(true);
  };

  const updateField = (name: string, value: unknown) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (kind.shopScoped && (formValues.shopId == null || formValues.shopId === '')) {
      errors.shopId = 'Shop is required';
    }
    if (!formValues.name || String(formValues.name).trim() === '') {
      errors.name = 'Name is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    saveMutation.mutate(formValues);
  };

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedItems = items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={openCreate} className="w-fit">
        <Plus className="size-4" />
        New {kind.label}
      </Button>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No items found.</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[70px]">Id</TableHead>
                <TableHead>Name</TableHead>
                {kind.fields.map((f) => (
                  <TableHead key={f.name}>{f.label}</TableHead>
                ))}
                <TableHead>Active</TableHead>
                <TableHead className="w-[160px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  {kind.fields.map((f) => (
                    <TableCell key={f.name}>
                      {String((item as unknown as Record<string, unknown>)[f.name] ?? '-')}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Badge variant={item.isActive ? 'default' : 'destructive'}>
                      {item.isActive ? 'Yes' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                        <Pencil className="size-3" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteTarget(item)}
                        disabled={deleteMutation.isPending && deleteMutation.variables === item.id}
                      >
                        <Trash2 className="size-3" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Page {safePage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                >
                  Prev
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${kind.label}` : `New ${kind.label}`}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update the details below.' : 'Fill in the details below.'}
            </DialogDescription>
          </DialogHeader>

          {Object.keys(formErrors).length > 0 && (
            <Alert variant="destructive">
              <AlertDescription>{Object.values(formErrors).join('. ')}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-4">
            {kind.shopScoped && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="shopId">Shop *</Label>
                <Select
                  value={formValues.shopId != null ? String(formValues.shopId) : undefined}
                  onValueChange={(v) => updateField('shopId', Number(v))}
                >
                  <SelectTrigger className={formErrors.shopId ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select a shop" />
                  </SelectTrigger>
                  <SelectContent>
                    {shops.map((s: Shop) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.shopId && (
                  <p className="text-sm text-destructive">{formErrors.shopId}</p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={String(formValues.name ?? '')}
                onChange={(e) => updateField('name', e.target.value)}
                className={formErrors.name ? 'border-destructive' : ''}
              />
              {formErrors.name && (
                <p className="text-sm text-destructive">{formErrors.name}</p>
              )}
            </div>

            {kind.fields.map((f) => (
              <div key={f.name} className="flex flex-col gap-1.5">
                <Label htmlFor={f.name}>{f.label}</Label>
                <Input
                  id={f.name}
                  value={String((formValues[f.name] as string) ?? '')}
                  onChange={(e) => updateField(f.name, e.target.value)}
                />
              </div>
            ))}

            <div className="flex items-center gap-2">
              <Checkbox
                id="isActive"
                checked={!!formValues.isActive}
                onCheckedChange={(checked) => updateField('isActive', checked === true)}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); }}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

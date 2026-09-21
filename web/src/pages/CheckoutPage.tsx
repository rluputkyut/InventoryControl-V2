import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { deliveryApi, shopsApi } from '../api/endpoints';
import { apiObjectUrl } from '../api/http';
import type { DeliveryMethod, PaymentMethod, Shop } from '../api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

const DELIVERIES_KEY = ['delivery-methods'] as const;

function RemoteImage({ path, className }: { path?: string | null; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setUrl(null);
    if (!path) return;
    apiObjectUrl(path)
      .then((u) => {
        if (active && u) {
          objectUrl = u;
          setUrl(u);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  if (!path) return <span className="text-sm text-muted-foreground">-</span>;
  if (!url) return <div className={`bg-muted animate-pulse rounded ${className ?? ''}`} />;
  return <img src={url} alt="" className={`rounded border object-contain ${className ?? ''}`} />;
}

function LogoPicker({ disabled, onPick }: { disabled?: boolean; onPick: (file: File) => void }) {
  return (
    <label className="text-primary cursor-pointer text-sm font-medium underline-offset-2 hover:underline">
      Upload
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = '';
        }}
      />
    </label>
  );
}

export function CheckoutPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Checkout setup</h1>
      <Tabs defaultValue="catalogue">
        <TabsList>
          <TabsTrigger value="catalogue">Delivery &amp; payment methods</TabsTrigger>
          <TabsTrigger value="shops">Shop delivery methods</TabsTrigger>
        </TabsList>
        <TabsContent value="catalogue">
          <CatalogueTab />
        </TabsContent>
        <TabsContent value="shops">
          <ShopLinksTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CatalogueTab() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DeliveryMethod | null>(null);
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<DeliveryMethod | null>(null);
  const [paymentsFor, setPaymentsFor] = useState<DeliveryMethod | null>(null);

  const { data: deliveries = [], isLoading } = useQuery({ queryKey: DELIVERIES_KEY, queryFn: deliveryApi.list });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: DELIVERIES_KEY });

  const save = useMutation({
    mutationFn: async () => {
      if (editing) await deliveryApi.update(editing.id, { name: name.trim(), isActive });
      else await deliveryApi.create({ name: name.trim(), isActive });
    },
    onSuccess: async () => {
      await invalidate();
      setDialogOpen(false);
      toast.success(editing ? 'Updated.' : 'Created.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deliveryApi.remove(id),
    onSuccess: async () => {
      await invalidate();
      setDeleteTarget(null);
      toast.success('Deleted.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadLogo = useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => deliveryApi.uploadLogo(id, file),
    onSuccess: async () => {
      await invalidate();
      toast.success('Logo updated.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditing(null);
    setName('');
    setIsActive(true);
    setDialogOpen(true);
  };

  const openEdit = (item: DeliveryMethod) => {
    setEditing(item);
    setName(item.name);
    setIsActive(item.isActive);
    setDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={openCreate} className="w-fit">
        <Plus className="size-4" />
        New delivery method
      </Button>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : deliveries.length === 0 ? (
        <p className="text-muted-foreground text-sm">No delivery methods yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[70px]">Id</TableHead>
              <TableHead className="w-[90px]">Logo</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-[320px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveries.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.id}</TableCell>
                <TableCell>
                  <RemoteImage path={item.logoUrl} className="size-9" />
                </TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>
                  <Badge variant={item.isActive ? 'default' : 'destructive'}>{item.isActive ? 'Yes' : 'No'}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                      <Pencil className="size-3" />
                      Edit
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setPaymentsFor(item)}>
                      Payments
                    </Button>
                    <LogoPicker
                      disabled={uploadLogo.isPending}
                      onPick={(file) => uploadLogo.mutate({ id: item.id, file })}
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleteTarget(item)}
                      disabled={remove.isPending && remove.variables === item.id}
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
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit delivery method' : 'New delivery method'}</DialogTitle>
            <DialogDescription>Delivery methods are global; shops opt in under the second tab.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="delivery-name">Name *</Label>
              <Input id="delivery-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="delivery-active" checked={isActive} onCheckedChange={(c) => setIsActive(c === true)} />
              <Label htmlFor="delivery-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={() => save.mutate()} disabled={save.isPending || name.trim() === ''}>
              {save.isPending ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
            <DialogDescription>This also removes its payment methods and shop links.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => { if (deleteTarget) remove.mutate(deleteTarget.id); }}
              disabled={remove.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!paymentsFor} onOpenChange={(open) => { if (!open) setPaymentsFor(null); }}>
        <DialogContent className="sm:max-w-2xl">
          {paymentsFor && <PaymentsManager delivery={paymentsFor} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PaymentsManager({ delivery }: { delivery: DeliveryMethod }) {
  const queryClient = useQueryClient();
  const key = ['delivery-payments', delivery.id] as const;
  const { data: payments = [], isLoading } = useQuery({ queryKey: key, queryFn: () => deliveryApi.payments(delivery.id) });

  const [name, setName] = useState('');
  const [editing, setEditing] = useState<PaymentMethod | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        await deliveryApi.updatePayment(editing.id, { name: name.trim(), isActive: editing.isActive, deliveryMethodId: delivery.id });
      } else {
        await deliveryApi.addPayment(delivery.id, { name: name.trim(), isActive: true });
      }
    },
    onSuccess: async () => {
      await invalidate();
      setName('');
      setEditing(null);
      toast.success(editing ? 'Payment updated.' : 'Payment added.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: (p: PaymentMethod) =>
      deliveryApi.updatePayment(p.id, { name: p.name, isActive: !p.isActive, deliveryMethodId: delivery.id }),
    onSuccess: async () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deliveryApi.removePayment(id),
    onSuccess: async () => {
      await invalidate();
      toast.success('Payment removed.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadLogo = useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => deliveryApi.uploadPaymentLogo(id, file),
    onSuccess: async () => {
      await invalidate();
      toast.success('Logo updated.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Payment methods · {delivery.name}</DialogTitle>
        <DialogDescription>Payment options accepted for this delivery method.</DialogDescription>
      </DialogHeader>

      <div className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="payment-name">{editing ? 'Rename payment' : 'New payment method'}</Label>
          <Input
            id="payment-name"
            value={name}
            placeholder="e.g. Cash on Delivery"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending || name.trim() === ''}>
          {save.isPending ? 'Saving...' : editing ? 'Save' : 'Add'}
        </Button>
        {editing && (
          <Button variant="outline" onClick={() => { setEditing(null); setName(''); }}>
            Cancel
          </Button>
        )}
      </div>

      <Separator />

      {isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : payments.length === 0 ? (
        <p className="text-muted-foreground text-sm">No payment methods yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-md border p-2">
              <RemoteImage path={p.logoUrl} className="size-9" />
              <span className="flex-1 text-sm font-medium">{p.name}</span>
              <Badge variant={p.isActive ? 'default' : 'destructive'}>{p.isActive ? 'Active' : 'Inactive'}</Badge>
              <Button size="sm" variant="outline" onClick={() => { setEditing(p); setName(p.name); }}>
                <Pencil className="size-3" />
              </Button>
              <Button size="sm" variant="secondary" onClick={() => toggle.mutate(p)}>
                {p.isActive ? 'Disable' : 'Enable'}
              </Button>
              <LogoPicker disabled={uploadLogo.isPending} onPick={(file) => uploadLogo.mutate({ id: p.id, file })} />
              <Button size="sm" variant="destructive" onClick={() => remove.mutate(p.id)} disabled={remove.isPending}>
                <Trash2 className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function ShopLinksTab() {
  const queryClient = useQueryClient();
  const [shopId, setShopId] = useState<string>('');
  const [selected, setSelected] = useState<number[]>([]);

  const { data: shops = [] } = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list });
  const { data: deliveries = [] } = useQuery({ queryKey: DELIVERIES_KEY, queryFn: deliveryApi.list });
  const { data: linked = [], isLoading } = useQuery({
    queryKey: ['shop-delivery-methods', shopId],
    queryFn: () => shopsApi.deliveryMethods(Number(shopId)),
    enabled: shopId !== '',
  });

  useEffect(() => {
    setSelected(linked.map((d) => d.id));
  }, [linked]);

  const save = useMutation({
    mutationFn: () => shopsApi.setDeliveryMethods(Number(shopId), selected),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shop-delivery-methods', shopId] });
      toast.success('Shop delivery methods saved.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (id: number) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>Shop</Label>
        <Select value={shopId || undefined} onValueChange={setShopId}>
          <SelectTrigger>
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
      </div>

      {shopId === '' ? (
        <p className="text-muted-foreground text-sm">Select a shop to manage its delivery methods.</p>
      ) : isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {deliveries.map((d) => (
              <label key={d.id} className="flex items-center gap-3 rounded-md border p-2 text-sm">
                <Checkbox checked={selected.includes(d.id)} onCheckedChange={() => toggle(d.id)} />
                <RemoteImage path={d.logoUrl} className="size-8" />
                <span className="flex-1 font-medium">{d.name}</span>
                {!d.isActive && <Badge variant="destructive">Inactive</Badge>}
              </label>
            ))}
          </div>
          <Button className="w-fit" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Saving...' : 'Save'}
          </Button>
        </>
      )}
    </div>
  );
}
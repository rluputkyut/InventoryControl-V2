import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, ImagePlus, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { apiObjectUrl } from '../api/http';
import { masterDataApi, shopsApi } from '../api/endpoints';
import type { Country, PublicShop, Shop, ShopDto } from '../api/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

const LOGO_KEY = ['shops'] as const;
const PAGE_SIZE = 10;

function ShopLogo({ shop }: { shop: Shop | PublicShop }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setUrl(null);
    const path = shop.logoUrl;
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
  }, [shop.logoUrl]);

  return (
    <Avatar size="lg">
      {url ? <AvatarImage src={url} alt={shop.name} /> : null}
      <AvatarFallback>{shop.name.charAt(0).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

const toShopDto: (s: Shop) => ShopDto = (s) => ({
  name: s.name,
  code: s.code,
  notes: s.notes ?? null,
  isActive: s.isActive,
  countryId: s.countryId ?? null,
});

export function ShopsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Shop | null>(null);
  const [deletingShop, setDeletingShop] = useState<Shop | null>(null);
  const [page, setPage] = useState(0);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [notes, setNotes] = useState('');
  const [countryId, setCountryId] = useState<string | undefined>(undefined);
  const [isActive, setIsActive] = useState(true);
  const [formErrors, setFormErrors] = useState<{ name?: string; code?: string }>({});

  const list = useQuery({ queryKey: LOGO_KEY, queryFn: () => shopsApi.list() });
  const { data: countries = [] } = useQuery({
    queryKey: ['master-data', 'countries'],
    queryFn: () => masterDataApi.list<Country>('countries'),
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: LOGO_KEY });

  const create = useMutation({
    mutationFn: (b: ShopDto) => shopsApi.create(b),
    onSuccess: () => { invalidate(); toast.success('Shop created'); },
    onError: (e: Error) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: (args: { id: number; body: ShopDto }) => shopsApi.update(args.id, args.body),
    onSuccess: () => { invalidate(); toast.success('Shop updated'); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: number) => shopsApi.remove(id),
    onSuccess: () => { invalidate(); toast.success('Shop deleted'); setDeletingShop(null); },
    onError: (e: Error) => toast.error(e.message),
  });
  const uploadLogo = useMutation({
    mutationFn: (args: { id: number; file: File }) => shopsApi.uploadLogo(args.id, args.file),
    onSuccess: () => { invalidate(); toast.success('Logo uploaded'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditing(null);
    setName('');
    setCode('');
    setNotes('');
    setCountryId(undefined);
    setIsActive(true);
    setFormErrors({});
    setOpen(true);
  };

  const openEdit = (shop: Shop) => {
    setEditing(shop);
    setName(shop.name);
    setCode(shop.code);
    setNotes(shop.notes ?? '');
    setCountryId(shop.countryId != null ? String(shop.countryId) : undefined);
    setIsActive(shop.isActive);
    setFormErrors({});
    setOpen(true);
  };

  const submit = () => {
    const errors: { name?: string; code?: string } = {};
    if (!name.trim()) errors.name = 'Name is required';
    if (!code.trim()) errors.code = 'Code is required';
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const body: ShopDto = {
      name: name.trim(),
      code: code.trim(),
      notes: notes.trim() || null,
      isActive,
      countryId: countryId ? Number(countryId) : null,
    };

    if (editing) update.mutate({ id: editing.id, body });
    else create.mutate(body);
    setOpen(false);
  };

  const handleFileSelect = (shopId: number, file: File | null) => {
    if (!file) return;
    uploadLogo.mutate({ id: shopId, file });
  };

  const total = list.data?.length ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const pagedData = list.data?.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) ?? [];

  useEffect(() => {
    if (totalPages > 0 && page >= totalPages) setPage(totalPages - 1);
  }, [totalPages, page]);

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Shops</h1>

      <div className="flex items-center gap-3">
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          New shop
        </Button>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Upload className="size-3" />
          The shop logo and name are shown to mobile users (login screen and catalog header).
        </span>
      </div>

      {list.isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Loading shops…</div>
      ) : (
        <>
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Logo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No shops found.
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedData.map((shop) => (
                    <TableRow key={shop.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ShopLogo shop={shop} />
                          <label className="inline-flex cursor-pointer items-center">
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              className="hidden"
                              onChange={(e) => handleFileSelect(shop.id, e.target.files?.[0] ?? null)}
                            />
                            <Button size="sm" variant="outline" asChild>
                              <span className="inline-flex items-center gap-1">
                                <ImagePlus className="size-3.5" />
                                {uploadLogo.isPending && uploadLogo.variables?.id === shop.id ? 'Uploading…' : 'Logo'}
                              </span>
                            </Button>
                          </label>
                        </div>
                      </TableCell>
                      <TableCell>{shop.name}</TableCell>
                      <TableCell>{shop.code}</TableCell>
                      <TableCell>{countries.find((c) => c.id === shop.countryId)?.name ?? '–'}</TableCell>
                      <TableCell className="text-muted-foreground">{shop.notes ?? '–'}</TableCell>
                      <TableCell>
                        <Checkbox
                          checked={shop.isActive}
                          disabled={update.isPending && update.variables?.id === shop.id}
                          onCheckedChange={(checked) => {
                            if (typeof checked === 'boolean') {
                              update.mutate({ id: shop.id, body: { ...toShopDto(shop), isActive: checked } });
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(shop)}>
                            <Pencil className="size-3.5" />
                            Edit
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setDeletingShop(shop)}>
                            <Trash2 className="size-3.5" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="size-4" />
                  Prev
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit shop' : 'New shop'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update the shop details below.' : 'Fill in the details to create a new shop.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {formErrors.name && (
              <Alert variant="destructive">
                <AlertDescription>{formErrors.name}</AlertDescription>
              </Alert>
            )}
            {formErrors.code && (
              <Alert variant="destructive">
                <AlertDescription>{formErrors.code}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="shop-name">Name</Label>
              <Input id="shop-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Shop name" />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="shop-code">Code</Label>
              <Input id="shop-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Shop code" />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="shop-country">Country</Label>
              <Select
                value={countryId}
                onValueChange={(v) => setCountryId(v)}
              >
                <SelectTrigger id="shop-country">
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c: Country) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name} ({c.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used to bias address autocomplete for this shop's users.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="shop-notes">Notes</Label>
              <Textarea
                id="shop-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="shop-active" checked={isActive} onCheckedChange={(v) => setIsActive(v === true)} />
              <Label htmlFor="shop-active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={submit} disabled={create.isPending || update.isPending}>
              {create.isPending || update.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingShop} onOpenChange={(v) => { if (!v) setDeletingShop(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete shop?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingShop?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" disabled={remove.isPending} onClick={() => { if (deletingShop) remove.mutate(deletingShop.id); }}>
              {remove.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

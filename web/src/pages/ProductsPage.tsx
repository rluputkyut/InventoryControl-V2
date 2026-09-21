import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import { apiObjectUrl } from '../api/http';
import { masterDataApi, productsApi, shopsApi } from '../api/endpoints';
import type {
  Product,
  ProductGroup,
  ProductImage,
  ProductInput,
  ProductType,
  Shop,
  UnitOfMeasurement,
} from '../api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
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

const PRODUCT_KEY = ['products'] as const;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const PAGE_SIZE = 10;

interface ProductFormValues {
  name: string;
  sku: string;
  shopId: string;
  unitOfMeasurementId: string;
  productTypeId: string;
  productGroupId: string;
  reorderLevel: string;
  buyPrice: string;
  sellPrice: string;
  discountPercent: string;
  isActive: boolean;
}

const emptyForm: ProductFormValues = {
  name: '',
  sku: '',
  shopId: '',
  unitOfMeasurementId: '',
  productTypeId: '',
  productGroupId: '',
  reorderLevel: '0',
  buyPrice: '0',
  sellPrice: '0',
  discountPercent: '',
  isActive: true,
};

function fmt(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

/** Renders an authenticated product image as a small preview. */
function ProductImage({ path, name, size = 56 }: { path: string; name: string; size?: number }) {
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

  return (
    <span className="inline-block align-middle">
      {url ? (
        <img
          src={url}
          alt={name}
          style={{ width: size, height: size }}
          className="rounded-md object-cover"
        />
      ) : (
        <span className="text-xs text-muted-foreground">none</span>
      )}
    </span>
  );
}

export function ProductsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormValues>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [images, setImages] = useState<ProductImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [imageToDelete, setImageToDelete] = useState<ProductImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: products = [], isLoading } = useQuery({ queryKey: PRODUCT_KEY, queryFn: productsApi.list });
  const filtered = products.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });
  const { data: units = [] } = useQuery({ queryKey: ['master-data', 'units'], queryFn: () => masterDataApi.list<UnitOfMeasurement>('units') });
  const { data: types = [] } = useQuery({ queryKey: ['master-data', 'product-types'], queryFn: () => masterDataApi.list<ProductType>('product-types') });
  const { data: groups = [] } = useQuery({ queryKey: ['master-data', 'product-groups'], queryFn: () => masterDataApi.list<ProductGroup>('product-groups') });
  const { data: shops = [] } = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: PRODUCT_KEY });

  const saveMutation = useMutation({
    mutationFn: async (values: ProductInput) => {
      if (editing) await productsApi.update(editing.id, { ...values, id: editing.id });
      else await productsApi.create(values);
    },
    onSuccess: async () => {
      await invalidate();
      setDialogOpen(false);
      toast.success(editing ? 'Product updated.' : 'Product created.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => productsApi.remove(id),
    onSuccess: async () => {
      await invalidate();
      toast.success('Product deleted.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const loadImages = async (productId: number | null) => {
    if (!productId) {
      setImages([]);
      return;
    }
    setImagesLoading(true);
    try {
      setImages(await productsApi.listImages(productId));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setImagesLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setImages([]);
    setForm(emptyForm);
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setImages([]);
    setFormErrors({});
    setForm({
      ...emptyForm,
      name: p.name,
      sku: p.sku,
      shopId: String(p.shopId),
      unitOfMeasurementId: String(p.unitOfMeasurementId),
      productTypeId: String(p.productTypeId),
      productGroupId: String(p.productGroupId),
      reorderLevel: String(p.reorderLevel),
      buyPrice: String(p.buyPrice),
      sellPrice: String(p.sellPrice),
      discountPercent: p.discountPercent != null ? String(p.discountPercent) : '',
      isActive: p.isActive,
    });
    setDialogOpen(true);
    void loadImages(p.id);
  };

  const refreshImages = async () => {
    await loadImages(editing?.id ?? null);
    await invalidate();
  };

  const uploadMutation = useMutation({
    mutationFn: (file: File) => productsApi.uploadImage(editing!.id, file),
    onSuccess: async () => {
      toast.success('Image uploaded.');
      await refreshImages();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteImageMutation = useMutation({
    mutationFn: (imageId: number) => productsApi.deleteImage(editing!.id, imageId),
    onSuccess: async () => {
      toast.success('Image removed.');
      await refreshImages();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const makePrimaryMutation = useMutation({
    mutationFn: async (imageId: number) => {
      const ordered = [imageId, ...images.filter((i) => i.id !== imageId).map((i) => i.id)];
      await productsApi.reorderImages(editing!.id, ordered);
    },
    onSuccess: async () => {
      toast.success('Primary image updated.');
      await refreshImages();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setField = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Only JPEG, PNG, WebP, or GIF images are supported.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('Image must be 2 MB or smaller.');
      return;
    }
    uploadMutation.mutate(file);
  };

  const handleSave = () => {
    setFormErrors({});
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.sku.trim()) e.sku = 'SKU is required';
    if (!form.shopId) e.shopId = 'Shop is required';
    if (!form.unitOfMeasurementId) e.unitOfMeasurementId = 'Unit is required';
    if (!form.productTypeId) e.productTypeId = 'Type is required';
    if (!form.productGroupId) e.productGroupId = 'Group is required';

    const reorderLevel = Number(form.reorderLevel || 0);
    const buyPrice = Number(form.buyPrice || 0);
    const sellPrice = Number(form.sellPrice || 0);
    const discountPercent = form.discountPercent.trim() === '' ? null : Number(form.discountPercent);

    if (Number.isNaN(reorderLevel)) e.reorderLevel = 'Reorder level must be a number.';
    if (Number.isNaN(buyPrice)) e.buyPrice = 'Buy price must be a number.';
    if (Number.isNaN(sellPrice)) e.sellPrice = 'Sell price must be a number.';
    if (discountPercent != null && Number.isNaN(discountPercent)) {
      e.discountPercent = 'Promotion must be a number.';
    }
    if (buyPrice > 0 && sellPrice !== 0 && sellPrice < buyPrice) {
      e.sellPrice = 'Sell price must be at least the buy price.';
    }

    if (Object.keys(e).length > 0) {
      setFormErrors(e);
      return;
    }

    const payload: ProductInput = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      shopId: Number(form.shopId),
      unitOfMeasurementId: Number(form.unitOfMeasurementId),
      productTypeId: Number(form.productTypeId),
      productGroupId: Number(form.productGroupId),
      reorderLevel,
      buyPrice,
      sellPrice,
      discountPercent,
      isActive: form.isActive,
    };
    saveMutation.mutate(payload);
  };

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagedRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="w-full pl-8 sm:w-80"
            placeholder="Search by name or SKU"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          New product
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Image</TableHead>
            <TableHead>Sku</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Group</TableHead>
            <TableHead className="text-right">Buy</TableHead>
            <TableHead className="text-right">Sell</TableHead>
            <TableHead className="text-right">Promo %</TableHead>
            <TableHead className="text-right">Effective</TableHead>
            <TableHead className="text-right">Reorder</TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={13}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            : pagedRows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <ProductImage path={p.imageUrl ?? ''} name={p.name} />
                  </TableCell>
                  <TableCell>{p.sku}</TableCell>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.unitOfMeasurement?.name ?? '-'}</TableCell>
                  <TableCell>{p.productType?.name ?? '-'}</TableCell>
                  <TableCell>{p.productGroup?.name ?? '-'}</TableCell>
                  <TableCell className="text-right">{fmt(p.buyPrice)}</TableCell>
                  <TableCell className="text-right">{fmt(p.sellPrice)}</TableCell>
                  <TableCell className="text-right">{p.discountPercent ? `${p.discountPercent}%` : '-'}</TableCell>
                  <TableCell className="text-right">
                    <span className="font-semibold">{fmt(p.effectivePrice)}</span>
                  </TableCell>
                  <TableCell className="text-right">{p.reorderLevel.toFixed(0)}</TableCell>
                  <TableCell>
                    {p.isActive ? (
                      <Badge className="bg-green-600 text-white">Yes</Badge>
                    ) : (
                      <Badge className="bg-red-600 text-white">No</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{p.sku}</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => openEdit(p)}>
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={() => setProductToDelete(p)}>
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
          {!isLoading && pagedRows.length === 0 && (
            <TableRow>
              <TableCell colSpan={13} className="text-center text-muted-foreground">
                No products found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {!isLoading && filtered.length > 0 && (
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit product' : 'New product'}</DialogTitle>
            <DialogDescription>
              {editing
                ? `Update details for ${editing.name}.`
                : 'Fill in the product details below.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                aria-invalid={!!formErrors.name}
              />
              {formErrors.name && <p className="text-sm text-destructive">{formErrors.name}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={form.sku}
                onChange={(e) => setField('sku', e.target.value)}
                aria-invalid={!!formErrors.sku}
              />
              {formErrors.sku && <p className="text-sm text-destructive">{formErrors.sku}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Shop</Label>
              <Select value={form.shopId} onValueChange={(v) => setField('shopId', v)}>
                <SelectTrigger className="w-full" aria-invalid={!!formErrors.shopId}>
                  <SelectValue placeholder="Select shop" />
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
            <div className="flex flex-col gap-1.5">
              <Label>Unit</Label>
              <Select
                value={form.unitOfMeasurementId}
                onValueChange={(v) => setField('unitOfMeasurementId', v)}
              >
                <SelectTrigger className="w-full" aria-invalid={!!formErrors.unitOfMeasurementId}>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.unitOfMeasurementId && (
                <p className="text-sm text-destructive">{formErrors.unitOfMeasurementId}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select value={form.productTypeId} onValueChange={(v) => setField('productTypeId', v)}>
                <SelectTrigger className="w-full" aria-invalid={!!formErrors.productTypeId}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.productTypeId && (
                <p className="text-sm text-destructive">{formErrors.productTypeId}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Group</Label>
              <Select value={form.productGroupId} onValueChange={(v) => setField('productGroupId', v)}>
                <SelectTrigger className="w-full" aria-invalid={!!formErrors.productGroupId}>
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.productGroupId && (
                <p className="text-sm text-destructive">{formErrors.productGroupId}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reorderLevel">Reorder level</Label>
              <Input
                id="reorderLevel"
                type="number"
                min={0}
                value={form.reorderLevel}
                onChange={(e) => setField('reorderLevel', e.target.value)}
                aria-invalid={!!formErrors.reorderLevel}
              />
              {formErrors.reorderLevel && (
                <p className="text-sm text-destructive">{formErrors.reorderLevel}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="buyPrice">Buy price</Label>
              <Input
                id="buyPrice"
                type="number"
                min={0}
                step={0.01}
                value={form.buyPrice}
                onChange={(e) => setField('buyPrice', e.target.value)}
                aria-invalid={!!formErrors.buyPrice}
              />
              {formErrors.buyPrice && (
                <p className="text-sm text-destructive">{formErrors.buyPrice}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sellPrice">Sell price</Label>
              <Input
                id="sellPrice"
                type="number"
                min={0}
                step={0.01}
                value={form.sellPrice}
                onChange={(e) => setField('sellPrice', e.target.value)}
                aria-invalid={!!formErrors.sellPrice}
              />
              {formErrors.sellPrice && (
                <p className="text-sm text-destructive">{formErrors.sellPrice}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="discountPercent">Promotion % (optional)</Label>
              <Input
                id="discountPercent"
                type="number"
                min={0}
                max={100}
                step={1}
                placeholder="e.g. 10 for 10% off"
                value={form.discountPercent}
                onChange={(e) => setField('discountPercent', e.target.value)}
                aria-invalid={!!formErrors.discountPercent}
              />
              {formErrors.discountPercent && (
                <p className="text-sm text-destructive">{formErrors.discountPercent}</p>
              )}
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Checkbox
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(v) => setField('isActive', v === true)}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>

          {editing && (
            <>
              <Separator />
              <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
                <span className="text-sm font-semibold">
                  Images {imagesLoading ? '' : `(${images.length})`}
                </span>
                {imagesLoading && (
                  <div className="flex gap-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-24 w-24" />
                    ))}
                  </div>
                )}
                {!imagesLoading && images.length === 0 && (
                  <p className="text-sm text-muted-foreground">No images yet.</p>
                )}
                {!imagesLoading && images.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {images.map((img, index) => (
                      <div key={img.id} className="w-24">
                        <ProductImage path={img.url} name={editing.name} size={96} />
                        <div className="mt-1 flex items-center justify-center gap-1">
                          {index === 0 ? (
                            <Badge className="bg-amber-500 text-white">Primary</Badge>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              title="Set as primary"
                              disabled={makePrimaryMutation.isPending}
                              onClick={() => makePrimaryMutation.mutate(img.id)}
                            >
                              <Star className="size-3" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            title="Remove image"
                            disabled={deleteImageMutation.isPending}
                            onClick={() => setImageToDelete(img)}
                          >
                            <Trash2 className="size-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ALLOWED_IMAGE_TYPES.join(',')}
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadMutation.isPending}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="size-4" />
                    {uploadMutation.isPending ? 'Uploading…' : 'Add image'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending
              ? 'Saving…'
              : editing
                ? 'Save changes'
                : 'Create product'}
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog
        open={productToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setProductToDelete(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete product?</DialogTitle>
            <DialogDescription>
              {productToDelete && (
                <>
                  This will permanently delete "{productToDelete.name}" (SKU{' '}
                  {productToDelete.sku}). This action cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (productToDelete) deleteMutation.mutate(productToDelete.id);
                setProductToDelete(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={imageToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setImageToDelete(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove image?</DialogTitle>
            <DialogDescription>
              This image will be permanently removed. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImageToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteImageMutation.isPending}
              onClick={() => {
                if (imageToDelete) deleteImageMutation.mutate(imageToDelete.id);
                setImageToDelete(null);
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
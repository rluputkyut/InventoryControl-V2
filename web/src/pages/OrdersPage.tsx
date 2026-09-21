import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Eye } from 'lucide-react';
import { apiObjectUrl } from '../api/http';
import { ordersApi } from '../api/endpoints';
import type { CustomerOrder, CustomerOrderStatus } from '../api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

const ORDERS_KEY = ['orders', 'admin'] as const;

const PAGE_SIZE = 20;

const STATUS_VARIANT: Record<CustomerOrderStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PendingApproval: 'outline',
  Approved: 'default',
  Delivered: 'secondary',
  Rejected: 'destructive',
};

const STATUS_LABEL: Record<CustomerOrderStatus, string> = {
  PendingApproval: 'Pending Approval',
  Approved: 'Approved',
  Delivered: 'Delivered',
  Rejected: 'Rejected',
};

function statusBadge(status: CustomerOrderStatus) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

function fmt(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function formatDateTime(utc: string): string {
  try {
    return new Date(utc).toLocaleString();
  } catch {
    return utc;
  }
}

function ProofImage({ url }: { url: string | null }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setSrc(null);
    if (!url) return;
    apiObjectUrl(url)
      .then((u) => {
        if (active && u) {
          objectUrl = u;
          setSrc(u);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (!src) {
    return (
      <span className="text-sm text-muted-foreground">
        {url ? 'Loading…' : 'No payment proof uploaded.'}
      </span>
    );
  }
  return (
    <div className="mt-2">
      <img
        src={src}
        alt="Payment proof"
        className="max-w-[360px] max-h-[360px] object-contain rounded-lg border border-border"
      />
    </div>
  );
}

export function OrdersPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<CustomerOrder | null>(null);
  const [note, setNote] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [page, setPage] = useState(1);

  const { data: orders = [], isLoading } = useQuery({ queryKey: ORDERS_KEY, queryFn: ordersApi.admin });

  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  const pagedOrders = orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const reload = () => queryClient.invalidateQueries({ queryKey: ORDERS_KEY });

  const approveMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) => ordersApi.approve(id, note || null),
    onSuccess: async (res, vars) => {
      toast.success(res.message);
      setNote('');
      await reload();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => ordersApi.reject(id, reason),
    onSuccess: async (res) => {
      toast.success(res.message);
      setRejectOpen(false);
      setReason('');
      await reload();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deliverMutation = useMutation({
    mutationFn: (id: number) => ordersApi.deliver(id),
    onSuccess: async (res) => {
      toast.success(res.message);
      await reload();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selectedLive = selected ? orders.find((o) => o.id === selected.id) ?? null : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Orders</h1>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 w-full animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : (
        <>
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Shop</TableHead>
                  <TableHead>Proof</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground">
                      No orders found.
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedOrders.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.number}</TableCell>
                      <TableCell>{statusBadge(item.status)}</TableCell>
                      <TableCell>{item.recipientName}</TableCell>
                      <TableCell>{item.recipientPhone}</TableCell>
                      <TableCell>{item.shop?.name ?? String(item.shopId)}</TableCell>
                      <TableCell>
                        {item.paymentProofUrl ? (
                          <Badge variant="secondary">Uploaded</Badge>
                        ) : (
                          <Badge variant="outline">Missing</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{item.items?.length ?? 0}</TableCell>
                      <TableCell className="text-right">{fmt(item.total)}</TableCell>
                      <TableCell>{formatDateTime(item.createdAtUtc)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setSelected(item)}>
                          <Eye className="size-4" />
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {/* ── Detail dialog ── */}
      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selected?.number}
              {selected && statusBadge(selected.status)}
            </DialogTitle>
            <DialogDescription>Review and manage this user's order.</DialogDescription>
          </DialogHeader>

          {selectedLive && (
            <>
              {/* User info */}
              <div className="grid gap-3 text-sm">
                <Row label="User" value={selectedLive.recipientName} />
                <Row label="Phone" value={selectedLive.recipientPhone} />
                <Row label="Address" value={selectedLive.shippingAddress} />
                <Row label="Notes" value={selectedLive.notes || '-'} />
                <Row label="Placed" value={formatDateTime(selectedLive.createdAtUtc)} />
                {selectedLive.approvedAtUtc && (
                  <Row label="Approved" value={formatDateTime(selectedLive.approvedAtUtc)} />
                )}
                {selectedLive.deliveredAtUtc && (
                  <Row label="Delivered" value={formatDateTime(selectedLive.deliveredAtUtc)} />
                )}
                {selectedLive.adminNote && <Row label="Admin note" value={selectedLive.adminNote} />}
                {selectedLive.saleDocumentId && (
                  <Row label="Sale document" value={`#${selectedLive.saleDocumentId}`} />
                )}
              </div>

              <Separator className="my-2" />

              {/* Items */}
              <h4 className="text-sm font-semibold text-foreground">Items</h4>
              <div className="rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Line</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedLive.items.map((li) => (
                      <TableRow key={li.id}>
                        <TableCell>{li.productName}</TableCell>
                        <TableCell>{li.sku}</TableCell>
                        <TableCell className="text-right">{li.quantity}</TableCell>
                        <TableCell className="text-right">{fmt(li.unitPrice)}</TableCell>
                        <TableCell className="text-right">{fmt(li.lineTotal)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-medium">
                      <TableCell colSpan={4} className="text-right text-muted-foreground">
                        Subtotal {fmt(selectedLive.subtotal)}
                        {selectedLive.discountAmount > 0 && (
                          <span className="ml-4 text-destructive">
                            Discount −{fmt(selectedLive.discountAmount)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{fmt(selectedLive.total)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <Separator className="my-2" />

              {/* Payment proof */}
              <h4 className="text-sm font-semibold text-foreground">Payment proof</h4>
              <ProofImage url={selectedLive.paymentProofUrl ?? null} />

              <DialogFooter className="mt-4">
                {selectedLive.status === 'PendingApproval' && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => setRejectOpen(true)}
                      disabled={rejectMutation.isPending}
                    >
                      Reject
                    </Button>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Optional note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="w-48"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') approveMutation.mutate({ id: selectedLive.id, note });
                        }}
                      />
                      <Button
                        onClick={() => approveMutation.mutate({ id: selectedLive.id, note })}
                        disabled={approveMutation.isPending}
                      >
                        Approve & post sale
                      </Button>
                    </div>
                  </>
                )}
                {selectedLive.status === 'Approved' && (
                  <Button
                    onClick={() => deliverMutation.mutate(selectedLive.id)}
                    disabled={deliverMutation.isPending}
                  >
                    Mark delivered
                  </Button>
                )}
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Reject confirmation dialog ── */}
      <Dialog open={rejectOpen} onOpenChange={(open) => { if (!open) setRejectOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject {selected?.number ?? ''}</DialogTitle>
            <DialogDescription>
              Provide a reason shown to the user. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            rows={3}
            placeholder="Reason shown to the user (required)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={!reason.trim() || rejectMutation.isPending}
              onClick={() => selected && reason.trim() && rejectMutation.mutate({ id: selected.id, reason })}
            >
              Reject order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

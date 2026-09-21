import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { usersApi, shopsApi } from '../api/endpoints';
import type { UserDto } from '../api/types';
import type { Shop } from '../api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

const ROLES = ['Admin', 'Operator', 'Viewer', 'Customer', 'ShopAdmin'];
const ROLE_LABELS: Record<string, string> = { Customer: 'User' };
const roleLabel = (role: string) => ROLE_LABELS[role] ?? role;
const USERS_KEY = ['users'] as const;
const PAGE_SIZE = 10;

export function UsersPage() {
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [rolesOpen, setRolesOpen] = useState<UserDto | null>(null);
  const [passwordOpen, setPasswordOpen] = useState<UserDto | null>(null);
  const [deleteOpen, setDeleteOpen] = useState<UserDto | null>(null);
  const [page, setPage] = useState(1);

  const [createUserName, setCreateUserName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRoles, setCreateRoles] = useState<string[]>(['Viewer']);
  const [createShopId, setCreateShopId] = useState<string>('');
  const [createErrors, setCreateErrors] = useState<{ userName?: string; password?: string; roles?: string }>({});

  const [rolesRoles, setRolesRoles] = useState<string[]>([]);
  const [rolesShopId, setRolesShopId] = useState<string>('');
  const [rolesErrors, setRolesErrors] = useState<{ roles?: string }>({});

  const [passwordValue, setPasswordValue] = useState('');
  const [passwordError, setPasswordError] = useState<string>('');

  const { data: users = [], isLoading } = useQuery({ queryKey: USERS_KEY, queryFn: usersApi.list });
  const { data: shops = [] } = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: USERS_KEY });

  const createMutation = useMutation({
    mutationFn: (values: { userName: string; email?: string; password: string; roles: string[]; shopId?: number | null }) =>
      usersApi.create(values),
    onSuccess: async () => {
      await invalidate();
      setCreateOpen(false);
      resetCreateForm();
      toast.success('User created.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rolesMutation = useMutation({
    mutationFn: async (values: { id: string; roles: string[]; shopId?: number | null }) =>
      usersApi.setRoles(values.id, values.roles, values.shopId),
    onSuccess: async () => {
      await invalidate();
      setRolesOpen(null);
      toast.success('Roles updated.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activeMutation = useMutation({
    mutationFn: (user: UserDto) => usersApi.setActive(user.id, !user.isActive),
    onSuccess: async () => {
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const passwordMutation = useMutation({
    mutationFn: (values: { id: string; newPassword: string }) =>
      usersApi.resetPassword(values.id, values.newPassword),
    onSuccess: async () => {
      await invalidate();
      setPasswordOpen(null);
      setPasswordValue('');
      toast.success('Password reset.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: async () => {
      await invalidate();
      setDeleteOpen(null);
      toast.success('User deleted.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const pageUsers = users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function resetCreateForm() {
    setCreateUserName('');
    setCreateEmail('');
    setCreatePassword('');
    setCreateRoles(['Viewer']);
    setCreateShopId('');
    setCreateErrors({});
  }

  function openRolesDialog(user: UserDto) {
    setRolesOpen(user);
    setRolesRoles(user.roles);
    setRolesShopId(user.shopId != null ? String(user.shopId) : '');
    setRolesErrors({});
  }

  function handleCreateSubmit() {
    const errors: typeof createErrors = {};
    if (!createUserName.trim()) errors.userName = 'Username is required';
    if (!createPassword || createPassword.length < 8) errors.password = 'At least 8 characters';
    if (createRoles.length === 0) errors.roles = 'Select at least one role';
    setCreateErrors(errors);
    if (Object.keys(errors).length > 0) return;

    createMutation.mutate({
      userName: createUserName.trim(),
      email: createEmail.trim() || undefined,
      password: createPassword,
      roles: createRoles,
      shopId: createShopId ? Number(createShopId) : null,
    });
  }

  function handleRolesSubmit() {
    const errors: typeof rolesErrors = {};
    if (rolesRoles.length === 0) errors.roles = 'Select at least one role';
    setRolesErrors(errors);
    if (Object.keys(errors).length > 0) return;

    rolesMutation.mutate({
      id: rolesOpen!.id,
      roles: rolesRoles,
      shopId: rolesShopId ? Number(rolesShopId) : null,
    });
  }

  function handlePasswordSubmit() {
    if (!passwordValue || passwordValue.length < 8) {
      setPasswordError('At least 8 characters');
      return;
    }
    setPasswordError('');
    passwordMutation.mutate({ id: passwordOpen!.id, newPassword: passwordValue });
  }

  function toggleCreateRole(role: string) {
    setCreateRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  }

  function toggleRolesRole(role: string) {
    setRolesRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  }

  function roleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' {
    switch (role) {
      case 'Admin':
        return 'default';
      case 'Operator':
        return 'secondary';
      default:
        return 'outline';
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Users</h1>
      </div>

      <Button
        onClick={() => {
          resetCreateForm();
          setCreateOpen(true);
        }}
        className="w-fit"
      >
        <Plus className="size-4" />
        New user
      </Button>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Shop</TableHead>
                <TableHead className="w-[340px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.userName}</TableCell>
                  <TableCell>{user.email ?? '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((r) => (
                        <Badge key={r} variant={roleBadgeVariant(r)}>
                          {roleLabel(r)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const s = shops.find((x) => x.id === user.shopId);
                      return s ? s.name : user.shopId ? `#${user.shopId}` : '-';
                    })()}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      <Button size="sm" variant="outline" onClick={() => openRolesDialog(user)}>
                        <Pencil className="size-3" />
                        Roles
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPasswordOpen(user);
                          setPasswordValue('');
                          setPasswordError('');
                        }}
                      >
                        <RefreshCw className="size-3" />
                        Reset password
                      </Button>
                      <Button
                        size="sm"
                        variant={user.isActive ? 'default' : 'secondary'}
                        disabled={activeMutation.isPending && activeMutation.variables?.id === user.id}
                        onClick={() => activeMutation.mutate(user)}
                      >
                        {user.isActive ? 'Enabled' : 'Disabled'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteOpen(user)}
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

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages} ({users.length} users)
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="size-4" />
                Prev
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Create user dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New user</DialogTitle>
            <DialogDescription>Create a new user account.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="create-username">Username</Label>
              <Input
                id="create-username"
                value={createUserName}
                onChange={(e) => setCreateUserName(e.target.value)}
                aria-invalid={!!createErrors.userName}
              />
              {createErrors.userName && (
                <p className="text-xs text-destructive">{createErrors.userName}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="create-password">Password</Label>
              <Input
                id="create-password"
                type="password"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                aria-invalid={!!createErrors.password}
              />
              {createErrors.password && (
                <p className="text-xs text-destructive">{createErrors.password}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Roles</Label>
              <div className="flex flex-wrap gap-3">
                {ROLES.map((role) => (
                  <label key={role} className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={createRoles.includes(role)}
                      onCheckedChange={() => toggleCreateRole(role)}
                    />
                    {roleLabel(role)}
                  </label>
                ))}
              </div>
              {createErrors.roles && (
                <p className="text-xs text-destructive">{createErrors.roles}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Shop</Label>
              <Select value={createShopId} onValueChange={setCreateShopId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a shop" />
                </SelectTrigger>
                <SelectContent>
                  {shops.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleCreateSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Roles dialog */}
      <Dialog open={rolesOpen !== null} onOpenChange={(open) => { if (!open) setRolesOpen(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Roles: {rolesOpen?.userName ?? ''}</DialogTitle>
            <DialogDescription>Assign roles and shop to this user.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Roles</Label>
              <div className="flex flex-wrap gap-3">
                {ROLES.map((role) => (
                  <label key={role} className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={rolesRoles.includes(role)}
                      onCheckedChange={() => toggleRolesRole(role)}
                    />
                    {roleLabel(role)}
                  </label>
                ))}
              </div>
              {rolesErrors.roles && (
                <p className="text-xs text-destructive">{rolesErrors.roles}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Shop</Label>
              <Select value={rolesShopId} onValueChange={setRolesShopId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a shop" />
                </SelectTrigger>
                <SelectContent>
                  {shops.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleRolesSubmit} disabled={rolesMutation.isPending}>
              {rolesMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password reset dialog */}
      <Dialog open={passwordOpen !== null} onOpenChange={(open) => { if (!open) setPasswordOpen(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password: {passwordOpen?.userName ?? ''}</DialogTitle>
            <DialogDescription>Enter a new password for this user.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reset-password">New password</Label>
            <Input
              id="reset-password"
              type="password"
              value={passwordValue}
              onChange={(e) => setPasswordValue(e.target.value)}
              aria-invalid={!!passwordError}
            />
            {passwordError && (
              <p className="text-xs text-destructive">{passwordError}</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handlePasswordSubmit} disabled={passwordMutation.isPending}>
              {passwordMutation.isPending ? 'Resetting...' : 'Reset'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen !== null} onOpenChange={(open) => { if (!open) setDeleteOpen(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete user</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteOpen?.userName}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteOpen) deleteMutation.mutate(deleteOpen.id);
              }}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="size-3" />
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

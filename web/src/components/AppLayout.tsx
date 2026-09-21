import { useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  Boxes,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Scale,
  ShoppingCart,
  Store,
  Tags,
  User,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type MenuEntry = { key: string; label: string; icon: ReactNode; roles: string[] };

const MENU: MenuEntry[] = [
  { key: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="size-4" />, roles: ['Admin', 'Operator', 'Viewer'] },
  { key: '/balances', label: 'Balances', icon: <Scale className="size-4" />, roles: ['Admin', 'Operator', 'Viewer'] },
  { key: '/transactions', label: 'Transactions', icon: <ArrowLeftRight className="size-4" />, roles: ['Admin', 'Operator', 'Viewer'] },
  { key: '/purchases', label: 'Purchases', icon: <Package className="size-4" />, roles: ['Admin', 'Operator', 'Viewer'] },
  { key: '/sales', label: 'Sales', icon: <ShoppingCart className="size-4" />, roles: ['Admin', 'Operator', 'Viewer'] },
  { key: '/transfers', label: 'Transfers', icon: <ArrowLeftRight className="size-4" />, roles: ['Admin', 'Operator', 'Viewer'] },
  { key: '/orders', label: 'Orders', icon: <ShoppingCart className="size-4" />, roles: ['Admin', 'ShopAdmin'] },
  { key: '/checkout', label: 'Checkout setup', icon: <CreditCard className="size-4" />, roles: ['Admin'] },
  { key: '/products', label: 'Products', icon: <Boxes className="size-4" />, roles: ['Admin'] },
  { key: '/master-data', label: 'Master data', icon: <Tags className="size-4" />, roles: ['Admin'] },
  { key: '/users', label: 'Users', icon: <Users className="size-4" />, roles: ['Admin'] },
  { key: '/shops', label: 'Shops', icon: <Store className="size-4" />, roles: ['Admin', 'ShopAdmin'] },
];

function roleColor(role: string): string {
  switch (role) {
    case 'Admin':
      return 'bg-amber-500';
    case 'Operator':
      return 'bg-blue-500';
    default:
      return 'bg-green-600';
  }
}

function NavList({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { hasRole } = useAuth();
  const location = useLocation();

  const items = MENU.filter((entry) => hasRole(...entry.roles));
  const selectedKey = items.find((item) => location.pathname.startsWith(item.key))?.key ?? '/dashboard';

  return (
    <nav className="flex flex-1 flex-col gap-1 p-2">
      {items.map((entry) => {
        const active = entry.key === selectedKey;
        return (
          <NavLink
            key={entry.key}
            to={entry.key}
            onClick={onNavigate}
            title={collapsed ? entry.label : undefined}
            className={cn(
              'flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              active && 'bg-sidebar-accent text-sidebar-accent-foreground',
              collapsed && 'justify-center px-0',
            )}
          >
            {entry.icon}
            {!collapsed && <span className="truncate">{entry.label}</span>}
          </NavLink>
        );
      })}
    </nav>
  );
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const firstName = user?.userName.split('@')[0] ?? 'there';
  const initials = firstName.slice(0, 2).toUpperCase();
  const currentLabel = MENU.find((m) => location.pathname.startsWith(m.key))?.label ?? 'Inventory Control';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="bg-muted/40 flex min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'bg-sidebar border-r-border sticky top-0 hidden h-screen shrink-0 flex-col border-r transition-[width] duration-200 lg:flex',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <div className={cn('flex h-12 items-center gap-2 px-4 text-sm font-semibold', collapsed && 'justify-center px-0')}>
          <Boxes className="text-sidebar-primary size-5" />
          {!collapsed && <span className="truncate">Inventory Control</span>}
        </div>
        <Separator />
        <NavList collapsed={collapsed} />
        <Button
          variant="ghost"
          size="sm"
          className="border-t-border m-2 mt-auto justify-start rounded-md border-t"
          onClick={() => setCollapsed((c) => !c)}
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          {!collapsed && 'Collapse'}
        </Button>
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="bg-black/40 absolute inset-0" onClick={() => setMobileOpen(false)} />
          <aside className="bg-sidebar relative flex h-full w-64 flex-col">
            <div className="flex h-12 items-center justify-between px-4 text-sm font-semibold">
              <span className="flex items-center gap-2">
                <Boxes className="text-sidebar-primary size-5" />
                Inventory Control
              </span>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
                <X className="size-4" />
              </Button>
            </div>
            <Separator />
            <NavList collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col lg:pl-0">
        <header className="bg-background border-b-border sticky top-0 z-20 flex items-center justify-between gap-4 border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
              <Menu className="size-5" />
            </Button>
            <span className="text-sm font-semibold lg:hidden">{currentLabel}</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Badge className={cn('rounded-md', user ? roleColor(user.roles[0]) : 'bg-muted')}>
              {user?.roles.join(', ')}
            </Badge>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <Avatar className="size-7">
                    <AvatarFallback className="bg-muted text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium md:inline">{user?.userName}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Signed in as {user?.userName}</TooltipContent>
            </Tooltip>
            <Button variant="ghost" size="icon" onClick={() => void handleLogout()} aria-label="Sign out" title="Sign out">
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>
        <main className="layout-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { RequireAuth } from './components/Protected';
import { BalancesPage } from './pages/BalancesPage';
import { DashboardPage } from './pages/DashboardPage';
import { DocumentDetailPage } from './pages/DocumentDetailPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { LoginPage } from './pages/LoginPage';
import { MasterDataPage } from './pages/MasterDataPage';
import { NewDocumentPage } from './pages/NewDocumentPage';
import { ProductsPage } from './pages/ProductsPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { UsersPage } from './pages/UsersPage';
import { ShopsPage } from './pages/ShopsPage';
import { OrdersPage } from './pages/OrdersPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { NotFoundPage } from './pages/NotFoundPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="balances" element={<BalancesPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="purchases" element={<DocumentsPage kind="purchases" title="Purchases" />} />
          <Route path="purchases/new" element={<NewDocumentPage kind="purchases" />} />
          <Route path="purchases/:id" element={<DocumentDetailPage kind="purchases" />} />
          <Route path="sales" element={<DocumentsPage kind="sales" title="Sales" />} />
          <Route path="sales/new" element={<NewDocumentPage kind="sales" />} />
          <Route path="sales/:id" element={<DocumentDetailPage kind="sales" />} />
          <Route path="transfers" element={<DocumentsPage kind="transfers" title="Transfers" />} />
          <Route path="transfers/new" element={<NewDocumentPage kind="transfers" />} />
          <Route path="transfers/:id" element={<DocumentDetailPage kind="transfers" />} />
          <Route
            path="products"
            element={
              <RequireAuth roles={['Admin']}>
                <ProductsPage />
              </RequireAuth>
            }
          />
          <Route
            path="master-data"
            element={
              <RequireAuth roles={['Admin']}>
                <MasterDataPage />
              </RequireAuth>
            }
          />
          <Route
            path="users"
            element={
              <RequireAuth roles={['Admin']}>
                <UsersPage />
              </RequireAuth>
            }
          />
          <Route
            path="shops"
            element={
              <RequireAuth roles={['Admin']}>
                <ShopsPage />
              </RequireAuth>
            }
          />
          <Route
            path="orders"
            element={
              <RequireAuth roles={['Admin', 'ShopAdmin']}>
                <OrdersPage />
              </RequireAuth>
            }
          />
          <Route
            path="checkout"
            element={
              <RequireAuth roles={['Admin']}>
                <CheckoutPage />
              </RequireAuth>
            }
          />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

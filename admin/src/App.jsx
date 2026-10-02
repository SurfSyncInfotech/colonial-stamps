import { Navigate, Route, Routes } from 'react-router-dom';
import { DeskAuth, Guard, Shell } from './kit';
import { DashboardPage } from './screens/Dashboard';
import { CategoriesPage } from './screens/Categories';
import { ProductsPage } from './screens/Products';
import { OrdersPage, OrderDetailPage } from './screens/Orders';
import { CustomersPage, CustomerDetailPage } from './screens/Customers';
import { InventoryPage } from './screens/Inventory';
import { ProfilePage } from './screens/Profile';
import { LoginPage } from './screens/Login';

export default function App() {
  return (
    <DeskAuth>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<Guard><Shell /></Guard>}>
          <Route index element={<DashboardPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/:id" element={<CustomerDetailPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DeskAuth>
  );
}

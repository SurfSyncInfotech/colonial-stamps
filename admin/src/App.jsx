import { Navigate, Route, Routes } from 'react-router-dom';
import { DeskAuth, Guard, Shell } from './kit';
import {
  ActivityPage, AdminsPage, AnalyticsPage, BannersPage, CategoriesPage, CmsPage, CouponsPage,
  CustomerDetailPage, CustomersPage, DashboardPage, InventoryPage, LoginPage, NotificationsPage,
  OrderDetailPage, OrdersPage, ProductFormPage, ProductsPage, ProfilePage, ReviewsPage,
  SettingsPage, ShippingPage, SubcategoriesPage,
} from './screens';

export default function App() {
  return (
    <DeskAuth>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<Guard><Shell /></Guard>}>
          <Route index element={<DashboardPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/new" element={<ProductFormPage />} />
          <Route path="products/:id" element={<ProductFormPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="subcategories" element={<SubcategoriesPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/:id" element={<CustomerDetailPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="coupons" element={<CouponsPage />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="banners" element={<BannersPage />} />
          <Route path="shipping" element={<ShippingPage />} />
          <Route path="cms" element={<CmsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="admins" element={<AdminsPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DeskAuth>
  );
}

import { Navigate, Route, Routes } from 'react-router-dom';
import { AccountLayout, AddressesPage, OrderDetailPage, OrdersPage, ProfilePage, SettingsPage } from './pages/Account';
import { CategoryPage, CmsPage, ShopPage, SubcategoryPage, TrackPage } from './pages/Browse';
import { CartPage, CheckoutPage, ConfirmationPage, LoginPage, SignupPage, VerifyPage, WishlistPage } from './pages/Flow';
import HomePage from './pages/Home';
import ProductPage from './pages/Product';
import { AuthProvider, SiteLayout } from './shell';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<HomePage />} />
          <Route path="stamps" element={<ShopPage />} />
          <Route path="stamps/:categorySlug" element={<CategoryPage />} />
          <Route path="stamps/:categorySlug/:subSlug" element={<SubcategoryPage />} />
          <Route path="product/:slug" element={<ProductPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="confirmation/:id" element={<ConfirmationPage />} />
          <Route path="wishlist" element={<WishlistPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignupPage />} />
          <Route path="verify" element={<VerifyPage />} />
          <Route path="track" element={<TrackPage />} />
          <Route path="about" element={<Navigate to="/pages/about-us" replace />} />
          <Route path="contact" element={<Navigate to="/pages/contact" replace />} />
          <Route path="contacts" element={<Navigate to="/pages/contact" replace />} />
          <Route path="product" element={<Navigate to="/stamps" replace />} />
          <Route path="products" element={<Navigate to="/stamps" replace />} />
          <Route path="pages/:slug" element={<CmsPage />} />
          <Route path="account" element={<AccountLayout />}>
            <Route index element={<ProfilePage />} />
            <Route path="addresses" element={<AddressesPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

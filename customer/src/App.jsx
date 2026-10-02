import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AccountLayout, AddressesPage, OrderDetailPage, OrdersPage, ProfilePage, SettingsPage } from './pages/Account';
import { CategoryPage, CmsPage, ContactPage, ShopPage, SubcategoryPage, TrackPage } from './pages/Browse';
import { CartPage, CheckoutPage, ConfirmationPage, ForgotPasswordPage, LoginPage, ResetPasswordPage, SignupPage, VerifyPage, WishlistPage } from './pages/Flow';
import HomePage from './pages/Home';
import ProductPage from './pages/Product';
import { AuthProvider, SiteLayout } from './shell';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <ScrollToTop />
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
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="track" element={<TrackPage />} />
          <Route path="about" element={<Navigate to="/pages/about-us" replace />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="contacts" element={<ContactPage />} />
          <Route path="pages/contact" element={<ContactPage />} />
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

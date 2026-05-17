import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { FunnelProvider } from './context/FunnelContext';
import GearBackground from './components/GearBackground';
import Screen1A from './screens/Screen1A';

const Screen4 = lazy(() => import('./screens/Screen4'));
const WhatsAppPage = lazy(() => import('./screens/WhatsAppPage'));
const Disqualified = lazy(() => import('./screens/Disqualified'));
const LanguageDisqualified = lazy(() => import('./screens/LanguageDisqualified'));
const NotTamil = lazy(() => import('./screens/NotTamil'));
const AdminPage = lazy(() => import('./admin/AdminPage'));
const AdminResetPassword = lazy(() => import('./admin/AdminResetPassword'));

function FunnelRoutes() {
  const location = useLocation();
  const path = location.pathname;
  // /register and /whatsapp render Screen1A behind them so the funnel
  // landing shows blurred through the backdrop — continuation of the
  // popup-style flow.
  const showLandingBehind = path === '/register' || path === '/whatsapp';
  return (
    <>
      <GearBackground />
      {showLandingBehind && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <Screen1A />
        </div>
      )}
      <AnimatePresence mode="sync" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Screen1A />} />
          <Route path="/language" element={<Navigate to="/" replace />} />
          <Route path="/duration" element={<Navigate to="/register" replace />} />
          <Route path="/register" element={<Screen4 />} />
          <Route path="/whatsapp" element={<WhatsAppPage />} />
          <Route path="/not-eligible" element={<Disqualified />} />
          <Route path="/language-mismatch" element={<LanguageDisqualified />} />
          <Route path="/not-tamil" element={<NotTamil />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </>
  );
}

export default function App() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  if (location.pathname === '/admin/reset-password') {
    return <Suspense fallback={null}><AdminResetPassword /></Suspense>;
  }
  if (isAdmin) {
    return <Suspense fallback={null}><AdminPage /></Suspense>;
  }
  return (
    <FunnelProvider>
      <Suspense fallback={null}>
        <FunnelRoutes />
      </Suspense>
    </FunnelProvider>
  );
}

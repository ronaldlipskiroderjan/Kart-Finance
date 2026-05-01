import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CommHistoryProvider } from './context/CommHistoryContext';
import { ToastProvider } from './components/ui/ToastProvider';
import LoginView from './pages/LoginView';
import Dashboard from './pages/Dashboard';
import HistoryView from './pages/HistoryView';
import Settings from './pages/Settings';
import Analytics from './pages/Analytics';
import CalendarView from './pages/CalendarView';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginView />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/history/:pilotId" element={<ProtectedRoute><HistoryView /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><CalendarView /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CommHistoryProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </CommHistoryProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

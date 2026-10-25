import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { RequireAuth } from './routes/RequireAuth';
import { LoginPage } from './pages/LoginPage';
import { ListPage } from './pages/ListPage';
import { DetailPage } from './pages/DetailPage';
import { AddEditPage } from './pages/AddEditPage';
import { AccountPage } from './pages/AccountPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/list"
            element={
              <RequireAuth>
                <ListPage />
              </RequireAuth>
            }
          />
          <Route
            path="/detail/:id"
            element={
              <RequireAuth>
                <DetailPage />
              </RequireAuth>
            }
          />
          <Route
            path="/add"
            element={
              <RequireAuth>
                <AddEditPage />
              </RequireAuth>
            }
          />
          <Route
            path="/add/:id"
            element={
              <RequireAuth>
                <AddEditPage />
              </RequireAuth>
            }
          />
          <Route
            path="/account"
            element={
              <RequireAuth>
                <AccountPage />
              </RequireAuth>
            }
          />
          <Route path="/" element={<Navigate to="/list" replace />} />
          <Route path="*" element={<Navigate to="/list" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

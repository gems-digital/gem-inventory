import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { RequireAuth } from './routes/RequireAuth';
import { LoginPage } from './pages/LoginPage';
import { ListPage } from './pages/ListPage';
import { PlaceholderPage } from './pages/PlaceholderPage';

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
                <PlaceholderPage
                  title="Chi tiết món"
                  note="Màn chi tiết sẽ hoàn thiện ở slice sau (gallery nhiều ảnh, margin, dư địa giảm giá)."
                />
              </RequireAuth>
            }
          />
          <Route
            path="/add"
            element={
              <RequireAuth>
                <PlaceholderPage
                  title="Thêm món"
                  note="Form thêm/sửa món sẽ hoàn thiện ở slice sau (độc bản/hàng loạt, kích thước theo loại, nhiều ảnh)."
                />
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

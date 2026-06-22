import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import JudgeDashboard from './pages/JudgeDashboard';
import PrintReport from './pages/PrintReport';

// Protected Route components
const AdminRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return null;
  if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const JudgeRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return null;
  if (!user || user.role !== 'judge') {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const AuthenticatedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return null;
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Root Redirect component
const RootRedirect = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  
  if (user.role === 'admin' || user.role === 'staff') {
    return <Navigate to="/admin" replace />;
  } else {
    return <Navigate to="/judge" replace />;
  }
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route 
        path="/admin" 
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        } 
      />
      
      <Route 
        path="/judge" 
        element={
          <JudgeRoute>
            <JudgeDashboard />
          </JudgeRoute>
        } 
      />
      
      <Route 
        path="/print-report/:activityId" 
        element={
          <AuthenticatedRoute>
            <PrintReport />
          </AuthenticatedRoute>
        } 
      />

      <Route path="/activities/:activityId/login" element={<Login />} />
      <Route 
        path="/activities/:activityId/evaluate" 
        element={
          <AuthenticatedRoute>
            <JudgeDashboard />
          </AuthenticatedRoute>
        } 
      />

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router basename={import.meta.env.BASE_URL}>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;

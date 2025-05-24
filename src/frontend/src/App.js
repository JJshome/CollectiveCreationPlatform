import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { store, persistor } from './store';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import DesignStudio from './pages/DesignStudio';
import VirtualAgents from './pages/VirtualAgents';
import Marketplace from './pages/Marketplace';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Auth from './pages/Auth';
import NotFound from './pages/NotFound';

// Hooks
import { useAuth } from './hooks/useAuth';

// Create theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Roboto',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        },
      },
    },
  },
});

// Create QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return children;
};

// Main App Component
function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <PersistGate loading={<LoadingSpinner />} persistor={persistor}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
              <CssBaseline />
              <Router>
                <div className="App">
                  <Navbar />
                  <main style={{ minHeight: 'calc(100vh - 200px)' }}>
                    <Routes>
                      {/* Public Routes */}
                      <Route path="/" element={<Home />} />
                      <Route path="/auth" element={<Auth />} />
                      
                      {/* Protected Routes */}
                      <Route 
                        path="/dashboard" 
                        element={
                          <ProtectedRoute>
                            <Dashboard />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/projects" 
                        element={
                          <ProtectedRoute>
                            <Projects />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/projects/:id" 
                        element={
                          <ProtectedRoute>
                            <ProjectDetail />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/design-studio" 
                        element={
                          <ProtectedRoute>
                            <DesignStudio />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/virtual-agents" 
                        element={
                          <ProtectedRoute>
                            <VirtualAgents />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/marketplace" 
                        element={
                          <ProtectedRoute>
                            <Marketplace />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/profile" 
                        element={
                          <ProtectedRoute>
                            <Profile />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/settings" 
                        element={
                          <ProtectedRoute>
                            <Settings />
                          </ProtectedRoute>
                        } 
                      />
                      
                      {/* 404 Route */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </main>
                  <Footer />
                </div>
              </Router>
            </ThemeProvider>
          </QueryClientProvider>
        </PersistGate>
      </Provider>
    </ErrorBoundary>
  );
}

export default App;

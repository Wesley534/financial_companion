// frontend/src/App.tsx

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useUserQuery } from './api/auth';

// Import Auth Pages (Will be created next)
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
// Placeholder for the main app
// import Dashboard from './pages/Dashboard'; 
import WelcomePage from './pages/auth/WelcomePage';

// Component to protect authenticated routes
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated } = useAuthStore();
    // Show a loading/spinner here if needed.
    if (!isAuthenticated) {
        return <Navigate to="/welcome" replace />;
    }
    return <>{children}</>;
};

function App() {
    // This hook runs on load to check token validity and fetch user data
    const { isLoading: isAuthLoading } = useUserQuery(); 
    const { isAuthenticated } = useAuthStore();

    if (isAuthLoading && isAuthenticated) {
        // Simple loading screen while checking token
        return <div className="h-screen w-screen flex items-center justify-center text-xl">Loading App...</div>;
    }

    return (
        <Router>
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <Routes>
                    {/* Public Routes */}
                    <Route path="/welcome" element={<WelcomePage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    
                    {/* Redirect authenticated users away from Auth pages */}
                    <Route 
                        path="/welcome" 
                        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <WelcomePage />}
                    />
                    <Route 
                        path="/login" 
                        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
                    />
                    <Route 
                        path="/register" 
                        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />}
                    />

                    {/* Protected Routes (Main App) */}
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

                    {/* Default Route */}
                    <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/welcome"} replace />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;

// Placeholder for now
const Dashboard = () => {
    const { user, logout } = useAuthStore();
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold">Welcome, {user?.name}!</h1>
            <p>Authentication Successful. This is the Dashboard placeholder.</p>
            <button 
                onClick={logout} 
                className="mt-4 p-2 bg-red-500 text-white rounded"
            >
                Log Out
            </button>
        </div>
    )
}
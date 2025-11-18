import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useUserQuery } from './api/auth';

// Import Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import WelcomePage from './pages/auth/WelcomePage';

// --- Protected Route Component ---
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated, user } = useAuthStore();

    // Run /auth/me ONLY when rendering a protected route
    const { isLoading } = useUserQuery();

    if (isLoading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center text-xl text-gray-700">
                Checking credentials...
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/welcome" replace />;
    }

    if (!user || !user.name) {
        return (
            <div className="h-screen w-screen flex items-center justify-center text-xl text-gray-700">
                Preparing user data...
            </div>
        );
    }

    return <>{children}</>;
};

// Placeholder Dashboard
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
    );
};

const PROTECTED_DEFAULT_PATH = "/dashboard";

function App() {
    const { isAuthenticated } = useAuthStore();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Routes>

                {/* 🚀 Public Routes (NO AUTH CHECK AT ALL) */}
                <Route path="/welcome" element={<WelcomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* 🔐 Protected Routes */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />

                {/* 🌍 Catch-All */}
                <Route
                    path="*"
                    element={
                        <Navigate
                            to={isAuthenticated ? PROTECTED_DEFAULT_PATH : "/welcome"}
                            replace
                        />
                    }
                />
            </Routes>
        </div>
    );
}

export default App;

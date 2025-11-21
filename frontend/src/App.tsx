import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { hasCompletedSetup } from './setupLogic'; // Assume this file exists

// Layouts
import MainLayoutRoute from './layouts/MainLayoutRoute';

// Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import WelcomePage from './pages/auth/WelcomePage';
import SetupWizardPage from './pages/setup/SetupWizard'; // Corrected naming convention

// Module Pages (Import all your module pages here)
import DashboardPage from './pages/DashboardPage';
import MonthlyBudgetPage from './pages/budget/MonthlyBudgetPage';
import CategoryDetailsPage from './pages/budget/CategoryDetailsPage';
import TransactionsListPage from './pages/transactions/TransactionsListPage';
import AddTransactionPage from './pages/transactions/AddTransactionPage';
import EditTransactionPage from './pages/transactions/EditTransactionPage';
import ShoppingListsOverviewPage from './pages/shopping/ShoppingListsOverviewPage';
import SingleShoppingListPage from './pages/shopping/SingleShoppingListPage';
import CheckoutPage from './pages/shopping/CheckoutPage';
import SavingsDashboardPage from './pages/savings/SavingsDashboardPage';
import SingleSavingsGoalPage from './pages/savings/SingleSavingsGoalPage';
import MonthlyCloseoutWizardPage from './pages/monthend/MonthlyCloseoutWizardPage';


// --- Protected Route Component ---
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const location = useLocation();

  // 1. Show loading while user is null but token exists
  if (!user && isAuthenticated) {
    return (
      <div className="h-screen w-screen flex items-center justify-center text-xl text-gray-700">
        Preparing user data...
      </div>
    );
  }

  // 2. Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/welcome" replace state={{ from: location }} />;
  }

  // 3. Safety check: user should exist here (shouldn't happen with step 1 and 2, but good practice)
  if (!user) {
    logout();
    return <Navigate to="/welcome" replace />;
  }

  // 4. Setup logic enforcement
  const setupComplete = hasCompletedSetup(user);
  const isSetupRoute = location.pathname === '/setup';
  
  if (!setupComplete && !isSetupRoute) {
    return <Navigate to="/setup" replace />;
  }

  if (setupComplete && isSetupRoute) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Determine default protected path
const getProtectedDefaultPath = (user: { id: number } | null | undefined): string => {
  return hasCompletedSetup(user) ? '/dashboard' : '/setup';
};

function App() {
  const { token, loadUser, isAuthenticated, user } = useAuthStore();
  const [loading, setLoading] = useState(true);

  // On app mount, rehydrate user from token
  useEffect(() => {
    if (token) {
      loadUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token, loadUser]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center text-xl text-gray-700">
        Loading user...
      </div>
    );
  }

  const protectedDefaultPath = getProtectedDefaultPath(user);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Routes>
        {/* --- 1. Public Routes --- */}
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* --- 2. Protected Routes (Wrapped by ProtectedRoute) --- */}
        <Route element={<ProtectedRoute> <MainLayoutRoute /> </ProtectedRoute>}>
          
          {/* Setup Wizard (Rendered inside ProtectedRoute, but *outside* MainLayoutRoute to hide sidebar) 
             Note: We put setup outside the MainLayoutRoute to have a full-screen wizard.
             The parent <Route element={...}> will still apply the ProtectedRoute logic. */}
          <Route path="/setup" element={<SetupWizardPage />} /> 

          {/* --- Module Routes (Wrapped by MainLayoutRoute) --- */}
          
          {/* DASHBOARD MODULE (5) */}
          <Route path="/dashboard" element={<DashboardPage />} />
          
          {/* BUDGET MODULE (6, 7) */}
          <Route path="/budget" element={<Navigate to="/budget/monthly" replace />} />
          <Route path="/budget/monthly" element={<MonthlyBudgetPage />} />
          <Route path="/budget/categories/:id" element={<CategoryDetailsPage />} />

          {/* TRANSACTION MODULE (8, 9, 10) */}
          <Route path="/transactions" element={<Navigate to="/transactions/list" replace />} />
          <Route path="/transactions/list" element={<TransactionsListPage />} />
          <Route path="/transactions/add" element={<AddTransactionPage />} />
          <Route path="/transactions/edit/:id" element={<EditTransactionPage />} />
          
          {/* SHOPPING LIST MODULE (11, 12, 13) */}
          <Route path="/shopping" element={<Navigate to="/shopping/lists" replace />} />
          <Route path="/shopping/lists" element={<ShoppingListsOverviewPage />} />
          <Route path="/shopping/list/:id" element={<SingleShoppingListPage />} />
          <Route path="/shopping/checkout" element={<CheckoutPage />} />

          {/* SAVINGS MODULE (14, 15) */}
          <Route path="/savings" element={<Navigate to="/savings/dashboard" replace />} />
          <Route path="/savings/dashboard" element={<SavingsDashboardPage />} />
          <Route path="/savings/goal/:id" element={<SingleSavingsGoalPage />} />

          {/* MONTH END MODULE (16) */}
          <Route path="/month-end" element={<Navigate to="/month-end/wizard" replace />} />
          <Route path="/month-end/wizard" element={<MonthlyCloseoutWizardPage />} />

        </Route>
        
        {/* --- 3. Catch-All Route --- */}
        <Route
          path="*"
          element={
            <Navigate
              to={isAuthenticated ? protectedDefaultPath : '/welcome'}
              replace
            />
          }
        />
      </Routes>
    </div>
  );
}

export default App;
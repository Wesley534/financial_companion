import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    Home, 
    Wallet, 
    FileText, 
    ShoppingCart, 
    PiggyBank, 
    CalendarCheck, 
    ArrowRight, 
    LogOut, 
    User, 
    Settings,
    Menu, 
    X // Close icon for mobile menu
} from 'lucide-react';

// Assuming shadcn setup is available for these components
import { Button } from '@/components/ui/button'; 
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/store/authStore'; 

// --- Theme Colors ---
const PRIMARY_BLUE = 'hsl(220, 80%, 50%)';
const BRAND_GREEN = 'hsl(140, 70%, 45%)';
// const ACCENT_YELLOW = 'hsl(40, 85%, 60%)'; // Not directly used in layout, but kept for context

// --- Navigation Structure ---
interface NavItem {
    name: string;
    path: string;
    icon: React.ElementType;
    subItems?: NavItem[];
}

const NAVIGATION_MODULES: NavItem[] = [
    { name: "Dashboard", path: "/dashboard", icon: Home },
    { 
        name: "Budget", 
        path: "/budget", 
        icon: Wallet,
        subItems: [
            { name: "Monthly View", path: "/budget/monthly", icon: ArrowRight },
            { name: "Category Details", path: "/budget/categories", icon: ArrowRight },
        ]
    },
    { 
        name: "Transactions", 
        path: "/transactions", 
        icon: FileText,
        subItems: [
            { name: "All Transactions", path: "/transactions/list", icon: ArrowRight },
            { name: "Add New", path: "/transactions/add", icon: ArrowRight },
        ]
    },
    { 
        name: "Shopping List", 
        path: "/shopping", 
        icon: ShoppingCart,
        subItems: [
            { name: "Lists Overview", path: "/shopping/lists", icon: ArrowRight },
            { name: "Checkout", path: "/shopping/checkout", icon: ArrowRight },
        ]
    },
    { 
        name: "Savings", 
        path: "/savings", 
        icon: PiggyBank,
        subItems: [
            { name: "Savings Goals", path: "/savings/dashboard", icon: ArrowRight },
            { name: "Single Goal", path: "/savings/goal/:id", icon: ArrowRight },
        ]
    },
    { 
        name: "Month End", 
        path: "/month-end", 
        icon: CalendarCheck,
        subItems: [
            { name: "Closeout Wizard", path: "/month-end/wizard", icon: ArrowRight },
        ]
    },
];

// --- Utility function for Header Title ---
const getPageTitle = (pathname: string): string => {
    // Flatten all items and subItems
    const allItems = NAVIGATION_MODULES.flatMap(module => [module, ...(module.subItems || [])]);

    // Find a match based on the current pathname
    const currentItem = allItems.find(item => {
        // Normalize paths (remove dynamic parts like :id and trailing slashes)
        const itemPath = item.path.replace(/:\w+/g, '').replace(/\/$/, '');
        const currentPath = pathname.replace(/\/$/, '');

        // Check for exact match or startsWith for top-level modules
        return itemPath === currentPath || (itemPath !== "/" && currentPath.startsWith(itemPath));
    });

    return currentItem ? currentItem.name : "SmartBudget";
};


// --- Sub-Component: Navigation Item ---
interface NavLinkProps {
    item: NavItem;
    isActive: boolean;
    onClick?: () => void; // Added for mobile menu closure
}

const NavLink: React.FC<NavLinkProps> = ({ item, isActive, onClick }) => {
    const location = useLocation();
    // Only use the top-level path for the main link, sub-items handle specifics
    const linkPath = item.path.includes(':') ? item.path.split('/:')[0] : item.path;
    const hasActiveSubItem = item.subItems?.some(sub => location.pathname.startsWith(sub.path.split(':')[0])) || false;

    return (
        <motion.div layout>
            <Link to={linkPath} onClick={onClick}>
                <motion.div
                    className={`flex items-center p-3 rounded-xl transition-all duration-200 cursor-pointer ${
                        isActive || hasActiveSubItem
                            ? 'font-semibold text-white shadow-lg' 
                            : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    style={{ backgroundColor: isActive || hasActiveSubItem ? PRIMARY_BLUE : 'transparent' }}
                    whileHover={{ scale: (isActive || hasActiveSubItem) ? 1.02 : 1.00 }}
                >
                    <item.icon className="w-5 h-5 mr-3" />
                    <span>{item.name}</span>
                </motion.div>
            </Link>
            
            {/* Render Sub-Items (Only show if the module is active) */}
            {item.subItems && (isActive || hasActiveSubItem) && (
                <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="ml-5 mt-2 space-y-1"
                >
                    {item.subItems.map(subItem => {
                        const subPath = subItem.path.split('/:')[0];
                        const isSubActive = location.pathname.startsWith(subPath);
                        return (
                            <Link key={subItem.path} to={subPath} onClick={onClick}>
                                <motion.div
                                    className={`flex items-center text-sm p-2 rounded-lg transition-colors ${
                                        isSubActive 
                                        ? 'text-gray-900 font-semibold bg-gray-100' 
                                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                                    }`}
                                >
                                    <subItem.icon className="w-4 h-4 mr-2" />
                                    {subItem.name.includes(":") ? subItem.name.split(" ")[0] : subItem.name}
                                </motion.div>
                            </Link>
                        );
                    })}
                </motion.div>
            )}
        </motion.div>
    );
};

// --- Sub-Component: Side Navigation ---
interface SideNavProps {
    onLinkClick?: () => void;
}

const SideNav: React.FC<SideNavProps> = ({ onLinkClick }) => {
    const location = useLocation();
    const { logout } = useAuthStore();

    // Function to check if a main module path is active (ignoring sub-paths)
    const isModuleActive = (path: string): boolean => {
        // Ensure path comparison works for /budget vs /budget/monthly
        const base = path.split('/:')[0];
        return location.pathname.startsWith(base);
    };

    return (
        <div className="flex flex-col h-full p-6 space-y-6 overflow-y-auto border-r border-gray-100 bg-white shadow-xl">
            {/* Logo */}
            <div className="flex-shrink-0 mb-4">
                <Link to="/dashboard" className="text-2xl font-black" style={{ color: PRIMARY_BLUE }} onClick={onLinkClick}>
                    SMARTBUDGET
                </Link>
            </div>
            <Separator />
            
            {/* Main Navigation Links */}
            <nav className="flex-grow space-y-1">
                {NAVIGATION_MODULES.map((item) => (
                    <NavLink
                        key={item.path}
                        item={item}
                        isActive={isModuleActive(item.path)}
                        onClick={onLinkClick}
                    />
                ))}
            </nav>

            {/* User/Settings Section */}
            <div className="mt-auto space-y-4">
                <Separator />
                <Button 
                    variant="ghost" 
                    className="w-full justify-start text-gray-700 hover:bg-gray-100 rounded-xl"
                >
                    <Settings className="w-5 h-5 mr-3" />
                    Settings
                </Button>
                <Button 
                    variant="ghost" 
                    className="w-full justify-start text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-xl"
                    onClick={logout} // Use real logout function
                >
                    <LogOut className="w-5 h-5 mr-3" />
                    Log Out
                </Button>
            </div>
        </div>
    );
};

// --- Sub-Component: Header ---
interface HeaderProps {
    onMenuToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
    const { user } = useAuthStore();
    const location = useLocation();
    
    // Dynamic Title
    const title = getPageTitle(location.pathname);

    return (
        <header className="flex items-center justify-between p-4 bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
            
            {/* Mobile Menu Button + Title */}
            <div className='flex items-center'>
                <Button variant="ghost" className="lg:hidden p-2 mr-3" onClick={onMenuToggle}>
                    <Menu className="w-6 h-6" />
                </Button>
                <h1 className="text-xl font-bold text-gray-800">{title}</h1>
            </div>

            <div className="flex items-center space-x-4">
                {/* Profile Icon / User Info (Hidden on small screens for cleaner look) */}
                <div className="hidden sm:flex items-center space-x-2 text-gray-700">
                    <User className="w-5 h-5" />
                    <span className="font-medium text-sm">{user?.name || 'User'}</span>
                </div>

                {/* Main Action Button (e.g., Add Transaction) */}
                <Link to="/transactions/add">
                    <motion.div whileHover={{ scale: 1.05 }} className="inline-block">
                        <Button 
                            className="rounded-xl shadow-md font-semibold h-9 px-4 text-sm"
                            style={{ backgroundColor: BRAND_GREEN }}
                        >
                            <ArrowRight className="w-4 h-4 mr-2" />
                            Quick Add
                        </Button>
                    </motion.div>
                </Link>
            </div>
        </header>
    );
};

// --- Main Component: MainLayout ---
interface MainLayoutProps {
    children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const location = useLocation();
    const { user } = useAuthStore();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Ensure user is present before rendering, although ProtectedRoute handles the hard redirect.
    if (!user) {
        // This state should ideally not be reached if ProtectedRoute is working correctly, 
        // but it prevents rendering if user is unexpectedly null.
        return null; 
    }

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
    const closeMobileMenu = () => setIsMobileMenuOpen(false);


    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            
            {/* 1. Side Navigation (Desktop Fixed) */}
            <motion.div
                initial={{ x: -200 }}
                animate={{ x: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                className="hidden lg:flex flex-shrink-0 w-72" 
            >
                <SideNav />
            </motion.div>

            {/* 1b. Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                    onClick={closeMobileMenu}
                />
            )}
            <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: isMobileMenuOpen ? '0%' : '-100%' }}
                transition={{ type: "tween", duration: 0.3 }}
                className="fixed top-0 left-0 h-full w-72 z-40 lg:hidden bg-white shadow-2xl"
            >
                <div className="absolute top-4 right-4">
                    <Button variant="ghost" size="icon" onClick={closeMobileMenu}>
                        <X className="h-6 w-6" />
                    </Button>
                </div>
                <SideNav onLinkClick={closeMobileMenu} />
            </motion.div>

            {/* 2. Main Content Area */}
            <div className="flex flex-col flex-grow overflow-x-hidden">
                
                {/* 2a. Header */}
                <Header onMenuToggle={toggleMobileMenu} />

                {/* 2b. Page Content */}
                <motion.main
                    key={location.pathname} // Important for page transition
                    className="flex-grow overflow-y-auto p-4 md:p-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {children}
                </motion.main>
            </div>
        </div>
    );
};

export default MainLayout;
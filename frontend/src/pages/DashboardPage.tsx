// frontend/src/pages/DashboardPage.tsx

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/store/authStore';
import { motion } from 'framer-motion';
import { 
    DollarSign, 
    Zap, 
    Target, 
    ArrowUpCircle, 
    ArrowDownCircle, 
    AlertTriangle, 
    TrendingUp, 
    FileText, 
    PlusCircle, 
    ShoppingCart, 
    ClipboardList, 
    BookOpen 
} from 'lucide-react';

// --- Theme Colors (Based on WelcomePage) ---
const PRIMARY_BLUE = 'hsl(220, 80%, 50%)';
const BRAND_GREEN = 'hsl(140, 70%, 45%)';
const ACCENT_YELLOW = 'hsl(40, 85%, 60%)';


// --- Utility Functions & Mock Data ---

// Function to calculate day progress for the progress bar
const calculateMonthProgress = (start: Date, end: Date, current: Date) => {
    const totalDays = end.getTime() - start.getTime();
    const elapsedDays = current.getTime() - start.getTime();
    return Math.min(100, Math.round((elapsedDays / totalDays) * 100));
};

const mockData = {
    cashBalance: 4520.75,
    freeToSpend: 1250.00,
    monthStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    monthEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
    currentDay: new Date(),
    categories: [
        { id: 1, name: "Rent/Mortgage", planned: 2000, actual: 2000, variance: 0 },
        { id: 2, name: "Groceries", planned: 600, actual: 450, variance: 150 }, // Under budget
        { id: 3, name: "Dining Out", planned: 250, actual: 320, variance: -70 }, // Over budget
        { id: 4, name: "Transportation", planned: 150, actual: 100, variance: 50 },
        { id: 5, name: "Utilities", planned: 180, actual: 195, variance: -15 },
    ],
    insights: [
        { type: "alert", text: "Spending in 'Dining Out' is 28% over budget.", icon: AlertTriangle, style: "text-red-600 bg-red-50" },
        { type: "projection", text: "On track to hit your savings goal 2 months early!", icon: TrendingUp, style: `text-[${BRAND_GREEN}] bg-[hsl(140,70%,95%)]` },
        { type: "warning", text: "Grocery spending is low, consider allocating $50 to savings.", icon: Zap, style: `text-[${ACCENT_YELLOW}] bg-[hsl(40,85%,90%)]` },
        { type: "tip", text: "You have spent 50% less on streaming this month.", icon: BookOpen, style: `text-[${PRIMARY_BLUE}] bg-[hsl(220,80%,95%)]` },
    ]
};

// --- Component Fragments ---

interface CategoryVarianceProps {
    name: string;
    planned: number;
    actual: number;
    variance: number;
}

const CategoryVarianceCard: React.FC<CategoryVarianceProps> = ({ name, planned, actual, variance }) => {
    const isUnderBudget = variance >= 0;
    const progress = (actual / planned) * 100;
    
    // Custom colors using the brand palette
    const barColor = isUnderBudget && progress <= 100 
        ? `bg-[${BRAND_GREEN}]` 
        : 'bg-red-500';
    
    const varianceSign = isUnderBudget ? '+' : '-';
    const varianceStyle = isUnderBudget 
        ? { color: BRAND_GREEN, className: 'text-sm font-semibold flex items-center' } 
        : { color: 'rgb(239, 68, 68)', className: 'text-sm text-red-600 font-semibold flex items-center' }; // Tailwind Red
    
    const displayProgress = Math.min(100, progress);

    return (
        <Card className="hover:shadow-xl transition-shadow duration-300 rounded-2xl border border-gray-100">
            <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-1">
                <CardTitle className="text-sm font-medium">{name}</CardTitle>
                <div className="flex items-center text-xs font-semibold text-gray-500">
                    Planned: ${planned.toFixed(0)}
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-2">
                <div className="text-2xl font-bold">${actual.toFixed(2)}</div>
                
                {/* Green/Red variance bar (Planned vs Actual) */}
                <div className="relative h-2 w-full rounded-full bg-gray-200">
                    <div 
                        className={`absolute h-full rounded-full ${barColor}`} 
                        style={{ width: `${displayProgress}%` }}
                    />
                    {/* Marker for 100% of planned */}
                    <div className="absolute h-3 w-0.5 bg-gray-700 -top-0.5" style={{ left: '100%' }} />
                </div>

                <div className={varianceStyle.className} style={{ color: varianceStyle.color }}>
                    {isUnderBudget ? <ArrowUpCircle className="w-4 h-4 mr-1" /> : <ArrowDownCircle className="w-4 h-4 mr-1" />}
                    {varianceSign}${Math.abs(variance).toFixed(2)} {isUnderBudget ? 'Under Budget' : 'Over Budget'}
                </div>
            </CardContent>
        </Card>
    );
};

interface InsightProps {
    text: string;
    Icon: React.ElementType;
    style: string;
}

const InsightCard: React.FC<InsightProps> = ({ text, Icon, style }) => {
    // Custom color extraction for icon
    const iconColor = style.match(/text-\[([^\]]+)\]/)?.[1] || 'text-gray-800';

    return (
        <div className={`flex items-start p-3 rounded-xl border ${style} border-opacity-30`}>
            {/* Set icon color dynamically from the style prop for consistency */}
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 mr-3`} style={{ color: iconColor }} />
            <p className="text-sm text-gray-700">{text}</p>
        </div>
    );
};

// --- Main Dashboard Component ---

const DashboardPage = () => {
    const { user } = useAuthStore();
    const monthProgress = calculateMonthProgress(
        mockData.monthStart, 
        mockData.monthEnd, 
        mockData.currentDay
    );

    const monthName = mockData.monthStart.toLocaleString('default', { month: 'long' });

    return (
        <motion.div 
            className="p-4 md:p-8 bg-gray-50 min-h-screen font-sans antialiased"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            {/* 1. Health Header */}
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.name || 'User'}!</h1>
                <p className="text-lg font-medium flex items-center" style={{ color: BRAND_GREEN }}>
                    <Zap className="w-5 h-5 mr-2" style={{ color: BRAND_GREEN }} />
                    Budget Health: Excellent. Your funds are fully allocated for {monthName}.
                </p>
            </header>

            {/* Main Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* --- LEFT/MAIN COLUMN (Col Span 3 on Large Screens) --- */}
                <div className="lg:col-span-3 space-y-6">

                    {/* 2. Cash Balance & 3. Free-to-Spend */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="rounded-2xl shadow-xl border border-gray-100" style={{ borderLeft: `4px solid ${PRIMARY_BLUE}` }}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Cash Balance</CardTitle>
                                <DollarSign className="h-4 w-4 text-gray-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-gray-900">${mockData.cashBalance.toFixed(2)}</div>
                                <p className="text-xs text-gray-500 mt-1">Total across all linked accounts</p>
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl shadow-xl border border-gray-100" style={{ borderLeft: `4px solid ${BRAND_GREEN}` }}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Free-to-Spend</CardTitle>
                                <Target className="h-4 w-4 text-gray-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold" style={{ color: BRAND_GREEN }}>${mockData.freeToSpend.toFixed(2)}</div>
                                <p className="text-xs text-gray-500 mt-1">Available to budget or roll over</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* 4. Month Progress (Timeline Bar) */}
                    <Card className="shadow-lg rounded-2xl border border-gray-100">
                        <CardHeader>
                            <CardTitle className="text-lg">Month Progress</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between text-sm text-gray-600 mb-2">
                                <span>{mockData.monthStart.toLocaleDateString()}</span>
                                <span>Day {mockData.currentDay.getDate()} of {mockData.monthEnd.getDate()}</span>
                                <span>{mockData.monthEnd.toLocaleDateString()}</span>
                            </div>
                            {/* Using an arbitrary value utility for the indicator color */}
                            <Progress value={monthProgress} className="h-3" indicatorColor={`bg-[${PRIMARY_BLUE}]`} />
                            <p className="text-sm text-center text-gray-500 mt-2">{monthProgress}% of the month completed.</p>
                        </CardContent>
                    </Card>

                    {/* 5. Variance Cards (Category Planned vs Actual) */}
                    <h2 className="text-2xl font-semibold text-gray-800 pt-4">Budget Variance: {monthName}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {mockData.categories.map(cat => (
                            <CategoryVarianceCard key={cat.id} {...cat} />
                        ))}
                    </div>

                </div>

                {/* --- RIGHT COLUMN (Sidebar) --- */}
                <div className="lg:col-span-1 space-y-6">
                    
                    {/* 7. Quick Actions */}
                    <Card className="shadow-lg rounded-2xl border border-gray-100">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center font-bold" style={{ color: PRIMARY_BLUE }}>
                                <Zap className="w-5 h-5 mr-2" style={{ color: PRIMARY_BLUE }} /> Quick Actions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Button className="w-full justify-start h-10 rounded-xl font-medium border border-gray-200 hover:bg-gray-100 bg-white text-gray-800" variant="secondary">
                                <PlusCircle className="w-5 h-5 mr-3" style={{ color: BRAND_GREEN }} />
                                Add New Transaction
                            </Button>
                            <Button className="w-full justify-start h-10 rounded-xl font-medium border border-gray-200 hover:bg-gray-100 bg-white text-gray-800" variant="secondary">
                                <ShoppingCart className="w-5 h-5 mr-3" style={{ color: PRIMARY_BLUE }} />
                                Add Shopping Item
                            </Button>
                            <Button className="w-full justify-start h-10 rounded-xl font-medium border border-gray-200 hover:bg-gray-100 bg-white text-gray-800" variant="secondary">
                                <ClipboardList className="w-5 h-5 mr-3" style={{ color: ACCENT_YELLOW }} />
                                View Full Budget
                            </Button>
                        </CardContent>
                    </Card>

                    {/* 6. Insight Feed (AI powered) */}
                    <Card className="shadow-lg rounded-2xl border border-gray-100">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center font-bold text-gray-900">
                                <FileText className="w-5 h-5 mr-2" style={{ color: PRIMARY_BLUE }} /> Insight Feed
                            </CardTitle>
                            <CardDescription>AI-powered suggestions and alerts for your finances.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {mockData.insights.map((insight, index) => (
                                // InsightCard styles are updated to use arbitrary HSL values for background and text
                                <InsightCard 
                                    key={index}
                                    text={insight.text}
                                    Icon={insight.icon}
                                    style={insight.style}
                                />
                            ))}
                        </CardContent>
                    </Card>

                </div>
            </div>
        </motion.div>
    );
};

export default DashboardPage;
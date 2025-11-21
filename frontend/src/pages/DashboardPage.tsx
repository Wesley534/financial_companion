// frontend/src/pages/DashboardPage.tsx

import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuthStore } from '@/store/authStore';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client'; // Import the centralized API client
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
    Loader2
} from 'lucide-react';

// --- Type Definitions (Matching FastAPI Schemas) ---
interface CategoryOut {
    id: number;
    name: string;
    type: string;
    planned: number;
    actual: number;
    icon: string;
    color: string;
}

interface BudgetTotals {
    planned: number;
    actual: number;
    difference: number;
}

interface MonthlyBudgetOut {
    id: number;
    month: string;
    income: number;
    starting_balance: number;
    free_to_spend: number;
    totals: BudgetTotals;
    categories: CategoryOut[];
}

interface InsightsResponse {
    insights: { type: string; text: string }[];
}

interface PredictStatusResponse {
    projection: string;
    risk_level: 'High' | 'Medium' | 'Low';
}

// --- Theme Colors ---
const PRIMARY_BLUE = 'hsl(220, 80%, 50%)';
const BRAND_GREEN = 'hsl(140, 70%, 45%)';

// --- Utility Functions ---

// Function to calculate day progress for the progress bar
const calculateMonthProgress = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const totalDays = end.getTime() - start.getTime();
    const elapsedDays = now.getTime() - start.getTime();
    return Math.min(100, Math.round((elapsedDays / totalDays) * 100));
};

// --- API Fetching Functions ---

const fetchCurrentBudget = async (): Promise<MonthlyBudgetOut> => {
    const response = await apiClient.get('/budget/current');
    return response.data;
};

const fetchAIPrediction = async (monthProgress: number, currentVariance: number): Promise<PredictStatusResponse> => {
    const response = await apiClient.post('/ai/predict-budget-status', {
        month_progress_percent: monthProgress,
        current_variance_percent: currentVariance // Total Actual / Total Planned
    });
    return response.data;
};

const fetchAIInsights = async (spendingSummaryText: string): Promise<InsightsResponse> => {
    const response = await apiClient.post('/ai/insights', {
        spending_summary_text: spendingSummaryText,
        // In a real app, you'd include goals, strict_mode, etc. here
    });
    return response.data;
};

// --- Component Fragments ---

interface CategoryVarianceProps {
    category: CategoryOut;
}

const CategoryVarianceCard: React.FC<CategoryVarianceProps> = ({ category }) => {
    const { name, planned, actual } = category;
    const variance = planned - actual;
    const isUnderBudget = variance >= 0;
    const progress = (actual / planned) * 100;
    const barColor = isUnderBudget && progress <= 100 ? `bg-[${BRAND_GREEN}]` : 'bg-red-500';
    const varianceSign = isUnderBudget ? '+' : '-';
    const varianceStyle = isUnderBudget 
        ? { color: BRAND_GREEN, className: 'text-sm font-semibold flex items-center' } 
        : { color: 'rgb(239, 68, 68)', className: 'text-sm text-red-600 font-semibold flex items-center' };
    
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
    type: string;
}

const InsightCard: React.FC<InsightProps> = ({ text, type }) => {
    let Icon: React.ElementType = FileText;
    let style = "text-gray-600 bg-gray-50";

    if (type === 'alert') {
        Icon = AlertTriangle;
        style = "text-red-600 bg-red-50 border-red-200";
    } else if (type === 'projection') {
        Icon = TrendingUp;
        style = `text-[${BRAND_GREEN}] bg-[hsl(140,70%,95%)] border-[hsl(140,70%,85%)]`;
    } else if (type === 'tip' || type === 'warning') {
        Icon = Zap;
        style = `text-[${PRIMARY_BLUE}] bg-[hsl(220,80%,95%)] border-[hsl(220,80%,85%)]`;
    }

    // Adjust color for icon when background is light
    const iconColor = type === 'alert' ? 'rgb(239, 68, 68)' : type === 'projection' ? BRAND_GREEN : PRIMARY_BLUE;

    return (
        <div className={`flex items-start p-3 rounded-xl border ${style} border-opacity-30`}>
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 mr-3`} style={{ color: iconColor }} />
            <p className="text-sm text-gray-700">{text}</p>
        </div>
    );
};

// --- Main Dashboard Component ---

const DashboardPage = () => {
    const { user } = useAuthStore();
    const monthProgress = calculateMonthProgress();
    const monthName = new Date().toLocaleString('default', { month: 'long' });

    // 1. Fetch Current Budget Data
    const { data: budgetData, isLoading: isBudgetLoading, error: budgetError } = useQuery<MonthlyBudgetOut>({
        queryKey: ['currentBudget'],
        queryFn: fetchCurrentBudget,
        staleTime: 5 * 60 * 1000, // Stale for 5 minutes
    });
    
    // Derived values for AI calls
    const totalPlanned = budgetData?.totals.planned || 0;
    const totalActual = budgetData?.totals.actual || 0;
    // Current variance (Actual/Planned) - used to determine risk level
    const currentVarianceRatio = totalPlanned > 0 ? totalActual / totalPlanned : 0;
    
    // Generate a simple spending summary for the Insights API
    const spendingSummary = `Total Planned: $${totalPlanned}, Total Actual: $${totalActual}, Month Progress: ${monthProgress}%. Categories: ${budgetData?.categories.map(c => `${c.name} (Planned: ${c.planned}, Actual: ${c.actual})`).join(', ')}`;
    
    // 2. Fetch AI Prediction for Health Header
    const { data: predictionData, isLoading: isPredictionLoading } = useQuery<PredictStatusResponse>({
        queryKey: ['aiPrediction', monthProgress, currentVarianceRatio],
        queryFn: () => fetchAIPrediction(monthProgress, currentVarianceRatio),
        enabled: !!budgetData, // Only run once budget data is available
        staleTime: 10 * 60 * 1000,
    });

    // 3. Fetch AI Insights for Feed
    const { data: insightsData, isLoading: isInsightsLoading } = useQuery<InsightsResponse>({
        queryKey: ['aiInsights', spendingSummary],
        queryFn: () => fetchAIInsights(spendingSummary),
        enabled: !!budgetData, // Only run once budget data is available
        staleTime: 30 * 60 * 1000,
    });

    if (isBudgetLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <p className="ml-3 text-gray-600">Loading budget data...</p>
            </div>
        );
    }

    if (budgetError) {
        return (
            <div className="p-8 text-center text-red-600 border border-red-200 bg-red-50 rounded-lg">
                <h2 className="text-xl font-bold mb-2">Error Loading Data</h2>
                <p>Could not fetch budget data. Please check your API server connection.</p>
                <p className="text-sm mt-2">Error: {budgetError.message}</p>
            </div>
        );
    }

    const freeToSpend = budgetData?.free_to_spend || 0;
    const isBudgetBalanced = freeToSpend === 0;
    const healthProjection = predictionData?.projection || (totalActual <= totalPlanned ? "Budget on track." : "Over budget trend detected.");
    
    let healthColor = 'text-green-600';
    if (predictionData?.risk_level === 'High') {
        healthColor = 'text-red-600';
    } else if (predictionData?.risk_level === 'Medium') {
        healthColor = 'text-orange-600';
    }

    const healthStyle = healthColor === 'text-green-600' ? { color: BRAND_GREEN } : {};


    return (
        <motion.div 
            className="p-4 md:p-8 bg-gray-50 min-h-screen"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            {/* 1. Health Header */}
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.name || 'User'}!</h1>
                <p className={`text-lg font-medium flex items-center ${healthColor}`} style={healthStyle}>
                    <Zap className="w-5 h-5 mr-2" style={healthStyle} />
                    Budget Health: {healthProjection}
                </p>
                {isPredictionLoading && <p className="text-sm text-gray-500 mt-1">Calculating projection...</p>}
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
                                <div className="text-3xl font-bold text-gray-900">${(budgetData?.starting_balance || 0).toFixed(2)}</div>
                                <p className="text-xs text-gray-500 mt-1">Starting balance (Proxy)</p>
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl shadow-xl border border-gray-100" style={{ borderLeft: `4px solid ${BRAND_GREEN}` }}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Free-to-Spend</CardTitle>
                                <Target className="h-4 w-4 text-gray-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold" style={{ color: BRAND_GREEN }}>${freeToSpend.toFixed(2)}</div>
                                <p className="text-xs text-gray-500 mt-1">{isBudgetBalanced ? 'Funds fully allocated' : 'Available to budget or roll over'}</p>
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
                                <span>{new Date(budgetData?.month + '-01').toLocaleDateString()}</span>
                                <span>{monthProgress}% Complete</span>
                                <span>{new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toLocaleDateString()}</span>
                            </div>
                            <Progress value={monthProgress} className="h-3" indicatorColor={`bg-[${PRIMARY_BLUE}]`} />
                            <p className="text-sm text-center text-gray-500 mt-2">Day {new Date().getDate()} of {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()} completed.</p>
                        </CardContent>
                    </Card>

                    {/* 5. Variance Cards (Category Planned vs Actual) */}
                    <h2 className="text-2xl font-semibold text-gray-800 pt-4">Budget Variance: {monthName}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {budgetData?.categories
                            .filter(cat => cat.type !== 'Savings') // Filter out Savings for the main expense variance view
                            .map(cat => (
                            <CategoryVarianceCard key={cat.id} category={cat} />
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
                            {/* Assuming routes are set up from MainLayout */}
                            <Link to="/transactions/add" className="block">
                                <Button className="w-full justify-start h-10 rounded-xl font-medium border border-gray-200 hover:bg-gray-100 bg-white text-gray-800" variant="secondary">
                                    <PlusCircle className="w-5 h-5 mr-3" style={{ color: BRAND_GREEN }} />
                                    Add New Transaction
                                </Button>
                            </Link>
                            <Link to="/shopping/lists" className="block">
                                <Button className="w-full justify-start h-10 rounded-xl font-medium border border-gray-200 hover:bg-gray-100 bg-white text-gray-800" variant="secondary">
                                    <ShoppingCart className="w-5 h-5 mr-3" style={{ color: PRIMARY_BLUE }} />
                                    View Shopping Lists
                                </Button>
                            </Link>
                            <Link to="/budget/monthly" className="block">
                                <Button className="w-full justify-start h-10 rounded-xl font-medium border border-gray-200 hover:bg-gray-100 bg-white text-gray-800" variant="secondary">
                                    <ClipboardList className="w-5 h-5 mr-3" style={{ color: PRIMARY_BLUE }} />
                                    View Full Budget
                                </Button>
                            </Link>
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
                            {isInsightsLoading && (
                                <div className="flex items-center text-sm text-gray-500">
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating insights...
                                </div>
                            )}
                            {insightsData?.insights.map((insight, index) => (
                                <InsightCard 
                                    key={index}
                                    text={insight.text}
                                    type={insight.type}
                                />
                            ))}
                            {insightsData?.insights.length === 0 && !isInsightsLoading && (
                                <p className="text-sm text-gray-500 italic">No pressing insights or alerts at this time.</p>
                            )}
                        </CardContent>
                    </Card>

                </div>
            </div>
        </motion.div>
    );
};

export default DashboardPage;
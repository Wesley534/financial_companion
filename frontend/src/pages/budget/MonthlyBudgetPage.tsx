// frontend/src/pages/budget/MonthlyBudgetPage.tsx

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // Added useMutation, useQueryClient
import apiClient from '@/api/client';
import { Loader2, PlusCircle, RefreshCw, ChevronRight, Settings, Repeat } from 'lucide-react'; // Added Repeat icon

// Component Imports (Assuming shadcn setup)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
// NOTE: Assuming you have a Toast component for success/error messages

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

// --- Theme Colors ---
const PRIMARY_BLUE = 'hsl(220, 80%, 50%)';
const BRAND_GREEN = 'hsl(140, 70%, 45%)';

// --- API Fetching Function ---

const fetchCurrentBudget = async (): Promise<MonthlyBudgetOut> => {
    const response = await apiClient.get('/budget/current');
    return response.data;
};

// --- API Mutation Function (Placeholder for 50/30/20 reset) ---
// NOTE: We don't have an exact 'reset' endpoint, so this mocks it as a setup call
// In a real app, you'd create POST /budget/reset-50-30-20
const mockResetBudget = async () => {
    // This is a placeholder for a complex backend action
    await new Promise(resolve => setTimeout(resolve, 500));
    // Simulate an error if the user has too much actual spending
    // if (Math.random() > 0.8) throw new Error("Cannot reset: Too many transactions already logged.");
};


// --- Component: Variance Indicator ---
const VarianceIndicator: React.FC<{ value: number }> = ({ value }) => {
    const isPositive = value >= 0;
    const color = isPositive ? BRAND_GREEN : 'rgb(239, 68, 68)'; // Tailwind Red-500
    const sign = isPositive ? '+' : '';

    return (
        <span style={{ color }} className="font-semibold text-sm">
            {sign}${Math.abs(value).toFixed(2)}
        </span>
    );
};

// --- Main Component ---

const MonthlyBudgetPage: React.FC = () => {
    const queryClient = useQueryClient();
    
    // Data Fetch
    const { data: budgetData, isLoading, error, refetch } = useQuery<MonthlyBudgetOut>({
        queryKey: ['currentBudget'],
        queryFn: fetchCurrentBudget,
    });
    
    // Reset Mutation
    const resetMutation = useMutation({
        mutationFn: mockResetBudget, // Using the mock for now
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['currentBudget'] });
            // Show a success toast
        },
        onError: (err: any) => {
            // Show an error toast
            console.error("Budget reset failed:", err.message);
        },
    });
    
    // Handlers
    const handleReset = () => {
        if (window.confirm("Are you sure you want to reset your budget? This will overwrite ALL planned amounts (Needs/Wants/Savings) for the current month.")) {
            resetMutation.mutate();
        }
    };
    
    const handleAdjustPlanned = () => {
        alert("Action: Open dialog to edit Category Planned Amounts (PATCH /category/update/{id})");
    };


    if (isLoading || resetMutation.isPending) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <p className="ml-3 text-gray-600">
                    {resetMutation.isPending ? 'Resetting budget...' : 'Loading monthly budget...'}
                </p>
            </div>
        );
    }

    if (error || resetMutation.isError) {
        const err = error || resetMutation.error;
        return (
            <div className="p-8 text-center text-red-600 border border-red-200 bg-red-50 rounded-lg">
                <h2 className="text-xl font-bold mb-2">Error</h2>
                <p>{err.message}</p>
                <Button onClick={() => refetch()} className="mt-4">
                    <RefreshCw className="w-4 h-4 mr-2" /> Try Again
                </Button>
            </div>
        );
    }

    if (!budgetData) return <div>No budget data found. Run the setup wizard.</div>;

    const monthDisplay = new Date(budgetData.month + '-01').toLocaleDateString('default', { month: 'long', year: 'numeric' });
    const categories = budgetData.categories.sort((a, b) => a.type.localeCompare(b.type)); // Group by type

    return (
        <motion.div 
            className="space-y-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-gray-900">Budget for {monthDisplay}</h1>
                <div className="flex space-x-3">
                    {/* Reset to 50/30/20 Button */}
                    <Button 
                        variant="outline" 
                        className="rounded-xl border-gray-200"
                        onClick={handleReset}
                        disabled={resetMutation.isPending}
                    >
                        <Repeat className="w-4 h-4 mr-2" /> Reset to 50/30/20
                    </Button>

                    {/* Adjust Planned Budget Button */}
                    <Button 
                        variant="outline" 
                        className="rounded-xl border-gray-200"
                        onClick={handleAdjustPlanned}
                    >
                        <Settings className="w-4 h-4 mr-2" /> Adjust Planned Budget
                    </Button>

                    {/* Add Category Button */}
                    <Link to="/budget/categories/add"> 
                        <Button className="rounded-xl" style={{ backgroundColor: PRIMARY_BLUE }}>
                            <PlusCircle className="w-4 h-4 mr-2" /> Add Category
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Top Cards Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="rounded-2xl shadow-md border border-gray-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${budgetData.income.toFixed(2)}</div>
                    </CardContent>
                </Card>
                <Card className="rounded-2xl shadow-md border border-gray-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Planned</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${budgetData.totals.planned.toFixed(2)}</div>
                    </CardContent>
                </Card>
                <Card className="rounded-2xl shadow-md border border-gray-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Free To Spend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold" style={{ color: budgetData.free_to_spend >= 0 ? BRAND_GREEN : 'red' }}>
                            ${budgetData.free_to_spend.toFixed(2)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Budget Table */}
            <Card className="rounded-2xl shadow-lg border border-gray-100">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableHead className="w-[40%] text-gray-600">Category</TableHead>
                            <TableHead className="w-[15%] text-gray-600">Planned</TableHead>
                            <TableHead className="w-[15%] text-gray-600">Actual</TableHead>
                            <TableHead className="w-[15%] text-gray-600">Difference</TableHead>
                            <TableHead className="w-[15%] text-gray-600 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {categories.map(cat => (
                            // Ensure the key is used on the outermost element
                            <TableRow key={cat.id} className="hover:bg-gray-50/50">
                                <TableCell className="font-medium text-gray-900 flex items-center">
                                    <span className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: cat.color }}></span>
                                    {cat.name}
                                    <span className={`ml-3 text-xs font-semibold px-2 py-0.5 rounded-full ${
                                        cat.type === 'Need' ? 'bg-blue-100 text-blue-800' :
                                        cat.type === 'Want' ? 'bg-orange-100 text-orange-800' :
                                        'bg-green-100 text-green-800'
                                    }`}>
                                        {cat.type}
                                    </span>
                                </TableCell>
                                <TableCell>${cat.planned.toFixed(2)}</TableCell>
                                <TableCell>${cat.actual.toFixed(2)}</TableCell>
                                <TableCell>
                                    <VarianceIndicator value={cat.planned - cat.actual} />
                                </TableCell>
                                <TableCell className="text-right">
                                    <Link to={`/budget/categories/${cat.id}`}>
                                        <Button variant="ghost" size="sm" className="h-8 p-1 text-gray-500 hover:text-gray-900">
                                            Details <ChevronRight className="w-4 h-4 ml-1" />
                                        </Button>
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                        
                        {/* Summary Row */}
                        <TableRow className="bg-gray-100 font-bold hover:bg-gray-100/80 border-t-2 border-gray-300">
                            <TableCell className="text-gray-900">TOTAL</TableCell>
                            <TableCell>${budgetData.totals.planned.toFixed(2)}</TableCell>
                            <TableCell>${budgetData.totals.actual.toFixed(2)}</TableCell>
                            <TableCell>
                                <VarianceIndicator value={budgetData.totals.difference} />
                            </TableCell>
                            <TableCell className="text-right"></TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </Card>
        </motion.div>
    );
};

export default MonthlyBudgetPage;
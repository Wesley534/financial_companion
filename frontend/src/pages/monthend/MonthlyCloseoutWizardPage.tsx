// frontend/src/pages/monthend/MonthlyCloseoutWizardPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { 
    Loader2, 
    ArrowRight, 
    ArrowLeft, 
    CheckCircle, 
    PieChart, 
    Zap, 
    Repeat,
    PiggyBank,
    CalendarCheck
} from 'lucide-react';

// Component Imports
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

// --- Type Definitions ---
interface CategorySummary {
    name: string;
    type: string;
    planned: number;
    actual: number;
    variance: number; 
}

interface GoalOut {
    id: number;
    name: string;
    target_amount: number;
}

// Wizard Step 1/2 Output Schema
interface WizardStep1Out {
    total_income: number;
    total_expenses: number; // Total actual (Needs + Wants)
    total_planned: number;
    total_actual: number; // Total actual (All categories)
    overall_variance: number; // Income - Total Actual Expenses (Net surplus/shortfall)
    overspent_categories: CategorySummary[];
    underspent_categories: CategorySummary[];
}

// Wizard Step 3 Input Schema
interface WizardStep3In {
    sweep_amount_to_goal: number;
    goal_id?: number; 
    confirmation: boolean;
}

// Wizard Step 4 Output Schema (Final Report)
interface WizardStep4Out {
    month: string;
    new_budget_month?: string;
    new_free_to_spend: number;
    total_income: number;
    total_expenses: number;
    net_surplus: number;
    category_breakdown: CategorySummary[];
    // ... other report fields
}

// --- API Fetching ---

const fetchMonthEndSummary = async (): Promise<WizardStep1Out> => {
    // GET /month-end/wizard/summary
    const response = await apiClient.get('/monthend/wizard/summary');
    return response.data;
};

const fetchGoals = async (): Promise<GoalOut[]> => {
    // GET /goals (for sweep targets)
    const response = await apiClient.get('/goals');
    return response.data;
};

const sweepSurplus = async (data: WizardStep3In): Promise<any> => {
    // POST /month-end/wizard/sweep
    const response = await apiClient.post('/monthend/wizard/sweep', data);
    return response.data;
};

const startNewMonth = async (priorMonth: string): Promise<WizardStep4Out> => {
    // POST /month-end/wizard/start-new-month?prior_month=YYYY-MM
    const response = await apiClient.post(`/monthend/wizard/start-new-month?prior_month=${priorMonth}`);
    return response.data;
};

// --- Main Component ---

const MonthlyCloseoutWizardPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [step, setStep] = useState(1);
    const currentMonth = new Date().toISOString().substring(0, 7);

    // --- Step 1: Summary Data ---
    const { data: summaryData, isLoading: isSummaryLoading, error: summaryError } = useQuery<WizardStep1Out>({
        queryKey: ['monthEndSummary', currentMonth],
        queryFn: fetchMonthEndSummary,
    });
    
    // --- Step 3: Sweep State ---
    const { data: goals, isLoading: isGoalsLoading } = useQuery<GoalOut[]>({
        queryKey: ['goalsList'],
        queryFn: fetchGoals,
        enabled: step === 3,
    });
    
    const [sweepAmount, setSweepAmount] = useState<number>(0);
    const [sweepGoalId, setSweepGoalId] = useState<number | undefined>(undefined);
    
    useEffect(() => {
        // Automatically set sweep amount to overall_variance on load
        if (summaryData && step === 2) {
            setSweepAmount(Math.max(0, summaryData.overall_variance));
        }
    }, [summaryData, step]);
    
    // --- Step 3: Mutation ---
    const sweepMutation = useMutation({
        mutationFn: sweepSurplus,
        onSuccess: () => {
            setStep(4); // Move to final step
        },
        onError: (err: any) => {
             alert(`Sweep Failed: ${err.response?.data?.detail || err.message}`);
        }
    });

    // --- Step 4: Mutation ---
    const startNewMonthMutation = useMutation({
        mutationFn: () => startNewMonth(currentMonth),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['currentBudget'] }); // Force dashboard refresh
            queryClient.invalidateQueries({ queryKey: ['allGoals'] });
            // Redirect to the new dashboard view (or refresh current page if on dashboard)
            navigate('/dashboard'); 
        },
        onError: (err: any) => {
            alert(`New Month Start Failed: ${err.response?.data?.detail || err.message}`);
        }
    });
    
    // --- Rendering Logic ---

    if (isSummaryLoading) {
         return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <p className="ml-3 text-gray-600">Calculating month-end summary...</p>
            </div>
        );
    }
    
    if (summaryError || !summaryData) {
        return <div className="p-4 text-red-600">Error loading month-end summary: {summaryError?.message}</div>;
    }

    const isSurplus = summaryData.overall_variance >= 0;
    const nextMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString('default', { month: 'long', year: 'numeric' });

    // --- Step 1/2 Component: Summary & Report ---
    const SummaryAndReport: React.FC = () => (
        <Card className="rounded-2xl shadow-lg border border-gray-100">
            <CardHeader>
                <CardTitle className="text-2xl flex items-center"><PieChart className="w-6 h-6 mr-3 text-blue-600" /> Month End Summary for {currentMonth}</CardTitle>
                <CardDescription>Review your actual spending and overall surplus/shortfall before closing the month.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Summary Metrics */}
                <div className="grid grid-cols-3 gap-4 text-center border-b pb-4">
                    <div>
                        <p className="text-sm text-gray-500">Total Income</p>
                        <p className="text-2xl font-bold text-gray-800">${summaryData.total_income.toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Total Actual Expenses</p>
                        <p className="text-2xl font-bold text-gray-800">${summaryData.total_expenses.toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Net Surplus/Shortfall</p>
                        <p className={`text-2xl font-bold ${isSurplus ? 'text-green-600' : 'text-red-600'}`}>
                            {isSurplus ? '+' : '-'} ${Math.abs(summaryData.overall_variance).toFixed(2)}
                        </p>
                    </div>
                </div>
                
                {/* Over/Under Tables */}
                <h3 className="text-xl font-bold text-gray-800">Variance Breakdown</h3>
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Overspent */}
                    <Card className="bg-red-50 border-red-200">
                        <CardHeader><CardTitle className="text-lg text-red-700 flex items-center"><Zap className="w-5 h-5 mr-2" /> Overspent Categories</CardTitle></CardHeader>
                        <Table><TableBody>{summaryData.overspent_categories.map(cat => (
                            <TableRow key={cat.name}><TableCell>{cat.name}</TableCell><TableCell className="text-right text-red-600 font-semibold">-${Math.abs(cat.variance).toFixed(2)}</TableCell></TableRow>
                        ))}</TableBody></Table>
                        {summaryData.overspent_categories.length === 0 && <p className="text-sm text-center py-4 text-red-600">No categories over budget. Great job!</p>}
                    </Card>
                    {/* Underspent */}
                    <Card className="bg-green-50 border-green-200">
                        <CardHeader><CardTitle className="text-lg text-green-700 flex items-center"><PiggyBank className="w-5 h-5 mr-2" /> Underspent Categories</CardTitle></CardHeader>
                        <Table><TableBody>{summaryData.underspent_categories.map(cat => (
                            <TableRow key={cat.name}><TableCell>{cat.name}</TableCell><TableCell className="text-right text-green-600 font-semibold">+{cat.variance.toFixed(2)}</TableCell></TableRow>
                        ))}</TableBody></Table>
                        {summaryData.underspent_categories.length === 0 && <p className="text-sm text-center py-4 text-green-600">No categories underspent.</p>}
                    </Card>
                </div>
                
                <div className="flex justify-end pt-4">
                    <Button onClick={() => setStep(3)} className="h-10 text-lg">
                        Proceed to Surplus Sweep <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );

    // --- Step 3 Component: Sweep Surplus ---
    const SweepSurplus: React.FC = () => {
        const canSweep = sweepAmount > 0;
        
        return (
            <Card className="rounded-2xl shadow-lg border border-gray-100">
                <CardHeader>
                    <CardTitle className="text-2xl flex items-center"><Repeat className="w-6 h-6 mr-3 text-purple-600" /> Sweep & Rollover</CardTitle>
                    <CardDescription>Final step for the **${Math.abs(summaryData.overall_variance).toFixed(2)}** {isSurplus ? 'surplus' : 'shortfall'}.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {isSurplus ? (
                        <>
                            <div className="p-4 rounded-lg bg-green-50 border border-green-200 space-y-4">
                                <h3 className="text-lg font-bold text-green-700">Available Surplus: ${summaryData.overall_variance.toFixed(2)}</h3>
                                
                                {/* Sweep Amount Input */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Amount to Sweep/Allocate</label>
                                    <Input 
                                        type="number" 
                                        step="0.01"
                                        value={sweepAmount} 
                                        onChange={(e) => setSweepAmount(Math.min(summaryData.overall_variance, parseFloat(e.target.value) || 0))}
                                    />
                                </div>
                                
                                {/* Target Goal Select */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Target Savings Goal (Optional)</label>
                                    <Select onValueChange={val => setSweepGoalId(val === "0" ? undefined : parseInt(val))} value={String(sweepGoalId || 0)}>
                                        <SelectTrigger><SelectValue placeholder="Roll over to next month (Default)" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0">Roll Over to Next Month's Free-to-Spend</SelectItem>
                                            {goals?.map(goal => (
                                                <SelectItem key={goal.id} value={String(goal.id)}>{goal.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                {/* Final Action Summary */}
                                <p className="text-sm pt-2 text-gray-700">
                                    Final Action: Moving **${sweepAmount.toFixed(2)}** to {sweepGoalId ? `the goal "${goals?.find(g => g.id === sweepGoalId)?.name}"` : "the next month's starting balance"}.
                                </p>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <Button variant="outline" onClick={() => setStep(2)}>
                                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                                </Button>
                                <Button 
                                    onClick={() => sweepMutation.mutate({ sweep_amount_to_goal: sweepAmount, goal_id: sweepGoalId, confirmation: true })}
                                    disabled={!canSweep || sweepMutation.isPending}
                                    className="h-10 text-lg bg-purple-600 hover:bg-purple-700"
                                >
                                    {sweepMutation.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Repeat className="w-5 h-5 ml-2" />}
                                    Finalize Sweep
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="p-8 text-center rounded-lg bg-red-50 border border-red-200">
                            <h3 className="text-lg font-bold text-red-700">No Surplus to Sweep</h3>
                            <p className="text-sm text-gray-600 mt-2">
                                You incurred a **shortfall of ${Math.abs(summaryData.overall_variance).toFixed(2)}**. This will be automatically reflected in the next month's starting balance as a negative amount.
                            </p>
                            <Button onClick={() => setStep(4)} className="mt-4">
                                Skip Sweep & Proceed <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    // --- Step 4 Component: Start New Month ---
    const StartNewMonth: React.FC = () => (
        <Card className="rounded-2xl shadow-lg border border-gray-100">
            <CardHeader>
                <CardTitle className="text-2xl flex items-center"><CalendarCheck className="w-6 h-6 mr-3 text-green-600" /> Start {nextMonth}</CardTitle>
                <CardDescription>This will generate a new budget document for {nextMonth} based on your prior month's plan and finalize the report for {currentMonth}.</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-6">
                <p className="text-xl font-semibold">
                    Ready to begin the next month?
                </p>
                <p className="text-gray-600">
                    Your categories will be duplicated, and any final surplus/shortfall will roll into the new month's starting balance.
                </p>
                <Button 
                    onClick={() => startNewMonthMutation.mutate()}
                    disabled={startNewMonthMutation.isPending}
                    className="h-12 w-64 text-xl bg-green-600 hover:bg-green-700"
                >
                    {startNewMonthMutation.isPending ? <Loader2 className="w-6 h-6 mr-3 animate-spin" /> : <CheckCircle className="w-6 h-6 mr-3" />}
                    Start New Month
                </Button>
                {startNewMonthMutation.isError && <p className="text-red-600 mt-3">Error starting new month. Check API logs.</p>}
            </CardContent>
        </Card>
    );
    
    // --- Render Wizard Steps ---
    const renderStep = () => {
        switch (step) {
            case 1:
            case 2: // Steps 1 and 2 are combined into the SummaryAndReport component
                return <SummaryAndReport />;
            case 3:
                return <SweepSurplus />;
            case 4:
                return <StartNewMonth />;
            default:
                return <SummaryAndReport />;
        }
    };

    return (
        <motion.div 
            className="space-y-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <div className='flex items-center space-x-3'>
                 <h1 className="text-3xl font-bold text-gray-900">Month End Wizard</h1>
                 <Badge variant="outline" className='text-md py-1 px-3'>Step {step} of 4</Badge>
            </div>
           
            {renderStep()}

        </motion.div>
    );
};

export default MonthlyCloseoutWizardPage;
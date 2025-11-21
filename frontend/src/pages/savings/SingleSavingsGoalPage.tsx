// frontend/src/pages/savings/SingleSavingsGoalPage.tsx

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { 
    Loader2, 
    ArrowLeft, 
    Target, 
    PiggyBank, 
    DollarSign, 
    CheckCircle,
    Calendar,
    Zap
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Component Imports
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';

// --- Theme Colors ---
const PRIMARY_BLUE = 'hsl(220, 80%, 50%)';
const BRAND_GREEN = 'hsl(140, 70%, 45%)';

// --- Type Definitions ---

interface GoalOut {
    id: number;
    name: string;
    target_amount: number;
    saved_amount: number;
    monthly_contribution: number;
    target_date: string | null;
    progress_percent: number;
}

interface BudgetOut {
    free_to_spend: number;
}

// --- Validation Schema for Contribution ---
const ContributionSchema = z.object({
    amount: z.coerce.number().positive("Amount must be positive."),
});


// --- API Fetching Functions ---

const fetchGoalAndBudget = async (goalId: string): Promise<{ goal: GoalOut, budget: BudgetOut }> => {
    // 1. Fetch Goal
    const goalResponse = await apiClient.get(`/goals/${goalId}`);
    const goal: GoalOut = goalResponse.data;

    // 2. Fetch current budget for Free-to-Spend balance
    const budgetResponse = await apiClient.get('/budget/current');
    const budget: BudgetOut = budgetResponse.data;
    
    return { goal, budget };
};

// --- Main Component ---

const SingleSavingsGoalPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Data Fetch
    const { data, isLoading, error } = useQuery({
        queryKey: ['singleGoal', id],
        queryFn: () => fetchGoalAndBudget(id!),
        enabled: !!id && id !== 'new', // Disable for new goal creation form (not implemented yet)
    });
    
    // Form Setup for manual contribution
    const form = useForm<z.infer<typeof ContributionSchema>>({
        resolver: zodResolver(ContributionSchema),
        defaultValues: { amount: 0 },
    });

    // Contribution Mutation
    const contributeMutation = useMutation({
        mutationFn: async (amount: number) => {
            // POST /goal/{id}/contribute
            return apiClient.post(`/goals/${id}/contribute`, { amount });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['singleGoal', id] });
            queryClient.invalidateQueries({ queryKey: ['allGoals'] });
            queryClient.invalidateQueries({ queryKey: ['currentBudget'] }); // Free-to-spend changes
            form.reset({ amount: 0 });
            // Show success toast
        },
        onError: (err: any) => {
            alert(`Contribution Failed: ${err.response?.data?.detail || err.message}`);
        }
    });
    
    // Handlers
    const handleManualContribute = (values: z.infer<typeof ContributionSchema>) => {
        contributeMutation.mutate(values.amount);
    };

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <p className="ml-3 text-gray-600">Loading goal details...</p>
            </div>
        );
    }

    if (error || !data?.goal) {
        return (
            <div className="p-8 text-center text-red-600 border border-red-200 bg-red-50 rounded-lg">
                <h2 className="text-xl font-bold mb-2">Error Loading Goal</h2>
                <p>Could not fetch goal details. Error: {error ? error.message : "Goal not found."}</p>
                <Button onClick={() => navigate('/savings/dashboard')} className="mt-4">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                </Button>
            </div>
        );
    }
    
    const { goal, budget } = data;
    const remaining = goal.target_amount - goal.saved_amount;
    const progressColor = goal.progress_percent >= 100 ? BRAND_GREEN : PRIMARY_BLUE;
    const canContribute = budget.free_to_spend > 0;

    return (
        <motion.div 
            className="space-y-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <div className="flex items-center space-x-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/savings/dashboard')}>
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <h1 className="text-3xl font-bold text-gray-900">{goal.name}</h1>
            </div>

            {/* Summary and Progress */}
            <Card className="rounded-2xl shadow-lg border border-gray-100">
                <CardContent className="pt-6 space-y-6">
                    {/* Progress */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm font-medium">
                            <span style={{ color: progressColor }}>
                                {goal.progress_percent.toFixed(1)}% Complete
                            </span>
                            <span className="text-gray-600">Target: ${goal.target_amount.toFixed(2)}</span>
                        </div>
                        <Progress value={goal.progress_percent} className="h-4" indicatorColor={progressColor} />
                    </div>
                    
                    {/* Key Metrics */}
                    <div className="grid grid-cols-3 gap-4 border-t pt-4 text-center">
                        <div>
                            <p className="text-sm text-gray-500">Saved So Far</p>
                            <p className="text-2xl font-bold text-gray-800">${goal.saved_amount.toFixed(2)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Amount Remaining</p>
                            <p className={`text-2xl font-bold ${remaining <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ${Math.max(0, remaining).toFixed(2)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Monthly Commitment</p>
                            <p className="text-2xl font-bold text-gray-800">${goal.monthly_contribution.toFixed(2)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Contribution and Sweep Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Manual Contribution */}
                <Card className="rounded-2xl shadow-lg border border-gray-100">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center">
                            <DollarSign className="w-5 h-5 mr-2 text-blue-500" /> Manual Contribution
                        </CardTitle>
                        <CardDescription>Allocate funds from your current 'Free-to-Spend' balance.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-600 mb-4">
                            Available to Move: <span className='font-bold' style={{ color: BRAND_GREEN }}>${budget.free_to_spend.toFixed(2)}</span>
                        </p>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleManualContribute)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="amount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Amount to Contribute</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.01" placeholder="e.g., 50.00" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button 
                                    type="submit" 
                                    className="w-full"
                                    disabled={contributeMutation.isPending || !canContribute}
                                >
                                    {contributeMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PiggyBank className="w-4 h-4 mr-2" />}
                                    Contribute Now
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                {/* Sweep Surplus Placeholder */}
                <Card className="rounded-2xl shadow-lg border border-gray-100 bg-gray-50">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center">
                            <Zap className="w-5 h-5 mr-2 text-purple-600" /> Sweep Surplus (Month End)
                        </CardTitle>
                        <CardDescription>Automatically allocate remaining budget at month end.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col h-full justify-center items-center">
                        <Calendar className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-center text-sm text-gray-500">
                            This goal will be included in the **Month End Wizard** for final surplus allocation.
                        </p>
                        <Button variant="outline" className="mt-4" disabled>
                            Go to Month End Wizard
                        </Button>
                    </CardContent>
                </Card>

            </div>
        </motion.div>
    );
};

export default SingleSavingsGoalPage;
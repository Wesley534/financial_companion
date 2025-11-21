// frontend/src/pages/savings/SavingsDashboardPage.tsx

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // <-- ADDED CardDescription

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // Added mutation/client
import apiClient from '@/api/client';
import { 
    Loader2, 
    PlusCircle, 
    PiggyBank, 
    ArrowRight, 
    DollarSign,
    TrendingUp,
    Target
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Component Imports
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge'; 
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

// --- Theme Colors ---
const PRIMARY_BLUE = 'hsl(220, 80%, 50%)';
const BRAND_GREEN = 'hsl(140, 70%, 45%)';

// --- Type Definitions (Matching GoalOut Schema) ---

interface GoalOut {
    id: number;
    name: string;
    target_amount: number;
    saved_amount: number;
    monthly_contribution: number;
    target_date: string | null;
    progress_percent: number; // Calculated on backend
}

// --- Validation Schema for New Goal ---
const NewGoalSchema = z.object({
    name: z.string().min(3, "Goal name is required."),
    target_amount: z.coerce.number().positive("Target amount must be positive."),
    monthly_contribution: z.coerce.number().min(0, "Contribution must be zero or positive."),
    // target_date: z.string().optional(), // Omitting date for simplicity in form
});

// --- API Fetching Function ---

const fetchAllGoals = async (): Promise<GoalOut[]> => {
    // NOTE: The backend endpoint is GET /goals
    const response = await apiClient.get('/goals');
    return response.data;
};

// --- Sub-Component: Goal Card (Remains the same) ---
const GoalCard: React.FC<{ goal: GoalOut }> = ({ goal }) => {
    const isComplete = goal.saved_amount >= goal.target_amount;
    const progressColor = isComplete ? BRAND_GREEN : PRIMARY_BLUE;

    const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

    return (
        <Card className="rounded-2xl shadow-lg border border-gray-100 transition-shadow duration-300 hover:shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-bold flex items-center">
                    <PiggyBank className="w-5 h-5 mr-2" style={{ color: progressColor }} />
                    {goal.name}
                </CardTitle>
                <Badge 
                    className={`text-white font-medium ${isComplete ? 'bg-green-600' : 'bg-gray-500'}`}
                >
                    {isComplete ? 'COMPLETE' : 'Active'}
                </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between text-sm text-gray-600">
                    <span>Saved: <span className="font-semibold text-gray-800">{formatCurrency(goal.saved_amount)}</span></span>
                    <span>Target: <span className="font-semibold text-gray-800">{formatCurrency(goal.target_amount)}</span></span>
                </div>
                
                <Progress value={goal.progress_percent} className="h-2" indicatorColor={progressColor} />
                
                <div className="grid grid-cols-2 gap-4 border-t pt-3">
                    <div className="text-sm">
                        <p className="text-gray-500">Monthly Est.</p>
                        <p className="font-bold text-gray-800">{formatCurrency(goal.monthly_contribution)}</p>
                    </div>
                    <div className="text-sm text-right">
                        <p className="text-gray-500">Remaining</p>
                        <p className="font-bold text-gray-800">{formatCurrency(Math.max(0, goal.target_amount - goal.saved_amount))}</p>
                    </div>
                </div>

                <Link to={`/savings/goal/${goal.id}`} className='block pt-2'>
                    <Button variant="outline" className="w-full h-8 rounded-lg text-sm border-gray-200">
                        View Details <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </Link>
            </CardContent>
        </Card>
    );
};

// --- Sub-Component: New Goal Form ---
const NewGoalForm: React.FC<{ setIsOpen: (open: boolean) => void }> = ({ setIsOpen }) => {
    const queryClient = useQueryClient();
    const form = useForm<z.infer<typeof NewGoalSchema>>({
        resolver: zodResolver(NewGoalSchema),
        defaultValues: { name: '', target_amount: 0, monthly_contribution: 0 },
    });

    const createGoalMutation = useMutation({
        mutationFn: async (data: z.infer<typeof NewGoalSchema>) => {
            // POST /goal
            return apiClient.post('/goals', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allGoals'] });
            form.reset();
            setIsOpen(false);
            // Show a success toast here
        },
        onError: (err: any) => {
            console.error("Goal creation failed:", err.response?.data?.detail || err.message);
        }
    });

    const onSubmit = (values: z.infer<typeof NewGoalSchema>) => {
        createGoalMutation.mutate(values);
    };

    return (
        <Card className="rounded-2xl shadow-lg border border-gray-100 max-w-lg mx-auto">
             <CardHeader>
                <CardTitle className="text-xl flex items-center">
                    <Target className="w-5 h-5 mr-2" style={{ color: PRIMARY_BLUE }} /> Define a New Goal
                </CardTitle>
                <CardDescription>Start saving towards your next big milestone.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Goal Name</FormLabel>
                                <FormControl><Input placeholder="e.g., European Vacation" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        
                        <FormField control={form.control} name="target_amount" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Target Amount ($)</FormLabel>
                                <FormControl><Input type="number" step="0.01" placeholder="e.g., 5000.00" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        
                        <FormField control={form.control} name="monthly_contribution" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Monthly Commitment ($)</FormLabel>
                                <FormControl><Input type="number" step="0.01" placeholder="e.g., 200.00" {...field} /></FormControl>
                                <FormDescription>This amount will be suggested in your monthly budget.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <Button 
                            type="submit" 
                            className="w-full"
                            disabled={createGoalMutation.isPending}
                            style={{ backgroundColor: BRAND_GREEN }}
                        >
                            {createGoalMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlusCircle className="w-4 h-4 mr-2" />}
                            Create Goal
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
};


// --- Main Component ---

const SavingsDashboardPage: React.FC = () => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    
    // Fetch all goals
    const { data: goals, isLoading, error } = useQuery<GoalOut[]>({
        queryKey: ['allGoals'],
        queryFn: fetchAllGoals,
    });

    const totalSaved = goals?.reduce((sum, goal) => sum + goal.saved_amount, 0) || 0;

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <p className="ml-3 text-gray-600">Loading savings dashboard...</p>
            </div>
        );
    }

    if (error) {
        return <div className="p-4 text-red-600">Error loading goals: {error.message}</div>;
    }

    return (
        <motion.div 
            className="space-y-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">Savings Dashboard</h1>
                <Button 
                    className="rounded-xl" 
                    style={{ backgroundColor: BRAND_GREEN }}
                    onClick={() => setIsFormOpen(!isFormOpen)}
                >
                    <PlusCircle className="w-4 h-4 mr-2" /> Create New Goal
                </Button>
            </div>
            
            {/* New Goal Form (Conditionally Rendered Inline) */}
            <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: isFormOpen ? 1 : 0, height: isFormOpen ? 'auto' : 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className={isFormOpen ? 'mb-8' : 'mb-0 overflow-hidden'}
            >
                <NewGoalForm setIsOpen={setIsFormOpen} />
            </motion.div>

            {/* Total Saved Card */}
            <Card className="rounded-2xl shadow-lg border border-gray-100 border-l-4" style={{ borderColor: BRAND_GREEN }}>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                        <DollarSign className="w-5 h-5 mr-2 text-green-600" /> Total Saved Across All Goals
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-extrabold" style={{ color: BRAND_GREEN }}>
                        ${totalSaved.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                        Currently tracking {goals?.length || 0} active goals.
                    </p>
                </CardContent>
            </Card>

            {/* Goals Grid */}
            <h2 className="text-2xl font-bold text-gray-900 pt-4">Your Active Goals</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {goals && goals.length > 0 ? (
                    goals.map(goal => <GoalCard key={goal.id} goal={goal} />)
                ) : (
                    <p className="text-gray-500 italic col-span-3">No savings goals defined yet.</p>
                )}
            </div>

            {/* Contribution History Chart Placeholder */}
            <Card className="rounded-2xl shadow-lg border border-gray-100">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2 text-blue-500" /> Contribution History
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-64 flex items-center justify-center text-gray-500">
                    [Chart Placeholder: Monthly Contribution vs. Goal Target]
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default SavingsDashboardPage;
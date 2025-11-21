// frontend/src/pages/budget/CategoryDetailsPage.tsx

import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom'; // Added useNavigate
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { Loader2, ArrowLeft, Trash2, Edit } from 'lucide-react';

// Component Imports (Assuming shadcn setup)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// --- Type Definitions ---
interface CategoryOut {
    id: number;
    name: string;
    type: string;
    planned: number;
    actual: number;
    icon: string;
    color: string;
}

interface TransactionOut {
    id: number;
    amount: number;
    date: string;
    description: string;
    notes?: string;
}

// --- API Fetching Functions ---

const fetchCategoryAndTransactions = async (categoryId: number): Promise<{ category: CategoryOut, transactions: TransactionOut[] }> => {
    
    // 1. Fetch the entire budget to find the category details by ID
    const categoryResponse = await apiClient.get('/budget/current');
    const allCategories: CategoryOut[] = categoryResponse.data.categories;
    const category = allCategories.find(c => c.id === categoryId);

    if (!category) {
        throw new Error(`Category with ID ${categoryId} not found in current budget.`);
    }

    // 2. Fetch linked transactions for the current month
    const currentMonth = new Date().toISOString().substring(0, 7);
    const transactionsResponse = await apiClient.get(`/transactions?category_id=${categoryId}&month=${currentMonth}`);
    const transactions: TransactionOut[] = transactionsResponse.data;

    return { category, transactions };
};

// --- Main Component ---

const CategoryDetailsPage: React.FC = () => {
    const navigate = useNavigate();
    const { id: idString } = useParams<{ id: string }>();
    
    // Convert the string ID from URL to a number, or null/0 if invalid
    const categoryId = idString ? parseInt(idString) : null;

    // Early exit if ID is clearly invalid or missing
    if (!categoryId || isNaN(categoryId)) {
        return (
            <div className="p-4 text-red-600">
                <h2 className="text-xl font-bold">Error: Category ID is missing or invalid.</h2>
                <Button onClick={() => navigate('/budget/monthly')} className="mt-4" variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Go to Monthly Budget
                </Button>
            </div>
        );
    }
    
    // --- Data Fetching ---
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['categoryDetails', categoryId],
        queryFn: () => fetchCategoryAndTransactions(categoryId),
        // No need for 'enabled' as we already checked categoryId
    });

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <p className="ml-3 text-gray-600">Loading category details...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center text-red-600 border border-red-200 bg-red-50 rounded-lg">
                <h2 className="text-xl font-bold mb-2">Error Loading Data</h2>
                <p>Could not fetch category details. Error: {error.message}</p>
                <Button onClick={() => refetch()} className="mt-4">Try Again</Button>
            </div>
        );
    }
    
    // Data check is simplified as the queryFn throws on not found
    const { category, transactions } = data!;
    const remaining = category.planned - category.actual;
    const progressPercent = category.planned > 0 ? (category.actual / category.planned) * 100 : 0;
    const progressColor = progressPercent > 100 ? 'bg-red-500' : 'bg-blue-500';

    return (
        <motion.div 
            className="space-y-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <div className="flex items-center space-x-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/budget/monthly')}>
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <h1 className="text-3xl font-bold text-gray-900">{category.name} Details</h1>
            </div>

            {/* Category Summary Card */}
            <Card className="rounded-2xl shadow-lg border border-gray-100">
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                        <CardTitle className="text-xl flex items-center">
                             <span className="w-4 h-4 rounded-full mr-3" style={{ backgroundColor: category.color }}></span>
                             {category.name}
                        </CardTitle>
                        <CardDescription className="mt-1">
                            {category.type} Category | Planned: ${category.planned.toFixed(2)}
                        </CardDescription>
                    </div>
                    <div className="flex space-x-2">
                         {/* Edit button placeholder */}
                        <Button variant="outline" size="sm" className="h-8 rounded-lg">
                            <Edit className="w-4 h-4 mr-2" /> Edit Category
                        </Button>
                         {/* Delete button placeholder */}
                        <Button variant="destructive" size="sm" className="h-8 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center border-b pb-4">
                        <div>
                            <p className="text-sm text-gray-500">Actual Spent</p>
                            <p className="text-2xl font-bold text-gray-800">${category.actual.toFixed(2)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Remaining</p>
                            <p className={`text-2xl font-bold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ${remaining.toFixed(2)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Over/Under</p>
                            <p className="text-2xl font-bold text-gray-800">
                                {progressPercent.toFixed(1)}%
                            </p>
                        </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <p className="text-sm font-medium">Spending Progress</p>
                        <Progress
                            value={Math.min(100, progressPercent)}
                            className={`h-2 ${progressColor}`}
                        />
                        {progressPercent > 100 && (
                            <p className="text-sm text-red-600 font-semibold">
                                ⚠️ {category.name} is {Math.abs(remaining).toFixed(2)} over budget!
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
            
            {/* Transaction List */}
            <h2 className="text-2xl font-bold text-gray-900 pt-4">Linked Transactions ({transactions.length})</h2>
            <Card className="rounded-2xl shadow-lg border border-gray-100">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.length > 0 ? (
                            transactions.map(tx => (
                                <TableRow key={tx.id}>
                                    <TableCell className="font-medium">{new Date(tx.date).toLocaleDateString()}</TableCell>
                                    <TableCell>{tx.description}</TableCell>
                                    <TableCell className="text-right font-bold text-red-600">-${tx.amount.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">
                                        <Link to={`/transactions/edit/${tx.id}`}>
                                            <Button variant="ghost" size="sm" className="h-8 p-1 text-gray-500 hover:text-gray-900">
                                                Edit
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-gray-500 italic">No transactions linked to this category yet.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>
        </motion.div>
    );
};

export default CategoryDetailsPage;
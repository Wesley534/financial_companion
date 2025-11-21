// frontend/src/pages/transactions/TransactionsListPage.tsx

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { 
    Loader2, 
    PlusCircle, 
    Filter, 
    Edit, 
    Calendar,
    Tag
} from 'lucide-react';

// Component Imports
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

// --- Type Definitions ---
interface TransactionOut {
    id: number;
    amount: number;
    date: string;
    description: string;
    recurring: boolean;
    category: {
        id: number;
        name: string;
        color: string;
        icon: string;
    };
}

interface CategoryOut {
    id: number;
    name: string;
}

// --- API Fetching Functions ---

const fetchTransactions = async (filters: { month: string | undefined, category_id: number }): Promise<TransactionOut[]> => {
    // Construct query parameters from filters
    const params = new URLSearchParams();
    if (filters.month) params.append('month', filters.month);
    
    // FIX: Only append category_id if it's not 0 (the 'All' selection)
    if (filters.category_id !== 0) { 
        params.append('category_id', String(filters.category_id));
    }
    
    // NOTE: The backend endpoint is GET /transactions
    const response = await apiClient.get(`/transactions?${params.toString()}`);
    return response.data;
};

const fetchCategories = async (): Promise<CategoryOut[]> => {
    // NOTE: Using the /budget/current to get the categories list for the filter dropdown
    const response = await apiClient.get('/budget/current');
    return response.data.categories.map((c: any) => ({ id: c.id, name: c.name }));
};

// --- Utility ---
const getCurrentMonthYYYYMM = () => new Date().toISOString().substring(0, 7);
const getMonthOptions = () => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({ 
            value: date.toISOString().substring(0, 7), 
            label: date.toLocaleDateString('default', { month: 'long', year: 'numeric' })
        });
    }
    return months;
};


// --- Main Component ---

const TransactionsListPage: React.FC = () => {
    const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthYYYYMM());
    // FIX: Initial state for selected category is 0 (which represents 'All Categories')
    const [selectedCategory, setSelectedCategory] = useState<number>(0); 
    
    // Fetch Filter Options (Categories)
    const { data: categories } = useQuery<CategoryOut[]>({
        queryKey: ['categoriesList'],
        queryFn: fetchCategories,
        staleTime: Infinity,
    });

    // Fetch Transactions based on filters
    const { data: transactions, isLoading: isTransactionsLoading, error, refetch } = useQuery<TransactionOut[]>({
        queryKey: ['transactionsList', selectedMonth, selectedCategory],
        queryFn: () => fetchTransactions({ month: selectedMonth, category_id: selectedCategory }),
    });
    
    const monthOptions = getMonthOptions();

    return (
        <motion.div 
            className="space-y-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-gray-900">Transaction History</h1>
                <Link to="/transactions/add"> 
                    <Button className="rounded-xl" >
                        <PlusCircle className="w-4 h-4 mr-2" /> Add New Transaction
                    </Button>
                </Link>
            </div>

            {/* Filter Section */}
            <Card className="rounded-2xl shadow-sm border border-gray-100">
                <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className='flex items-center space-x-2'>
                        <Calendar className='w-5 h-5 text-gray-500 flex-shrink-0' />
                        <Select onValueChange={setSelectedMonth} value={selectedMonth}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Month" />
                            </SelectTrigger>
                            <SelectContent>
                                {monthOptions.map(m => (
                                    <SelectItem key={m.value} value={m.value}>
                                        {m.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className='flex items-center space-x-2'>
                        <Tag className='w-5 h-5 text-gray-500 flex-shrink-0' />
                        <Select 
                            // FIX: onValueChange converts the string value back to a number
                            onValueChange={val => setSelectedCategory(parseInt(val))} 
                            // FIX: The value is controlled as a string "0" or the ID string
                            value={String(selectedCategory)}
                        >
                            <SelectTrigger>
                                {/* The value will be set to the corresponding SelectItem's label */}
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                {/* FIX: Changed value="" to value="0" to avoid Radix UI error */}
                                <SelectItem value="0">All Categories</SelectItem> 
                                {categories?.map(c => (
                                    <SelectItem key={c.id} value={String(c.id)}>
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Placeholder for Amount Filter */}
                    <Input type="number" placeholder="Min Amount" className='col-span-1' disabled />
                    
                    <Button onClick={() => refetch()} variant="outline" className='col-span-1'>
                        <Filter className="w-4 h-4 mr-2" /> Apply Filters
                    </Button>
                </CardContent>
            </Card>

            {/* Transaction Table */}
            <Card className="rounded-2xl shadow-lg border border-gray-100">
                {isTransactionsLoading && (
                    <div className="flex h-40 items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        <p className="ml-3 text-gray-600">Loading transactions...</p>
                    </div>
                )}
                {error && (
                    <div className="p-4 text-center text-red-600">Error: {error.message}</div>
                )}
                {!isTransactionsLoading && transactions && (
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 hover:bg-gray-50">
                                <TableHead className="w-[10%]">Date</TableHead>
                                <TableHead className="w-[40%]">Description</TableHead>
                                <TableHead className="w-[20%]">Category</TableHead>
                                <TableHead className="w-[10%] text-center">Recurring</TableHead>
                                <TableHead className="w-[10%] text-right">Amount</TableHead>
                                <TableHead className="w-[10%] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.length > 0 ? (
                                transactions.map(tx => (
                                    <TableRow key={tx.id} className="hover:bg-gray-50/50">
                                        <TableCell className="font-medium text-gray-700">
                                            {new Date(tx.date).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>{tx.description}</TableCell>
                                        <TableCell>
                                            <span className="w-2 h-2 rounded-full inline-block mr-2" style={{ backgroundColor: tx.category.color }}></span>
                                            {tx.category.name}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {tx.recurring ? 'Yes' : 'No'}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-red-600">
                                            ${tx.amount.toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Link to={`/transactions/edit/${tx.id}`}>
                                                <Button variant="ghost" size="sm" className="h-8 p-1 text-gray-500 hover:text-gray-900">
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-gray-500 italic py-8">
                                        No transactions found for the selected filter criteria.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </Card>
        </motion.div>
    );
};

export default TransactionsListPage;
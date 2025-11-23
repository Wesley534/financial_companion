// frontend/src/pages/budget/CategoryDetailsPage.tsx

import React, { useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // Added useQueryClient
import apiClient from '@/api/client';
import { Loader2, ArrowLeft, Trash2, Edit, ListPlus, DollarSign, Tag, Palette, CheckCircle } from 'lucide-react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Component Imports (Assuming shadcn setup)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input'; // Added Input
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'; // Added Form components
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Added Select components

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

// --- Local Validation Schema for Form (Add/Edit) ---
const CategorySchema = z.object({
    name: z.string().min(3, "Category name is required."),
    type: z.enum(["Need", "Want", "Saving", "Income"]),
    planned: z.coerce.number().min(0, "Planned amount must be non-negative."),
    color: z.string().regex(/^#[0-9A-F]{6}$/i, "Color must be a valid hex code (e.g., #123456)."),
    icon: z.string().optional(),
});

type CategoryFormData = z.infer<typeof CategorySchema>;

// Mock Colors for Select
const mockColors = [
    { value: '#007BFF', label: 'Blue' },
    { value: '#28A745', label: 'Green' },
    { value: '#FFC107', label: 'Yellow' },
    { value: '#DC3545', label: 'Red' },
    { value: '#6C757D', label: 'Gray' },
    { value: '#6F42C1', label: 'Purple' },
];


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
    const queryClient = useQueryClient();
    const { id: idString } = useParams<{ id: string }>();
    
    // Determine if we are in Add Mode
    const isAddMode = idString === 'add' || idString === 'new'; 
    const categoryId = isAddMode ? null : (idString ? parseInt(idString) : null);

    // --- Data Fetching ---
    // Query only runs if we are NOT in Add Mode
    const { data, isLoading, error } = useQuery({
        queryKey: ['categoryDetails', categoryId],
        queryFn: () => fetchCategoryAndTransactions(categoryId!),
        enabled: !isAddMode && !!categoryId && !isNaN(categoryId),
    });

    // --- Form Setup (for Add/Edit) ---
    const defaultValues: CategoryFormData = useMemo(() => {
        // Use fetched data for edit mode, or standard defaults for add mode
        if (data?.category) {
            return {
                name: data.category.name,
                type: data.category.type as CategoryFormData['type'],
                planned: data.category.planned,
                color: data.category.color,
                icon: data.category.icon,
            };
        }
        return { 
            name: '', 
            type: 'Need', 
            planned: 0, 
            color: '#007BFF', 
            icon: 'default-icon' 
        };
    }, [data]);

    // Fallback full category used in view/edit rendering when API data is not present yet
    const fallbackCategory: CategoryOut = {
        id: 0,
        name: defaultValues.name,
        type: defaultValues.type as CategoryOut['type'],
        planned: defaultValues.planned,
        actual: 0,
        icon: defaultValues.icon ?? 'default-icon',
        color: defaultValues.color,
    };

    const form = useForm<CategoryFormData>({
        resolver: zodResolver(CategorySchema) as unknown as Resolver<CategoryFormData, any>,
        defaultValues: defaultValues,
        mode: 'onBlur',
    });

    // Update form defaults when data loads
    useEffect(() => {
        if (!isAddMode && data?.category) {
            form.reset(defaultValues);
        }
    }, [data, isAddMode, form, defaultValues]);
    
    // --- Mutations ---

    // Create/Edit Mutation
    const saveMutation = useMutation({
        mutationFn: async (values: CategoryFormData) => {
            const dataToSend = {
                ...values,
                planned: Number(values.planned) // Ensure number type for API
            };
            
            if (isAddMode) {
                // POST /budget/categories (Assumed endpoint)
                return apiClient.post('/budget/categories', dataToSend);
            } else {
                // PATCH /budget/categories/{id} (Assumed endpoint)
                return apiClient.patch(`/budget/categories/${categoryId}`, dataToSend);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['currentBudget'] });
            queryClient.invalidateQueries({ queryKey: ['categoryDetails', categoryId] });
            // Show success toast
            
            // Redirect to the monthly budget page after success
            navigate('/budget/monthly'); 
        },
        onError: (err: any) => {
            // Show error toast
            console.error("Save failed:", err.response?.data?.detail || err.message);
            form.setError('name', { message: err.response?.data?.detail || 'Category saving failed.' });
        }
    });

    const onSubmit = (values: CategoryFormData) => {
        saveMutation.mutate(values);
    };

    // --- Loading and Error Guards ---

    if (isLoading || saveMutation.isPending) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <p className="ml-3 text-gray-600">{saveMutation.isPending ? 'Saving category...' : 'Loading details...'}</p>
            </div>
        );
    }
    
    if (!isAddMode && (error || !categoryId || isNaN(categoryId))) {
        // Show a simple error UI if we can't load the requested category
        const errMessage = (error as any)?.message || 'Failed to load category.';
        return (
            <div className="max-w-xl mx-auto">
                <h2 className="text-xl font-bold">Error: {errMessage}</h2>
                <Button onClick={() => navigate('/budget/monthly')} className="mt-4" variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Go to Monthly Budget
                </Button>
            </div>
        );
    }
    
    // Logic below this line assumes valid data (for View/Edit) or isAddMode (for Add)
    // Always use a CategoryOut shape for 'category' to avoid missing 'actual'
    const category: CategoryOut = data?.category ?? fallbackCategory;
    const transactions = data?.transactions || [];
    
    const remaining = category.planned - category.actual;
    const progressPercent = category.planned > 0 ? (category.actual / category.planned) * 100 : 0;
    const progressColor = progressPercent > 100 ? 'bg-red-500' : 'bg-blue-500';

    const formTitle = isAddMode ? 'Add New Budget Category' : 'Edit Budget Category';


    // --- Render Logic ---

    if (isAddMode) {
        return (
             <motion.div 
                className="space-y-8"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
             >
                 <div className="max-w-xl mx-auto mb-6">
                     <Button variant="ghost" onClick={() => navigate('/budget/monthly')}>
                         <ArrowLeft className="w-4 h-4 mr-2" /> Back to Budget
                     </Button>
                 </div>
                 
                 <Card className="rounded-2xl shadow-lg border border-gray-100 max-w-xl mx-auto">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold text-gray-900 flex items-center">
                            <ListPlus className="w-5 h-5 mr-3" />
                            {formTitle}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                                {/* Row 1: Name */}
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center"><Tag className="w-4 h-4 mr-2" /> Category Name</FormLabel>
                                            <FormControl><Input placeholder="e.g., Groceries" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Row 2: Type and Planned */}
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="type"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center"><Tag className="w-4 h-4 mr-2" /> Type</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select Type" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Need">Need (50%)</SelectItem>
                                                        <SelectItem value="Want">Want (30%)</SelectItem>
                                                        <SelectItem value="Saving">Saving (20%)</SelectItem>
                                                        <SelectItem value="Income">Income</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="planned"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center"><DollarSign className="w-4 h-4 mr-2" /> Planned Amount</FormLabel>
                                                <FormControl><Input type="number" step="0.01" placeholder="e.g., 500.00" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Row 3: Color and Icon (Simple) */}
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="color"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center"><Palette className="w-4 h-4 mr-2" /> Color</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="flex items-center">
                                                            <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: field.value }}></span>
                                                            <SelectValue placeholder="Select Color" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {mockColors.map(c => (
                                                            <SelectItem key={c.value} value={c.value}>
                                                                <div className='flex items-center'>
                                                                    <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: c.value }}></span>
                                                                    {c.label} ({c.value})
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="icon"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Icon (e.g., `shopping-cart`)</FormLabel>
                                                <FormControl><Input placeholder="Icon Name" {...field} value={field.value || ''} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                
                                {/* Submit Button */}
                                <Button type="submit" disabled={saveMutation.isPending} className="w-full h-10 text-lg">
                                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                    Create Category
                                </Button>
                                
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </motion.div>
        );
    }

    // --- Render Logic for VIEW/EDIT Mode ---

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
                         {/* Edit button placeholder - Will open the same form/modal or switch to edit view later */}
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
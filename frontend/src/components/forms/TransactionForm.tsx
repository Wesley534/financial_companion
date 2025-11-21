// frontend/src/components/forms/TransactionForm.tsx

import React, { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { 
    Loader2, 
    CheckCircle, 
    DollarSign, 
    Calendar, 
    Tag, 
    Pencil, 
    Sparkles, 
    ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Component Imports
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

// --- Type Definitions (Matching Schemas) ---
interface CategoryOut {
    id: number;
    name: string;
    icon: string;
    color: string;
}

interface TransactionData {
    amount: number;
    date: string; // YYYY-MM-DD
    description: string;
    category_id: number;
    notes?: string;
    recurring?: boolean;
}

interface CategorizeResponse {
    predicted_category_id: number;
    confidence: number;
}

// --- Validation Schema ---
const TransactionSchema = z.object({
    amount: z.coerce.number().positive("Amount must be positive."),
    date: z.string().refine((date) => !isNaN(new Date(date).getTime()), {
        message: "Invalid date format. Use YYYY-MM-DD.",
    }),
    description: z.string().min(3, "Description is required."),
    category_id: z.coerce.number().min(1, "Category is required."),
    notes: z.string().optional(),
    recurring: z.boolean().optional(),
});

// --- Component Props ---
interface TransactionFormProps {
    initialData?: TransactionData & { id?: number };
    isEditMode: boolean;
}

// --- API Fetching ---
const fetchCategories = async (): Promise<CategoryOut[]> => {
    const response = await apiClient.get('/budget/current');
    return response.data.categories.map((c: any) => ({ 
        id: c.id, 
        name: c.name, 
        icon: c.icon, 
        color: c.color 
    }));
};

// --- Main Component ---
const TransactionForm: React.FC<TransactionFormProps> = ({ initialData, isEditMode }) => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // 1. Data Fetch: Categories
    const { data: categories, isLoading: isCategoriesLoading } = useQuery<CategoryOut[]>({
        queryKey: ['categoriesList'],
        queryFn: fetchCategories,
        staleTime: Infinity,
    });
    
    // Convert categories map for AI context
    const categoryContext: Record<number, string> = categories 
        ? categories.reduce((acc, cat) => ({ ...acc, [cat.id]: cat.name }), {}) 
        : {};

    // 2. Form Setup
    const form = useForm<z.infer<typeof TransactionSchema>>({
        resolver: zodResolver(TransactionSchema) as Resolver<z.infer<typeof TransactionSchema>, any>,
        defaultValues: {
            amount: initialData?.amount || 0,
            date: initialData?.date || new Date().toISOString().substring(0, 10),
            description: initialData?.description || '',
            category_id: initialData?.category_id || 0,
            notes: initialData?.notes || '',
            recurring: initialData?.recurring || false,
        },
    });
    
    // Watch description field for AI prediction
    const descriptionWatch = form.watch('description');
    
    // 3. Mutations: Save & AI Categorization
    
    // AI Categorization Mutation
    const aiCategorizeMutation = useMutation({
        mutationFn: async (description: string) => {
            const response = await apiClient.post<CategorizeResponse>('/ai/categorize', {
                description: description,
                context_categories: categoryContext,
            });
            return response.data;
        },
        onSuccess: (data) => {
            // Automatically set the predicted category
            form.setValue('category_id', data.predicted_category_id);
            // Optionally show a toast: `Predicted: ${categories.find(c => c.id === data.predicted_category_id)?.name}`
        },
    });
    
    // Main Save Mutation
    const saveMutation = useMutation({
        mutationFn: async (data: TransactionData) => {
            if (isEditMode && initialData?.id) {
                // PATCH /transaction/{id}
                return apiClient.patch(`/transactions/${initialData.id}`, data);
            } else {
                // POST /transaction
                return apiClient.post('/transactions', data);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactionsList'] });
            queryClient.invalidateQueries({ queryKey: ['currentBudget'] }); // Budget actuals changed
            // Show success toast
            navigate('/transactions/list'); // Redirect after successful save
        },
        onError: (err: any) => {
            // Show error toast
            console.error("Save failed:", err.response?.data?.detail || err.message);
        }
    });

    // 4. Effects: Auto-Categorize on Description Change
    useEffect(() => {
        const MIN_LENGTH = 8;
        if (descriptionWatch.length >= MIN_LENGTH && categoryContext && !aiCategorizeMutation.isPending) {
            // Simple debouncing (optional)
            const timeout = setTimeout(() => {
                aiCategorizeMutation.mutate(descriptionWatch);
            }, 1000); 
            return () => clearTimeout(timeout);
        }
    }, [descriptionWatch, categoryContext]);


    // Handlers
    const onSubmit = (values: z.infer<typeof TransactionSchema>) => {
        saveMutation.mutate({
            ...values,
            category_id: values.category_id, // Ensure it's treated as number
        });
    };
    
    const isSubmitting = saveMutation.isPending;
    const formTitle = isEditMode ? 'Edit Transaction' : 'Add New Transaction';
    const submitButtonText = isEditMode ? 'Save Changes' : 'Record Transaction';
    const currentCategory = categories?.find(c => c.id === form.getValues('category_id'));
    
    return (
        <Card className="rounded-2xl shadow-lg border border-gray-100 max-w-2xl mx-auto">
            <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">{formTitle}</h1>
                    <Button variant="ghost" onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                </div>
                
                {isCategoriesLoading && (
                    <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
                )}
                
                {!isCategoriesLoading && categories && (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            
                            {/* Row 1: Amount and Date */}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="amount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center"><DollarSign className="w-4 h-4 mr-2" /> Amount</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.01" placeholder="e.g., 45.99" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="date"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center"><Calendar className="w-4 h-4 mr-2" /> Date</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            
                            {/* Row 2: Description (for AI) */}
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center"><Pencil className="w-4 h-4 mr-2" /> Vendor / Description</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., Starbucks Coffee $5.50" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Enter the vendor and amount to auto-suggest the category.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            {/* Row 3: Category Select (with AI status) */}
                            <FormField
                                control={form.control}
                                name="category_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center">
                                            <Tag className="w-4 h-4 mr-2" /> Category
                                        </FormLabel>
                                        <Select onValueChange={val => field.onChange(parseInt(val))} value={String(field.value)}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a Category" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {categories.map(c => (
                                                    <SelectItem key={c.id} value={String(c.id)}>
                                                        <div className='flex items-center'>
                                                            <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: c.color }}></span>
                                                            {c.name}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        
                                        {/* AI Prediction Status */}
                                        <div className="mt-2 text-sm">
                                            {aiCategorizeMutation.isPending && (
                                                <div className="flex items-center text-gray-500">
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Predicting category...
                                                </div>
                                            )}
                                            {aiCategorizeMutation.isSuccess && currentCategory && (
                                                <div className="flex items-center text-green-600">
                                                    <Sparkles className="w-4 h-4 mr-2" /> 
                                                    AI Suggested: <span className='font-semibold ml-1'>{currentCategory.name}</span>
                                                    <span className='text-xs ml-2 text-gray-500'>({(aiCategorizeMutation.data.confidence * 100).toFixed(0)}%)</span>
                                                </div>
                                            )}
                                            {aiCategorizeMutation.isError && (
                                                <div className="flex items-center text-red-600">
                                                    <Sparkles className="w-4 h-4 mr-2" /> Prediction failed (Mocked: Ensure API is running).
                                                </div>
                                            )}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            {/* Row 4: Notes (and Recurring for Edit Mode) */}
                            <FormField
                                control={form.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Notes</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Optional notes for this transaction" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            {isEditMode && (
                                <FormField
                                    control={form.control}
                                    name="recurring"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 rounded-lg border">
                                            <FormControl>
                                                {/* Use a basic checkbox implementation here */}
                                                <input type="checkbox" checked={field.value} onChange={field.onChange} className="mt-1" />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>Mark as Recurring</FormLabel>
                                                <FormDescription>
                                                    This transaction will be automatically suggested next month.
                                                </FormDescription>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            )}

                            {/* Submit Button */}
                            <Button type="submit" disabled={isSubmitting || isCategoriesLoading} className="w-full h-12 text-lg">
                                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {!isSubmitting && <CheckCircle className="w-4 h-4 mr-2" />}
                                {submitButtonText}
                            </Button>
                        </form>
                    </Form>
                )}
            </CardContent>
        </Card>
    );
};

export default TransactionForm;
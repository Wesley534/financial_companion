// frontend/src/pages/shopping/CheckoutPage.tsx

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
    Loader2, 
    ShoppingCart, 
    DollarSign, 
    ArrowLeft,
    CheckCircle
} from 'lucide-react';

// Component Imports
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

// --- Type Definitions ---
interface ShoppingListOut {
    id: number;
    name: string;
    total_cost: number; // Estimated Total
    category_id: number;
}

// --- API Fetching Functions ---

const fetchListForCheckout = async (listId: number | string): Promise<ShoppingListOut> => {
    // NOTE: The backend endpoint is GET /shopping-list/{id}
    const response = await apiClient.get(`/shopping/${listId}`);
    return response.data;
};

// --- Validation Schema for Checkout ---
const CheckoutSchema = z.object({
    actual_total_cost: z.coerce.number().positive("Actual amount must be positive."),
    transaction_description: z.string().min(5, "A description for the transaction is required."),
});

// --- Main Component ---

const CheckoutPage: React.FC = () => {
    const { id } = useParams<{ id: string }>(); // ID of the list to checkout
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Data Fetch: List Details
    const { data: listData, isLoading, error } = useQuery<ShoppingListOut>({
        queryKey: ['checkoutList', id],
        queryFn: () => fetchListForCheckout(id!),
        enabled: !!id,
    });
    
    // Form Setup
    const form = useForm<z.infer<typeof CheckoutSchema>>({
        resolver: zodResolver(CheckoutSchema),
        defaultValues: {
            actual_total_cost: listData?.total_cost || 0,
            transaction_description: listData?.name || "Shopping List Checkout",
        },
        values: { // Use values to update defaults when data loads
            actual_total_cost: listData?.total_cost || 0,
            transaction_description: listData?.name || "Shopping List Checkout",
        }
    });

    // Mutation: Checkout
    const checkoutMutation = useMutation({
        mutationFn: async (checkoutValues: z.infer<typeof CheckoutSchema>) => {
            // POST /shopping-list/{id}/checkout
            return apiClient.post(`/shopping/${id}/checkout`, checkoutValues);
        },
        onSuccess: () => {
            // Invalidate necessary queries to refresh the UI
            queryClient.invalidateQueries({ queryKey: ['shoppingLists'] });
            queryClient.invalidateQueries({ queryKey: ['currentBudget'] });
            queryClient.invalidateQueries({ queryKey: ['transactionsList'] });
            
            // Redirect to the list overview or dashboard
            navigate('/shopping/lists');
        },
        onError: (err: any) => {
            alert(`Checkout failed: ${err.response?.data?.detail || err.message}`);
        }
    });

    // Handlers
    const onSubmit = (values: z.infer<typeof CheckoutSchema>) => {
        if (!listData) return;
        checkoutMutation.mutate(values);
    };

    if (isLoading || checkoutMutation.isPending) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <p className="ml-3 text-gray-600">Finalizing list for checkout...</p>
            </div>
        );
    }

    if (error || !listData) {
        return (
            <div className="p-8 text-center text-red-600 border border-red-200 bg-red-50 rounded-lg">
                <h2 className="text-xl font-bold mb-2">Checkout Error</h2>
                <p>List not found or could not be loaded. Please go back.</p>
                <Button onClick={() => navigate('/shopping/lists')} className="mt-4" variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Lists
                </Button>
            </div>
        );
    }

    const estimatedTotal = listData.total_cost;
    const isPriceAdjusted = form.watch('actual_total_cost') !== estimatedTotal;
    const categoryName = "Groceries"; // Placeholder: Would need to fetch category details

    return (
        <motion.div 
            className="space-y-8 max-w-lg mx-auto"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <h1 className="text-3xl font-bold text-gray-900 text-center">Final Checkout: {listData.name}</h1>
            <Card className="rounded-2xl shadow-lg border border-gray-100">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">Confirm Purchase</CardTitle>
                    <CardDescription className="text-center">
                        The transaction will be recorded to your **{categoryName}** budget.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            
                            {/* Estimated Total Display */}
                            <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                                <p className="text-sm text-blue-800">Estimated List Total:</p>
                                <p className="text-3xl font-extrabold text-blue-900">${estimatedTotal.toFixed(2)}</p>
                            </div>

                            {/* Actual Total Input */}
                            <FormField
                                control={form.control}
                                name="actual_total_cost"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center text-lg font-semibold">
                                            <DollarSign className="w-5 h-5 mr-2" /> Actual Amount Spent
                                        </FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" placeholder="Enter final amount" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                        {isPriceAdjusted && (
                                            <p className="text-sm text-orange-600 flex items-center">
                                                <AlertTriangle className="w-4 h-4 mr-1" /> Price adjusted by ${(estimatedTotal - field.value).toFixed(2)}
                                            </p>
                                        )}
                                    </FormItem>
                                )}
                            />

                            {/* Transaction Description Input */}
                            <FormField
                                control={form.control}
                                name="transaction_description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Transaction Description</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Description for transaction history" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Checkout Button */}
                            <Button 
                                type="submit" 
                                disabled={checkoutMutation.isPending}
                                className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
                            >
                                {checkoutMutation.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                                Complete Purchase & Record
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default CheckoutPage;
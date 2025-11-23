// frontend/src/pages/shopping/SingleShoppingListPage.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { 
    Loader2, 
    ArrowLeft, 
    ShoppingCart, 
    CheckCircle, 
    AlertTriangle, 
    Plus,
    Trash2,
    ListChecks
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';


// Component Imports
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

// --- Type Definitions ---
interface ShoppingListItem {
    name: string;
    estimated_price: number;
    quantity: number;
    total_price?: number; // MAKE OPTIONAL for incoming data, will be calculated
}

interface ShoppingListOut {
    id: number;
    name: string;
    category_id: number;
    total_cost: number;
    items: ShoppingListItem[];
    created_at: string;
}

interface CategoryData {
    id: number;
    name: string;
    planned: number;
    actual: number;
}

// --- Validation Schema for New Item ---
const NewItemSchema = z.object({
    name: z.string().min(1, "Name is required."),
    estimated_price: z.coerce.number().positive("Price must be > 0."),
    quantity: z.coerce.number().int().min(1, "Qty must be at least 1."),
});

// --- Utility: Calculate Total Price for an Item ---
const calculateItemTotalPrice = (item: ShoppingListItem): ShoppingListItem => ({
    ...item,
    total_price: item.estimated_price * item.quantity,
});

// --- API Fetching Functions ---

const fetchSingleShoppingList = async (listId: number | string): Promise<{ list: ShoppingListOut, categories: CategoryData[] }> => {
    // 1. Fetch List
    const listResponse = await apiClient.get(`/shopping/${listId}`);
    const list: ShoppingListOut = listResponse.data;

    // FIX: Ensure total_price is calculated for all incoming items from the API
    const calculatedItems = list.items.map(calculateItemTotalPrice);
    list.items = calculatedItems;

    // 2. Fetch Categories
    const categoryResponse = await apiClient.get<any>('/budget/current');
    const categories: CategoryData[] = categoryResponse.data.categories;
    
    return { list, categories };
};

// --- Main Component ---

const SingleShoppingListPage: React.FC = () => {
    const { id: idString } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const listId = idString === 'new' ? 0 : parseInt(idString!);

    // Fetch List Data
    const { data, isLoading, error } = useQuery({
        queryKey: ['shoppingList', listId],
        queryFn: () => fetchSingleShoppingList(listId),
        enabled: listId !== 0, // Disable query for 'new' list
    });
    
    const isNewList = listId === 0;

    // 1. Item Form Setup
    const itemForm = useForm<z.infer<typeof NewItemSchema>>({
        defaultValues: { name: '', estimated_price: 0, quantity: 1 },
        // zodResolver can produce a resolver type that doesn't exactly match the inferred useForm types
        resolver: zodResolver(NewItemSchema) as any,
        mode: 'onBlur',
    });

    // 2. State for editing and new list creation
    // Initialize currentListItems with calculated items if data is present
    const [currentListItems, setCurrentListItems] = useState<ShoppingListItem[]>(data?.list?.items || []);
    const [listName, setListName] = useState(data?.list?.name || '');
    const [selectedCategoryId, setSelectedCategoryId] = useState(data?.list?.category_id || (data?.categories[0]?.id || 0));

    useEffect(() => {
        if (data?.list) {
            // Items should already have total_price calculated by fetchSingleShoppingList
            setCurrentListItems(data.list.items);
            setListName(data.list.name);
            setSelectedCategoryId(data.list.category_id);
        }
        // Handle New List initialization: grab the first category ID if available
        if (isNewList && !selectedCategoryId && data?.categories.length) {
            setSelectedCategoryId(data.categories[0].id);
        }
    }, [data]);
    
    const listTotal = currentListItems.reduce((sum, item) => sum + (item.total_price || 0), 0);


    // 3. Mutations

    // Checkout Mutation
    const checkoutMutation = useMutation({
        mutationFn: async (actualTotalCost?: number) => {
            // POST /shopping-list/{id}/checkout
            return apiClient.post(`/shopping/${listId}/checkout`, { 
                actual_total_cost: actualTotalCost,
                transaction_description: listName,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shoppingLists'] });
            queryClient.invalidateQueries({ queryKey: ['currentBudget'] }); // Transaction added, budget changed
            queryClient.invalidateQueries({ queryKey: ['transactionsList'] });
            // Show success toast
            navigate('/shopping/lists');
        },
    });

    // Save/Update List Mutation
    const saveListMutation = useMutation({
        mutationFn: async (listData: any) => {
            if (isNewList) {
                // POST /shopping-list
                return apiClient.post('/shopping', listData);
            } else {
                // PATCH /shopping-list/{id}
                return apiClient.patch(`/shopping/${listId}`, listData);
            }
        },
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ['shoppingLists'] });
            // Show success toast
            if (isNewList) {
                // Redirect to the newly created list's page
                navigate(`/shopping/list/${response.data.id}`, { replace: true });
            } else {
                 queryClient.invalidateQueries({ queryKey: ['shoppingList', listId] });
            }
        },
    });

    // Handlers
    const handleAddItem = (values: z.infer<typeof NewItemSchema>) => {
        const newItem: ShoppingListItem = calculateItemTotalPrice(values);
        setCurrentListItems([...currentListItems, newItem]);
        itemForm.reset({ name: '', estimated_price: 0, quantity: 1 });
    };
    
    const handleSaveList = () => {
        if (!listName || currentListItems.length === 0 || !selectedCategoryId) {
            alert("List must have a name, a category, and at least one item.");
            return;
        }
        
        saveListMutation.mutate({
            name: listName,
            category_id: selectedCategoryId,
            // Only send fields expected by the backend schema (estimated_price and quantity)
            items: currentListItems.map(({ total_price, ...rest }) => rest), 
        });
    };
    
    const handleRemoveItem = (index: number) => {
        const newItems = currentListItems.filter((_, i) => i !== index);
        setCurrentListItems(newItems);
    };

    if (isLoading && !isNewList) {
        return (
             <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
        );
    }

    if (error) {
        return <div className="p-4 text-red-600">Error loading list: {error.message}</div>;
    }
    
    // Safety check for currentCategory which can be undefined if data hasn't loaded 
    // or if the category ID is invalid/missing.
    const categories = data?.categories || [];
    const currentCategory = categories.find(c => c.id === selectedCategoryId);
    const budgetRemaining = currentCategory ? currentCategory.planned - currentCategory.actual : 0;
    const projectedRemaining = budgetRemaining - listTotal;
    const isOverBudget = projectedRemaining < 0;

    return (
        <motion.div 
            className="space-y-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/shopping/lists')}>
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <h1 className="text-3xl font-bold text-gray-900">{isNewList ? 'Create New Shopping List' : listName}</h1>
                </div>
                <Button 
                    onClick={handleSaveList} 
                    disabled={saveListMutation.isPending || listName.length < 3 || currentListItems.length === 0 || !selectedCategoryId}
                    className="rounded-xl"
                >
                    <ListChecks className="w-4 h-4 mr-2" /> 
                    {saveListMutation.isPending ? 'Saving...' : (isNewList ? 'Save List' : 'Update List')}
                </Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Shopping List Card (Col 1 & 2) */}
                <Card className="rounded-2xl shadow-lg border border-gray-100 lg:col-span-2">
                    <CardHeader>
                        {/* List Name Input */}
                        <Input 
                            value={listName} 
                            onChange={(e) => setListName(e.target.value)}
                            placeholder="Enter List Name (e.g., Weekly Groceries)"
                            className="text-xl font-bold border-0 p-0 h-auto focus-visible:ring-0"
                            disabled={saveListMutation.isPending}
                        />
                        {/* Category Select (for all lists) */}
                        <select 
                            value={selectedCategoryId} 
                            onChange={(e) => setSelectedCategoryId(parseInt(e.target.value))}
                            className="text-sm p-1 border rounded-md w-fit bg-white mt-2"
                            disabled={saveListMutation.isPending || !categories.length}
                        >
                            <option value={0} disabled>Select Category</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[45%]">Item</TableHead>
                                    <TableHead className="w-[15%] text-center">Qty</TableHead>
                                    <TableHead className="w-[20%] text-right">Est. Total</TableHead>
                                    <TableHead className="w-[20%] text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {currentListItems.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{item.name}</TableCell>
                                        <TableCell className="text-center">{item.quantity}</TableCell>
                                        <TableCell className="text-right">${(item.total_price || (item.estimated_price * item.quantity)).toFixed(2)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)} disabled={saveListMutation.isPending}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className='bg-gray-50 font-bold'>
                                    <TableCell colSpan={2}>ESTIMATED TOTAL</TableCell>
                                    <TableCell colSpan={2} className='text-right text-lg'>
                                        ${listTotal.toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Controls/Add Item Card (Col 3) */}
                <Card className="rounded-2xl shadow-lg border border-gray-100 lg:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle className="text-lg">Add Item & Checkout</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        
                        {/* Budget Status */}
                        {currentCategory && (
                            <div className={`p-3 rounded-lg border ${isOverBudget ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                                <div className="flex items-center text-sm font-semibold">
                                    {isOverBudget ? <AlertTriangle className='w-4 h-4 mr-2 text-red-600' /> : <CheckCircle className='w-4 h-4 mr-2 text-green-600' />}
                                    <span className={isOverBudget ? 'text-red-600' : 'text-green-600'}>
                                        {isOverBudget ? 'WARNING: Exceeds Budget' : 'Budget OK'}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                    {currentCategory.name} Budget Remaining: 
                                    <span className={`font-bold ml-1 ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>${projectedRemaining.toFixed(2)}</span>
                                </p>
                            </div>
                        )}
                        
                        {/* Item Form */}
                        <Form {...itemForm}>
                            <form onSubmit={itemForm.handleSubmit(handleAddItem)} className="space-y-3">
                                <FormField control={itemForm.control} name="name" render={({ field }) => (
                                    <FormItem><FormLabel>Item Name</FormLabel><FormControl><Input placeholder="e.g., Bananas" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField control={itemForm.control} name="estimated_price" render={({ field }) => (
                                        <FormItem><FormLabel>Price Est.</FormLabel><FormControl><Input type="number" step="0.01" placeholder="3.99" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={itemForm.control} name="quantity" render={({ field }) => (
                                        <FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" placeholder="1" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>
                                <Button type="submit" className="w-full" disabled={saveListMutation.isPending}>
                                    <Plus className="w-4 h-4 mr-2" /> Add Item
                                </Button>
                            </form>
                        </Form>
                        
                        {/* Checkout Button */}
                        <div className="pt-4 border-t border-gray-100">
                            <Button 
                                onClick={() => checkoutMutation.mutate(listTotal)} // Pass listTotal as default actual_total_cost
                                disabled={listTotal === 0 || checkoutMutation.isPending || isNewList || saveListMutation.isPending}
                                className="w-full h-10 text-lg bg-green-600 hover:bg-green-700"
                            >
                                {checkoutMutation.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <ShoppingCart className="w-5 h-5 mr-2" />}
                                Checkout & Record (${listTotal.toFixed(2)})
                            </Button>
                            <p className="text-xs text-gray-500 text-center mt-2">
                                Checkout records a transaction and deletes this list.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </motion.div>
    );
};

export default SingleShoppingListPage;
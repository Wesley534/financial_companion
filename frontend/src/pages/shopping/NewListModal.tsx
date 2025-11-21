// frontend/src/components/shopping/NewListModal.tsx

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { Loader2, ListChecks, DollarSign, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Component Imports
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// --- Type Definitions ---
interface CategoryOut {
    id: number;
    name: string;
}

// --- Validation Schema ---
const NewListSchema = z.object({
    name: z.string().min(3, "List name is required."),
    category_id: z.coerce.number().min(1, "A budget category is required."),
});

interface NewListModalProps {
    children: React.ReactNode;
}

// --- API Fetching: Categories ---
const fetchCategories = async (): Promise<CategoryOut[]> => {
    // Fetch categories for the required budget linkage
    const response = await apiClient.get('/budget/current');
    return response.data.categories.map((c: any) => ({ id: c.id, name: c.name }));
};

// --- Main Component ---
const NewListModal: React.FC<NewListModalProps> = ({ children }) => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    
    const form = useForm<z.infer<typeof NewListSchema>>({
        resolver: zodResolver(NewListSchema),
        defaultValues: { name: '', category_id: 0 },
    });

    // Fetch Categories
    const { data: categories, isLoading: isCategoriesLoading } = useQuery<CategoryOut[]>({
        queryKey: ['categoriesList'],
        queryFn: fetchCategories,
        staleTime: Infinity,
    });
    
    // Save Mutation
    const createListMutation = useMutation({
        mutationFn: async (data: z.infer<typeof NewListSchema>) => {
            // POST /shopping-list (assuming items=[] by default)
            return apiClient.post('/shopping', {
                ...data,
                items: [], // Start with an empty items list
            });
        },
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ['shoppingLists'] });
            form.reset();
            setIsOpen(false);
            // Redirect to the new list's page for item entry
            navigate(`/shopping/list/${response.data.id}`);
        },
        onError: (err: any) => {
            console.error("List creation failed:", err.response?.data?.detail || err.message);
        }
    });

    const onSubmit = (values: z.infer<typeof NewListSchema>) => {
        createListMutation.mutate(values);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl">Create New Shopping List</DialogTitle>
                    <DialogDescription>
                        Give your list a name and link it to a budget category.
                    </DialogDescription>
                </DialogHeader>
                
                {isCategoriesLoading ? (
                    <div className="flex h-20 items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
                ) : (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center"><ListChecks className="w-4 h-4 mr-2" /> List Name</FormLabel>
                                        <FormControl><Input placeholder="e.g., Weekly Groceries" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <FormField
                                control={form.control}
                                name="category_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center"><DollarSign className="w-4 h-4 mr-2" /> Budget Category</FormLabel>
                                        <Select onValueChange={val => field.onChange(parseInt(val))} value={String(field.value)}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select target budget category" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {categories?.map(c => (
                                                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button 
                                type="submit" 
                                className="w-full"
                                disabled={createListMutation.isPending || isCategoriesLoading}
                            >
                                {createListMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                                Create List & Add Items
                            </Button>
                        </form>
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default NewListModal;
// frontend/src/pages/shopping/ShoppingListsOverviewPage.tsx (UNCHANGED LOGIC)

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { 
    Loader2, 
    PlusCircle, 
    ArrowRight, 
    ListChecks} from 'lucide-react';

// Component Imports
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge'; 
// import NewListModal from '@/components/shopping/NewListModal'; // Corrected relative path for import
import NewListModal from './NewListModal';
// --- Type Definitions ---

interface CategoryData {
    id: number;
    name: string;
    planned: number;
    actual: number;
}

interface ShoppingListOut {
    id: number;
    name: string;
    category_id: number;
    total_cost: number;
    created_at: string;
}

interface MonthlyBudgetOut {
    categories: CategoryData[];
}

// --- API Fetching Functions ---

const fetchShoppingLists = async (): Promise<ShoppingListOut[]> => {
    // FIX: Corrected endpoint to /shopping-lists
    const response = await apiClient.get('/shopping');
    return response.data;
};

const fetchBudgetCategories = async (): Promise<CategoryData[]> => {
    // Fetch budget data to get Category Planned/Actual amounts
    const response = await apiClient.get<MonthlyBudgetOut>('/budget/current');
    return response.data.categories;
};

// --- Utility: Determine Budget Status (Remains the same) ---
const getBudgetStatus = (listCost: number, categoryId: number, categories: CategoryData[]): { status: string, color: string, remaining: number } => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return { status: "No Budget", color: "gray", remaining: 0 };

    const remainingBudget = category.planned - category.actual;
    const projectedRemaining = remainingBudget - listCost;

    if (projectedRemaining >= 0) {
        return { status: "Within Budget", color: "green", remaining: projectedRemaining };
    }
    if (projectedRemaining < 0 && projectedRemaining >= -category.planned * 0.1) {
        return { status: "Close/Warning", color: "yellow", remaining: projectedRemaining };
    }
    return { status: "Over Budget", color: "red", remaining: projectedRemaining };
};

// --- Main Component ---

const ShoppingListsOverviewPage: React.FC = () => {
    // Fetch all lists
    const { data: lists, isLoading: isListsLoading, error: listError } = useQuery<ShoppingListOut[]>({
        queryKey: ['shoppingLists'],
        queryFn: fetchShoppingLists,
    });
    
    // Fetch categories for budget comparison
    const { data: categories, isLoading: isCategoriesLoading, error: categoryError } = useQuery<CategoryData[]>({
        queryKey: ['budgetCategories'],
        queryFn: fetchBudgetCategories,
    });

    const isLoading = isListsLoading || isCategoriesLoading;
    const error = listError || categoryError;

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <p className="ml-3 text-gray-600">Loading shopping lists...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center text-red-600 border border-red-200 bg-red-50 rounded-lg">
                <h2 className="text-xl font-bold mb-2">Error Loading Lists</h2>
                <p>Could not fetch data. Error: {error.message}</p>
            </div>
        );
    }
    
    const categoriesMap = categories || [];

    return (
        <motion.div 
            className="space-y-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-gray-900">Shopping Lists Overview</h1>
                {/* USE MODAL COMPONENT */}
                <NewListModal> 
                    <Button className="rounded-xl">
                        <PlusCircle className="w-4 h-4 mr-2" /> Create New List
                    </Button>
                </NewListModal>
            </div>

            <Card className="rounded-2xl shadow-lg border border-gray-100">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableHead className="w-[30%]"><ListChecks className="w-4 h-4 inline mr-2" /> List Name</TableHead>
                            <TableHead className="w-[20%]">Budget Category</TableHead>
                            <TableHead className="w-[15%] text-right">Est. Total Cost</TableHead>
                            <TableHead className="w-[20%]">Budget Status</TableHead>
                            <TableHead className="w-[15%] text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {lists?.length ? (
                            lists.map(list => {
                                const category = categoriesMap.find(c => c.id === list.category_id);
                                const status = getBudgetStatus(list.total_cost, list.category_id, categoriesMap);
                                
                                const badgeColor = status.color === 'green' ? 'bg-green-500 hover:bg-green-600' :
                                                   status.color === 'yellow' ? 'bg-yellow-500 hover:bg-yellow-600' :
                                                   status.color === 'red' ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-500 hover:bg-gray-600';
                                
                                return (
                                    <TableRow key={list.id} className="hover:bg-gray-50/50">
                                        <TableCell className="font-medium text-gray-900">{list.name}</TableCell>
                                        <TableCell className="text-gray-600">{category?.name || 'N/A'}</TableCell>
                                        <TableCell className="text-right font-semibold">${list.total_cost.toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Badge className={`text-white font-medium ${badgeColor}`}>
                                                {status.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Link to={`/shopping/list/${list.id}`}>
                                                <Button variant="ghost" size="sm" className="h-8 p-1 text-gray-500 hover:text-gray-900">
                                                    View/Checkout <ArrowRight className="w-4 h-4 ml-1" />
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-gray-500 italic py-8">
                                    No shopping lists created yet. Click the button above to start one!
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>
        </motion.div>
    );
};

export default ShoppingListsOverviewPage;
// frontend/src/api/budget.ts (UPDATED)

import { useMutation, useQueryClient } from '@tanstack/react-query'; // <-- Import useQueryClient
import apiClient from './client';
import { z } from 'zod';

// --- Schemas (Matching Backend Pydantic Models) ---

export const CategoryCreateSchema = z.object({
  name: z.string().min(1, "Category name is required"),
  type: z.enum(["Need", "Want", "Savings"], { required_error: "Type is required" }),
  planned: z.number().min(0, "Planned amount must be non-negative"),
  icon: z.string().optional().default("dollar-sign"),
  color: z.string().optional().default("#333333"),
});

export type CategoryCreate = z.infer<typeof CategoryCreateSchema>;

export const BudgetInitialSetupSchema = z.object({
    income: z.number().min(0, "Monthly income is required"),
    starting_balance: z.number().min(0, "Starting balance is required"),
    savings_goal_amount: z.number().min(0, "Savings goal amount is required"),
    allocation_method: z.enum(["50/30/20", "Manual"]),
    initial_categories: z.array(CategoryCreateSchema).optional(),
});

export type BudgetInitialSetup = z.infer<typeof BudgetInitialSetupSchema>;

export interface BudgetOut {
    id: number;
    month: string;
    income: number;
    starting_balance: number;
    free_to_spend: number;
}


// --- API Functions ---

// 1. Setup Initial Budget
const setupInitialBudget = async (data: BudgetInitialSetup): Promise<BudgetOut> => {
    // Note: If the backend returns the updated User object along with BudgetOut, 
    // you might want to adjust the return type and data handling. For now, 
    // we rely on the side effect (invalidateQueries) to get the fresh user data.
    const response = await apiClient.post<BudgetOut>('/budget/setup', data);
    return response.data;
};


// --- React Query Hooks ---

// Hook for the Setup Wizard mutation
export const useSetupBudgetMutation = () => {
    const queryClient = useQueryClient(); // <-- Initialize useQueryClient inside the hook

    return useMutation({
        mutationFn: setupInitialBudget,
        // --- ADDED: Invalidate User Query on Success ---
        onSuccess: () => {
            // Invalidate the cache for the 'user' query key.
            // This forces the useUserQuery in App.tsx to refetch the user data
            // (which now includes is_setup_complete: true).
            queryClient.invalidateQueries({ queryKey: ['user'] });
        },
        // ---------------------------------------------
    });
};
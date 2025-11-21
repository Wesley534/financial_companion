// frontend/src/pages/transactions/EditTransactionPage.tsx

import React from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { Loader2 } from 'lucide-react';
import TransactionForm from '@/components/forms/TransactionForm';

// --- Type Definitions ---
interface FullTransactionOut {
    id: number;
    amount: number;
    date: string; // ISO format
    description: string;
    category_id: number;
    notes: string;
    recurring: boolean;
    // ... other fields not needed by form ...
}

// --- API Fetching ---
const fetchTransactionById = async (id: string): Promise<FullTransactionOut> => {
    // NOTE: The endpoint is GET /transactions/{id}
    const response = await apiClient.get(`/transactions/${id}`);
    
    // Convert date object to YYYY-MM-DD string for form default value
    const data = response.data;
    data.date = new Date(data.date).toISOString().substring(0, 10);
    
    return data;
};

// --- Main Component ---

const EditTransactionPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();

    // Fetch existing transaction data
    const { data, isLoading, error } = useQuery<FullTransactionOut>({
        queryKey: ['transaction', id],
        queryFn: () => fetchTransactionById(id!),
        enabled: !!id,
    });
    
    if (!id || isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <p className="ml-3 text-gray-600">{!id ? 'Invalid Transaction ID' : 'Loading transaction...'}</p>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="p-8 text-center text-red-600 border border-red-200 bg-red-50 rounded-lg">
                <h2 className="text-xl font-bold mb-2">Error Loading Transaction</h2>
                <p>{error.message}</p>
            </div>
        );
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            {/* isEditMode is true, pass the fetched data */}
            <TransactionForm 
                isEditMode={true} 
                initialData={data} 
            />
        </motion.div>
    );
};

export default EditTransactionPage;
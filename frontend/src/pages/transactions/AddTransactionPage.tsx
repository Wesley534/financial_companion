// frontend/src/pages/transactions/AddTransactionPage.tsx

import React from 'react';
import TransactionForm from '@/components/forms/TransactionForm';
import { motion } from 'framer-motion';

const AddTransactionPage: React.FC = () => {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            {/* isEditMode is false */}
            <TransactionForm isEditMode={false} />
        </motion.div>
    );
};

export default AddTransactionPage;
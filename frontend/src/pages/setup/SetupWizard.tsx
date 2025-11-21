// frontend/src/pages/SetupWizardPage.tsx

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useSetupBudgetMutation } from '@/api/budget'; 
import type { BudgetInitialSetup } from '@/api/budget'; 


// --- Initial State and Types ---
// Extend the BudgetSetup type for the multi-step form state
interface SetupState extends Omit<BudgetInitialSetup, 'initial_categories'> {
    categories_planned: number;
}

const INITIAL_STATE: SetupState = {
    income: 0,
    starting_balance: 0,
    savings_goal_amount: 0,
    allocation_method: "50/30/20",
    categories_planned: 0, // Calculated value for review
};

// --- Wizard Component ---
const SetupWizardPage = () => {
    const navigate = useNavigate();
    // user is only needed for context, not for setup status in this final version
    const { user } = useAuthStore(); 
    const setupMutation = useSetupBudgetMutation();

    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<SetupState>(INITIAL_STATE);
    const [error, setError] = useState<string | null>(null);

    // --- Dynamic Calculations (Used in Review Step) ---
    const allocationBreakdown = useMemo(() => {
        if (formData.allocation_method === '50/30/20') {
            return {
                Needs: formData.income * 0.50,
                Wants: formData.income * 0.30,
                Savings: formData.income * 0.20,
                TotalPlanned: formData.income,
            };
        }
        // Manual allocation logic will be complex, so we'll just show the income for now
        return {
            Needs: 0,
            Wants: 0,
            Savings: 0,
            TotalPlanned: formData.income,
        };
    }, [formData]);


    // --- Form Handlers ---

    const handleNext = () => {
        setError(null);
        // Simple validation for each step
        if (step === 1 && formData.income <= 0) {
            return setError("Please enter a valid monthly income.");
        }
        if (step === 2 && formData.starting_balance < 0) {
            return setError("Starting balance cannot be negative.");
        }

        if (step < 5) {
            setStep(step + 1);
        }
    };

    const handlePrev = () => {
        if (step > 1) {
            setStep(step - 1);
        }
    };

    const handleFinalize = async () => {
        setError(null);
        
        // 1. Prepare data for API call (BudgetInitialSetup)
        const apiData: BudgetInitialSetup = {
            income: formData.income,
            starting_balance: formData.starting_balance,
            savings_goal_amount: formData.savings_goal_amount,
            allocation_method: formData.allocation_method,
            // initial_categories: [] // Omitted for MVP 50/30/20 logic
        };

        try {
            // 2. Execute mutation (onSuccess hook in useSetupBudgetMutation will invalidate the user query)
            await setupMutation.mutateAsync(apiData);

            // 3. On Success: Redirect to dashboard. 
            // The routing logic in App.tsx handles the setup status check via the backend field.
            navigate('/dashboard', { replace: true });

        } catch (err: any) {
            // Handle API errors (e.g., HTTP 409 Conflict if budget already exists)
            const detail = err.response?.data?.detail || "Budget setup failed. Check server logs.";
            setError(detail);
        }
    };
    
    // --- Step Components ---

    const Step1 = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">Step 1: Monthly Income</h3>
            <p className="text-sm text-muted-foreground">This is the foundation of your zero-based budget.</p>
            <Label htmlFor="income">Total Monthly Income</Label>
            <Input 
                id="income"
                type="number"
                placeholder="e.g., 5000"
                value={formData.income || ''}
                onChange={(e) => setFormData({...formData, income: parseFloat(e.target.value) || 0})}
            />
        </div>
    );

    const Step2 = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">Step 2: Starting Balance</h3>
            <p className="text-sm text-muted-foreground">The current balance in your main checking account.</p>
            <Label htmlFor="balance">Current Account Balance</Label>
            <Input 
                id="balance"
                type="number"
                placeholder="e.g., 1250.50"
                value={formData.starting_balance || ''}
                onChange={(e) => setFormData({...formData, starting_balance: parseFloat(e.target.value) || 0})}
            />
        </div>
    );

    const Step3 = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">Step 3: Savings Goal</h3>
            <p className="text-sm text-muted-foreground">What is the next big thing you are saving for?</p>
            <Label htmlFor="goal">Target Amount</Label>
            <Input 
                id="goal"
                type="number"
                placeholder="e.g., 10000"
                value={formData.savings_goal_amount || ''}
                onChange={(e) => setFormData({...formData, savings_goal_amount: parseFloat(e.target.value) || 0})}
            />
            <p className="text-xs text-muted-foreground pt-2">A default savings goal will be created for you.</p>
        </div>
    );

    const Step4 = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">Step 4: Allocation Method</h3>
            <p className="text-sm text-muted-foreground">Choose a method for your initial category setup.</p>
            
            <RadioGroup 
                defaultValue={formData.allocation_method} 
                onValueChange={(value: "50/30/20" | "Manual") => setFormData({...formData, allocation_method: value})}
                className="space-y-4"
            >
                <div className="flex items-center space-x-2 border p-3 rounded-md">
                    <RadioGroupItem value="50/30/20" id="r1" />
                    <Label htmlFor="r1">
                        <span className="font-medium">50/30/20 Rule</span>
                        <p className="text-xs text-muted-foreground">50% Needs, 30% Wants, 20% Savings (Default Categories)</p>
                    </Label>
                </div>
                <div className="flex items-center space-x-2 border p-3 rounded-md">
                    <RadioGroupItem value="Manual" id="r2" />
                    <Label htmlFor="r2">
                        <span className="font-medium">Manual Allocation</span>
                        <p className="text-xs text-muted-foreground">Define your own categories and planned amounts.</p>
                    </Label>
                </div>
            </RadioGroup>
            
            {/* Note: Manual Category UI is Phase 2. For MVP, we will only use the 50/30/20 option */}
            {formData.allocation_method === 'Manual' && (
                <div className="text-sm text-orange-500 border-l-4 border-orange-400 pl-3 py-1 bg-orange-50/50">
                    Manual allocation is a Phase 2 feature. Default 50/30/20 categories will be used.
                </div>
            )}

        </div>
    );

    const Step5 = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">Step 5: Review Budget Summary</h3>
            <p className="text-sm text-muted-foreground">Confirm your initial budget before proceeding.</p>

            <div className="space-y-2 text-sm">
                <div className="flex justify-between font-medium">
                    <span>Monthly Income:</span>
                    <span>${formData.income.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span>Starting Balance:</span>
                    <span>${formData.starting_balance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span>Initial Savings Goal:</span>
                    <span>${formData.savings_goal_amount.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-sm pt-2 text-green-600">
                    <span>Total Planned Expenses:</span>
                    <span>${allocationBreakdown.TotalPlanned.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-sm">
                    <span>Free-to-Spend (Zero-Based):</span>
                    <span className={allocationBreakdown.TotalPlanned > formData.income ? 'text-red-500' : 'text-primary'}>
                        ${(formData.income - allocationBreakdown.TotalPlanned).toFixed(2)}
                    </span>
                </div>
                
                <p className="text-xs text-muted-foreground italic pt-4">
                    The backend will create your budget and default 50/30/20 categories (Needs: ${allocationBreakdown.Needs.toFixed(2)}, Wants: ${allocationBreakdown.Wants.toFixed(2)}, Savings: ${allocationBreakdown.Savings.toFixed(2)}).
                </p>
            </div>
        </div>
    );


    // --- Render Logic ---

    const currentStepComponent = [Step1, Step2, Step3, Step4, Step5][step - 1];
    const totalSteps = 5;

    return (
        <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50">
            <Card className="w-full max-w-lg shadow-2xl">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-primary">First-Time Setup Wizard</CardTitle>
                    <CardDescription>Step {step} of {totalSteps}: Setting up your foundation.</CardDescription>
                </CardHeader>
                
                <CardContent>
                    {error && (
                        <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-200 rounded text-sm">
                            {error}
                        </div>
                    )}
                    {currentStepComponent()}
                </CardContent>

                <CardFooter className="flex justify-between border-t pt-4">
                    <Button 
                        variant="outline" 
                        onClick={handlePrev} 
                        disabled={step === 1}
                    >
                        <ArrowLeftIcon className="h-4 w-4 mr-2" /> Back
                    </Button>
                    
                    {step < totalSteps ? (
                        <Button onClick={handleNext}>
                            Next <ArrowRightIcon className="h-4 w-4 ml-2" />
                        </Button>
                    ) : (
                        <Button 
                            onClick={handleFinalize} 
                            disabled={setupMutation.isPending}
                        >
                            {setupMutation.isPending ? 'Creating Budget...' : 'Finish Setup'}
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
};

export default SetupWizardPage;
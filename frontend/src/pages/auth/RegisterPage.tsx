// frontend/src/pages/auth/RegisterPage.tsx

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Link, useNavigate } from 'react-router-dom';
import { useRegisterMutation } from '@/api/auth'; 
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, cubicBezier } from 'framer-motion';
import { Heart, CheckCircle } from 'lucide-react'; 

// --- Color and Style Constants (matching the WelcomePage) ---
const PRIMARY_BLUE = 'hsl(220, 80%, 50%)'; // Primary CTA Color
const BRAND_GREEN = 'hsl(140, 70%, 45%)'; // Accent Color

// Re-use the full schema from auth.ts
const RegisterSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type RegisterFormValues = z.infer<typeof RegisterSchema>;

// Framer Motion Variants for the split layout using cubicBezier easing
const slideInLeft = {
    hidden: { opacity: 0, x: -50 },
    visible: { 
        opacity: 1, 
        x: 0, 
        transition: { duration: 0.8, ease: cubicBezier(0.4, 0, 0.2, 1) } 
    },
};

const slideInRight = {
    hidden: { opacity: 0, x: 50 },
    visible: { 
        opacity: 1, 
        x: 0, 
        transition: { duration: 0.8, ease: cubicBezier(0.4, 0, 0.2, 1) } 
    },
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const registerMutation = useRegisterMutation(); 

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    try {
        await registerMutation.mutateAsync(values); 
        alert("Success! You're now registered. Let's get you logged in.");
        navigate('/login'); 
    } catch (error: any) {
        const errorMessage = error.response?.data?.detail || 'Registration failed. Please try again.';
        if (errorMessage.includes("Email already registered")) {
            form.setError('email', { type: 'manual', message: errorMessage });
        } else {
            form.setError('name', { type: 'manual', message: errorMessage });
        }
    }
  };

  return (
    <div 
        className="flex items-center justify-center min-h-screen p-6 relative"
        style={{ 
            backgroundImage: `url('https://images.pexels.com/photos/6266641/pexels-photo-6266641.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
        }}
    >
        <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"></div>

        <div className="w-full max-w-5xl grid lg:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl z-10">
            
            {/* Left Column: Image/Welcome Panel */}
            <motion.div
                className="hidden lg:flex flex-col items-center justify-center p-12 text-white relative"
                style={{ 
                    backgroundColor: PRIMARY_BLUE,
                    background: `linear-gradient(135deg, ${PRIMARY_BLUE} 0%, hsl(240, 70%, 55%) 100%)`
                }}
                initial="hidden"
                animate="visible"
                variants={slideInLeft}
            >
                <div className="text-center p-8">
                    <Heart className="w-16 h-16 mx-auto mb-4 fill-white" />
                    <h2 className="text-4xl font-extrabold mb-4">
                        Unlock Your Savings Potential
                    </h2>
                    <p className="text-lg text-indigo-100">
                        Join our community of smart money managers. Effortless tracking, smart budgets, and real-time clarity await you!
                    </p>
                    <ul className="mt-6 space-y-3 text-left w-fit mx-auto">
                        <li className="flex items-center text-lg font-medium"><CheckCircle className="w-5 h-5 mr-3 text-white" /> AI Expense Tagging</li>
                        <li className="flex items-center text-lg font-medium"><CheckCircle className="w-5 h-5 mr-3 text-white" /> Real-Time Budget Monitoring</li>
                        <li className="flex items-center text-lg font-medium"><CheckCircle className="w-5 h-5 mr-3 text-white" /> Secure & Private</li>
                    </ul>
                </div>
            </motion.div>

            {/* Right Column: Registration Form */}
            <motion.div
                className="bg-white p-8 sm:p-12"
                initial="hidden"
                animate="visible"
                variants={slideInRight}
            >
                <Card className="w-full border-none shadow-none">
                    <CardHeader className="p-0 text-center lg:text-left">
                        <h1 className="text-3xl font-black mb-1" style={{ color: BRAND_GREEN }}>
                            SMARTBUDGET
                        </h1>
                        <CardTitle className="text-4xl font-extrabold text-gray-900">
                            Create Account
                        </CardTitle>
                        <CardDescription className="text-gray-600 mt-2 text-lg">
                            It's quick and easy. Let's get started on your free trial!
                        </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="p-0 pt-6">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                
                                {/* Name Field */}
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Your Name</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    placeholder="John Doe" 
                                                    {...field} 
                                                    className="h-11 rounded-xl focus:border-blue-500"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Email Field */}
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email Address</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    placeholder="you@example.com" 
                                                    type="email" 
                                                    {...field} 
                                                    className="h-11 rounded-xl focus:border-blue-500"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                
                                {/* Password Field */}
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Secure Password</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    placeholder="Minimum 6 characters" 
                                                    type="password" 
                                                    {...field} 
                                                    className="h-11 rounded-xl focus:border-blue-500"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Submit Button */}
                                <Button 
                                    type="submit" 
                                    className="w-full h-12 text-lg font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
                                    style={{ backgroundColor: PRIMARY_BLUE }}
                                    disabled={registerMutation.isPending} 
                                >
                                    {registerMutation.isPending ? 'Signing You Up...' : 'Create Account'}
                                </Button>
                            </form>
                        </Form>
                        
                        <div className="mt-8 text-center text-base text-gray-600">
                            By creating an account, you agree to our <Link to="/terms" className="underline font-medium" style={{ color: PRIMARY_BLUE }}>Terms of Service</Link> and <Link to="/privacy" className="underline font-medium" style={{ color: PRIMARY_BLUE }}>Privacy Policy</Link>.
                        </div>
                        
                        <div className="mt-4 text-center text-sm text-gray-600">
                            Already part of the family?{' '}
                            <Link to="/login" className="font-semibold" style={{ color: PRIMARY_BLUE }}>
                                Log In
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    </div>
  );
};

export default RegisterPage;

// frontend/src/pages/auth/LoginPage.tsx

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Link, useNavigate } from 'react-router-dom';
import { useLoginMutation, UserInSchema } from '@/api/auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Lock, Zap } from 'lucide-react'; 

// --- Color and Style Constants (matching the RegisterPage) ---
const PRIMARY_BLUE = 'hsl(220, 80%, 50%)'; // Primary CTA Color
const BRAND_GREEN = 'hsl(140, 70%, 45%)'; // Accent Color

// Define the Login Schema (subset of UserInSchema)
const LoginSchema = UserInSchema.omit({ name: true });
type LoginFormValues = z.infer<typeof LoginSchema>;

// Framer Motion Variants for the split layout
const slideInLeft = {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: "easeOut" } },
};

const slideInRight = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: "easeOut" } },
};


const LoginPage = () => {
  const navigate = useNavigate();
  const loginMutation = useLoginMutation();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
        await loginMutation.mutateAsync(values);
        // Navigate to the dashboard (or first-time setup wizard later)
        navigate('/dashboard', { replace: true });

    } catch (error: any) {
        // Handle API errors (e.g., Incorrect email or password)
        const errorMessage = error.response?.data?.detail || 'Login failed. Please check your credentials.';
        form.setError('email', { type: 'manual', message: errorMessage });
        form.setError('password', { type: 'manual', message: '' }); // Clear password error
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
        {/* Semi-transparent Overlay for Readability */}
        <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"></div>

        <div className="w-full max-w-5xl grid lg:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl z-10">
            
            {/* Left Column: Welcome Back Panel (Blue Gradient) - Hidden on Mobile */}
            {/* Swapping the order from the Register page for visual variety */}
            <motion.div
                className="bg-white p-8 sm:p-12 order-2 lg:order-1"
                initial="hidden"
                animate="visible"
                variants={slideInLeft} // Adjusted animation to match its new position
            >
                <Card className="w-full border-none shadow-none">
                    <CardHeader className="p-0 text-center lg:text-left">
                        {/* Logo/Brand Title */}
                        <h1 
                            className="text-3xl font-black mb-1" 
                            style={{ color: BRAND_GREEN }}
                        >
                            SMARTBUDGET
                        </h1>
                        <CardTitle className="text-4xl font-extrabold text-gray-900">
                            Welcome Back!
                        </CardTitle>
                        <CardDescription className="text-gray-600 mt-2 text-lg">
                            We're ready to help you continue your financial success.
                        </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="p-0 pt-6">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                
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
                                            <FormLabel>Password</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    placeholder="••••••••" 
                                                    type="password" 
                                                    {...field} 
                                                    className="h-11 rounded-xl focus:border-blue-500"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                
                                {/* Forgot Password Link */}
                                <div className="text-right text-sm">
                                    <Link to="/forgot-password" className="font-medium hover:underline" style={{ color: PRIMARY_BLUE }}>
                                        Forgot Password?
                                    </Link>
                                </div>


                                {/* Submit Button (Primary Blue Style) */}
                                <Button 
                                    type="submit" 
                                    className="w-full h-12 text-lg font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
                                    style={{ backgroundColor: PRIMARY_BLUE }}
                                    disabled={loginMutation.isPending}
                                >
                                    {loginMutation.isPending ? 'Accessing Account...' : 'Log In'}
                                </Button>
                            </form>
                        </Form>
                        
                        <div className="mt-6 text-center text-sm text-gray-600">
                            Don't have an account?{' '}
                            <Link to="/register" className="font-semibold" style={{ color: BRAND_GREEN }}>
                                Sign Up Now
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>


            {/* Right Column: Illustration/Friendly Message (Image Background) */}
            <motion.div
                className="hidden lg:flex flex-col items-center justify-center p-12 text-white relative order-1 lg:order-2"
                style={{ 
                    // Use the accent color for a clean split on the side with the image
                    backgroundColor: BRAND_GREEN, 
                    background: `linear-gradient(135deg, ${BRAND_GREEN} 0%, hsl(160, 60%, 45%) 100%)`
                }}
                initial="hidden"
                animate="visible"
                variants={slideInRight} // Adjusted animation to match its new position
            >
                <div className="text-center p-8">
                    <Zap className="w-16 h-16 mx-auto mb-4 fill-white" />
                    <h2 className="text-4xl font-extrabold mb-4">
                        Instant Access. Smart Results.
                    </h2>
                    <p className="text-lg text-white/90">
                        Your dashboard is waiting. Get back to tracking, planning, and achieving your financial goals.
                    </p>
                    <ul className="mt-6 space-y-3 text-left w-fit mx-auto">
                        <li className="flex items-center text-lg font-medium"><Lock className="w-5 h-5 mr-3 text-white" /> Industry-Leading Security</li>
                        <li className="flex items-center text-lg font-medium"><Lock className="w-5 h-5 mr-3 text-white" /> Quick, Seamless Login</li>
                    </ul>
                </div>
            </motion.div>
        </div>
    </div>
  );
};

export default LoginPage;
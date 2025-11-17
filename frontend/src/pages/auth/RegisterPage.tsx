// frontend/src/pages/auth/RegisterPage.tsx

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Link, useNavigate } from 'react-router-dom';
import { useRegisterMutation} from '@/api/auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Re-use the full schema from auth.ts
const RegisterSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type RegisterFormValues = z.infer<typeof RegisterSchema>;


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
        await registerMutation.mutateAsync(values as UserIn); // Cast for type safety
        
        // On successful registration, prompt for login or auto-login (we'll navigate to login for MVP)
        alert("Registration successful! Please log in.");
        navigate('/login'); 

    } catch (error: any) {
        // Handle API errors (e.g., Email already registered)
        const errorMessage = error.response?.data?.detail || 'Registration failed. Please try again.';
        if (errorMessage.includes("Email already registered")) {
            form.setError('email', { type: 'manual', message: errorMessage });
        } else {
            // General error
            form.setError('name', { type: 'manual', message: errorMessage });
        }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sign Up</CardTitle>
          <CardDescription>Create an account to start your SmartBudget journey.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Name Field */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="you@example.com" type="email" {...field} />
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
                      <Input placeholder="••••••••" type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? 'Registering...' : 'Create Account'}
              </Button>
            </form>
          </Form>
          
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link to="/login" className="underline font-medium">
              Log In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterPage;
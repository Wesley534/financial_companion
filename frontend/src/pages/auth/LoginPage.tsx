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

// Define the Login Schema (subset of UserInSchema)
const LoginSchema = UserInSchema.omit({ name: true });
type LoginFormValues = z.infer<typeof LoginSchema>;


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
        // On successful login, useLoginMutation onSuccess will:
        // 1. Set the token (in store and api client)
        // 2. Invalidate the 'me' query, which fetches user data and updates store.
        
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
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Log In</CardTitle>
          <CardDescription>Enter your email and password to access your budget.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

              <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? 'Logging In...' : 'Log In'}
              </Button>
            </form>
          </Form>
          
          <div className="mt-4 text-center text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="underline font-medium">
              Sign Up
            </Link>
          </div>
          {/* Logout Everywhere option is not MVP, leave as note */}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
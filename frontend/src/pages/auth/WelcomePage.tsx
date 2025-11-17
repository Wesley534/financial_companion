import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';

const WelcomePage = () => {
  return (
    // Mobile-first centering container
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-extrabold text-primary">
            SMART<span className="text-green-600">BUDGET</span>
          </CardTitle>
          <CardDescription className="text-gray-600 mt-2">
            Digitizing "Planned vs Actual" with AI-powered expense management.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* A.1 App introduction carousel (Placeholder) */}
          <div className="h-48 w-full bg-blue-50 border border-dashed border-blue-200 rounded-xl flex flex-col items-center justify-center p-4">
            <h3 className="font-semibold text-lg text-blue-700">Planned vs Actual</h3>
            <p className="text-sm text-blue-600 mt-1 text-center">
              Real-time variance monitoring, zero-based budgeting, and AI categorization.
            </p>
            <span className="text-xs mt-3 text-blue-400">Swipe for more features (Carousel Placeholder)</span>
          </div>

          {/* Buttons: Sign Up / Log In / Try Demo */}
          <div className="space-y-3">
            <Link to="/register" className="block">
              <Button className="w-full text-lg font-semibold h-11 shadow-md">
                Sign Up
              </Button>
            </Link>
            <Link to="/login" className="block">
              <Button variant="outline" className="w-full text-lg font-semibold h-11 border-2">
                Log In
              </Button>
            </Link>
          </div>

          <Button variant="link" className="w-full text-sm text-gray-500 hover:text-gray-700">
            Try Demo (Coming Soon - Phase 2)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default WelcomePage;
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Ambulance, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage({ isDriver = false }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name}!`);
      
      if (user.role === 'driver') {
        navigate('/driver/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
        
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-600 flex items-center justify-center mx-auto mb-4">
              <Ambulance className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">{isDriver ? 'Driver Login' : 'Welcome Back'}</CardTitle>
            <CardDescription>
              {isDriver 
                ? 'Sign in to your driver account to start accepting rides'
                : 'Sign in to request emergency medical transport'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="login-email-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="login-password-input"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={loading}
                data-testid="login-submit-btn"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Sign In
              </Button>
            </form>
            
            <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
              Don't have an account?{' '}
              <Link 
                to={isDriver ? '/driver/register' : '/register'} 
                className="text-red-600 hover:underline font-medium"
                data-testid="login-register-link"
              >
                Sign up
              </Link>
            </div>
            
            {!isDriver && (
              <div className="mt-4 text-center">
                <Link 
                  to="/driver/login" 
                  className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  data-testid="login-driver-link"
                >
                  Are you a driver? Login here
                </Link>
              </div>
            )}
            {isDriver && (
              <div className="mt-4 text-center">
                <Link 
                  to="/login" 
                  className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  data-testid="login-patient-link"
                >
                  Are you a patient? Login here
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

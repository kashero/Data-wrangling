import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Ambulance, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RegisterPage({ isDriver = false }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    vehicleNumber: '',
    ambulanceType: ''
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    
    try {
      const userData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: isDriver ? 'driver' : 'patient'
      };
      
      const user = await register(userData);
      toast.success(`Welcome to SwiftCare, ${user.name}!`);
      
      if (isDriver) {
        navigate('/driver/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-8">
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
            <CardTitle className="text-2xl">{isDriver ? 'Register as Driver' : 'Create Account'}</CardTitle>
            <CardDescription>
              {isDriver 
                ? 'Join our network of emergency medical responders'
                : 'Sign up to access emergency medical transport services'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  data-testid="register-name-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  data-testid="register-email-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  data-testid="register-phone-input"
                />
              </div>
              
              {isDriver && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                    <Input
                      id="vehicleNumber"
                      name="vehicleNumber"
                      placeholder="Enter ambulance plate number"
                      value={formData.vehicleNumber}
                      onChange={handleChange}
                      data-testid="register-vehicle-input"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Ambulance Type</Label>
                    <Select 
                      value={formData.ambulanceType} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, ambulanceType: value }))}
                    >
                      <SelectTrigger data-testid="register-ambulance-type-select">
                        <SelectValue placeholder="Select ambulance type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic Life Support</SelectItem>
                        <SelectItem value="icu">ICU / Advanced Life Support</SelectItem>
                        <SelectItem value="neonatal">Neonatal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  data-testid="register-password-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  data-testid="register-confirm-password-input"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={loading}
                data-testid="register-submit-btn"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Account
              </Button>
            </form>
            
            <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
              Already have an account?{' '}
              <Link 
                to={isDriver ? '/driver/login' : '/login'} 
                className="text-red-600 hover:underline font-medium"
                data-testid="register-login-link"
              >
                Sign in
              </Link>
            </div>
            
            {!isDriver && (
              <div className="mt-4 text-center">
                <Link 
                  to="/driver/register" 
                  className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  data-testid="register-driver-link"
                >
                  Want to drive? Register as driver
                </Link>
              </div>
            )}
            {isDriver && (
              <div className="mt-4 text-center">
                <Link 
                  to="/register" 
                  className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  data-testid="register-patient-link"
                >
                  Need an ambulance? Register as patient
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

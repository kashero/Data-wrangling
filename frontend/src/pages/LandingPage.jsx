import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Ambulance, Clock, MapPin, Phone, Shield, Star, Users, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  {
    icon: Zap,
    title: 'Instant Response',
    description: 'Get connected to the nearest ambulance within seconds of your request.'
  },
  {
    icon: MapPin,
    title: 'Real-Time Tracking',
    description: 'Track your ambulance live on the map as it makes its way to you.'
  },
  {
    icon: Shield,
    title: 'Verified Drivers',
    description: 'All our drivers are certified professionals with verified credentials.'
  },
  {
    icon: Clock,
    title: '24/7 Available',
    description: 'Emergency services available round the clock, every day of the year.'
  }
];

const ambulanceTypes = [
  {
    type: 'Basic',
    price: '$50 + $10/km',
    description: 'Standard medical transport with basic life support equipment.',
    features: ['First Aid Kit', 'Oxygen Supply', 'Stretcher', 'Trained EMT']
  },
  {
    type: 'ICU',
    price: '$150 + $25/km',
    description: 'Advanced life support for critical patients requiring intensive care.',
    features: ['Ventilator', 'Cardiac Monitor', 'Defibrillator', 'ICU Nurse']
  },
  {
    type: 'Neonatal',
    price: '$200 + $30/km',
    description: 'Specialized care for newborns and infants with dedicated equipment.',
    features: ['Incubator', 'Infant Monitor', 'Specialized Equipment', 'Neonatal Specialist']
  }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center">
                <Ambulance className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-white">SwiftCare</span>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/login">
                <Button variant="ghost" data-testid="nav-login-btn">Login</Button>
              </Link>
              <Link to="/register">
                <Button data-testid="nav-register-btn" className="bg-red-600 hover:bg-red-700">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1762805080882-84c2d3855963?crop=entropy&cs=srgb&fm=jpg&q=85" 
            alt="Emergency ambulance"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/80 to-slate-900/60"></div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-red-600/20 text-red-400 text-sm font-medium mb-6">
                Emergency Medical Services
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
                When Every Second <span className="text-red-500">Counts</span>
              </h1>
              <p className="text-lg text-slate-300 mb-8 max-w-lg">
                Book an ambulance instantly with just a few taps. Our network of verified ambulances ensures help reaches you when you need it most.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/register">
                  <Button size="lg" className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-lg px-8" data-testid="hero-get-started-btn">
                    <Phone className="w-5 h-5 mr-2" />
                    Request Ambulance
                  </Button>
                </Link>
                <Link to="/driver/register">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto border-slate-400 text-white hover:bg-white/10 text-lg px-8" data-testid="hero-driver-btn">
                    <Users className="w-5 h-5 mr-2" />
                    Join as Driver
                  </Button>
                </Link>
              </div>
              
              <div className="mt-12 flex items-center gap-8">
                <div>
                  <div className="text-3xl font-bold text-white">500+</div>
                  <div className="text-slate-400 text-sm">Active Ambulances</div>
                </div>
                <div className="w-px h-12 bg-slate-600"></div>
                <div>
                  <div className="text-3xl font-bold text-white">10K+</div>
                  <div className="text-slate-400 text-sm">Lives Saved</div>
                </div>
                <div className="w-px h-12 bg-slate-600"></div>
                <div>
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    <span className="text-3xl font-bold text-white">4.9</span>
                  </div>
                  <div className="text-slate-400 text-sm">User Rating</div>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="hidden lg:block"
            >
              <div className="relative">
                <div className="absolute -inset-4 bg-red-600/20 rounded-3xl blur-3xl"></div>
                <Card className="relative bg-white/10 backdrop-blur-lg border-white/20">
                  <CardContent className="p-8">
                    <div className="text-center mb-6">
                      <div className="w-20 h-20 rounded-full bg-red-600 mx-auto flex items-center justify-center mb-4 sos-pulse">
                        <Phone className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-white">Emergency SOS</h3>
                      <p className="text-slate-300 text-sm mt-1">Press and hold for immediate help</p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-slate-300">
                        <MapPin className="w-5 h-5 text-red-400" />
                        <span>Auto-detect your location</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-300">
                        <Ambulance className="w-5 h-5 text-red-400" />
                        <span>Nearest ICU ambulance dispatched</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-300">
                        <Clock className="w-5 h-5 text-red-400" />
                        <span>Average response: 8 minutes</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Why Choose SwiftCare?
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              We combine cutting-edge technology with medical expertise to provide you with the fastest and most reliable emergency response service.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow border-slate-200 dark:border-slate-800">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Ambulance Types Section */}
      <section className="py-20 px-4 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Choose Your Ambulance Type
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              We offer different ambulance types to match your specific medical needs.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {ambulanceTypes.map((amb, index) => (
              <motion.div
                key={amb.type}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-xl transition-all hover:-translate-y-1 border-slate-200 dark:border-slate-800">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        amb.type === 'Basic' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        amb.type === 'ICU' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                      }`}>
                        {amb.type}
                      </span>
                      <span className="text-lg font-bold text-slate-900 dark:text-white">{amb.price}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">{amb.description}</p>
                    <ul className="space-y-2">
                      {amb.features.map(feat => (
                        <li key={feat} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                          {feat}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-red-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-red-100 mb-8 text-lg">
            Join thousands of users who trust SwiftCare for their emergency medical transport needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="w-full sm:w-auto bg-white text-red-600 hover:bg-slate-100 text-lg px-8" data-testid="cta-patient-btn">
                I Need an Ambulance
              </Button>
            </Link>
            <Link to="/driver/register">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-white text-white hover:bg-white/10 text-lg px-8" data-testid="cta-driver-btn">
                Register as Driver
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
                <Ambulance className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">SwiftCare</span>
            </div>
            <p className="text-slate-400 text-sm">
              © 2024 SwiftCare. All rights reserved. Emergency services available 24/7.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

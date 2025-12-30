import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import MapComponent from '../components/MapComponent';
import { 
  Ambulance, MapPin, Phone, Clock, Star, LogOut, AlertTriangle, 
  Navigation, User, History, Loader2, X, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

const AMBULANCE_PRICES = {
  basic: { base: 50, per_km: 10, label: 'Basic Life Support' },
  icu: { base: 150, per_km: 25, label: 'ICU / Advanced' },
  neonatal: { base: 200, per_km: 30, label: 'Neonatal' }
};

const STATUS_LABELS = {
  pending: 'Searching for driver...',
  accepted: 'Driver assigned',
  en_route: 'Ambulance on the way',
  arrived: 'Ambulance arrived',
  in_progress: 'En route to hospital',
  completed: 'Trip completed',
  cancelled: 'Cancelled'
};

export default function PatientDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [activeBooking, setActiveBooking] = useState(null);
  const [bookingHistory, setBookingHistory] = useState([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sosHolding, setSOSHolding] = useState(false);
  const [sosProgress, setSOSProgress] = useState(0);
  const [selectedTab, setSelectedTab] = useState('book');
  
  const [currentLocation, setCurrentLocation] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    pickupAddress: '',
    destinationAddress: '',
    ambulanceType: 'basic',
    notes: ''
  });
  
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [completedBookingId, setCompletedBookingId] = useState(null);

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          // Default to a location
          setCurrentLocation({ lat: 40.7128, lng: -74.0060 });
        }
      );
    }
  }, []);

  // Fetch active booking and history
  const fetchBookings = useCallback(async () => {
    try {
      const [active, history] = await Promise.all([
        api.getActiveBooking(),
        api.getBookings()
      ]);
      
      setActiveBooking(active);
      setBookingHistory(history.filter(b => b.status === 'completed' || b.status === 'cancelled'));
      
      // Check if there's a completed booking that needs rating
      if (active && active.status === 'completed' && !active.rating) {
        setCompletedBookingId(active.id);
        setShowRatingModal(true);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
    const interval = setInterval(fetchBookings, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [fetchBookings]);

  // SOS hold timer
  useEffect(() => {
    let interval;
    if (sosHolding) {
      interval = setInterval(() => {
        setSOSProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            handleSOSRequest();
            return 0;
          }
          return prev + 4; // 25 steps = 2.5 seconds
        });
      }, 100);
    } else {
      setSOSProgress(0);
    }
    return () => clearInterval(interval);
  }, [sosHolding]);

  const handleSOSRequest = async () => {
    if (!currentLocation) {
      toast.error('Unable to get your location');
      return;
    }
    
    setSOSHolding(false);
    setLoading(true);
    
    try {
      const booking = await api.createSOSBooking(currentLocation.lat, currentLocation.lng);
      setActiveBooking(booking);
      toast.success('SOS Emergency sent! Help is on the way!');
      setShowSOSModal(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send SOS');
    } finally {
      setLoading(false);
    }
  };

  const handleBookAmbulance = async (e) => {
    e.preventDefault();
    if (!currentLocation) {
      toast.error('Unable to get your location');
      return;
    }
    
    setLoading(true);
    
    try {
      const booking = await api.createBooking({
        pickup_location: {
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          address: bookingForm.pickupAddress || 'Current Location'
        },
        destination: bookingForm.destinationAddress ? {
          lat: currentLocation.lat + 0.02, // Simulated destination
          lng: currentLocation.lng + 0.02,
          address: bookingForm.destinationAddress
        } : null,
        ambulance_type: bookingForm.ambulanceType,
        notes: bookingForm.notes,
        is_emergency: false
      });
      
      setActiveBooking(booking);
      setShowBookingModal(false);
      toast.success('Ambulance requested successfully!');
      setBookingForm({ pickupAddress: '', destinationAddress: '', ambulanceType: 'basic', notes: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to book ambulance');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!activeBooking) return;
    
    try {
      await api.updateBookingStatus(activeBooking.id, 'cancelled');
      setActiveBooking(null);
      toast.success('Booking cancelled');
      fetchBookings();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to cancel booking');
    }
  };

  const handleSubmitRating = async () => {
    if (!completedBookingId) return;
    
    try {
      await api.rateBooking(completedBookingId, rating, review);
      toast.success('Thank you for your feedback!');
      setShowRatingModal(false);
      setCompletedBookingId(null);
      setRating(5);
      setReview('');
      fetchBookings();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit rating');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const estimatedFare = AMBULANCE_PRICES[bookingForm.ambulanceType];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center">
              <Ambulance className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 dark:text-white">SwiftCare</h1>
              <p className="text-xs text-slate-500">Hi, {user?.name}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="logout-btn">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6" data-testid="patient-dashboard">
        {/* Active Booking Card */}
        {activeBooking && activeBooking.status !== 'completed' && activeBooking.status !== 'cancelled' && (
          <Card className="mb-6 border-red-200 dark:border-red-900 bg-white dark:bg-slate-900" data-testid="active-booking-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-red-600" />
                  Active Booking
                </CardTitle>
                <Badge className={`status-${activeBooking.status}`} data-testid="booking-status-badge">
                  {STATUS_LABELS[activeBooking.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Map */}
              <div className="h-48 rounded-xl overflow-hidden mb-4">
                <MapComponent
                  center={currentLocation}
                  patientLocation={activeBooking.pickup_location}
                  driverLocation={activeBooking.driver_location}
                />
              </div>
              
              {/* Driver Info */}
              {activeBooking.driver_name && (
                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <User className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{activeBooking.driver_name}</h3>
                    <p className="text-sm text-slate-500">{activeBooking.vehicle_number || 'Vehicle assigned'}</p>
                  </div>
                  <a href={`tel:${activeBooking.driver_phone}`}>
                    <Button size="icon" variant="outline" className="rounded-full" data-testid="call-driver-btn">
                      <Phone className="w-4 h-4" />
                    </Button>
                  </a>
                </div>
              )}
              
              {/* Booking Details */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">Pickup</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {activeBooking.pickup_location?.address || 'Current Location'}
                    </p>
                  </div>
                </div>
                {activeBooking.destination && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Destination</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {activeBooking.destination.address}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{activeBooking.ambulance_type?.toUpperCase()}</Badge>
                    {activeBooking.is_emergency && (
                      <Badge className="bg-red-600">EMERGENCY</Badge>
                    )}
                  </div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    ${activeBooking.estimated_fare?.toFixed(2)}
                  </p>
                </div>
              </div>
              
              {activeBooking.status === 'pending' && (
                <Button 
                  variant="outline" 
                  className="w-full mt-4 border-red-200 text-red-600 hover:bg-red-50"
                  onClick={handleCancelBooking}
                  data-testid="cancel-booking-btn"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel Booking
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="w-full mb-6">
            <TabsTrigger value="book" className="flex-1" data-testid="tab-book">
              <Ambulance className="w-4 h-4 mr-2" />
              Book
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1" data-testid="tab-history">
              <History className="w-4 h-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="book">
            {/* SOS Button */}
            <Card className="mb-6 bg-gradient-to-br from-red-600 to-red-700 border-0" data-testid="sos-card">
              <CardContent className="p-6 text-center">
                <button
                  className="w-32 h-32 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-4 sos-pulse hover:bg-white/30 transition-colors disabled:opacity-50"
                  onMouseDown={() => !activeBooking && setSOSHolding(true)}
                  onMouseUp={() => setSOSHolding(false)}
                  onMouseLeave={() => setSOSHolding(false)}
                  onTouchStart={() => !activeBooking && setSOSHolding(true)}
                  onTouchEnd={() => setSOSHolding(false)}
                  disabled={!!activeBooking || loading}
                  data-testid="sos-button"
                >
                  <div className="relative">
                    <AlertTriangle className="w-16 h-16 text-white" />
                    {sosHolding && (
                      <svg className="absolute inset-0 w-full h-full -rotate-90">
                        <circle
                          cx="50%"
                          cy="50%"
                          r="45%"
                          fill="none"
                          stroke="white"
                          strokeWidth="4"
                          strokeDasharray={`${sosProgress * 2.83} 283`}
                        />
                      </svg>
                    )}
                  </div>
                </button>
                <h2 className="text-xl font-bold text-white mb-1">Emergency SOS</h2>
                <p className="text-red-100 text-sm">
                  {activeBooking ? 'You have an active booking' : 'Press and hold for 3 seconds'}
                </p>
              </CardContent>
            </Card>

            {/* Quick Book Card */}
            <Card className="bg-white dark:bg-slate-900">
              <CardHeader>
                <CardTitle className="text-lg">Book an Ambulance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {/* Ambulance Type Selection */}
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(AMBULANCE_PRICES).map(([type, info]) => (
                      <button
                        key={type}
                        onClick={() => setBookingForm(prev => ({ ...prev, ambulanceType: type }))}
                        className={`p-3 rounded-xl border-2 transition-all ${
                          bookingForm.ambulanceType === type 
                            ? 'border-red-600 bg-red-50 dark:bg-red-900/20' 
                            : 'border-slate-200 dark:border-slate-700 hover:border-red-300'
                        }`}
                        data-testid={`ambulance-type-${type}`}
                      >
                        <Ambulance className={`w-6 h-6 mx-auto mb-2 ${
                          bookingForm.ambulanceType === type ? 'text-red-600' : 'text-slate-400'
                        }`} />
                        <p className="text-xs font-medium text-slate-900 dark:text-white">{type.toUpperCase()}</p>
                        <p className="text-xs text-slate-500">${info.base}+</p>
                      </button>
                    ))}
                  </div>

                  <Button 
                    className="w-full bg-red-600 hover:bg-red-700"
                    onClick={() => setShowBookingModal(true)}
                    disabled={!!activeBooking}
                    data-testid="book-ambulance-btn"
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    {activeBooking ? 'Active booking in progress' : 'Book Now'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <div className="space-y-4">
              {bookingHistory.length === 0 ? (
                <Card className="bg-white dark:bg-slate-900">
                  <CardContent className="py-12 text-center">
                    <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No booking history yet</p>
                  </CardContent>
                </Card>
              ) : (
                bookingHistory.map(booking => (
                  <Card key={booking.id} className="bg-white dark:bg-slate-900" data-testid={`history-card-${booking.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <Badge className={`status-${booking.status}`}>
                            {booking.status.toUpperCase()}
                          </Badge>
                          <p className="text-xs text-slate-500 mt-1">
                            {new Date(booking.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="font-bold text-slate-900 dark:text-white">
                          ${booking.estimated_fare?.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <MapPin className="w-4 h-4" />
                        {booking.pickup_location?.address || 'Location'}
                      </div>
                      {booking.rating && (
                        <div className="flex items-center gap-1 mt-2">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-4 h-4 ${i < booking.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`} 
                            />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Booking Modal */}
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Book Ambulance</DialogTitle>
            <DialogDescription>
              Fill in the details to request an ambulance
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBookAmbulance} className="space-y-4">
            <div className="space-y-2">
              <Label>Pickup Location</Label>
              <Input
                placeholder="Enter pickup address (or use current location)"
                value={bookingForm.pickupAddress}
                onChange={(e) => setBookingForm(prev => ({ ...prev, pickupAddress: e.target.value }))}
                data-testid="booking-pickup-input"
              />
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Will use your current location if left empty
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Destination (Optional)</Label>
              <Input
                placeholder="Enter hospital or destination"
                value={bookingForm.destinationAddress}
                onChange={(e) => setBookingForm(prev => ({ ...prev, destinationAddress: e.target.value }))}
                data-testid="booking-destination-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Ambulance Type</Label>
              <Select 
                value={bookingForm.ambulanceType}
                onValueChange={(value) => setBookingForm(prev => ({ ...prev, ambulanceType: value }))}
              >
                <SelectTrigger data-testid="booking-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic Life Support - $50 base</SelectItem>
                  <SelectItem value="icu">ICU / Advanced - $150 base</SelectItem>
                  <SelectItem value="neonatal">Neonatal - $200 base</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Any additional information for the driver..."
                value={bookingForm.notes}
                onChange={(e) => setBookingForm(prev => ({ ...prev, notes: e.target.value }))}
                data-testid="booking-notes-input"
              />
            </div>
            
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Estimated Fare</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  ${estimatedFare.base} + ${estimatedFare.per_km}/km
                </span>
              </div>
            </div>
            
            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={loading} data-testid="confirm-booking-btn">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm Booking
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rating Modal */}
      <Dialog open={showRatingModal} onOpenChange={setShowRatingModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Trip Completed
            </DialogTitle>
            <DialogDescription>
              How was your experience?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1"
                  data-testid={`rating-star-${star}`}
                >
                  <Star 
                    className={`w-8 h-8 transition-colors ${
                      star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'
                    }`} 
                  />
                </button>
              ))}
            </div>
            
            <Textarea
              placeholder="Tell us about your experience (optional)"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              data-testid="rating-review-input"
            />
            
            <Button 
              className="w-full bg-red-600 hover:bg-red-700"
              onClick={handleSubmitRating}
              data-testid="submit-rating-btn"
            >
              Submit Rating
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

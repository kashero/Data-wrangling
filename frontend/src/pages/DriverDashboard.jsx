import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import MapComponent from '../components/MapComponent';
import { 
  Ambulance, MapPin, Phone, Clock, Star, LogOut, AlertTriangle, 
  Navigation, User, History, Loader2, Check, X, Settings,
  Play, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_FLOW = {
  accepted: { next: 'en_route', label: 'Start Trip', icon: Play },
  en_route: { next: 'arrived', label: 'Arrived at Pickup', icon: MapPin },
  arrived: { next: 'in_progress', label: 'Patient Onboard', icon: User },
  in_progress: { next: 'completed', label: 'Complete Trip', icon: CheckCircle }
};

// Format KES currency
const formatKES = (amount) => {
  return `KES ${amount?.toLocaleString() || 0}`;
};

export default function DriverDashboard() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  
  const [activeBooking, setActiveBooking] = useState(null);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [bookingHistory, setBookingHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState('requests');
  
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isAvailable, setIsAvailable] = useState(user?.is_available ?? true);
  const [driverSettings, setDriverSettings] = useState({
    vehicleNumber: user?.vehicle_number || '',
    ambulanceType: user?.ambulance_type || 'basic'
  });

  // Get and track current location
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(loc);
          
          // Update location on server if has active booking
          if (activeBooking) {
            api.updateDriverLocation(loc.lat, loc.lng).catch(console.error);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          setCurrentLocation({ lat: 40.7128, lng: -74.0060 });
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
      
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [activeBooking]);

  // Fetch bookings
  const fetchBookings = useCallback(async () => {
    try {
      const [active, pending, all] = await Promise.all([
        api.getActiveBooking(),
        api.getPendingBookings(),
        api.getBookings()
      ]);
      
      setActiveBooking(active);
      setPendingBookings(pending.filter(b => b.status === 'pending'));
      setBookingHistory(all.filter(b => b.status === 'completed' || b.status === 'cancelled'));
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
    const interval = setInterval(fetchBookings, 5000);
    return () => clearInterval(interval);
  }, [fetchBookings]);

  const handleToggleAvailability = async (available) => {
    try {
      await api.updateDriverProfile({ is_available: available });
      setIsAvailable(available);
      updateUser({ is_available: available });
      toast.success(available ? 'You are now online' : 'You are now offline');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleAcceptBooking = async (bookingId) => {
    setLoading(true);
    try {
      const booking = await api.acceptBooking(bookingId);
      setActiveBooking(booking);
      setPendingBookings(prev => prev.filter(b => b.id !== bookingId));
      toast.success('Booking accepted! Navigate to patient.');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to accept booking');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!activeBooking) return;
    
    const nextStatus = STATUS_FLOW[activeBooking.status]?.next;
    if (!nextStatus) return;
    
    setLoading(true);
    try {
      const updated = await api.updateBookingStatus(activeBooking.id, nextStatus);
      
      if (nextStatus === 'completed') {
        setActiveBooking(null);
        toast.success('Trip completed! Great job!');
        // Update availability
        await api.updateDriverProfile({ is_available: true });
        setIsAvailable(true);
        updateUser({ is_available: true });
      } else {
        setActiveBooking(updated);
        toast.success(`Status updated to ${nextStatus.replace('_', ' ')}`);
      }
      
      fetchBookings();
    } catch (error) {
      toast.error('Failed to update status');
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
      
      // Update availability
      await api.updateDriverProfile({ is_available: true });
      setIsAvailable(true);
      updateUser({ is_available: true });
      
      fetchBookings();
    } catch (error) {
      toast.error('Failed to cancel booking');
    }
  };

  const handleSaveSettings = async () => {
    try {
      await api.updateDriverProfile({
        vehicle_number: driverSettings.vehicleNumber,
        ambulance_type: driverSettings.ambulanceType
      });
      updateUser({
        vehicle_number: driverSettings.vehicleNumber,
        ambulance_type: driverSettings.ambulanceType
      });
      toast.success('Settings saved');
      setShowSettingsModal(false);
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const statusAction = STATUS_FLOW[activeBooking?.status];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Ambulance className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 dark:text-white">SwiftCare Driver</h1>
              <p className="text-xs text-slate-500">{user?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={`text-sm ${isAvailable ? 'text-green-600' : 'text-slate-500'}`}>
                {isAvailable ? 'Online' : 'Offline'}
              </span>
              <Switch 
                checked={isAvailable} 
                onCheckedChange={handleToggleAvailability}
                disabled={!!activeBooking}
                data-testid="availability-switch"
              />
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowSettingsModal(true)} data-testid="settings-btn">
              <Settings className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="logout-btn">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6" data-testid="driver-dashboard">
        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="bg-white dark:bg-slate-900">
            <CardContent className="p-4 text-center">
              <Star className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{user?.rating?.toFixed(1) || '5.0'}</p>
              <p className="text-xs text-slate-500">Rating</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-900">
            <CardContent className="p-4 text-center">
              <Navigation className="w-6 h-6 text-blue-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{user?.total_trips || 0}</p>
              <p className="text-xs text-slate-500">Total Trips</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-900">
            <CardContent className="p-4 text-center">
              <Ambulance className="w-6 h-6 text-red-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-slate-900 dark:text-white uppercase">{user?.ambulance_type || 'N/A'}</p>
              <p className="text-xs text-slate-500">Type</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Booking Card */}
        {activeBooking && (
          <Card className="mb-6 border-blue-200 dark:border-blue-900 bg-white dark:bg-slate-900" data-testid="active-booking-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-blue-600" />
                  Active Trip
                </CardTitle>
                <Badge className={`status-${activeBooking.status}`}>
                  {activeBooking.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Map */}
              <div className="h-48 rounded-xl overflow-hidden mb-4">
                <MapComponent
                  center={currentLocation || activeBooking.pickup_location}
                  patientLocation={activeBooking.pickup_location}
                  driverLocation={currentLocation}
                  destination={activeBooking.destination}
                />
              </div>
              
              {/* Patient Info */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl mb-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{activeBooking.patient_name}</h3>
                  <p className="text-sm text-slate-500">{activeBooking.patient_phone}</p>
                </div>
                <a href={`tel:${activeBooking.patient_phone}`}>
                  <Button size="icon" variant="outline" className="rounded-full" data-testid="call-patient-btn">
                    <Phone className="w-4 h-4" />
                  </Button>
                </a>
              </div>
              
              {/* Trip Details */}
              <div className="space-y-3 mb-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">Pickup</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {activeBooking.pickup_location?.address || 'Patient Location'}
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
                {activeBooking.notes && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <AlertTriangle className="w-4 h-4 inline mr-1" />
                      {activeBooking.notes}
                    </p>
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
              
              {/* Action Buttons */}
              <div className="flex gap-3">
                {statusAction && (
                  <Button 
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={handleUpdateStatus}
                    disabled={loading}
                    data-testid="update-status-btn"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <statusAction.icon className="w-4 h-4 mr-2" />
                    )}
                    {statusAction.label}
                  </Button>
                )}
                {activeBooking.status === 'accepted' && (
                  <Button 
                    variant="outline" 
                    className="border-red-200 text-red-600 hover:bg-red-50"
                    onClick={handleCancelBooking}
                    data-testid="cancel-trip-btn"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="w-full mb-6">
            <TabsTrigger value="requests" className="flex-1" data-testid="tab-requests">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Requests ({pendingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1" data-testid="tab-history">
              <History className="w-4 h-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests">
            {!isAvailable && !activeBooking && (
              <Card className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                <CardContent className="p-4 text-center">
                  <p className="text-yellow-800 dark:text-yellow-200">
                    You are currently offline. Toggle your status to receive requests.
                  </p>
                </CardContent>
              </Card>
            )}
            
            <div className="space-y-4">
              {pendingBookings.length === 0 ? (
                <Card className="bg-white dark:bg-slate-900">
                  <CardContent className="py-12 text-center">
                    <Ambulance className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No pending requests</p>
                    <p className="text-sm text-slate-400 mt-1">New requests will appear here</p>
                  </CardContent>
                </Card>
              ) : (
                pendingBookings.map(booking => (
                  <Card 
                    key={booking.id} 
                    className={`bg-white dark:bg-slate-900 ${booking.is_emergency ? 'border-red-300 dark:border-red-800' : ''}`}
                    data-testid={`pending-booking-${booking.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {booking.is_emergency && (
                            <Badge className="bg-red-600 animate-pulse">EMERGENCY</Badge>
                          )}
                          <Badge variant="outline">{booking.ambulance_type?.toUpperCase()}</Badge>
                        </div>
                        <p className="font-bold text-slate-900 dark:text-white">
                          ${booking.estimated_fare?.toFixed(2)}
                        </p>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-900 dark:text-white">{booking.patient_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-green-600" />
                          <span className="text-slate-600 dark:text-slate-400">
                            {booking.pickup_location?.address || 'Location provided'}
                          </span>
                        </div>
                        {booking.notes && (
                          <p className="text-sm text-slate-500 italic">"{booking.notes}"</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Clock className="w-3 h-3" />
                          {new Date(booking.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                      
                      <Button 
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => handleAcceptBooking(booking.id)}
                        disabled={loading || !!activeBooking}
                        data-testid={`accept-booking-${booking.id}`}
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 mr-2" />
                        )}
                        Accept Request
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="space-y-4">
              {bookingHistory.length === 0 ? (
                <Card className="bg-white dark:bg-slate-900">
                  <CardContent className="py-12 text-center">
                    <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No trip history yet</p>
                  </CardContent>
                </Card>
              ) : (
                bookingHistory.map(booking => (
                  <Card key={booking.id} className="bg-white dark:bg-slate-900">
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
                        <User className="w-4 h-4" />
                        {booking.patient_name}
                      </div>
                      {booking.rating && (
                        <div className="flex items-center gap-1 mt-2">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-4 h-4 ${i < booking.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`} 
                            />
                          ))}
                          {booking.review && (
                            <span className="text-xs text-slate-500 ml-2">"{booking.review}"</span>
                          )}
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

      {/* Settings Modal */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Driver Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Vehicle Number</Label>
              <Input
                placeholder="Enter your vehicle plate number"
                value={driverSettings.vehicleNumber}
                onChange={(e) => setDriverSettings(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                data-testid="settings-vehicle-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Ambulance Type</Label>
              <Select 
                value={driverSettings.ambulanceType}
                onValueChange={(value) => setDriverSettings(prev => ({ ...prev, ambulanceType: value }))}
              >
                <SelectTrigger data-testid="settings-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic Life Support</SelectItem>
                  <SelectItem value="icu">ICU / Advanced Life Support</SelectItem>
                  <SelectItem value="neonatal">Neonatal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              className="w-full"
              onClick={handleSaveSettings}
              data-testid="save-settings-btn"
            >
              Save Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

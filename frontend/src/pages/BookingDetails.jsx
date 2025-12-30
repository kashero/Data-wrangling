import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import MapComponent from '../components/MapComponent';
import { ArrowLeft, MapPin, Phone, User, Clock, Ambulance, Star, Loader2 } from 'lucide-react';

const STATUS_LABELS = {
  pending: 'Searching for driver',
  accepted: 'Driver assigned',
  en_route: 'Ambulance on the way',
  arrived: 'Ambulance arrived',
  in_progress: 'En route to hospital',
  completed: 'Trip completed',
  cancelled: 'Cancelled'
};

// Format KES currency
const formatKES = (amount) => {
  return `KES ${amount?.toLocaleString() || 0}`;
};

export default function BookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const data = await api.getBooking(id);
        setBooking(data);
      } catch (error) {
        console.error('Error fetching booking:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBooking();
    const interval = setInterval(fetchBooking, 5000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <p className="text-slate-500">Booking not found</p>
            <Button className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 shadow-sm sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} data-testid="back-btn">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-slate-900 dark:text-white">Booking Details</h1>
            <p className="text-xs text-slate-500 mono">#{booking.id.slice(0, 8)}</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6" data-testid="booking-details">
        {/* Map */}
        <Card className="mb-6 overflow-hidden">
          <div className="h-64">
            <MapComponent
              center={booking.pickup_location}
              patientLocation={booking.pickup_location}
              driverLocation={booking.driver_location}
              destination={booking.destination}
            />
          </div>
        </Card>

        {/* Status Card */}
        <Card className="mb-6 bg-white dark:bg-slate-900">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Badge className={`status-${booking.status} text-sm px-3 py-1`}>
                {STATUS_LABELS[booking.status]}
              </Badge>
              {booking.is_emergency && (
                <Badge className="bg-red-600">EMERGENCY</Badge>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ambulance className="w-5 h-5 text-slate-400" />
                <span className="text-slate-600 dark:text-slate-400">
                  {booking.ambulance_type?.toUpperCase()} Ambulance
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                ${booking.estimated_fare?.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Driver/Patient Info */}
        {user?.role === 'patient' && booking.driver_name && (
          <Card className="mb-6 bg-white dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-base">Driver Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <User className="w-7 h-7 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{booking.driver_name}</h3>
                  <p className="text-sm text-slate-500">{booking.vehicle_number || 'Vehicle assigned'}</p>
                </div>
                <a href={`tel:${booking.driver_phone}`}>
                  <Button size="icon" className="rounded-full bg-green-600 hover:bg-green-700">
                    <Phone className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {user?.role === 'driver' && (
          <Card className="mb-6 bg-white dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-base">Patient Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <User className="w-7 h-7 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{booking.patient_name}</h3>
                  <p className="text-sm text-slate-500">{booking.patient_phone}</p>
                </div>
                <a href={`tel:${booking.patient_phone}`}>
                  <Button size="icon" className="rounded-full bg-green-600 hover:bg-green-700">
                    <Phone className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Location Details */}
        <Card className="mb-6 bg-white dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-base">Trip Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Pickup Location</p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {booking.pickup_location?.address || 'Patient Location'}
                </p>
              </div>
            </div>
            
            {booking.destination && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Destination</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {booking.destination.address}
                  </p>
                </div>
              </div>
            )}
            
            {booking.notes && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Notes:</strong> {booking.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="bg-white dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-base">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Requested</p>
                  <p className="text-xs text-slate-500">
                    {new Date(booking.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              
              {booking.accepted_at && (
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">Accepted</p>
                    <p className="text-xs text-slate-500">
                      {new Date(booking.accepted_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              
              {booking.completed_at && (
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">Completed</p>
                    <p className="text-xs text-slate-500">
                      {new Date(booking.completed_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {booking.rating && (
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-sm font-medium text-slate-900 dark:text-white mb-2">Rating</p>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`w-5 h-5 ${i < booking.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`} 
                    />
                  ))}
                </div>
                {booking.review && (
                  <p className="text-sm text-slate-500 mt-2 italic">"{booking.review}"</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const createIcon = (color, emoji) => L.divIcon({
  className: 'custom-marker',
  html: `<div style="
    background: ${color};
    width: 36px;
    height: 36px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  ">
    <span style="transform: rotate(45deg); font-size: 16px;">${emoji}</span>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

const patientIcon = createIcon('#DC2626', '📍');
const driverIcon = createIcon('#0EA5E9', '🚑');
const destinationIcon = createIcon('#059669', '🏥');

// Smaller icon for nearby ambulances
const createNearbyAmbulanceIcon = (type) => {
  const colors = {
    basic: '#22C55E',
    icu: '#3B82F6', 
    neonatal: '#A855F7'
  };
  const color = colors[type] || '#0EA5E9';
  
  return L.divIcon({
    className: 'nearby-ambulance-marker',
    html: `<div style="
      background: ${color};
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      font-size: 14px;
    ">🚑</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

// Component to handle map center changes
function MapUpdater({ center }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], map.getZoom());
    }
  }, [center, map]);
  
  return null;
}

export default function MapComponent({ 
  center, 
  patientLocation, 
  driverLocation, 
  destination,
  nearbyAmbulances = [],
  zoom = 14 
}) {
  const defaultCenter = center || patientLocation || { lat: -1.2921, lng: 36.8219 }; // Default to Nairobi
  
  return (
    <MapContainer
      center={[defaultCenter.lat, defaultCenter.lng]}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapUpdater center={center} />
      
      {/* Patient/Pickup Location */}
      {patientLocation && (
        <Marker 
          position={[patientLocation.lat, patientLocation.lng]} 
          icon={patientIcon}
        >
          <Popup>
            <strong>Your Location</strong>
            <br />
            {patientLocation.address || 'Pickup point'}
          </Popup>
        </Marker>
      )}
      
      {/* Active Driver Location */}
      {driverLocation && (
        <Marker 
          position={[driverLocation.lat, driverLocation.lng]} 
          icon={driverIcon}
        >
          <Popup>
            <strong>Your Ambulance</strong>
            <br />
            En route to you
          </Popup>
        </Marker>
      )}
      
      {/* Destination */}
      {destination && (
        <Marker 
          position={[destination.lat, destination.lng]} 
          icon={destinationIcon}
        >
          <Popup>
            <strong>Destination</strong>
            <br />
            {destination.address || 'Hospital'}
          </Popup>
        </Marker>
      )}
      
      {/* Nearby Ambulances */}
      {nearbyAmbulances && nearbyAmbulances.map((ambulance) => (
        ambulance.location && (
          <Marker
            key={ambulance.id}
            position={[ambulance.location.lat, ambulance.location.lng]}
            icon={createNearbyAmbulanceIcon(ambulance.ambulance_type)}
          >
            <Popup>
              <div className="text-sm">
                <strong>{ambulance.ambulance_type?.toUpperCase() || 'Ambulance'}</strong>
                <br />
                <span className="text-slate-600">
                  {ambulance.vehicle_number || 'Available'}
                </span>
                <br />
                <span className="text-green-600 font-medium">
                  ~{ambulance.eta_minutes} min away
                </span>
                <br />
                <span className="text-slate-500 text-xs">
                  {ambulance.distance_km} km
                </span>
              </div>
            </Popup>
          </Marker>
        )
      ))}
    </MapContainer>
  );
}

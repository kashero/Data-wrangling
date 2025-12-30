import { useEffect, useRef } from 'react';
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

const patientIcon = createIcon('#DC2626', '🏥');
const driverIcon = createIcon('#0EA5E9', '🚑');
const destinationIcon = createIcon('#059669', '📍');

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
  zoom = 14 
}) {
  const defaultCenter = center || patientLocation || { lat: 40.7128, lng: -74.0060 };
  
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
      
      {patientLocation && (
        <Marker 
          position={[patientLocation.lat, patientLocation.lng]} 
          icon={patientIcon}
        >
          <Popup>
            <strong>Pickup Location</strong>
            <br />
            {patientLocation.address || 'Patient location'}
          </Popup>
        </Marker>
      )}
      
      {driverLocation && (
        <Marker 
          position={[driverLocation.lat, driverLocation.lng]} 
          icon={driverIcon}
        >
          <Popup>
            <strong>Ambulance</strong>
            <br />
            Driver location
          </Popup>
        </Marker>
      )}
      
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
    </MapContainer>
  );
}

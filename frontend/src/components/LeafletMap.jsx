/**
 * Thin wrapper around vanilla Leaflet (loaded via CDN in index.html).
 * Props:
 *   center: [lat, lng]   default: Sirius campus
 *   zoom:   number       default: 13
 *   markers: [{lat, lng, label, color?}]
 *   route:  [[lat, lng], ...]  polyline
 *   height: string       default: "320px"
 */
import { useEffect, useRef } from 'react';

const SIRIUS = [43.4070, 39.9500];

export default function LeafletMap({
  center = SIRIUS,
  zoom = 13,
  markers = [],
  route = [],
  height = '320px',
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    const L = window.L;
    if (!L || !containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(containerRef.current, { center, zoom });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    markers.forEach(({ lat, lng, label, color = '#10b981' }) => {
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      const marker = L.marker([lat, lng], { icon }).addTo(map);
      if (label) marker.bindPopup(label);
    });

    if (route.length >= 2) {
      L.polyline(route, { color: '#10b981', weight: 4, opacity: 0.8 }).addTo(map);
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify({ center, zoom, markers, route })]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: '0.75rem', overflow: 'hidden' }}
    />
  );
}

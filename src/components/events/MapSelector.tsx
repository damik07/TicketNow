"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix para los íconos rotos por defecto de Leaflet en Next.js
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface MapSelectorProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}

export default function MapSelector({ lat, lng, onChange }: MapSelectorProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // 1. Inicialización y Limpieza estricta del mapa físico
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Si por alguna razón de HMR ya existía una instancia en el Ref, la destruimos
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Inicializamos Leaflet directamente sobre el DIV nativo
    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 13,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Creamos el marcador inicial
    const marker = L.marker([lat, lng], { icon: defaultIcon }).addTo(map);
    markerRef.current = marker;

    // Escuchador de clics
    map.on("click", (e) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      onChange(clickLat, clickLng);
      map.flyTo(e.latlng, map.getZoom());
    });

    mapInstanceRef.current = map;

    // LIMPIEZA TOTAL: Cuando el componente se desmonte, removemos todo sí o sí
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []); // Solo se ejecuta una vez al montar

  // 2. Sincronización de coordenadas externas (cuando cambia el estado del formulario)
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      const currentCenter = mapInstanceRef.current.getCenter();
      
      // Solo actualizamos la vista si la coordenada real es diferente (evita loops)
      if (currentCenter.lat !== lat || currentCenter.lng !== lng) {
        markerRef.current.setLatLng([lat, lng]);
        mapInstanceRef.current.setView([lat, lng], mapInstanceRef.current.getZoom());
      }
    }
  }, [lat, lng]);

  // Cláusula de guarda para coordenadas inválidas
  if (lat === undefined || lat === null || lng === undefined || lng === null || isNaN(lat) || isNaN(lng)) {
    return (
      <div className="w-full h-56 rounded-xl border border-slate-800 bg-slate-900/50 flex items-center justify-center text-slate-400 text-sm">
        Cargando mapa o ubicación no disponible...
      </div>
    );
  }

  return (
    <div className="w-full h-56 rounded-xl overflow-hidden border border-slate-800 relative z-10">
      {/* Usamos un DIV plano del DOM. Ya no usamos <MapContainer> ni <TileLayer> de la librería React-Leaflet */}
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
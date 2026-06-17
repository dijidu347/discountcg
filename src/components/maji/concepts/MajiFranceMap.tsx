import { useEffect, useRef } from "react";
import maplibregl, { type Map as MapLibreMap, type Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAJI_CITIES_TAKEN_GEO, type MajiCity } from "@/components/maji/maji-shared";

/**
 * Vraie carte de France interactive (MapLibre GL + tuiles CARTO Positron).
 * 100% gratuit, sans clé API. Markers rouges = zones prises, marker vert = vous.
 * maplibre-gl est chargé en import dynamique pour ne pas alourdir le dashboard.
 */
interface Props {
  you?: { name: string; lon: number; lat: number } | null;
  height?: number;
}

function makeDot(color: string, title: string, big = false): HTMLDivElement {
  const el = document.createElement("div");
  const size = big ? 18 : 14;
  el.style.cssText =
    `width:${size}px;height:${size}px;border-radius:9999px;background:${color};` +
    "border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.12),0 1px 4px rgba(0,0,0,.3);cursor:default;";
  el.title = title;
  return el;
}

export function MajiFranceMap({ you, height = 260 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const youMarkerRef = useRef<Marker | null>(null);

  // Init carte (import statique maplibre)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      // Cadrage France via l'option bounds du constructeur (pas besoin d'attendre 'load')
      bounds: [
        [-5.5, 41.2],
        [10.2, 51.5],
      ],
      fitBoundsOptions: { padding: 18 },
      minZoom: 3.8,
      maxZoom: 12,
      maxBounds: [
        [-8, 39.5],
        [13, 53],
      ],
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
    });
    mapRef.current = map;
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    // Markers des zones prises — ajoutés IMMÉDIATEMENT (positionnés par lng/lat,
    // pas besoin de l'événement 'load' qui est capricieux avec React StrictMode)
    MAJI_CITIES_TAKEN_GEO.forEach((c: MajiCity) => {
      new maplibregl.Marker({
        element: makeDot("#ef4444", `${c.name} · zone prise`),
        anchor: "center",
      })
        .setLngLat([c.lon, c.lat])
        .addTo(map);
    });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);
    setTimeout(() => map.resize(), 250);

    return () => {
      ro.disconnect();
      youMarkerRef.current?.remove();
      youMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Marker "vous" (vert) — reste à l'échelle France pour garder l'effet rareté
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Placement immédiat (le marker se positionne par lng/lat sans attendre 'load')
    youMarkerRef.current?.remove();
    youMarkerRef.current = null;
    if (!you) return;
    youMarkerRef.current = new maplibregl.Marker({
      element: makeDot("#059669", `${you.name} · votre zone (libre)`, true),
      anchor: "center",
    })
      .setLngLat([you.lon, you.lat])
      .addTo(map);
  }, [you]);

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        style={{ height }}
        className="w-full rounded-xl overflow-hidden border border-emerald-100"
      />
      <div className="mt-1.5 flex items-center justify-center gap-4 text-[10px] text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" /> Zone prise
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-600" /> Votre zone (libre)
        </span>
      </div>
      <p className="text-[9px] text-gray-300 text-center mt-0.5">
        © CARTO · OpenStreetMap · API gouv.fr
      </p>
    </div>
  );
}

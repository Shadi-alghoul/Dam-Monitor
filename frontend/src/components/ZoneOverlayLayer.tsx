import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { ZONES } from "../lib/zones";

interface Props {
  zoneCounts: { zone: (typeof ZONES)[number]; count: number }[];
  threshold: number;
}

export default function ZoneOverlayLayer({ zoneCounts, threshold }: Props) {
  const map = useMap();

  useEffect(() => {
    const layers: L.Layer[] = [];

    zoneCounts.forEach(({ zone, count }) => {
      const isAlert = count >= threshold;

      // Zone rectangle
      const rect = L.rectangle(
        [
          [zone.minLat, zone.minLon],
          [zone.maxLat, zone.maxLon],
        ],
        {
          color: zone.color,
          weight: isAlert ? 2.5 : 1.5,
          opacity: isAlert ? 0.9 : 0.5,
          fillColor: zone.color,
          fillOpacity: isAlert ? 0.14 : 0.04,
          dashArray: isAlert ? undefined : "6 4",
          interactive: false,
        }
      );

      // Zone label marker
      const centerLat = (zone.minLat + zone.maxLat) / 2;
      const centerLon = (zone.minLon + zone.maxLon) / 2;

      const labelHtml = `
        <div class="zone-label ${isAlert ? "zone-label--alert" : ""}" style="--zc: ${zone.color}">
          <span class="zone-label__name">${zone.label}</span>
          <span class="zone-label__count">${count} report${count !== 1 ? "s" : ""}</span>
          ${isAlert ? '<span class="zone-label__warn">⚠ High</span>' : ""}
        </div>`;

      const labelIcon = L.divIcon({
        html: labelHtml,
        className: "",
        iconSize: [110, 52],
        iconAnchor: [55, 26],
      });

      const labelMarker = L.marker([centerLat, centerLon], {
        icon: labelIcon,
        interactive: false,
        zIndexOffset: 1000,
      });

      rect.addTo(map);
      labelMarker.addTo(map);
      layers.push(rect, labelMarker);
    });

    return () => {
      layers.forEach((l) => map.removeLayer(l));
    };
  }, [map, zoneCounts, threshold]);

  return null;
}
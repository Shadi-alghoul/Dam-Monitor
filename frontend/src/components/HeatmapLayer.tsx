import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import type { EnvironmentalReport } from "../types";

interface Props {
  reports: EnvironmentalReport[];
}

export default function HeatmapLayer({ reports }: Props) {
  const map = useMap();

  useEffect(() => {
    const points = reports
      .filter((r) => r.latitude != null && r.longitude != null)
      .map((r) => [r.latitude!, r.longitude!, 1] as [number, number, number]);

    const heat = (L as any).heatLayer(points, {
      radius: 35,
      blur: 25,
      maxZoom: 15,
      gradient: { 0.4: "blue", 0.6: "lime", 0.8: "yellow", 1.0: "red" }
    });

    heat.addTo(map);
    return () => { map.removeLayer(heat); };
  }, [reports, map]);

  return null;
}
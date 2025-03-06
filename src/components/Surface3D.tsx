import React, { useRef, useEffect } from "react";
import Plotly from "plotly.js-dist-min";

interface SurfaceDataPoint {
  x: number;
  y: number;
  z: number;
}

interface Surface3DProps {
  data: SurfaceDataPoint[];
  xLabel: string;
  yLabel: string;
  zLabel: string;
}

export const Surface3D: React.FC<Surface3DProps> = ({
  data,
  xLabel,
  yLabel,
  zLabel,
}) => {
  const plotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // ... existing Surface3D useEffect code ...
  }, [data, xLabel, yLabel, zLabel]);

  return (
    <div className="h-64 w-full">
      <div ref={plotRef} className="w-full h-full" />
    </div>
  );
};

// Surface3D.tsx
import React, { useEffect, useRef } from "react";
import Plotly from "plotly.js-dist-min";
import { Surface3DProps } from "../utils/types";

const ThreeDChart: React.FC<Surface3DProps> = ({
  data,
  xLabel,
  yLabel,
  zLabel,
}) => {
  const plotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!plotRef.current || data.length === 0) return;

    const xValues = Array.from(new Set(data.map((point) => point.x))).sort(
      (a, b) => a - b
    );
    const yValues = Array.from(new Set(data.map((point) => point.y))).sort(
      (a, b) => a - b
    );
    const zValues: number[][] = [];

    yValues.forEach((y) => {
      const row: number[] = [];
      xValues.forEach((x) => {
        const point = data.find((p) => p.x === x && p.y === y);
        row.push(point ? point.z : 0);
      });
      zValues.push(row);
    });

    const plotData: Partial<Plotly.Data>[] = [
      {
        type: "surface",
        x: xValues,
        y: yValues,
        z: zValues,
        colorscale: "Viridis",
      },
    ];

    const layout: Partial<Plotly.Layout> = {
      scene: {
        xaxis: { title: { text: xLabel } },
        yaxis: { title: { text: yLabel } },
        zaxis: { title: { text: zLabel } },
      },
      margin: { l: 0, r: 0, t: 40, b: 0 },
      height: 400,
    };

    Plotly.newPlot(plotRef.current, plotData, layout, { responsive: true });

    return () => {
      if (plotRef.current) Plotly.purge(plotRef.current);
    };
  }, [data, xLabel, yLabel, zLabel]);

  return (
    <div className="h-64 w-full">
      <div ref={plotRef} className="w-full h-full" />
    </div>
  );
};

export default ThreeDChart;

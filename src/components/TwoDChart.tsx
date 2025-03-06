import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ChartDataPoint, Greeks } from "../utils/types";

interface TwoDChartProps {
  chartData: ChartDataPoint[];
  parameter: string;
  greek: keyof Greeks | "price";
  getAxisLabel: (param: string) => string;
  formatTooltip: (value: number) => string;
}

const TwoDChart: React.FC<TwoDChartProps> = ({
  chartData,
  parameter,
  greek,
  getAxisLabel,
  formatTooltip,
}) => {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="parameter"
            label={{
              value: getAxisLabel(parameter),
              position: "insideBottom",
              offset: -5,
            }}
          />
          <YAxis
            label={{
              value: greek.charAt(0).toUpperCase() + greek.slice(1),
              angle: -90,
              position: "insideLeft",
            }}
          />
          <Tooltip
            formatter={(value: number) => [
              formatTooltip(value),
              greek.charAt(0).toUpperCase() + greek.slice(1),
            ]}
            labelFormatter={(value: number) =>
              `${getAxisLabel(parameter)}: ${value.toFixed(2)}`
            }
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="value"
            name={greek.charAt(0).toUpperCase() + greek.slice(1)}
            stroke="#8884d8"
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TwoDChart;

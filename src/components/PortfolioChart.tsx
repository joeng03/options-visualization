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
import OptionContract from "./OptionContract";
import { PortfolioDataPoint, PortfolioOption } from "../utils/types";

interface PortfolioChartProps {
  options: PortfolioOption[];
  portfolioData: PortfolioDataPoint[];
  portfolioParam: string;
  isDropdownOpen: boolean;
  setIsDropdownOpen: (value: boolean) => void;
  updateOption: (
    index: number,
    field: keyof PortfolioOption,
    value: any
  ) => void;
  removeOption: (index: number) => void;
  addOption: () => void;
  getAxisLabel: (param: string) => string;
}

const PortfolioChart: React.FC<PortfolioChartProps> = ({
  options,
  portfolioData,
  portfolioParam,
  isDropdownOpen,
  setIsDropdownOpen,
  updateOption,
  removeOption,
  addOption,
  getAxisLabel,
}) => {
  const [visibleLines, setVisibleLines] = React.useState({
    delta: true,
    gamma: true,
    theta: true,
    vega: true,
    value: true,
  });

  const toggleLine = (line: keyof typeof visibleLines) => {
    setVisibleLines((prev) => ({
      ...prev,
      [line]: !prev[line],
    }));
  };

  return (
    <div>
      <div className="mb-4">
        <h3
          className="font-medium mb-2 cursor-pointer"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          Portfolio Composition {isDropdownOpen ? "↑" : "↓"}
        </h3>
        {isDropdownOpen && (
          <>
            {options.map((option, index) => (
              <OptionContract
                key={index}
                option={option}
                index={index}
                updateOption={updateOption}
                removeOption={removeOption}
              />
            ))}
            <button
              onClick={addOption}
              className="px-4 py-2 bg-blue-600 text-black rounded hover:bg-blue-700"
            >
              Add Option
            </button>
          </>
        )}
      </div>
      <div className="mb-4 flex gap-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={visibleLines.delta}
            onChange={() => toggleLine("delta")}
            className="mr-2"
          />
          Delta
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={visibleLines.gamma}
            onChange={() => toggleLine("gamma")}
            className="mr-2"
          />
          Gamma
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={visibleLines.theta}
            onChange={() => toggleLine("theta")}
            className="mr-2"
          />
          Theta
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={visibleLines.vega}
            onChange={() => toggleLine("vega")}
            className="mr-2"
          />
          Vega
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={visibleLines.value}
            onChange={() => toggleLine("value")}
            className="mr-2"
          />
          Portfolio Value
        </label>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={portfolioData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="parameter"
              label={{
                value: getAxisLabel(portfolioParam),
                position: "insideBottom",
                offset: -5,
              }}
            />
            <YAxis />
            <Tooltip />
            <Legend />
            {visibleLines.delta && (
              <Line
                type="monotone"
                dataKey="delta"
                name="Delta"
                stroke="#8884d8"
              />
            )}
            {visibleLines.gamma && (
              <Line
                type="monotone"
                dataKey="gamma"
                name="Gamma"
                stroke="#82ca9d"
              />
            )}
            {visibleLines.theta && (
              <Line
                type="monotone"
                dataKey="theta"
                name="Theta"
                stroke="#ff7300"
              />
            )}
            {visibleLines.vega && (
              <Line
                type="monotone"
                dataKey="vega"
                name="Vega"
                stroke="#0088FE"
              />
            )}
            {visibleLines.value && (
              <Line
                type="monotone"
                dataKey="value"
                name="Portfolio Value"
                stroke="#000"
                strokeWidth={2}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PortfolioChart;

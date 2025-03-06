import React, { useState, useEffect, useRef } from "react";
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
import Plotly from "plotly.js-dist-min";
import "./App.css";

// Define types for option parameters and Greeks
interface OptionParams {
  type: "call" | "put";
  S: number; // Spot price
  K: number; // Strike price
  T: number; // Time to expiry (years)
  r: number; // Risk-free interest rate
  sigma: number; // Volatility
}

interface CalculatorMessage {
  task:
    | "calculateGreeks"
    | "calculatePortfolio"
    | "generateData"
    | "generate3DData";
  params: CalculatorParams;
}

type CalculatorParams =
  | GreeksParams
  | DataGenerationParams
  | ThreeDDataParams
  | PortfolioParams;

interface GreeksParams {
  type: "call" | "put";
  S: number;
  K: number;
  T: number;
  r: number;
  sigma: number;
  position: string;
  quantity: number;
}

interface DataGenerationParams {
  greek: keyof Greeks;
  interestRate: number;
  optionType: "call" | "put";
  parameter: string;
  spotPrice: number;
  strikePrice: number;
  timeToExpiry: number;
  volatility: number;
}

interface ThreeDDataParams {
  interestRate: number;
  optionType: "call" | "put";
  spotPrice: number;
  strikePrice: number;
  timeToExpiry: number;
  volatility: number;
  xParam: keyof ThreeDRanges;
  yParam: keyof ThreeDRanges;
}

interface ThreeDRange {
  min: number;
  max: number;
  steps: number;
  current: number;
}

interface ThreeDRanges {
  price: ThreeDRange;
  strike: ThreeDRange;
  time: ThreeDRange;
  volatility: ThreeDRange;
  interest: ThreeDRange;
}

interface PortfolioParams {
  options: Array<GreeksParams>;
  xAxis: string;
  range: {
    min: number;
    max: number;
  };
}

interface CalculatorResponse {
  task: "greeksResult" | "dataResult" | "3dDataResult" | "portfolioResult";
  result?: Greeks;
  data?: any[]; // Refined below
  results?: any[]; // Refined below
}

// Chart data types
interface ChartDataPoint {
  parameter: number;
  value: number;
}

interface SurfaceDataPoint {
  x: number;
  y: number;
  z: number;
}

interface PortfolioDataPoint {
  parameter: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  value: number;
}

// Portfolio option type
interface PortfolioOption extends OptionParams {
  position: "long" | "short";
  quantity: number;
}

// Surface3D (unchanged)
interface Surface3DProps {
  data: SurfaceDataPoint[];
  xLabel: string;
  yLabel: string;
  zLabel: string;
}

// Define types for Greeks
interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  price: number;
}

interface WasmExports extends WebAssembly.Exports {
  memory: WebAssembly.Memory;
  calculateGreeks: (
    isCall: number,
    S: number,
    K: number,
    T: number,
    r: number,
    sigma: number
  ) => number;
}

interface WasmModule {
  calculateGreeks: (
    type: "call" | "put",
    S: number,
    K: number,
    T: number,
    r: number,
    sigma: number
  ) => Greeks;
}

const initWasm = async (): Promise<WasmModule> => {
  try {
    const response = await fetch("wasm/options_calc.wasm");
    if (!response.ok) {
      throw new Error(
        `Failed to fetch options-calc.wasm: ${response.statusText}`
      );
    }
    const buffer = await response.arrayBuffer();

    const imports = {
      env: {
        memory: new WebAssembly.Memory({ initial: 256, maximum: 256 }), // Memory for calloc
        __memory_base: 0,
        __table_base: 0,
        emscripten_notify_memory_growth: function (size: number) {
          console.log(`Memory grown to: ${size} bytes`); // Debug log, can be empty
        },
      },
    };

    const module = await WebAssembly.instantiate(buffer, imports);
    const exports = module.instance.exports as WasmExports;

    const calculateGreeksRaw = exports.calculateGreeks as (
      isCall: number,
      S: number,
      K: number,
      T: number,
      r: number,
      sigma: number
    ) => number;

    return {
      calculateGreeks: (
        type: "call" | "put",
        S: number,
        K: number,
        T: number,
        r: number,
        sigma: number
      ): Greeks => {
        const isCall = type === "call" ? 1 : 0;
        const resultsPtr = calculateGreeksRaw(isCall, S, K, T, r, sigma);
        const results = new Float64Array(exports.memory.buffer, resultsPtr, 6);
        return {
          price: results[5], // PRICE
          delta: results[0], // DELTA
          gamma: results[1], // GAMMA
          theta: results[2], // THETA
          vega: results[3], // VEGA
          rho: results[4], // RHO
        };
      },
    };
  } catch (error) {
    console.error("WebAssembly module failed to load:", error);
    return {
      calculateGreeks: () => ({
        delta: 0,
        gamma: 0,
        theta: 0,
        vega: 0,
        rho: 0,
        price: 0,
      }), // Fallback
    };
  }
};

const Surface3D: React.FC<Surface3DProps> = ({
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

// OptionContract (unchanged)
interface OptionContractProps {
  option: PortfolioOption;
  index: number;
  updateOption: (
    index: number,
    field: keyof PortfolioOption,
    value: any
  ) => void;
  removeOption: (index: number) => void;
}

const OptionContract: React.FC<OptionContractProps> = ({
  option,
  index,
  updateOption,
  removeOption,
}) => {
  return (
    <div className="border p-3 rounded-lg mb-2 bg-gray-50">
      <div className="flex justify-between mb-2">
        <h4 className="font-medium">Option #{index + 1}</h4>
        <button
          onClick={() => removeOption(index)}
          className="text-red-500 hover:text-red-700"
        >
          Remove
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div>
          <label className="block text-sm">Type</label>
          <select
            value={option.type}
            onChange={(e) =>
              updateOption(index, "type", e.target.value as "call" | "put")
            }
            className="border rounded p-1 w-full"
          >
            <option value="call">Call</option>
            <option value="put">Put</option>
          </select>
        </div>
        <div>
          <label className="block text-sm">Position</label>
          <select
            value={option.position}
            onChange={(e) =>
              updateOption(
                index,
                "position",
                e.target.value as "long" | "short"
              )
            }
            className="border rounded p-1 w-full"
          >
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
        </div>
        <div>
          <label className="block text-sm">Quantity</label>
          <input
            type="number"
            value={option.quantity}
            onChange={(e) =>
              updateOption(index, "quantity", parseInt(e.target.value) || 1)
            }
            min="1"
            className="border rounded p-1 w-full"
          />
        </div>
        <div>
          <label className="block text-sm">Strike</label>
          <input
            type="number"
            value={option.K}
            onChange={(e) =>
              updateOption(index, "K", parseFloat(e.target.value))
            }
            className="border rounded p-1 w-full"
            step="1"
          />
        </div>
      </div>
    </div>
  );
};

// Black-Scholes helper functions
const d1 = (S: number, K: number, T: number, r: number, sigma: number) =>
  (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));

const d2 = (S: number, K: number, T: number, r: number, sigma: number) =>
  d1(S, K, T, r, sigma) - sigma * Math.sqrt(T);

const cdf = (x: number) => {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const z = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * z);
  const erf =
    1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

  return 0.5 * (1.0 + sign * erf);
};

const normalPDF = (x: number) =>
  Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);

// Calculate option greeks
const jsCalculateGreeks = (
  type: string,
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number
) => {
  if (T <= 0) {
    // Handle expiration
    const isInTheMoney =
      (type === "call" && S > K) || (type === "put" && S < K);
    return {
      delta: type === "call" ? (S > K ? 1 : 0) : S < K ? -1 : 0,
      gamma: 0,
      theta: 0,
      vega: 0,
      rho: 0,
      price: isInTheMoney ? Math.abs(S - K) : 0,
    };
  }

  const d1Value = d1(S, K, T, r, sigma);
  const d2Value = d2(S, K, T, r, sigma);
  ("");

  const N_d1 = cdf(d1Value);
  const N_d2 = cdf(d2Value);
  const N_neg_d1 = cdf(-d1Value);
  const N_neg_d2 = cdf(-d2Value);

  // Option price
  const price =
    type === "call"
      ? S * N_d1 - K * Math.exp(-r * T) * N_d2
      : K * Math.exp(-r * T) * N_neg_d2 - S * N_neg_d1;

  // Greeks calculations
  let delta, gamma, theta, vega, rho;

  if (type === "call") {
    delta = N_d1;
    rho = (K * T * Math.exp(-r * T) * N_d2) / 100;
    theta =
      (-S * sigma * normalPDF(d1Value)) / (2 * Math.sqrt(T)) -
      r * K * Math.exp(-r * T) * N_d2;
  } else {
    delta = N_d1 - 1;
    rho = (-K * T * Math.exp(-r * T) * N_neg_d2) / 100;
    theta =
      (-S * sigma * normalPDF(d1Value)) / (2 * Math.sqrt(T)) +
      r * K * Math.exp(-r * T) * N_neg_d2;
  }

  // Common for both
  gamma = normalPDF(d1Value) / (S * sigma * Math.sqrt(T));
  vega = (S * Math.sqrt(T) * normalPDF(d1Value)) / 100;

  // Convert theta to daily
  theta = theta / 365;

  return { delta, gamma, theta, vega, rho, price };
};

// Main Component with Fixed Worker Messaging

// Main Component with WASM integration using react-wasm
const OptionGreeksVisualization: React.FC = () => {
  const [optionType, setOptionType] = useState<"call" | "put">("call");
  const [greek, setGreek] = useState<keyof Greeks | "price">("delta");
  const [parameter, setParameter] = useState<
    "price" | "time" | "volatility" | "interest" | "moneyness"
  >("price");
  const [spotPrice, setSpotPrice] = useState<number>(100);
  const [strikePrice, setStrikePrice] = useState<number>(100);
  const [volatility, setVolatility] = useState<number>(0.2);
  const [timeToExpiry, setTimeToExpiry] = useState<number>(1);
  const [interestRate, setInterestRate] = useState<number>(0.05);
  const [visualizationMode, setVisualizationMode] = useState<
    "2d" | "3d" | "portfolio"
  >("2d");
  const [xParameter, setXParameter] = useState<
    "price" | "strike" | "time" | "volatility" | "interest"
  >("price");
  const [yParameter, setYParameter] = useState<
    "price" | "strike" | "time" | "volatility" | "interest"
  >("volatility");
  const [options, setOptions] = useState<PortfolioOption[]>(() => {
    const savedOptions = localStorage.getItem("options");
    return savedOptions
      ? JSON.parse(savedOptions)
      : [
          {
            type: "call",
            position: "long",
            quantity: 1,
            S: 100,
            K: 100,
            T: 1,
            r: 0.05,
            sigma: 0.2,
          },
        ];
  });
  const [portfolioParam, setPortfolioParam] = useState<
    "price" | "time" | "volatility" | "interest"
  >("price");
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [surfaceData, setSurfaceData] = useState<SurfaceDataPoint[]>([]);
  const [portfolioData, setPortfolioData] = useState<PortfolioDataPoint[]>(
    () => {
      const savedPortfolioData = localStorage.getItem("portfolioData");
      return savedPortfolioData ? JSON.parse(savedPortfolioData) : [];
    }
  );
  const [currentValues, setCurrentValues] = useState<Partial<Greeks>>({});
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(true);

  // Update the wasmModule when the WebAssembly instance is loaded

  const [wasmModule, setWasmModule] = useState<WasmModule | null>(null);
  useEffect(() => {
    const loadWasm = async () => {
      const module = await initWasm();
      setWasmModule(module);
    };
    loadWasm();
  }, []);

  // Calculate current option values
  useEffect(() => {
    // Use wasmModule for calculations if available, otherwise use worker
    const greeks = calculateGreeks(
      optionType,
      spotPrice,
      strikePrice,
      timeToExpiry,
      interestRate,
      volatility
    );
    setCurrentValues(greeks);
  }, [
    wasmModule,
    optionType,
    spotPrice,
    strikePrice,
    timeToExpiry,
    interestRate,
    volatility,
  ]);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem("options", JSON.stringify(options));
    localStorage.setItem("portfolioData", JSON.stringify(portfolioData));
  }, [options, portfolioData]);

  useEffect(() => {
    setIsCalculating(true);

    if (visualizationMode === "2d") {
      processMessage({
        task: "generateData",
        params: {
          optionType,
          greek,
          parameter,
          spotPrice,
          strikePrice,
          timeToExpiry,
          interestRate,
          volatility,
        },
      });
    } else if (visualizationMode === "3d") {
      processMessage({
        task: "generate3DData",
        params: {
          optionType,
          xParam: xParameter,
          yParam: yParameter,
          spotPrice,
          strikePrice,
          timeToExpiry,
          interestRate,
          volatility,
        },
      });
    } else if (visualizationMode === "portfolio") {
      const updatedOptions = options.map((option) => ({
        ...option,
        S: spotPrice,
        T: timeToExpiry,
        r: interestRate,
        sigma: volatility,
      }));
      let min: number, max: number;
      if (portfolioParam === "price") {
        min = spotPrice * 0.5;
        max = spotPrice * 1.5;
      } else if (portfolioParam === "time") {
        min = 0.01;
        max = 2;
      } else if (portfolioParam === "volatility") {
        min = 0.05;
        max = 0.6;
      } else {
        min = 0.01;
        max = 0.1;
      }

      processMessage({
        task: "calculatePortfolio",
        params: {
          options: updatedOptions,
          xAxis: portfolioParam,
          range: { min, max },
        },
      });
    }
  }, [
    visualizationMode,
    optionType,
    greek,
    parameter,
    spotPrice,
    strikePrice,
    timeToExpiry,
    interestRate,
    volatility,
    xParameter,
    yParameter,
    portfolioParam,
    options,
  ]);

  const calculateGreeks = (
    type: "call" | "put",
    S: number,
    K: number,
    T: number,
    r: number,
    sigma: number
  ) => {
    if (!wasmModule) {
      return jsCalculateGreeks(type, S, K, T, r, sigma);
    }
    return wasmModule.calculateGreeks(type, S, K, T, r, sigma);
  };

  const processCalculatorResult = (e: CalculatorResponse) => {
    setIsCalculating(false);
    const { task, result, data, results } = e;

    if (task === "dataResult") {
      setChartData(data as ChartDataPoint[]);
    } else if (task === "3dDataResult") {
      setSurfaceData(data as SurfaceDataPoint[]);
    } else if (task === "greeksResult") {
      setCurrentValues(result as Greeks);
    } else if (task === "portfolioResult") {
      setPortfolioData(results as PortfolioDataPoint[]);
    }
  };

  const processMessage = async function (e: CalculatorMessage) {
    const startTime = performance.now();

    const { task, params } = e;

    if (task === "calculateGreeks") {
      const { type, S, K, T, r, sigma } = params as GreeksParams;
      const result = calculateGreeks(type, S, K, T, r, sigma);
      processCalculatorResult({ task: "greeksResult", result });
    } else if (task === "generateData") {
      const {
        optionType,
        greek,
        parameter,
        spotPrice,
        strikePrice,
        timeToExpiry,
        interestRate,
        volatility,
      } = params as DataGenerationParams;
      const data = [];

      if (parameter === "price") {
        const minPrice = strikePrice * 0.5;
        const maxPrice = strikePrice * 1.5;
        const step = (maxPrice - minPrice) / 100;

        for (let price = minPrice; price <= maxPrice; price += step) {
          const greeks = calculateGreeks(
            optionType,
            price,
            strikePrice,
            timeToExpiry,
            interestRate,
            volatility
          );
          data.push({
            parameter: price,
            value: greeks[greek],
          });
        }
      } else if (parameter === "time") {
        for (let time = 0.01; time <= 2; time += 0.02) {
          const greeks = calculateGreeks(
            optionType,
            spotPrice,
            strikePrice,
            time,
            interestRate,
            volatility
          );
          data.push({
            parameter: time,
            value: greeks[greek],
          });
        }
      } else if (parameter === "volatility") {
        for (let vol = 0.05; vol <= 1; vol += 0.01) {
          const greeks = calculateGreeks(
            optionType,
            spotPrice,
            strikePrice,
            timeToExpiry,
            interestRate,
            vol
          );
          data.push({
            parameter: vol,
            value: greeks[greek],
          });
        }
      } else if (parameter === "interest") {
        for (let rate = 0.01; rate <= 0.1; rate += 0.001) {
          const greeks = calculateGreeks(
            optionType,
            spotPrice,
            strikePrice,
            timeToExpiry,
            rate,
            volatility
          );
          data.push({
            parameter: rate,
            value: greeks[greek],
          });
        }
      } else if (parameter === "moneyness") {
        for (let moneyness = 0.5; moneyness <= 1.5; moneyness += 0.01) {
          const effectiveSpotPrice = strikePrice * moneyness;
          const greeks = calculateGreeks(
            optionType,
            effectiveSpotPrice,
            strikePrice,
            timeToExpiry,
            interestRate,
            volatility
          );
          data.push({
            parameter: moneyness,
            value: greeks[greek],
          });
        }
      }

      processCalculatorResult({ task: "dataResult", data });
    } else if (task === "generate3DData") {
      const {
        optionType,
        xParam,
        yParam,
        spotPrice,
        strikePrice,
        timeToExpiry,
        interestRate,
        volatility,
      } = params as ThreeDDataParams;
      console.log(params);
      const data = [];

      // Define ranges
      const xRanges = {
        price: {
          min: spotPrice * 0.7,
          max: spotPrice * 1.3,
          steps: 30,
          current: spotPrice,
        },
        strike: {
          min: strikePrice * 0.7,
          max: strikePrice * 1.3,
          steps: 30,
          current: strikePrice,
        },
        time: { min: 0.1, max: 2, steps: 30, current: timeToExpiry },
        volatility: { min: 0.05, max: 0.6, steps: 30, current: volatility },
        interest: { min: 0.01, max: 0.1, steps: 30, current: interestRate },
      };

      const yRanges = { ...xRanges };

      // Generate grid of values
      const xRange = xRanges[xParam];
      const yRange = yRanges[yParam];

      const xStep = (xRange.max - xRange.min) / xRange.steps;
      const yStep = (yRange.max - yRange.min) / yRange.steps;

      for (let i = 0; i <= xRange.steps; i++) {
        const xValue = xRange.min + i * xStep;

        for (let j = 0; j <= yRange.steps; j++) {
          const yValue = yRange.min + j * yStep;

          // Set parameters
          const params = {
            type: optionType,
            S: spotPrice,
            K: strikePrice,
            T: timeToExpiry,
            r: interestRate,
            sigma: volatility,
          };

          // Override with x and y parameters
          if (xParam === "price") params.S = xValue;
          if (xParam === "strike") params.K = xValue;
          if (xParam === "time") params.T = xValue;
          if (xParam === "volatility") params.sigma = xValue;
          if (xParam === "interest") params.r = xValue;

          if (yParam === "price") params.S = yValue;
          if (yParam === "strike") params.K = yValue;
          if (yParam === "time") params.T = yValue;
          if (yParam === "volatility") params.sigma = yValue;
          if (yParam === "interest") params.r = yValue;

          const result = calculateGreeks(
            params.type,
            params.S,
            params.K,
            params.T,
            params.r,
            params.sigma
          );

          data.push({
            x: xValue,
            y: yValue,
            z: result.price,
          });
        }
      }

      processCalculatorResult({ task: "3dDataResult", data });
    } else if (task === "calculatePortfolio") {
      const { options, xAxis, range } = params as PortfolioParams;
      console.log(params);
      const results = [];

      const min = range.min;
      const max = range.max;
      const steps = 50;
      const step = (max - min) / steps;

      for (let i = 0; i <= steps; i++) {
        const xValue = min + i * step;
        let totalDelta = 0;
        let totalGamma = 0;
        let totalTheta = 0;
        let totalVega = 0;
        let totalRho = 0;
        let totalValue = 0;

        options.forEach((option) => {
          // Apply the varying parameter
          const params = { ...option };

          if (xAxis === "price") params.S = xValue;
          if (xAxis === "time") params.T = xValue;
          if (xAxis === "volatility") params.sigma = xValue;
          if (xAxis === "interest") params.r = xValue;

          const { delta, gamma, theta, vega, rho, price } = calculateGreeks(
            params.type,
            params.S,
            params.K,
            params.T,
            params.r,
            params.sigma
          );

          // Apply quantity and direction
          const sign = params.position === "long" ? 1 : -1;
          const qty = params.quantity || 1;

          totalDelta += delta * sign * qty;
          totalGamma += gamma * sign * qty;
          totalTheta += theta * sign * qty;
          totalVega += vega * sign * qty;
          totalRho += rho * sign * qty;
          totalValue += price * sign * qty;
        });

        results.push({
          parameter: xValue,
          delta: totalDelta,
          gamma: totalGamma,
          theta: totalTheta,
          vega: totalVega,
          rho: totalRho,
          value: totalValue,
        });
      }

      processCalculatorResult({ task: "portfolioResult", results });
    }

    const endTime = performance.now();
    console.log(`${task} took ${endTime - startTime}ms`);
  };

  // Input handler
  const handleInputChange = (
    setter: React.Dispatch<React.SetStateAction<number>>,
    value: string,
    min: number,
    max: number
  ) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= min && numValue <= max) {
      setter(numValue);
    }
  };

  // Portfolio functions
  const addOption = () => {
    setOptions([
      ...options,
      {
        type: "call",
        position: "long",
        quantity: 1,
        S: spotPrice,
        K: strikePrice,
        T: timeToExpiry,
        r: interestRate,
        sigma: volatility,
      },
    ]);
  };

  const updateOption = (
    index: number,
    field: keyof PortfolioOption,
    value: any
  ) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setOptions(newOptions);
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const getAxisLabel = (param: string): string => {
    switch (param) {
      case "price":
        return "Underlying Price";
      case "strike":
        return "Strike Price";
      case "time":
        return "Time to Expiry (Years)";
      case "volatility":
        return "Implied Volatility";
      case "interest":
        return "Interest Rate";
      case "moneyness":
        return "Moneyness (S/K)";
      default:
        return "";
    }
  };

  const formatTooltip = (value: number): string => {
    return greek === "theta" ? value.toFixed(4) : value.toFixed(5);
  };

  const renderVisualization = () => {
    if (visualizationMode === "2d") {
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
    } else if (visualizationMode === "3d") {
      return (
        <Surface3D
          data={surfaceData}
          xLabel={getAxisLabel(xParameter)}
          yLabel={getAxisLabel(yParameter)}
          zLabel="Option Price"
        />
      );
    } else if (visualizationMode === "portfolio") {
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
                <Line
                  type="monotone"
                  dataKey="delta"
                  name="Delta"
                  stroke="#8884d8"
                />
                <Line
                  type="monotone"
                  dataKey="gamma"
                  name="Gamma"
                  stroke="#82ca9d"
                />
                <Line
                  type="monotone"
                  dataKey="theta"
                  name="Theta"
                  stroke="#ff7300"
                />
                <Line
                  type="monotone"
                  dataKey="vega"
                  name="Vega"
                  stroke="#0088FE"
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  name="Portfolio Value"
                  stroke="#000"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen w-full p-4 bg-white rounded-lg shadow">
      <div className="w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-center">
            Option Greeks Visualizer
          </h2>
          {isCalculating && (
            <div className="text-sm bg-blue-100 px-2 py-1 rounded">
              · Calculating..."
            </div>
          )}
        </div>
        <div className="mb-4">
          <div className="flex justify-center space-x-4">
            <button
              className={`px-3 py-1 rounded border ${
                visualizationMode === "2d" ? "" : "border-transparent"
              }`}
              onClick={() => setVisualizationMode("2d")}
            >
              2D Chart
            </button>
            <button
              className={`px-3 py-1 rounded border ${
                visualizationMode === "3d" ? "" : "border-transparent"
              }`}
              onClick={() => setVisualizationMode("3d")}
            >
              3D Chart
            </button>
            <button
              className={`px-3 py-1 rounded border ${
                visualizationMode === "portfolio" ? "" : "border-transparent"
              }`}
              onClick={() => setVisualizationMode("portfolio")}
            >
              Portfolio Analysis
            </button>
          </div>
        </div>
        {visualizationMode === "2d" && (
          <div className="flex flex-wrap gap-4 mb-4 justify-center">
            <div>
              <label className="mr-2 font-medium">Option Type:</label>
              <select
                value={optionType}
                onChange={(e) =>
                  setOptionType(e.target.value as "call" | "put")
                }
                className="border rounded p-1"
              >
                <option value="call">Call</option>
                <option value="put">Put</option>
              </select>
            </div>
            <div>
              <label className="mr-2 font-medium">Greek:</label>
              <select
                value={greek}
                onChange={(e) =>
                  setGreek(e.target.value as keyof Greeks | "price")
                }
                className="border rounded p-1"
              >
                <option value="delta">Delta</option>
                <option value="gamma">Gamma</option>
                <option value="theta">Theta</option>
                <option value="vega">Vega</option>
                <option value="rho">Rho</option>
                <option value="price">Price</option>
              </select>
            </div>
            <div>
              <label className="mr-2 font-medium">X-Axis:</label>
              <select
                value={parameter}
                onChange={(e) =>
                  setParameter(
                    e.target.value as
                      | "price"
                      | "time"
                      | "volatility"
                      | "interest"
                      | "moneyness"
                  )
                }
                className="border rounded p-1"
              >
                <option value="price">Underlying Price</option>
                <option value="time">Time to Expiry</option>
                <option value="volatility">Volatility</option>
                <option value="interest">Interest Rate</option>
                <option value="moneyness">Moneyness (S/K)</option>
              </select>
            </div>
          </div>
        )}
        {visualizationMode === "3d" && (
          <div className="flex flex-wrap gap-4 mb-4 justify-center">
            <div>
              <label className="mr-2 font-medium">Option Type:</label>
              <select
                value={optionType}
                onChange={(e) =>
                  setOptionType(e.target.value as "call" | "put")
                }
                className="border rounded p-1"
              >
                <option value="call">Call</option>
                <option value="put">Put</option>
              </select>
            </div>
            <div>
              <label className="mr-2 font-medium">X-Axis:</label>
              <select
                value={xParameter}
                onChange={(e) =>
                  setXParameter(
                    e.target.value as
                      | "price"
                      | "strike"
                      | "time"
                      | "volatility"
                      | "interest"
                  )
                }
                className="border rounded p-1"
              >
                <option value="price">Underlying Price</option>
                <option value="strike">Strike Price</option>
                <option value="time">Time to Expiry</option>
                <option value="volatility">Volatility</option>
                <option value="interest">Interest Rate</option>
              </select>
            </div>
            <div>
              <label className="mr-2 font-medium">Y-Axis:</label>
              <select
                value={yParameter}
                onChange={(e) =>
                  setYParameter(
                    e.target.value as
                      | "price"
                      | "strike"
                      | "time"
                      | "volatility"
                      | "interest"
                  )
                }
                className="border rounded p-1"
              >
                <option value="price">Underlying Price</option>
                <option value="strike">Strike Price</option>
                <option value="time">Time to Expiry</option>
                <option value="volatility">Volatility</option>
                <option value="interest">Interest Rate</option>
              </select>
            </div>
          </div>
        )}
        {visualizationMode === "portfolio" && (
          <div className="flex flex-wrap gap-4 mb-4 justify-center">
            <div>
              <label className="mr-2 font-medium">X-Axis Parameter:</label>
              <select
                value={portfolioParam}
                onChange={(e) =>
                  setPortfolioParam(
                    e.target.value as
                      | "price"
                      | "time"
                      | "volatility"
                      | "interest"
                  )
                }
                className="border rounded p-1"
              >
                <option value="price">Underlying Price</option>
                <option value="time">Time to Expiry</option>
                <option value="volatility">Volatility</option>
                <option value="interest">Interest Rate</option>
              </select>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4">
          <div>
            <label className="block text-sm font-medium">Spot Price:</label>
            <input
              type="number"
              value={spotPrice}
              onChange={(e) =>
                handleInputChange(setSpotPrice, e.target.value, 1, 1000)
              }
              className="border rounded p-1 w-full"
              step="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Strike Price:</label>
            <input
              type="number"
              value={strikePrice}
              onChange={(e) =>
                handleInputChange(setStrikePrice, e.target.value, 1, 1000)
              }
              className="border rounded p-1 w-full"
              step="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Volatility:</label>
            <input
              type="number"
              value={volatility}
              onChange={(e) =>
                handleInputChange(setVolatility, e.target.value, 0.01, 2)
              }
              className="border rounded p-1 w-full"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Time (Years):</label>
            <input
              type="number"
              value={timeToExpiry}
              onChange={(e) =>
                handleInputChange(setTimeToExpiry, e.target.value, 0.01, 10)
              }
              className="border rounded p-1 w-full"
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Interest Rate:</label>
            <input
              type="number"
              value={interestRate}
              onChange={(e) =>
                handleInputChange(setInterestRate, e.target.value, 0, 0.2)
              }
              className="border rounded p-1 w-full"
              step="0.01"
            />
          </div>
        </div>
        {renderVisualization()}
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <h3 className="font-bold">Current Option Parameters</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mt-2">
            <div>Spot/Strike: {(spotPrice / strikePrice).toFixed(2)}</div>
            <div>
              Moneyness:{" "}
              {spotPrice > strikePrice
                ? "ITM"
                : spotPrice < strikePrice
                ? "OTM"
                : "ATM"}
            </div>
            <div>Delta: {currentValues.delta?.toFixed(5) || "-"}</div>
            <div>Gamma: {currentValues.gamma?.toFixed(5) || "-"}</div>
            <div>Theta: {currentValues.theta?.toFixed(5) || "-"}</div>
            <div>Vega: {currentValues.vega?.toFixed(5) || "-"}</div>
            <div>Rho: {currentValues.rho?.toFixed(5) || "-"}</div>
            <div>Price: {currentValues.price?.toFixed(2) || "-"}</div>
          </div>
        </div>
        <div className="mt-4 flex justify-end space-x-2">
          <button
            className="px-3 py-1 bg-gray-600 text-black rounded border border-transparent hover:border-black"
            onClick={() => {
              const data =
                visualizationMode === "2d"
                  ? chartData
                  : visualizationMode === "3d"
                  ? surfaceData
                  : portfolioData;
              const blob = new Blob([JSON.stringify(data)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "option-data.json";
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }}
          >
            Export Data
          </button>
          {visualizationMode !== "3d" && (
            <button
              className="px-3 py-1 bg-gray-600 text-black rounded border border-transparent hover:border-black"
              onClick={async () => {
                const svgElement = document.querySelector("svg");
                if (svgElement) {
                  try {
                    const svgData = new XMLSerializer().serializeToString(
                      svgElement
                    );
                    const canvas = document.createElement("canvas");
                    const context = canvas.getContext("2d");
                    const img = new Image();
                    const svgBlob = new Blob([svgData], {
                      type: "image/svg+xml;charset=utf-8",
                    });
                    const url = URL.createObjectURL(svgBlob);

                    img.onload = async () => {
                      canvas.width = img.width;
                      canvas.height = img.height;
                      context!.fillStyle = "white";
                      context?.fillRect(0, 0, canvas.width, canvas.height);
                      context?.drawImage(img, 0, 0);
                      const pngDataUrl = canvas.toDataURL("image/png");
                      const link = document.createElement("a");
                      link.href = pngDataUrl;
                      link.download = "chart.png";
                      link.click();
                      URL.revokeObjectURL(url);
                    };

                    img.src = url;
                  } catch (error) {
                    console.error("Error capturing screenshot:", error);
                    alert("Failed to take screenshot. Please try again.");
                  }
                } else {
                  alert("No SVG available to capture.");
                }
              }}
            >
              Take Screenshot
            </button>
          )}{" "}
        </div>
      </div>
    </div>
  );
};

export default OptionGreeksVisualization;

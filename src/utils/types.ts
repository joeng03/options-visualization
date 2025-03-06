// types.ts
export interface OptionParams {
  type: "call" | "put";
  S: number;
  K: number;
  T: number;
  r: number;
  sigma: number;
}

export interface CalculatorMessage {
  task:
    | "calculateGreeks"
    | "calculatePortfolio"
    | "generateData"
    | "generate3DData";
  params: CalculatorParams;
}

export type CalculatorParams =
  | GreeksParams
  | DataGenerationParams
  | ThreeDDataParams
  | PortfolioParams;

export interface GreeksParams {
  type: "call" | "put";
  S: number;
  K: number;
  T: number;
  r: number;
  sigma: number;
  position: string;
  quantity: number;
}

export interface DataGenerationParams {
  greek: keyof Greeks;
  interestRate: number;
  optionType: "call" | "put";
  parameter: string;
  spotPrice: number;
  strikePrice: number;
  timeToExpiry: number;
  volatility: number;
}

export interface ThreeDRange {
  min: number;
  max: number;
  steps: number;
  current: number;
}

export interface ThreeDRanges {
  price: ThreeDRange;
  strike: ThreeDRange;
  time: ThreeDRange;
  volatility: ThreeDRange;
  interest: ThreeDRange;
}

export interface ThreeDDataParams {
  interestRate: number;
  optionType: "call" | "put";
  spotPrice: number;
  strikePrice: number;
  timeToExpiry: number;
  volatility: number;
  xParam: keyof ThreeDRanges;
  yParam: keyof ThreeDRanges;
}

export interface PortfolioParams {
  options: Array<GreeksParams>;
  xAxis: string;
  range: {
    min: number;
    max: number;
  };
}

export interface CalculatorResponse {
  task: "greeksResult" | "dataResult" | "3dDataResult" | "portfolioResult";
  result?: Greeks;
  data?: any[];
  results?: any[];
}

export interface ChartDataPoint {
  parameter: number;
  value: number;
}

export interface SurfaceDataPoint {
  x: number;
  y: number;
  z: number;
}

export interface PortfolioDataPoint {
  parameter: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  value: number;
}

export interface PortfolioOption extends OptionParams {
  position: "long" | "short";
  quantity: number;
}

export interface Surface3DProps {
  data: SurfaceDataPoint[];
  xLabel: string;
  yLabel: string;
  zLabel: string;
}

export interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  price: number;
}

export interface WasmExports extends WebAssembly.Exports {
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

export interface WasmModule {
  calculateGreeks: (
    type: "call" | "put",
    S: number,
    K: number,
    T: number,
    r: number,
    sigma: number
  ) => Greeks;
}

export interface OptionContractProps {
  option: PortfolioOption;
  index: number;
  updateOption: (
    index: number,
    field: keyof PortfolioOption,
    value: any
  ) => void;
  removeOption: (index: number) => void;
}

// wasm.ts
import { Greeks, WasmModule, WasmExports } from "./types";

export const initWasm = async (): Promise<WasmModule> => {
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
        memory: new WebAssembly.Memory({ initial: 256, maximum: 256 }),
        __memory_base: 0,
        __table_base: 0,
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
          price: results[5],
          delta: results[0],
          gamma: results[1],
          theta: results[2],
          vega: results[3],
          rho: results[4],
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
      }),
    };
  }
};

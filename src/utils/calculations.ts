// calculations.ts
import { Greeks } from "./types";

export const d1 = (S: number, K: number, T: number, r: number, sigma: number) =>
  (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));

export const d2 = (S: number, K: number, T: number, r: number, sigma: number) =>
  d1(S, K, T, r, sigma) - sigma * Math.sqrt(T);

export const cdf = (x: number) => {
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

export const normalPDF = (x: number) =>
  Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);

export const jsCalculateGreeks = (
  type: string,
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number
): Greeks => {
  if (T <= 0) {
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

  const price =
    type === "call"
      ? S * N_d1 - K * Math.exp(-r * T) * N_d2
      : K * Math.exp(-r * T) * N_neg_d2 - S * N_neg_d1;

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

  gamma = normalPDF(d1Value) / (S * sigma * Math.sqrt(T));
  vega = (S * Math.sqrt(T) * normalPDF(d1Value)) / 100;

  theta = theta / 365;

  return { delta, gamma, theta, vega, rho, price };
};

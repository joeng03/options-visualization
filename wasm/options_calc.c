// options-calc.c - Compile to WebAssembly with:
// emcc options-calc.c -o options-calc.wasm -s WASM=1 -s EXPORTED_FUNCTIONS="['_calculateOptionPrice', '_calculateDelta', '_calculateGamma', '_calculateTheta', '_calculateVega', '_calculateRho']" -O3

#include <math.h>
#include <stdlib.h>

// Constants for normal distribution approximation
const double a1 = 0.254829592;
const double a2 = -0.284496736;
const double a3 = 1.421413741;
const double a4 = -1.453152027;
const double a5 = 1.061405429;
const double p = 0.3275911;

// Fast cumulative normal distribution approximation
double cnd(double x) {
    double sign = 1.0;
    if (x < 0) {
        sign = -1.0;
        x = -x;
    }
    
    double t = 1.0 / (1.0 + p * x);
    double y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * exp(-x * x);
    
    return 0.5 * (1.0 + sign * y);
}

// Normal probability density function
double npdf(double x) {
    return exp(-0.5 * x * x) / sqrt(2.0 * M_PI);
}

// d1 and d2 calculations for Black-Scholes
double d1(double S, double K, double T, double r, double sigma) {
    return (log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrt(T));
}

double d2(double S, double K, double T, double r, double sigma) {
    return d1(S, K, T, r, sigma) - sigma * sqrt(T);
}

// Batch calculation of all greeks - more efficient for WASM
// Returns array of [price, delta, gamma, theta, vega, rho]
double* calculateGreeks(int isCall, double S, double K, double T, double r, double sigma) {
    static double results[6];
    
    if (T <= 0.0001) {
        // At expiration
        if (isCall) {
            results[0] = fmax(0.0, S - K); // price
            results[1] = S > K ? 1.0 : 0.0; // delta
        } else {
            results[0] = fmax(0.0, K - S); // price
            results[1] = S < K ? -1.0 : 0.0; // delta
        }
        results[2] = 0.0; // gamma
        results[3] = 0.0; // theta
        results[4] = 0.0; // vega
        results[5] = 0.0; // rho
        return results;
    }
    
    double d1_val = d1(S, K, T, r, sigma);
    double d2_val = d2(S, K, T, r, sigma);
    double nd1 = npdf(d1_val);
    
    // Common calculations
    results[2] = nd1 / (S * sigma * sqrt(T)); // gamma
    results[4] = 0.01 * S * sqrt(T) * nd1; // vega
    
    if (isCall) {
        results[0] = S * cnd(d1_val) - K * exp(-r * T) * cnd(d2_val); // price
        results[1] = cnd(d1_val); // delta
        results[3] = -(S * sigma * nd1) / (2.0 * sqrt(T)) - r * K * exp(-r * T) * cnd(d2_val); // theta
        results[5] = 0.01 * K * T * exp(-r * T) * cnd(d2_val); // rho
    } else {
        results[0] = K * exp(-r * T) * cnd(-d2_val) - S * cnd(-d1_val); // price
        results[1] = cnd(d1_val) - 1.0; // delta
        results[3] = -(S * sigma * nd1) / (2.0 * sqrt(T)) + r * K * exp(-r * T) * cnd(-d2_val); // theta
        results[5] = -0.01 * K * T * exp(-r * T) * cnd(-d2_val); // rho
    }
    
    // Convert theta to daily
    results[3] = results[3] / 365.0;
    
    return results;
}
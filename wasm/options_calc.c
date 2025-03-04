#include <math.h>
#include <stdbool.h>
#include <stdlib.h>

#define DELTA 0
#define GAMMA 1
#define THETA 2
#define VEGA 3
#define RHO 4
#define PRICE 5

double d1(double S, double K, double T, double r, double sigma) {
    return (log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * sqrt(T));
}

double d2(double S, double K, double T, double r, double sigma) {
    return d1(S, K, T, r, sigma) - sigma * sqrt(T);
}

double cdf(double x) {
    const double a1 = 0.254829592;
    const double a2 = -0.284496736;
    const double a3 = 1.421413741;
    const double a4 = -1.453152027;
    const double a5 = 1.061405429;
    const double p = 0.3275911;

    int sign = x < 0 ? -1 : 1;
    double z = fabs(x) / sqrt(2.0);

    double t = 1.0 / (1.0 + p * z);
    double erf = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * exp(-z * z);

    return 0.5 * (1.0 + sign * erf);
}

double normalPDF(double x) {
    return exp(-0.5 * x * x) / sqrt(2.0 * M_PI);
}

static double greeks[6];

double* calculateGreeks(bool isCall, double S, double K, double T, double r, double sigma) {

    if (T <= 0) {
        // Handle expiration
        int isInTheMoney = (isCall && S > K) || (!isCall && S < K);
        greeks[PRICE] = isInTheMoney ? fabs(S - K) : 0;
        greeks[DELTA] = isCall ? (S > K ? 1 : 0) : (S < K ? -1 : 0);
        return greeks;
    }

    double d1Value = d1(S, K, T, r, sigma);
    double d2Value = d2(S, K, T, r, sigma);

    double N_d1 = cdf(d1Value);
    double N_d2 = cdf(d2Value);
    double N_neg_d1 = cdf(-d1Value);
    double N_neg_d2 = cdf(-d2Value);

    // Option price
    greeks[PRICE] = isCall
        ? S * N_d1 - K * exp(-r * T) * N_d2
        : K * exp(-r * T) * N_neg_d2 - S * N_neg_d1;

    // Greeks calculations
    if (isCall) {
        greeks[DELTA] = N_d1;
        greeks[RHO] = (K * T * exp(-r * T) * N_d2) / 100;
        greeks[THETA] = (-S * sigma * normalPDF(d1Value)) / (2 * sqrt(T)) - r * K * exp(-r * T) * N_d2;
    } else {
        greeks[DELTA] = N_d1 - 1;
        greeks[RHO] = (-K * T * exp(-r * T) * N_neg_d2) / 100;
        greeks[THETA] = (-S * sigma * normalPDF(d1Value)) / (2 * sqrt(T)) + r * K * exp(-r * T) * N_neg_d2;
    }

    // Common for both
    greeks[GAMMA] = normalPDF(d1Value) / (S * sigma * sqrt(T));
    greeks[VEGA] = (S * sqrt(T) * normalPDF(d1Value)) / 100;

    // Convert theta to daily
    greeks[THETA] = greeks[THETA] / 365;

    return greeks;
}
// Calculate option price - exported to JS
double calculateOptionPrice(int isCall, double S, double K, double T, double r, double sigma) {
    if (T <= 0.0001) {
        // At expiration
        if (isCall) {
            return fmax(0.0, S - K);
        } else {
            return fmax(0.0, K - S);
        }
    }
    
    double d1_val = d1(S, K, T, r, sigma);
    double d2_val = d2(S, K, T, r, sigma);
    
    if (isCall) {
        return S * cnd(d1_val) - K * exp(-r * T) * cnd(d2_val);
    } else {
        return K * exp(-r * T) * cnd(-d2_val) - S * cnd(-d1_val);
    }
}

// Calculate option delta
double calculateDelta(int isCall, double S, double K, double T, double r, double sigma) {
    if (T <= 0.0001) {
        // At expiration
        if (isCall) {
            return S > K ? 1.0 : 0.0;
        } else {
            return S < K ? -1.0 : 0.0;
        }
    }
    
    double d1_val = d1(S, K, T, r, sigma);
    
    if (isCall) {
        return cnd(d1_val);
    } else {
        return cnd(d1_val) - 1.0;
    }
}

// Calculate option gamma (same for calls and puts)
double calculateGamma(double S, double K, double T, double r, double sigma) {
    if (T <= 0.0001) return 0.0;
    
    double d1_val = d1(S, K, T, r, sigma);
    return npdf(d1_val) / (S * sigma * sqrt(T));
}

// Calculate option theta
double calculateTheta(int isCall, double S, double K, double T, double r, double sigma) {
    if (T <= 0.0001) return 0.0;
    
    double d1_val = d1(S, K, T, r, sigma);
    double d2_val = d2(S, K, T, r, sigma);
    
    double common = -(S * sigma * npdf(d1_val)) / (2.0 * sqrt(T));
    
    if (isCall) {
        return common - r * K * exp(-r * T) * cnd(d2_val);
    } else {
        return common + r * K * exp(-r * T) * cnd(-d2_val);
    }
}

// Calculate option vega (same for calls and puts)
double calculateVega(double S, double K, double T, double r, double sigma) {
    if (T <= 0.0001) return 0.0;
    
    double d1_val = d1(S, K, T, r, sigma);
    return 0.01 * S * sqrt(T) * npdf(d1_val);
}

// Calculate option rho
double calculateRho(int isCall, double S, double K, double T, double r, double sigma) {
    if (T <= 0.0001) return 0.0;
    
    double d2_val = d2(S, K, T, r, sigma);
    
    if (isCall) {
        return 0.01 * K * T * exp(-r * T) * cnd(d2_val);
    } else {
        return -0.01 * K * T * exp(-r * T) * cnd(-d2_val);
    }
}

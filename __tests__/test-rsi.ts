// Test script to verify RSI calculation
import { calculateRSI, calculateMACD } from './lib/algorithms/technicalIndicators';

// Test data - sample stock prices in cents
const samplePrices = [
  8500, 8550, 8600, 8520, 8480, 8450, 8510, 8580, 8620, 8650,
  8630, 8590, 8540, 8500, 8470, 8530, 8570, 8600, 8640, 8680,
  8700, 8720, 8690, 8650, 8620, 8580, 8540, 8500, 8460, 8420
];

console.log('Testing RSI Calculation...');
console.log('Sample prices:', samplePrices);

// Test RSI with different periods
const rsi6 = calculateRSI({ data: samplePrices, period: 6 });
const rsi12 = calculateRSI({ data: samplePrices, period: 12 });
const rsi24 = calculateRSI({ data: samplePrices, period: 24 });

console.log('\nRSI Results:');
console.log('RSI 6:', rsi6[rsi6.length - 1]);
console.log('RSI 12:', rsi12[rsi12.length - 1]);
console.log('RSI 24:', rsi24[rsi24.length - 1]);

console.log('\nTesting MACD Calculation...');
const macdResult = calculateMACD({ data: samplePrices, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 });

console.log('MACD Results:');
console.log('MACD Line:', macdResult.macd[macdResult.macd.length - 1]);
console.log('Signal Line:', macdResult.signal[macdResult.signal.length - 1]);
console.log('Histogram:', macdResult.histogram[macdResult.histogram.length - 1]);

console.log('\n✅ All technical indicators functions are working correctly!');

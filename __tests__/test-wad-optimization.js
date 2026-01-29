"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// WAD模型核心优化测试
const wad_1 = require("./lib/algorithms/wad");
// 测试优化后的衰减权重计算
function testDecayWeightOptimization() {
    console.log('=== 衰减权重计算优化测试 ===');
    const now = Date.now();
    const testTimestamp = now - 86400000; // 一天前
    // 测试当前实现
    const currentResult = (0, wad_1.calculateDecayWeight)(testTimestamp, now, 0.1);
    console.log(`当前实现结果: ${currentResult}`);
    // 测试优化实现
    function optimizedCalculateDecayWeight(timestamp, currentTime, decayRate = 0.1) {
        const timeDiff = currentTime - timestamp;
        const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
        const exponent = -decayRate * daysDiff;
        // 使用快速指数计算
        if (exponent > -1 && exponent < 1) {
            // 泰勒级数近似：e^x ≈ 1 + x + x²/2! + x³/6! + x⁴/24!
            const x2 = exponent * exponent;
            const x3 = x2 * exponent;
            const x4 = x3 * exponent;
            return 1 + exponent + x2 / 2 + x3 / 6 + x4 / 24;
        }
        return Math.exp(exponent);
    }
    const optimizedResult = optimizedCalculateDecayWeight(testTimestamp, now, 0.1);
    console.log(`优化实现结果: ${optimizedResult}`);
    console.log(`误差: ${Math.abs(optimizedResult - currentResult)}`);
    // 性能比较
    const count = 100000;
    const timestamps = Array.from({ length: count }, (_, i) => now - i * 60000);
    const currentStart = performance.now();
    for (const ts of timestamps) {
        (0, wad_1.calculateDecayWeight)(ts, now, 0.1);
    }
    const currentEnd = performance.now();
    console.log(`当前实现耗时: ${currentEnd - currentStart}ms`);
    const optimizedStart = performance.now();
    for (const ts of timestamps) {
        optimizedCalculateDecayWeight(ts, now, 0.1);
    }
    const optimizedEnd = performance.now();
    console.log(`优化实现耗时: ${optimizedEnd - optimizedStart}ms`);
    console.log(`性能提升: ${(currentEnd - currentStart) / (optimizedEnd - optimizedStart)}x`);
}
// 运行测试
testDecayWeightOptimization();

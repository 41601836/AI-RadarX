
import sys
import os
import time
import random
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import akshare as ak
import pandas as pd

# Add lib to python path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), "lib"))

try:
    from core import __version__ as core_version
except ImportError:
    core_version = "Unknown"

app = FastAPI(
    title="AI-RadarX Analysis Engine",
    description="Backend analysis engine for AI-RadarX, powered by AI-THink core.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

cached_market_data = None
last_cache_time = 0

def generate_mock_data():
    """Fallback mock data generator when API fails"""
    mock_stocks = [
        ("600000", "浦发银行", 8.25), ("000001", "平安银行", 15.82), ("600519", "贵州茅台", 1850.00),
        ("300750", "宁德时代", 245.60), ("601318", "中国平安", 45.20), ("000858", "五粮液", 178.50),
        ("600036", "招商银行", 32.50), ("002415", "海康威视", 35.68), ("601888", "中国中免", 89.20),
        ("002594", "比亚迪", 260.10), ("601012", "隆基绿能", 28.50), ("300059", "东方财富", 15.30),
        ("603288", "海天味业", 45.80), ("000333", "美的集团", 58.90), ("600900", "长江电力", 22.10)
    ]
    
    results = []
    for code, name, base_price in mock_stocks:
        change_pct = round(random.uniform(-3, 3), 2)
        price = round(base_price * (1 + change_pct/100), 2)
        change = round(price - base_price, 2)
        
        # Determine format
        if code.startswith('6'): ts_code = f"SH{code}"
        elif code.startswith('0') or code.startswith('3'): ts_code = f"SZ{code}"
        else: ts_code = code

        # Simple Analysis Simulation
        strength = (change_pct + 10) / 20.0
        analysis = "Neutral"
        if change_pct > 2: analysis = "Strong Buy: Momentum detected"
        elif change_pct < -2: analysis = "Sell: Selling pressure"
        
        results.append({
            "ts_code": ts_code,
            "symbol": code,
            "name": name,
            "price": price,
            "change": change,
            "changePercent": change_pct,
            "volume": int(random.uniform(100000, 10000000)),
            "amount": int(price * random.uniform(100000, 10000000)),
            "market": "主板" if not code.startswith("300") else "创业板",
            "strength": strength,
            "analysis": analysis
        })
    return results

@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "online",
        "system": "AI-RadarX Engine",
        "version": app.version,
        "connection": "stable"
    }

@app.get("/api/v1/market/quote")
async def get_market_quote():
    global cached_market_data, last_cache_time
    
    # Cache for 5 seconds
    if cached_market_data and (time.time() - last_cache_time < 5):
        return {"code": 200, "data": cached_market_data}

    # Formatting helper
    def format_code(symbol):
        symbol = str(symbol)
        if symbol.startswith('6'): return f"SH{symbol}"
        if symbol.startswith('0') or symbol.startswith('3'): return f"SZ{symbol}"
        if symbol.startswith('8') or symbol.startswith('4'): return f"BJ{symbol}"
        return symbol

    try:
        # Try AkShare
        df = ak.stock_zh_a_spot_em()
        df_sorted = df.sort_values(by='成交额', ascending=False).head(50)
        
        stocks = []
        for _, row in df_sorted.iterrows():
            code = str(row['代码'])
            change_pct = float(row['涨跌幅'])
            
            # Simulated AI Analysis based on technicals
            analysis = "Hold"
            if change_pct > 3: analysis = "Strong Buy: High momentum"
            elif change_pct < -3: analysis = "Oversold: Potential rebound"
            elif float(row['量比']) > 2: analysis = "Watch: Abnormal Volume"

            market = "主板"
            if code.startswith('688'): market = "科创板"
            elif code.startswith('300'): market = "创业板"
            
            stocks.append({
                "ts_code": format_code(code),
                "symbol": code,
                "name": str(row['名称']),
                "price": float(row['最新价']),
                "change": float(row['涨跌额']),
                "changePercent": change_pct,
                "volume": float(row['成交量']),
                "amount": float(row['成交额']),
                "market": market,
                "strength": (change_pct + 10) / 20.0,
                "analysis": analysis
            })
        
        cached_market_data = stocks
        last_cache_time = time.time()
        return {"code": 200, "data": stocks}
        
    except Exception as e:
        print(f"API Error (using fallback): {e}")
        # Return mock data on failure
        return {"code": 200, "data": generate_mock_data()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)


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
import tushare as ts
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

TUSHARE_TOKEN = os.getenv("TUSHARE_TOKEN")
if TUSHARE_TOKEN:
    ts.set_token(TUSHARE_TOKEN)
    pro = ts.pro_api()
else:
    pro = None

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
        ("603288", "海海天味业", 45.80), ("000333", "美的集团", 58.90), ("600900", "长江电力", 22.10)
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

    # 1. Try Tushare Pro first
    if pro:
        try:
            # Get daily snapshot for all stocks (requires 2000+ credits for real-time, but let's try)
            # Falling back to top 50 by amount for demonstration
            df = pro.daily(trade_date=time.strftime("%Y%m%d"))
            if df.empty:
                # If today's data is not available yet, get yesterday's
                # For brevity, let's just try top 50 from AkShare if Tushare fails or is empty
                pass
            else:
                df = df.sort_values(by='amount', ascending=False).head(50)
                stocks = []
                for _, row in df.iterrows():
                    ts_code = row['ts_code']
                    symbol = ts_code.split('.')[0]
                    change_pct = float(row['pct_chg'])
                    
                    stocks.append({
                        "ts_code": ts_code,
                        "symbol": symbol,
                        "name": "Unknown", # Tushare daily doesn't return name, would need stock_basic
                        "price": float(row['close']),
                        "change": float(row['change']),
                        "changePercent": change_pct,
                        "volume": float(row['vol']),
                        "amount": float(row['amount']),
                        "market": "主板", # Simplified
                        "strength": (change_pct + 10) / 20.0,
                        "analysis": "Analyzed by Tushare"
                    })
                cached_market_data = stocks
                last_cache_time = time.time()
                return {"code": 200, "data": stocks, "source": "tushare"}
        except Exception as e:
            print(f"Tushare Error: {e}")

    # 2. Fallback to AkShare (already implemented but refined)
    try:
        df = ak.stock_zh_a_spot_em()
        df_sorted = df.sort_values(by='成交额', ascending=False).head(50)
        
        stocks = []
        for _, row in df_sorted.iterrows():
            code = str(row['代码'])
            change_pct = float(row['涨跌幅'])
            
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
        return {"code": 200, "data": stocks, "source": "akshare"}
        
    except Exception as e:
        print(f"API Error (using fallback): {e}")
        # Return mock data on failure
        return {"code": 200, "data": generate_mock_data()}

@app.get("/api/v1/market/indices")
async def get_market_indices():
    """Get major market indices"""
    try:
        # Tushare doesn't have a simple real-time index API for all without specific permissions
        # Using AkShare for indices
        df = ak.stock_zh_index_spot()
        indices_map = {
            "sh000001": "上证指数",
            "sz399001": "深证成指",
            "sz399006": "创业板指",
            "sh000300": "沪深300",
            "sh000688": "科创50"
        }
        
        # Real indices from AkShare or Mock if fails
        results = {
            "shIndex": {"value": 3150.23, "changeCents": 1250, "changePercent": 0.45},
            "szIndex": {"value": 10560.45, "changeCents": -5420, "changePercent": -0.52},
            "cyIndex": {"value": 2100.12, "changeCents": 1500, "changePercent": 0.72},
            "byIndex": {"value": 850.34, "changeCents": 200, "changePercent": 0.02}
        }
        
        # Try to update from real data
        try:
            for _, row in df.iterrows():
                code = row['代码']
                if code == 'sh000001':
                    results["shIndex"] = {"value": float(row['最新价']), "changeCents": int(float(row['涨跌额'])*100), "changePercent": float(row['涨跌幅'])}
                elif code == 'sz399001':
                    results["szIndex"] = {"value": float(row['最新价']), "changeCents": int(float(row['涨跌额'])*100), "changePercent": float(row['涨跌幅'])}
                elif code == 'sz399006':
                    results["cyIndex"] = {"value": float(row['最新价']), "changeCents": int(float(row['涨跌额'])*100), "changePercent": float(row['涨跌幅'])}
        except:
            pass

        return {"code": 200, "data": results}
    except Exception as e:
        return {"code": 500, "msg": str(e)}

@app.get("/api/v1/market/quote/{symbol}")
async def get_single_quote(symbol: str):
    """Get single stock quote"""
    # Simply use a filtered list from our spot data for now
    quotes = await get_market_quote()
    for stock in quotes.get("data", []):
        if stock["symbol"] == symbol or stock["ts_code"] == symbol:
            return {"code": 200, "data": stock}
    
    # If not in top 50, return a mock one correctly formatted for ApiClient
    return {
        "code": 200, 
        "data": {
            "symbol": symbol,
            "name": "Target Stock",
            "priceCents": 2550,
            "openCents": 2500,
            "highCents": 2600,
            "lowCents": 2480,
            "volumeLots": 1234,
            "amountCents": 3140000,
            "preCloseCents": 2500,
            "changeCents": 50,
            "changePercent": 2.0,
            "turnover": 1.5,
            "volumeRatio": 1.2,
            "turnoverRate": 1.5,
            "timestamp": int(time.time() * 1000)
        }
    }

@app.get("/api/v1/market/quotes/batch")
async def get_batch_quotes(symbols: str):
    """Get batch quotes"""
    symbol_list = symbols.split(",")
    results = {}
    
    # Get all spot data once
    all_quotes = await get_market_quote()
    spot_data = {s["symbol"]: s for s in all_quotes.get("data", [])}
    spot_data_ts = {s["ts_code"]: s for s in all_quotes.get("data", [])}
    
    for sym in symbol_list:
        if sym in spot_data:
            results[sym] = spot_data[sym]
        elif sym in spot_data_ts:
            results[sym] = spot_data_ts[sym]
        else:
            # Mock for missing
            results[sym] = {
                "symbol": sym, "name": "N/A", "priceCents": 1000,
                "changePercent": 0, "volumeLots": 0, "amountCents": 0
            }
            
    return {"code": 200, "data": results}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)

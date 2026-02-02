"""
AI-RadarX 系统健康检查脚本
快速诊断前后端连接状态和数据流
"""

import requests
import json
from datetime import datetime

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")

def check_backend_health():
    """检查后端健康状态"""
    print_section("后端健康检查")
    try:
        response = requests.get('http://localhost:8080/api/v1/health', timeout=3)
        if response.status_code == 200:
            data = response.json()
            print("✅ 后端服务正常运行")
            print(f"   状态: {data.get('status')}")
            print(f"   系统: {data.get('system')}")
            print(f"   版本: {data.get('version')}")
            return True
        else:
            print(f"❌ 后端响应异常: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 无法连接到后端: {e}")
        return False

def check_market_data():
    """检查市场数据接口"""
    print_section("市场数据检查")
    try:
        response = requests.get('http://localhost:8080/api/v1/market/quote', timeout=5)
        if response.status_code == 200:
            data = response.json()
            stocks = data.get('data', [])
            source = data.get('source', 'unknown')
            
            print(f"✅ 市场数据获取成功")
            print(f"   数据源: {source.upper()}")
            print(f"   股票数量: {len(stocks)}")
            
            if stocks:
                print(f"\n   前3只股票预览:")
                for i, stock in enumerate(stocks[:3], 1):
                    name = stock.get('name', 'N/A')
                    code = stock.get('symbol', 'N/A')
                    price = stock.get('price', 0)
                    change_pct = stock.get('changePercent', 0)
                    print(f"   {i}. {name} ({code}): ¥{price:.2f} ({change_pct:+.2f}%)")
            return True
        else:
            print(f"❌ 数据接口响应异常: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 无法获取市场数据: {e}")
        return False

def check_frontend():
    """检查前端服务"""
    print_section("前端服务检查")
    try:
        response = requests.get('http://localhost:3000', timeout=3)
        if response.status_code == 200:
            print("✅ 前端服务正常运行")
            print(f"   状态码: {response.status_code}")
            print(f"   访问地址: http://localhost:3000")
            return True
        else:
            print(f"❌ 前端响应异常: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 无法连接到前端: {e}")
        return False

def main():
    print("\n" + "🚀 " * 20)
    print("AI-RadarX 系统诊断工具 v1.0")
    print(f"检查时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("🚀 " * 20)
    
    results = {
        'backend': check_backend_health(),
        'market_data': check_market_data(),
        'frontend': check_frontend()
    }
    
    print_section("诊断总结")
    
    all_ok = all(results.values())
    
    if all_ok:
        print("🎉 所有服务运行正常！")
        print("\n📋 下一步操作:")
        print("   1. 打开浏览器访问: http://localhost:3000")
        print("   2. 点击 'ENTER TERMINAL' 进入行情中心")
        print("   3. 测试股票列表和详情页面")
    else:
        print("⚠️  发现以下问题:")
        for service, status in results.items():
            if not status:
                print(f"   ❌ {service} 服务异常")
        print("\n💡 建议:")
        print("   1. 检查服务是否已启动")
        print("   2. 查看终端错误日志")
        print("   3. 重启相关服务")
    
    print("\n" + "="*60 + "\n")

if __name__ == "__main__":
    main()

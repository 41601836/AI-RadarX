// 测试腾讯实时指数API
// 使用Node.js内置的fetch API

async function testTencentIndexAPI() {
  try {
    // 模拟错误：使用不存在的API地址
    const TENCENT_FINANCE_URL = 'http://invalid-api-url.invalid/q=';
    
    // 上证指数和深证成指的代码
    const indexCodes = ['sh000001', 'sz399001'];
    
    // 构建腾讯财经API请求URL
    const url = `${TENCENT_FINANCE_URL}${indexCodes.join(',')}`;
    
    // 发起请求
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'text/plain',
      },
    });
    
    // 检查响应状态
    if (!response.ok) {
      throw new Error(`Tencent Finance API error: ${response.status}`);
    }
    
    // 解析响应数据
    const data = await response.text();
    
    console.log('腾讯实时指数API响应:');
    console.log(data);
    
    // 解析腾讯财经返回的文本数据
    const indices = parseTencentIndexData(data);
    
    console.log('\n解析后的指数数据:');
    console.log(JSON.stringify(indices, null, 2));
    
  } catch (error) {
    console.error('获取实时指数数据失败:', error);
  }
}

/**
 * 解析腾讯财经返回的指数数据
 * @param data 原始文本数据
 * @returns 格式化后的指数数据
 */
function parseTencentIndexData(data) {
  const result = [];
  const lines = data.split(';');
  
  lines.forEach(line => {
    if (!line || !line.startsWith('v_')) return;
    
    try {
      // 提取指数代码和数据
      const [keyPart, valuePart] = line.split('=');
      if (!keyPart || !valuePart) return;
      
      // 提取指数代码
      const symbol = keyPart.substring(2);
      
      // 解析数据部分
      const dataStr = valuePart.replace(/^"|"$/g, '');
      const dataArray = dataStr.split('~');
      
      if (dataArray.length < 30) return;
      
      // 提取关键数据
      const name = dataArray[1];
      const current = parseFloat(dataArray[3]) * 100; // 转换为分
      const preClose = parseFloat(dataArray[4]) * 100;
      const open = parseFloat(dataArray[5]) * 100;
      const high = parseFloat(dataArray[33]) * 100;
      const low = parseFloat(dataArray[34]) * 100;
      const volume = parseInt(dataArray[36]);
      const amount = parseFloat(dataArray[37]) * 1000000; // 转换为分（原数据是万元）
      
      // 计算涨跌额和涨跌幅
      const change = current - preClose;
      const changePercent = parseFloat(dataArray[31]);
      
      // 格式化更新时间
      const updateTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
      
      result.push({
        symbol,
        name,
        current,
        change,
        changePercent,
        open,
        high,
        low,
        volume,
        amount,
        updateTime
      });
    } catch (error) {
      console.error(`解析指数数据失败: ${line}`, error);
    }
  });
  
  return result;
}

// 运行测试
testTencentIndexAPI();

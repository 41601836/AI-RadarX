'use client';

export default function TestPage() {
    return (
        <div className="p-8 text-white">
            <h1 className="text-2xl font-bold mb-4">测试页面</h1>
            <p>如果你能看到这个页面,说明 Next.js 基础架构是正常的。</p>
            <div className="mt-4 p-4 bg-green-500/20 border border-green-500 rounded">
                <p>✓ Next.js 运行正常</p>
                <p>✓ 路由系统正常</p>
                <p>✓ Tailwind CSS 正常</p>
            </div>
        </div>
    );
}

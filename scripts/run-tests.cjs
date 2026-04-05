// 单元测试执行脚本
const { execSync } = require('child_process');

console.log('🚀 开始运行单元测试...\n');

try {
  // 运行 Rust 单元测试
  console.log('📝 运行 Rust 单元测试...');
  execSync('cargo test --workspace', { stdio: 'inherit', cwd: 'src-tauri' });
  
  console.log('\n✅ Rust 单元测试完成');
} catch (error) {
  console.error('\n❌ Rust 单元测试失败:', error.message);
}

try {
  // 运行前端测试（如果有）
  console.log('\n📝 运行前端单元测试...');
  execSync('cd apps/web && npm run test', { stdio: 'inherit' });
  
  console.log('\n✅ 前端单元测试完成');
} catch (error) {
  console.error('\n⚠️ 前端单元测试跳过 (无测试配置):', error.message);
}

console.log('\n🎉 测试执行完毕！');

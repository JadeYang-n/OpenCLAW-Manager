// 批量替换 db::log_audit 调用，添加 signature 参数
const fs = require('fs');
const path = require('path');

const commandsDir = path.join(__dirname, '..', 'src-tauri', 'src', 'commands');
const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.rs'));

let modifiedCount = 0;

files.forEach(file => {
  const filePath = path.join(commandsDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;
  
  // 匹配 db::log_audit 调用但不包含 signature 参数
  // 基本模式：log_audit( &conn, &id, &user_id, ... ) 
  // 需要在最后一个参数后添加 , None
  
  // 处理 multi-line 调用
  const pattern1 = /db::log_audit\(\s*&conn,\s*&(\w+),\s*(&\w+|"\w+"),\s*(&\w+|"\w+"),\s*(&\w+|"\w+"),\s*(&\w+|"\w+"),\s*\)\.?/g;
  content = content.replace(pattern1, match => {
    // 简单替换逻辑
    return match.replace(/\)\.?\s*$/m, ', None).');
  });
  
  // 处理更复杂的多行调用（带','的）
  // 匹配: )\s*\)\.?\s*$/ 使得在最后一个参数后加 , None
  content = content.replace(/db::log_audit\(([\s\S]*?)\\.?\s*$/mg, (match, args) => {
    if (args.includes('signature')) return match; // 已经有 signature 参数
    if (!args.trim().endsWith(')')) return match; // 不是完整的调用
    
    // 移除末尾的 );
    const trimmed = args.replace(/\)\.?\s*$/m, '');
    return `db::log_audit(${trimmed}, None).`;
  });
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ ${file} - modified`);
    modifiedCount++;
  } else {
    console.log(`- ${file} - no changes`);
  }
});

console.log(`\nTotal modified: ${modifiedCount} files`);

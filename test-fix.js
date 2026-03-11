// Test fix_environment command via Tauri IPC
// This script tests if the fix_environment command works correctly

async function testFixCommand() {
  console.log('Testing fix_environment command...');
  
  try {
    // 1. Test Node.js fix
    console.log('Testing Node.js repair...');
    const nodeResult = await window.__TAURI__.invoke('fix_environment', { 
      function_name: 'install_nodejs' 
    });
    console.log('✅ Node.js fix result:', nodeResult);
    
    // 2. Test Docker fix
    console.log('Testing Docker repair...');
    const dockerResult = await window.__TAURI__.invoke('fix_environment', { 
      function_name: 'install_docker' 
    });
    console.log('✅ Docker fix result:', dockerResult);
    
    // 3. Test Git fix
    console.log('Testing Git repair...');
    const gitResult = await window.__TAURI__.invoke('fix_environment', { 
      function_name: 'install_git' 
    });
    console.log('✅ Git fix result:', gitResult);
    
    // 4. Test WSL2 fix
    console.log('Testing WSL2 repair...');
    const wslResult = await window.__TAURI__.invoke('fix_environment', { 
      function_name: 'install_wsl2' 
    });
    console.log('✅ WSL2 fix result:', wslResult);
    
    console.log('\n🎉 All fix commands executed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Wait for Tauri to load
if (window.__TAURI__) {
  testFixCommand();
} else {
  console.log('Waiting for Tauri to load...');
  setTimeout(() => testFixCommand(), 1000);
}

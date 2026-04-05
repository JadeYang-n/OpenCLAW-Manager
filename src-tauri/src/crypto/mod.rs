use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use rand::RngCore;
use std::env;
use std::sync::OnceLock;

/// 加密密钥（32 字节 = 256 位）
/// 优先从环境变量读取，否则使用内存密钥（重启后JWT会失效）
static ENCRYPTION_KEY: OnceLock<[u8; 32]> = OnceLock::new();

fn get_encryption_key() -> &'static [u8; 32] {
    ENCRYPTION_KEY.get_or_init(|| {
        // 优先尝试从环境变量读取（生产环境推荐方式）
        if let Ok(key_base64) = env::var("OPENCLAW_MASTER_KEY") {
            let key_bytes = BASE64.decode(&key_base64)
                .expect("无效的密钥格式：必须是 32 字节的 base64 编码");
            if key_bytes.len() != 32 {
                panic!("密钥长度错误：必须是 32 字节（256 位），当前 {} 字节", key_bytes.len());
            }
            let mut key = [0u8; 32];
            key.copy_from_slice(&key_bytes);
            return key;
        }
        
        // 使用内存密钥（重启后会重置）
        eprintln!("[KEY] 警告：未配置OPENCLAW_MASTER_KEY环境变量，使用内存密钥（重启后JWT会失效）");
        let mut key = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut key);
        key
    })
}

/// 加密数据（AES-256-GCM）
pub fn encrypt(data: &str) -> Result<String, String> {
    let cipher = Aes256Gcm::new_from_slice(get_encryption_key())
        .map_err(|e| format!("初始化加密器失败：{}", e))?;
    
    // 生成随机 nonce（12 字节）
    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    
    // 加密
    let ciphertext = cipher
        .encrypt(nonce, data.as_bytes())
        .map_err(|e| format!("加密失败：{}", e))?;
    
    // 组合 nonce + ciphertext 并 base64 编码
    let mut combined = Vec::with_capacity(nonce_bytes.len() + ciphertext.len());
    combined.extend_from_slice(&nonce_bytes);
    combined.extend_from_slice(&ciphertext);
    
    Ok(BASE64.encode(&combined))
}

/// 解密数据（AES-256-GCM）
pub fn decrypt(encrypted_base64: &str) -> Result<String, String> {
    // base64 解码
    let combined = BASE64
        .decode(encrypted_base64)
        .map_err(|e| format!("base64 解码失败：{}", e))?;
    
    // 分离 nonce 和 ciphertext
    if combined.len() < 12 {
        return Err("加密数据格式错误".to_string());
    }
    
    let nonce_bytes = &combined[..12];
    let ciphertext = &combined[12..];
    
    let cipher = Aes256Gcm::new_from_slice(get_encryption_key())
        .map_err(|e| format!("初始化加密器失败：{}", e))?;
    
    let nonce = Nonce::from_slice(nonce_bytes);
    
    // 解密
    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("解密失败：{}", e))?;
    
    String::from_utf8(plaintext)
        .map_err(|e| format!("UTF-8 转换失败：{}", e))
}

/// 获取主密钥（用于JWT签名等）
pub fn get_master_key() -> &'static [u8; 32] {
    get_encryption_key()
}

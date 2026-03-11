use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use rand::RngCore;

/// 加密密钥（32 字节 = 256 位）
/// TODO: 生产环境应该从环境变量或密钥管理服务获取
const ENCRYPTION_KEY: &[u8; 32] = b"openclaw_manager_master_key_0000";

/// 加密数据（AES-256-GCM）
pub fn encrypt(data: &str) -> Result<String, String> {
    let cipher = Aes256Gcm::new_from_slice(ENCRYPTION_KEY)
        .map_err(|e| format!("初始化加密器失败：{}", e))?;
    
    // 生成随机 nonce（12 字节）
    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
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
    
    let cipher = Aes256Gcm::new_from_slice(ENCRYPTION_KEY)
        .map_err(|e| format!("初始化加密器失败：{}", e))?;
    
    let nonce = Nonce::from_slice(nonce_bytes);
    
    // 解密
    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("解密失败：{}", e))?;
    
    String::from_utf8(plaintext)
        .map_err(|e| format!("UTF-8 转换失败：{}", e))
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_encrypt_decrypt() {
        let original = "test_api_key_123456";
        let encrypted = encrypt(original).unwrap();
        let decrypted = decrypt(&encrypted).unwrap();
        assert_eq!(original, decrypted);
    }
}

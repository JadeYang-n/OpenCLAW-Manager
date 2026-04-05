#!/usr/bin/env node

/**
 * OCM Agent 上报脚本
 * 功能：向 OpenCLAW Manager 上报实例状态、Token用量和Skill元信息
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置文件路径
const CONFIG_FILE = path.join(__dirname, 'config.json');

// 读取配置
function readConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
    return {
        manager_url: 'http://localhost:8080/api/v1',
        instance_id: '',
        instance_token: '',
        heartbeat_interval: 300
    };
}

// 保存配置
function saveConfig(config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// 执行 OpenCLAW Gateway 命令
function executeGatewayCommand(command) {
    try {
        const result = execSync(`openclaw gateway call ${command} --json`, {
            encoding: 'utf8',
            timeout: 5000
        });
        return JSON.parse(result);
    } catch (error) {
        console.error(`执行命令失败: ${command}`, error.message);
        return null;
    }
}

// 发送HTTP请求
async function sendRequest(url, method, data, token) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);
        return await response.json();
    } catch (error) {
        console.error(`请求失败: ${url}`, error.message);
        return null;
    }
}

// 注册到 Manager
async function registerToManager() {
    const config = readConfig();
    
    // 获取实例信息
    const healthInfo = executeGatewayCommand('health');
    if (!healthInfo) {
        console.error('无法获取实例健康状态');
        return false;
    }

    const registerData = {
        name: `OpenCLAW Instance ${Date.now()}`,
        host_ip: '127.0.0.1',
        port: 18789,
        version: healthInfo.version || 'unknown',
        status: healthInfo.status || 'unknown'
    };

    const response = await sendRequest(
        `${config.manager_url}/agent/register`,
        'POST',
        registerData
    );

    if (response && response.success && response.instance_id && response.instance_token) {
        config.instance_id = response.instance_id;
        config.instance_token = response.instance_token;
        saveConfig(config);
        console.log('注册成功:', response.instance_id);
        return true;
    } else {
        console.error('注册失败:', response);
        return false;
    }
}

// 上报心跳
async function reportHeartbeat() {
    const config = readConfig();
    
    if (!config.instance_id || !config.instance_token) {
        if (!await registerToManager()) {
            return false;
        }
    }

    const healthInfo = executeGatewayCommand('health');
    if (!healthInfo) {
        return false;
    }

    const heartbeatData = {
        instance_id: config.instance_id,
        status: healthInfo.status || 'unknown',
        timestamp: new Date().toISOString(),
        version: healthInfo.version || 'unknown',
        uptime: healthInfo.uptime || 0
    };

    const response = await sendRequest(
        `${config.manager_url}/agent/heartbeat`,
        'POST',
        heartbeatData,
        config.instance_token
    );

    if (response && response.success) {
        console.log('心跳上报成功');
        return true;
    } else {
        console.error('心跳上报失败:', response);
        return false;
    }
}

// 上报Token用量
async function reportUsage() {
    const config = readConfig();
    
    if (!config.instance_id || !config.instance_token) {
        return false;
    }

    const statusInfo = executeGatewayCommand('status');
    if (!statusInfo) {
        return false;
    }

    const usageData = [];
    
    if (statusInfo.session_cost_usage) {
        for (const usage of statusInfo.session_cost_usage) {
            usageData.push({
                instance_id: config.instance_id,
                model: usage.model || 'unknown',
                prompt_tokens: usage.prompt_tokens || 0,
                completion_tokens: usage.completion_tokens || 0,
                total_tokens: usage.total_tokens || 0,
                timestamp: new Date().toISOString()
            });
        }
    }

    if (usageData.length > 0) {
        const response = await sendRequest(
            `${config.manager_url}/agent/usage`,
            'POST',
            usageData,
            config.instance_token
        );

        if (response && response.success) {
            console.log('用量上报成功:', usageData.length, '条记录');
            return true;
        } else {
            console.error('用量上报失败:', response);
            return false;
        }
    }

    return true;
}

// 上报Skill元信息
async function reportSkills() {
    const config = readConfig();
    
    if (!config.instance_id || !config.instance_token) {
        return false;
    }

    // 这里需要根据实际情况获取Skill列表
    // 暂时模拟数据
    const skillsData = [
        {
            instance_id: config.instance_id,
            skill_id: 'skill-1',
            name: 'Test Skill',
            version: '1.0.0',
            author: 'User',
            description: 'Test skill',
            timestamp: new Date().toISOString()
        }
    ];

    const response = await sendRequest(
        `${config.manager_url}/agent/skills`,
        'POST',
        skillsData,
        config.instance_token
    );

    if (response && response.success) {
        console.log('Skill上报成功:', skillsData.length, '个Skill');
        return true;
    } else {
        console.error('Skill上报失败:', response);
        return false;
    }
}

// 主函数
async function main() {
    const action = process.argv[2] || 'all';

    switch (action) {
        case 'register':
            await registerToManager();
            break;
        case 'heartbeat':
            await reportHeartbeat();
            break;
        case 'usage':
            await reportUsage();
            break;
        case 'skills':
            await reportSkills();
            break;
        case 'all':
            await reportHeartbeat();
            await reportUsage();
            await reportSkills();
            break;
        default:
            console.log('Usage: node report.js [register|heartbeat|usage|skills|all]');
    }
}

// 运行主函数
main().catch(console.error);
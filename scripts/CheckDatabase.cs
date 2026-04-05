using System;
using System.Data;
using Microsoft.Data.Sqlite;

class Program
{
    static void Main(string[] args)
    {
        string dbPath = args.Length > 0 ? args[0] : "data/ocm.db";
        
        Console.WriteLine($"=== 检查数据库：{dbPath} ===\n");
        
        try
        {
            using var connection = new SqliteConnection($"Data Source={dbPath}");
            connection.Open();
            
            // 检查 api_keys 表
            Console.WriteLine("1. 检查 api_keys 表...");
            var cmd = connection.CreateCommand();
            cmd.CommandText = "SELECT name FROM sqlite_master WHERE type='table' AND name='api_keys';";
            var result = cmd.ExecuteScalar();
            
            if (result != null)
            {
                Console.WriteLine("   ✓ api_keys 表存在\n");
                
                // 显示表结构
                Console.WriteLine("   表结构:");
                cmd.CommandText = "PRAGMA table_info(api_keys);";
                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    Console.WriteLine($"     - {reader["name"]} ({reader["type"]})");
                }
            }
            else
            {
                Console.WriteLine("   ✗ api_keys 表不存在\n");
            }
            
            // 列出所有表
            Console.WriteLine("\n2. 所有数据表:");
            cmd.CommandText = "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;";
            using var allTables = cmd.ExecuteReader();
            while (allTables.Read())
            {
                Console.WriteLine($"   - {allTables["name"]}");
            }
            
            // 检查审计日志
            Console.WriteLine("\n3. 最近的审计日志:");
            cmd.CommandText = "SELECT username, resource, operation, risk_level, result, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 5;";
            using var auditReader = cmd.ExecuteReader();
            while (auditReader.Read())
            {
                Console.WriteLine($"   [{auditReader["created_at"]}] {auditReader["username"]} - {auditReader["operation"]} ({auditReader["risk_level"]})");
            }
            
            connection.Close();
            
            Console.WriteLine("\n=== 检查完成 ===");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"错误：{ex.Message}");
            Environment.Exit(1);
        }
    }
}

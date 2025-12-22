# 日志文件说明

本目录包含应用运行时产生的各种日志文件，用于问题诊断和性能监控。

## 📁 日志文件类型

### 🔧 系统日志
- **`main.log`** - 主要系统事件
  - 服务启动/停止
  - 性能统计信息
  - 系统级别的重要事件

### 🌐 API日志
- **`api.log`** - API请求和响应
  - 所有HTTP请求的详细信息
  - 请求参数和响应数据
  - API执行时间统计

### 💬 聊天日志
- **`chat.log`** - 对话相关事件
  - 用户输入和AI响应
  - 模型调用信息
  - 工具使用记录
  - 上下文管理

### 🔢 Token日志
- **`token.log`** - Token使用统计
  - 输入/输出Token数量
  - 不同模型的Token消耗
  - 成本估算信息

### 🗄️ 数据库日志
- **`database.log`** - 数据库操作
  - 数据库连接和查询
  - 数据创建、更新、删除
  - 数据库错误和性能

### ❌ 错误日志
- **`error.log`** - 错误和异常
  - 详细的错误信息
  - 堆栈跟踪
  - 错误上下文

## 🐛 问题反馈指南

如果遇到问题需要反馈，请提供以下信息：

### 1. 基本信息
- 操作系统版本
- Python版本
- 问题发生的时间
- 具体的操作步骤

### 2. 相关日志
根据问题类型，提供对应的日志文件内容：

**启动问题** → `main.log`
**API调用失败** → `api.log` + `error.log`
**对话异常** → `chat.log` + `error.log`
**数据库问题** → `database.log` + `error.log`
**任何错误** → `error.log`（必需）

### 3. 日志提取方法

#### Windows
```cmd
# 查看最近的错误日志
type logs\error.log | findstr /C:"2025-12-22"

# 复制日志文件
copy logs\error.log error_backup.log
```

#### Linux/Mac
```bash
# 查看最近的错误日志
grep "2025-12-22" logs/error.log

# 复制日志文件
cp logs/error.log error_backup.log
```

### 4. 敏感信息保护

日志系统已自动脱敏以下敏感信息：
- API密钥 → `***HIDDEN***`
- 密码 → `***HIDDEN***`
- Token → `***HIDDEN***`

但请在分享日志前，仍需检查是否包含：
- 个人对话内容
- 私人文档内容
- 其他敏感信息

## 🔧 日志管理

### 清理日志
```bash
# 清空所有日志（保留文件）
echo "" > logs/main.log
echo "" > logs/api.log
echo "" > logs/chat.log
echo "" > logs/token.log
echo "" > logs/database.log
echo "" > logs/error.log
```

### 日志轮转
日志文件会随着使用增长，建议定期备份和清理：

```bash
# 备份当前日志
mkdir logs_backup_$(date +%Y%m%d)
cp logs/*.log logs_backup_$(date +%Y%m%d)/

# 清空当前日志
find logs/ -name "*.log" -exec sh -c 'echo "" > "$1"' _ {} \;
```

## 📊 日志分析

### 常用查询命令

```bash
# 查看今天的错误
grep "$(date +%Y-%m-%d)" logs/error.log

# 统计API调用次数
grep "API请求" logs/api.log | wc -l

# 查看Token使用情况
grep "Token使用" logs/token.log | tail -10

# 查看最近的聊天记录
tail -50 logs/chat.log

# 查看数据库操作
grep "数据库操作" logs/database.log | tail -20
```

## ⚠️ 注意事项

1. **隐私保护**：虽然系统会自动脱敏API密钥等信息，但对话内容仍会被记录
2. **存储空间**：日志文件会随时间增长，建议定期清理
3. **性能影响**：详细的日志记录可能轻微影响性能，如需要可以调整日志级别
4. **备份重要**：在清理日志前，请备份可能需要的历史记录

## 🔗 相关链接

- [问题反馈](https://github.com/your-repo/issues)
- [使用文档](../README.md)
- [快速开始](../QUICKSTART.md)
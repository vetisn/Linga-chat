# 本地 AI 助手 WebUI

一个功能强大、轻量级的本地 AI 助手 Web 界面，支持多模型切换、知识库、MCP 工具调用、联网搜索、图像生成等高级功能。

## ✨ 主要特性

### 🚀 核心功能
- **多 Provider 支持**：兼容 OpenAI API 格式，支持配置多个模型提供商
- **模型能力标记**：为每个模型标记视觉、推理、对话、生图等能力
- **流式输出**：实时流式渲染，支持 Token 统计
- **对话管理**：多对话、置顶、重命名、删除等操作
- **Markdown 渲染**：完整支持 Markdown 语法，代码高亮、表格、列表等
- **数学公式**：支持 LaTeX/KaTeX 数学公式渲染（`$...$` 行内，`$$...$$` 块级）
- **代码复制**：代码块一键复制功能

### 🎨 图像生成
- **生图模式**：支持 DALL-E 等图像生成模型
- **多尺寸选择**：方形、横向、纵向等多种尺寸
- **即时预览**：生成的图片直接显示在对话中

### 🧠 高级功能
- **知识库（RAG）**：文档上传、向量化存储、智能检索、知识图谱
- **MCP 工具调用**：支持 Model Context Protocol 工具集成
- **联网搜索**：支持 DuckDuckGo（免费）和 Tavily 搜索引擎

### 🎯 界面特性
- **响应式设计**：适配桌面和移动设备
- **界面比例调节**：极小/较小/标准/较大/极大 五档可选
- **Token 统计**：实时显示输入/输出 Token 消耗

## 📋 系统要求

- Python 3.8+
- 现代浏览器（Chrome、Firefox、Safari、Edge）

## 🔧 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/vetisn/local-ai-Assistant.git
cd local-ai-Assistant
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 启动应用

```bash
python start.py
```

应用将在 http://localhost:8000 启动。

### 4. 配置 Provider

1. 打开浏览器访问 http://localhost:8000
2. 点击「设置」→「管理 Provider」
3. 添加你的 AI 服务提供商（如 OpenAI、智谱AI、通义千问等）
4. 填写 API Base URL、API Key（可选）、模型列表
5. 为每个模型勾选其支持的能力（视觉、推理、对话、生图）

## 📖 功能说明

### Provider 管理

支持配置多个 API 提供商，方便切换不同的模型服务：

- **API Base URL**：API 服务地址（如 `https://api.openai.com/v1`）
- **API Key**：可选，部分本地服务不需要
- **模型列表**：添加多个模型，为每个模型标记能力
- **模型能力**：
  - 👁 视觉：图片识别
  - 🧠 推理：深度思考
  - 💬 对话：基础聊天
  - 🎨 生图：图像生成

### 图像生成

1. 在 Provider 中配置生图模型（如 dall-e-3），勾选「生图」能力
2. 点击聊天工具栏的 🎨 按钮
3. 选择生图模型和图片尺寸
4. 勾选启用生图模式
5. 输入图片描述，发送即可生成

### 知识库功能

基于向量检索 + 知识图谱的本地知识库：

1. 「设置」→「管理知识库」→ 创建知识库
2. 选择向量模型（支持本地 RAG 或 API 模型）
3. 上传文档（支持 PDF、Word、TXT、Markdown 等）
4. 对话时开启「知识库」开关

**支持的文档格式**：PDF, Word, PPT, Excel, TXT, Markdown, CSV, JSON, XML, HTML

**本地方案**：
- **向量模型**：安装 [mcp-local-rag](https://github.com/shinpr/mcp-local-rag) 可使用本地向量模型
- **图片识别**：安装 [Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki) 可识别扫描件/图片 PDF

### MCP 工具调用

支持 Model Context Protocol 工具集成：

1. 「设置」→「管理 MCP」→ 添加服务器
2. 支持 STDIO（本地命令）和 HTTP（远程服务）两种连接方式
3. 对话时开启「MCP」开关

### 联网搜索

支持实时联网搜索：

- **DuckDuckGo**：免费，无需 API Key，开箱即用
- **Tavily**：可选配置 API Key 获得更好的搜索效果

## 📁 项目结构

```
├── app/                    # 后端代码
│   ├── ai/                 # AI 模块（对话、生图、向量等）
│   ├── core/               # 核心配置
│   ├── db/                 # 数据库模块
│   ├── utils/              # 工具函数
│   └── main.py             # FastAPI 入口
├── frontend/               # 前端代码
│   ├── lib/                # 第三方库（marked、highlight、katex等）
│   ├── index.html          # 主页面
│   ├── script.js           # 主逻辑
│   ├── style.css           # 样式
│   └── markdown.js         # Markdown 渲染
├── logs/                   # 日志目录
├── uploads/                # 上传文件目录
├── start.py                # 启动脚本
└── requirements.txt        # Python 依赖
```

## 🔍 常见问题

### Q: 端口被占用？

修改 `start.py` 中的端口号，或关闭占用 8000 端口的程序。

### Q: API 调用失败？

检查 Provider 配置是否正确，确保 API Base URL 和 API Key 有效。

### Q: 如何重置数据库？

```bash
rm app.db        # 删除数据库文件（Windows: del app.db）
python start.py  # 重启会自动创建新数据库
```

### Q: 如何备份数据？

直接复制 `app.db` 文件即可备份所有对话和设置。

### Q: 生图功能不工作？

1. 确保 Provider 中配置了支持生图的模型（如 dall-e-3）
2. 确保为该模型勾选了「生图」能力
3. 点击 🎨 按钮选择生图模型后再发送

## 🐛 问题反馈

如遇问题，请收集日志后反馈：

```bash
python collect_logs.py
```

或在 Web 界面「设置」→「导出日志」下载日志文件。

## 🛠️ 技术栈

- **后端**：FastAPI + SQLAlchemy + SQLite
- **前端**：原生 JavaScript + Marked.js + Highlight.js + KaTeX
- **HTTP**：httpx（AI API）+ requests（联网搜索）

## 📄 许可证

MIT License

## 📮 联系方式

- GitHub Issues：[提交问题](https://github.com/vetisn/local-ai-Assistant/issues)
- 个人邮箱：2414644363@qq.com

---

**声明**：本项目大部分代码由 AI 辅助完成，仅供学习和研究使用。

// 本地 AI 助手 - JavaScript 主文件

// API基础URL配置
const apiBase = "";

// 常量定义
const TOOL_SETTINGS_KEY = "tool_settings_v1";

// ========== 自定义弹窗组件 ==========
// 弹窗状态
let dialogResolve = null;

// 显示自定义弹窗
function showCustomDialog(options) {
    return new Promise((resolve) => {
        const overlay = document.getElementById("custom-dialog-overlay");
        const dialog = document.getElementById("custom-dialog");
        const iconEl = document.getElementById("custom-dialog-icon");
        const titleEl = document.getElementById("custom-dialog-title");
        const messageEl = document.getElementById("custom-dialog-message");
        const inputWrapper = document.getElementById("custom-dialog-input-wrapper");
        const inputEl = document.getElementById("custom-dialog-input");
        const cancelBtn = document.getElementById("custom-dialog-cancel");
        const confirmBtn = document.getElementById("custom-dialog-confirm");
        
        if (!overlay || !dialog) {
            // 如果弹窗元素不存在，回退到原生弹窗
            if (options.type === "alert") {
                window.alert(options.message);
                resolve(true);
            } else if (options.type === "confirm") {
                resolve(window.confirm(options.message));
            } else if (options.type === "prompt") {
                resolve(window.prompt(options.message, options.defaultValue || ""));
            }
            return;
        }
        
        // 设置图标
        const icons = {
            info: "ℹ️",
            success: "✅",
            warning: "⚠️",
            error: "❌",
            confirm: "❓",
            prompt: "✏️"
        };
        iconEl.textContent = options.icon || icons[options.type] || icons.info;
        
        // 设置标题
        titleEl.textContent = options.title || "提示";
        
        // 设置消息
        messageEl.textContent = options.message || "";
        
        // 设置弹窗类型样式
        dialog.className = "custom-dialog";
        if (options.type === "success") dialog.classList.add("dialog-success");
        else if (options.type === "warning") dialog.classList.add("dialog-warning");
        else if (options.type === "error") dialog.classList.add("dialog-error");
        
        // 设置输入框
        if (options.type === "prompt") {
            inputWrapper.style.display = "block";
            inputEl.value = options.defaultValue || "";
            inputEl.placeholder = options.placeholder || "";
            setTimeout(() => inputEl.focus(), 100);
        } else {
            inputWrapper.style.display = "none";
            inputEl.value = "";
        }
        
        // 设置按钮
        if (options.type === "alert" || options.type === "success" || options.type === "error" || options.type === "warning") {
            cancelBtn.style.display = "none";
            confirmBtn.textContent = options.confirmText || "确定";
        } else {
            cancelBtn.style.display = "inline-block";
            cancelBtn.textContent = options.cancelText || "取消";
            confirmBtn.textContent = options.confirmText || "确定";
        }
        
        // 危险操作样式
        if (options.danger) {
            confirmBtn.classList.add("danger");
        } else {
            confirmBtn.classList.remove("danger");
        }
        
        // 保存 resolve 函数
        dialogResolve = resolve;
        
        // 显示弹窗
        overlay.classList.add("open");
        
        // 聚焦确认按钮（非输入框模式）
        if (options.type !== "prompt") {
            setTimeout(() => confirmBtn.focus(), 100);
        }
    });
}

// 关闭弹窗
function closeCustomDialog(result) {
    const overlay = document.getElementById("custom-dialog-overlay");
    if (overlay) {
        overlay.classList.remove("open");
    }
    if (dialogResolve) {
        dialogResolve(result);
        dialogResolve = null;
    }
}

// 初始化弹窗事件
function initCustomDialog() {
    const overlay = document.getElementById("custom-dialog-overlay");
    const cancelBtn = document.getElementById("custom-dialog-cancel");
    const confirmBtn = document.getElementById("custom-dialog-confirm");
    const inputEl = document.getElementById("custom-dialog-input");
    
    if (!overlay) return;
    
    // 点击遮罩关闭（可选）
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
            closeCustomDialog(null);
        }
    });
    
    // 取消按钮
    if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
            closeCustomDialog(null);
        });
    }
    
    // 确认按钮
    if (confirmBtn) {
        confirmBtn.addEventListener("click", () => {
            const inputWrapper = document.getElementById("custom-dialog-input-wrapper");
            if (inputWrapper && inputWrapper.style.display !== "none") {
                closeCustomDialog(inputEl.value);
            } else {
                closeCustomDialog(true);
            }
        });
    }
    
    // 输入框回车确认
    if (inputEl) {
        inputEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                closeCustomDialog(inputEl.value);
            } else if (e.key === "Escape") {
                closeCustomDialog(null);
            }
        });
    }
    
    // ESC 键关闭
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && overlay.classList.contains("open")) {
            closeCustomDialog(null);
        }
    });
}

// 便捷方法：提示框（替代 alert）
async function showAlert(message, options = {}) {
    return showCustomDialog({
        type: options.type || "info",
        title: options.title || "提示",
        message: message,
        icon: options.icon,
        confirmText: options.confirmText || "确定"
    });
}

// 便捷方法：确认框（替代 confirm）
async function showConfirm(message, options = {}) {
    const result = await showCustomDialog({
        type: "confirm",
        title: options.title || "确认",
        message: message,
        icon: options.icon || "❓",
        confirmText: options.confirmText || "确定",
        cancelText: options.cancelText || "取消",
        danger: options.danger || false
    });
    return result === true;
}

// 便捷方法：输入框（替代 prompt）
async function showPrompt(message, options = {}) {
    return showCustomDialog({
        type: "prompt",
        title: options.title || "请输入",
        message: message,
        icon: options.icon || "✏️",
        defaultValue: options.defaultValue || "",
        placeholder: options.placeholder || "",
        confirmText: options.confirmText || "确定",
        cancelText: options.cancelText || "取消"
    });
}

// 便捷方法：成功提示
async function showSuccess(message, options = {}) {
    return showCustomDialog({
        type: "success",
        title: options.title || "成功",
        message: message,
        icon: "✅",
        confirmText: options.confirmText || "确定"
    });
}

// 便捷方法：错误提示
async function showError(message, options = {}) {
    return showCustomDialog({
        type: "error",
        title: options.title || "错误",
        message: message,
        icon: "❌",
        confirmText: options.confirmText || "确定"
    });
}

// 便捷方法：警告提示
async function showWarning(message, options = {}) {
    return showCustomDialog({
        type: "warning",
        title: options.title || "警告",
        message: message,
        icon: "⚠️",
        confirmText: options.confirmText || "确定"
    });
}

// ========== 全局状态变量 ==========
let currentConversationId = null;
let conversations = [];
let providers = [];
let knowledgeBases = [];
let mcpServers = [];
let selectedWebSource = "duckduckgo";  // 当前选中的搜索源
let currentSettings = {
    autoTitleModel: "current",
    theme: "light",
    layout_scale: "normal",  // 界面比例：xs / sm / normal / lg / xl
    bubble_style: "default",  // 消息布局样式
    context_length: "20",  // 上下文长度
    default_system_prompt: "",  // 默认系统提示词
    search_results_count: "5",  // 搜索结果数量
    show_avatar: true,  // 是否显示头像
    user_avatar: "",  // 用户自定义头像
    availableModels: []
};

let autoTitling = false;

function normalizeApiResponse(json) {
    if (json && typeof json === "object" && "data" in json) {
        return json.data;
    }
    return json;
}

// 去除Markdown符号，转为纯文本
function stripMarkdown(text) {
    if (!text) return '';
    
    return text
        // 移除代码块
        .replace(/```[\s\S]*?```/g, (match) => {
            // 提取代码块内容（去掉语言标识）
            const lines = match.split('\n');
            lines.shift(); // 移除开头的 ```language
            lines.pop();   // 移除结尾的 ```
            return lines.join('\n');
        })
        // 移除行内代码的反引号
        .replace(/`([^`]+)`/g, '$1')
        // 移除粗体
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        // 移除斜体
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/_([^_]+)_/g, '$1')
        // 移除删除线
        .replace(/~~([^~]+)~~/g, '$1')
        // 移除标题符号
        .replace(/^#{1,6}\s+/gm, '')
        // 移除引用符号
        .replace(/^>\s+/gm, '')
        // 移除无序列表符号
        .replace(/^[\*\-\+]\s+/gm, '')
        // 移除有序列表符号
        .replace(/^\d+\.\s+/gm, '')
        // 移除链接，保留文本
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // 移除图片
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
        // 移除水平线
        .replace(/^[-*_]{3,}\s*$/gm, '')
        // 移除多余空行
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

// 流式传输控制变量
let isStreaming = false;
let currentStreamController = null;
let currentStreamingMessageEl = null; // 跟踪当前正在流式输出的消息元素

const autoTitleRequested = new Set();

// 深度思考开关状态
let enableThinking = true; // 默认开启

// 对话文件上传相关
let uploadedFiles = []; // 当前对话已上传的文件列表
let fileUploadInputEl, uploadedFilesPreviewEl, uploadedFilesListEl, dropOverlayEl, mainPanelEl;

// DOM元素变量 - 统一声明
let conversationListEl, chatMessagesEl, chatTitleEl, modelSelectEl, providerSelectEl;
let userInputEl, toggleKnowledgeEl, toggleMcpEl, toggleWebEl, toggleThinkingEl;
let providerModalEl, providerFormEl;
let knowledgeModalEl, kbListEl, kbFormEl, kbSelectEl, kbUploadFormEl, kbUploadStatusEl, embeddingModelSelectEl;
let mcpModalEl, mcpFormEl, settingsModalEl;

// 滚动到底部（带节流）
let _scrollThrottleTimer = null;
function scrollToBottom() {
    if (!_scrollThrottleTimer) {
        _scrollThrottleTimer = setTimeout(() => {
            _scrollThrottleTimer = null;
            if (chatMessagesEl) {
                chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
            }
        }, 50);
    }
}

// ========== 通用自定义下拉框组件 ==========

// 将原生select转换为自定义下拉框
function convertToCustomSelect(selectEl, options = {}) {
    if (!selectEl || selectEl.dataset.customized === 'true') return;
    
    const {
        dropDirection = 'down',  // 'up' 或 'down'
        minWidth = null,
        onSelect = null
    } = options;
    
    // 创建包装器
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select custom-select-generic';
    if (dropDirection === 'up') wrapper.classList.add('drop-up');
    if (minWidth) wrapper.style.minWidth = minWidth;
    
    // 创建触发器
    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    
    const valueEl = document.createElement('span');
    valueEl.className = 'custom-select-value';
    valueEl.textContent = selectEl.options[selectEl.selectedIndex]?.text || '请选择';
    
    const arrow = document.createElement('span');
    arrow.className = 'custom-select-arrow';
    arrow.textContent = '▼';
    
    trigger.appendChild(valueEl);
    trigger.appendChild(arrow);
    
    // 创建下拉列表
    const dropdown = document.createElement('div');
    dropdown.className = 'custom-select-dropdown';
    
    // 创建选项元素
    function createOptionEl(opt) {
        const optionEl = document.createElement('div');
        optionEl.className = 'custom-select-option';
        optionEl.dataset.value = opt.value;
        optionEl.textContent = opt.text;
        if (opt.disabled) {
            optionEl.classList.add('disabled');
        }
        if (opt.value === selectEl.value) {
            optionEl.classList.add('selected');
        }
        
        if (!opt.disabled) {
            optionEl.addEventListener('click', (e) => {
                e.stopPropagation();
                selectEl.value = opt.value;
                selectEl.dispatchEvent(new Event('change', { bubbles: true }));
                valueEl.textContent = opt.text;
                dropdown.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
                optionEl.classList.add('selected');
                wrapper.classList.remove('open');
                if (onSelect) onSelect(opt.value, opt.text);
            });
        }
        
        return optionEl;
    }
    
    // 填充选项（简化版本，直接使用selectEl.options）
    function populateOptions() {
        dropdown.innerHTML = '';
        let lastOptgroup = null;
        
        // 直接遍历所有options
        Array.from(selectEl.options).forEach(opt => {
            // 检查是否在optgroup中
            const parentEl = opt.parentElement;
            const isInGroup = parentEl && parentEl.tagName === 'OPTGROUP';
            
            // 如果是新的optgroup，添加分组标题
            if (isInGroup && parentEl !== lastOptgroup) {
                lastOptgroup = parentEl;
                const groupLabel = document.createElement('div');
                groupLabel.className = 'custom-select-group-label';
                groupLabel.textContent = parentEl.label;
                dropdown.appendChild(groupLabel);
            }
            
            const optionEl = createOptionEl(opt);
            if (isInGroup) {
                optionEl.classList.add('in-group');
            }
            dropdown.appendChild(optionEl);
        });
    }
    
    populateOptions();
    
    // 组装
    wrapper.appendChild(trigger);
    wrapper.appendChild(dropdown);
    
    // 隐藏原始select并插入自定义组件
    selectEl.style.display = 'none';
    selectEl.dataset.customized = 'true';
    selectEl.parentNode.insertBefore(wrapper, selectEl.nextSibling);
    
    // 更新下拉框位置（使用fixed定位避免被overflow裁剪）
    function updateDropdownPosition() {
        const rect = trigger.getBoundingClientRect();
        const dropdownHeight = dropdown.offsetHeight || 200;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        // 判断向上还是向下展开
        let showAbove = dropDirection === 'up';
        if (dropDirection === 'down' && spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
            showAbove = true;
        }
        
        dropdown.style.left = rect.left + 'px';
        dropdown.style.width = rect.width + 'px';
        
        if (showAbove) {
            dropdown.style.top = 'auto';
            dropdown.style.bottom = (window.innerHeight - rect.top + 4) + 'px';
        } else {
            dropdown.style.top = (rect.bottom + 4) + 'px';
            dropdown.style.bottom = 'auto';
        }
    }
    
    // 事件处理
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        // 关闭其他打开的下拉框
        document.querySelectorAll('.custom-select-generic.open').forEach(el => {
            if (el !== wrapper) el.classList.remove('open');
        });
        
        const isOpening = !wrapper.classList.contains('open');
        wrapper.classList.toggle('open');
        
        if (isOpening) {
            updateDropdownPosition();
        }
    });
    
    // 监听原始select变化，同步更新显示
    selectEl.addEventListener('change', () => {
        const selectedOpt = selectEl.options[selectEl.selectedIndex];
        if (selectedOpt) {
            valueEl.textContent = selectedOpt.text;
            dropdown.querySelectorAll('.custom-select-option').forEach(o => {
                o.classList.toggle('selected', o.dataset.value === selectEl.value);
            });
        }
    });
    
    // 提供刷新选项的方法
    wrapper.refreshOptions = () => {
        populateOptions();
        const selectedOpt = selectEl.options[selectEl.selectedIndex];
        if (selectedOpt) {
            valueEl.textContent = selectedOpt.text;
        }
    };
    
    // 存储引用
    selectEl._customWrapper = wrapper;
    
    return wrapper;
}

// 刷新自定义下拉框选项（当原生select选项变化时调用）
function refreshCustomSelect(selectEl) {
    if (selectEl && selectEl._customWrapper && selectEl._customWrapper.refreshOptions) {
        selectEl._customWrapper.refreshOptions();
    }
}

// 初始化设置页面的所有下拉框
function initSettingsCustomSelects() {
    // 主页面的provider下拉框已隐藏，不再创建自定义下拉框
    // const providerSelect = document.getElementById('provider-select');
    // if (providerSelect) {
    //     convertToCustomSelect(providerSelect, { dropDirection: 'up' });
    // }
    
    // 设置页面的下拉框ID列表
    const settingsSelectIds = [
        'layout-scale-select',
        'default-chat-model-select',
        'auto-title-model-select',
        'default-vision-model-select',
        'export-logs-hours',
        'search-default-source',
        'mcp-connection-type'
    ];
    
    settingsSelectIds.forEach(id => {
        const selectEl = document.getElementById(id);
        if (selectEl) {
            convertToCustomSelect(selectEl, { dropDirection: 'down' });
        }
    });
    
    // 知识库相关下拉框
    const kbSelectIds = [
        'kb-select',
        'embedding-model-select',
        'rerank-model-select',
        'kb-vision-model-select'
    ];
    
    kbSelectIds.forEach(id => {
        const selectEl = document.getElementById(id);
        if (selectEl) {
            convertToCustomSelect(selectEl, { dropDirection: 'down' });
        }
    });
}

// 全局点击关闭下拉框
document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-select-generic')) {
        document.querySelectorAll('.custom-select-generic.open').forEach(el => {
            el.classList.remove('open');
        });
    }
});

// 初始化DOM元素引用
function initDOMElements() {
    conversationListEl = document.getElementById("conversation-list");
    chatMessagesEl = document.getElementById("chat-messages");
    chatTitleEl = document.getElementById("chat-title");
    modelSelectEl = document.getElementById("model-select");
    providerSelectEl = document.getElementById("provider-select");
    userInputEl = document.getElementById("user-input");
    toggleKnowledgeEl = document.getElementById("toggle-knowledge");
    toggleMcpEl = document.getElementById("toggle-mcp");
    toggleWebEl = document.getElementById("toggle-web");
    providerModalEl = document.getElementById("provider-modal");
    providerFormEl = document.getElementById("provider-form");
    knowledgeModalEl = document.getElementById("knowledge-modal");
    kbListEl = document.getElementById("kb-list");
    kbFormEl = document.getElementById("kb-form");
    kbSelectEl = document.getElementById("kb-select");
    kbUploadFormEl = document.getElementById("kb-upload-form");
    kbUploadStatusEl = document.getElementById("kb-upload-status");
    embeddingModelSelectEl = document.getElementById("embedding-model-select");
    mcpModalEl = document.getElementById("mcp-modal");
    mcpFormEl = document.getElementById("mcp-form");
    settingsModalEl = document.getElementById("settings-modal");
    
    // 文件上传相关
    fileUploadInputEl = document.getElementById("file-upload-input");
    uploadedFilesPreviewEl = document.getElementById("uploaded-files-preview");
    uploadedFilesListEl = document.getElementById("uploaded-files-list");
    dropOverlayEl = document.getElementById("drop-overlay");
    mainPanelEl = document.getElementById("main-panel");
}
// 输入框自适应高度设置
function setupInputAutoResize() {
    if (userInputEl) {
        userInputEl.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 150) + 'px';
        });
    }
}

// 重置输入框高度
function resetInputHeight() {
    if (userInputEl) {
        userInputEl.style.height = '60px';
    }
}

// 加载工具设置
function loadToolSettings() {
    try {
        const saved = localStorage.getItem(TOOL_SETTINGS_KEY);
        if (saved) {
            const settings = JSON.parse(saved);
            if (toggleKnowledgeEl) toggleKnowledgeEl.checked = settings.knowledge || false;
            if (toggleWebEl) toggleWebEl.checked = settings.web || false;
            
            // MCP 服务器的选中状态已经在 loadMCPServers 中恢复
            // 这里只需要启动选中的服务器
            if (settings.selectedMcpServers && Array.isArray(settings.selectedMcpServers)) {
                // 启动选中的服务器（异步）
                settings.selectedMcpServers.forEach(serverName => {
                    // 检查服务器是否已经运行
                    const server = mcpServers.find(s => s.id === serverName);
                    if (server && !server.running) {
                        startMcpServerIfNeeded(serverName);
                    }
                });
                
                // 更新 MCP 按钮状态
                updateMcpToggleState();
            }
            
            // 更新搜索源
            if (settings.webSearchSource) {
                selectedWebSource = settings.webSearchSource;
                // 更新弹出框中的选中状态
                const webPopup = document.getElementById('web-popup');
                if (webPopup) {
                    webPopup.querySelectorAll('input[name="web-source"]').forEach(radio => {
                        radio.checked = radio.value === selectedWebSource;
                    });
                }
            }
        }
    } catch (e) {
        console.error("加载工具设置失败:", e);
    }
}

// 按需启动 MCP 服务器
async function startMcpServerIfNeeded(serverName) {
    try {
        const res = await fetch(`${apiBase}/mcp/servers/${encodeURIComponent(serverName)}/start`, {
            method: 'POST'
        });
        const data = await res.json();
        if (data.success) {
            // 保存当前选中状态到 localStorage（在刷新列表之前）
            saveToolSettings();
            // 刷新服务器列表以更新状态
            await loadMCPServers();
        } else {
            console.warn(`[MCP] 服务器 ${serverName} 启动失败:`, data.error);
        }
    } catch (e) {
        console.error(`[MCP] 启动服务器 ${serverName} 失败:`, e);
    }
}

// 停止 MCP 服务器
async function stopMcpServer(serverName) {
    try {
        const res = await fetch(`${apiBase}/mcp/servers/${encodeURIComponent(serverName)}/stop`, {
            method: 'POST'
        });
        const data = await res.json();
        if (data.success) {
            // 服务器已停止
        }
    } catch (e) {
        console.error(`[MCP] 停止服务器 ${serverName} 失败:`, e);
    }
}

// 保存工具设置
function saveToolSettings() {
    try {
        // 收集选中的 MCP 服务器名称（不管是否运行中）
        const selectedMcpServers = mcpServers
            .filter(s => s.selected)
            .map(s => s.id);
        
        const settings = {
            knowledge: toggleKnowledgeEl ? toggleKnowledgeEl.checked : false,
            mcp: toggleMcpEl ? toggleMcpEl.checked : false,
            web: toggleWebEl ? toggleWebEl.checked : false,
            webSearchSource: selectedWebSource,
            selectedMcpServers: selectedMcpServers
        };
        localStorage.setItem(TOOL_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
        console.error("保存工具设置失败:", e);
    }
}

// 为所有工具开关添加事件监听器
function setupToolSettingsListeners() {
    // 为工具开关添加监听器
    if (toggleKnowledgeEl) toggleKnowledgeEl.addEventListener('change', saveToolSettings);
    if (toggleMcpEl) toggleMcpEl.addEventListener('change', saveToolSettings);
    if (toggleWebEl) toggleWebEl.addEventListener('change', saveToolSettings);
}
// Modal 控制函数
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add("open");
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove("open");
}

// 设置管理功能
async function loadSettings() {
    try {
        const res = await fetch(`${apiBase}/settings`);
        if (!res.ok) return;
        const settings = await res.json();
        
        // 更新界面比例选择器
        const layoutScaleSelect = document.getElementById("layout-scale-select");
        if (layoutScaleSelect) layoutScaleSelect.value = settings.layout_scale || "normal";
        
        // 更新主题模式
        const currentTheme = settings.theme || "light";
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === currentTheme);
        });
        
        // 更新消息布局样式选择器
        const bubbleStyleSelect = document.getElementById("bubble-style-select");
        if (bubbleStyleSelect) {
            bubbleStyleSelect.value = settings.bubble_style || "default";
        }
        
        // 更新头像显示开关
        const showAvatarToggle = document.getElementById("show-avatar-toggle");
        const avatarUploadRow = document.getElementById("avatar-upload-row");
        const showAvatar = settings.show_avatar !== "false";
        if (showAvatarToggle) {
            showAvatarToggle.checked = showAvatar;
        }
        if (avatarUploadRow) {
            avatarUploadRow.style.display = showAvatar ? 'flex' : 'none';
        }
        
        // 更新头像预览
        if (settings.user_avatar) {
            updateAvatarPreview(settings.user_avatar);
        }
        
        // 更新样式预览
        updateBubblePreview(settings.bubble_style || "default", showAvatar);
        
        // 更新上下文长度选择器
        const contextLengthSelect = document.getElementById("context-length-select");
        if (contextLengthSelect) {
            contextLengthSelect.value = settings.context_length || "20";
        }
        
        // 更新默认系统提示词
        const defaultSystemPrompt = document.getElementById("default-system-prompt");
        if (defaultSystemPrompt) {
            defaultSystemPrompt.value = settings.default_system_prompt || "";
        }
        
        // 更新搜索结果数量
        const searchResultsCount = document.getElementById("search-results-count");
        if (searchResultsCount) {
            searchResultsCount.value = settings.search_results_count || "5";
        }
        
        const searchDefaultSource = document.getElementById("search-default-source");
        if (searchDefaultSource) {
            searchDefaultSource.value = settings.default_search_source || "duckduckgo";
            refreshCustomSelect(searchDefaultSource);
        }
        
        // 显示 Tavily API Key 配置状态
        const tavilyApiKeyInput = document.getElementById("search-tavily-api-key");
        if (tavilyApiKeyInput) {
            if (settings.tavily_api_key) {
                tavilyApiKeyInput.placeholder = settings.tavily_api_key + " (已配置，留空保持不变)";
            } else {
                tavilyApiKeyInput.placeholder = "输入 Tavily API Key";
            }
            tavilyApiKeyInput.value = "";  // 不显示实际值
        }
        
        // 获取所有可用模型
        await loadModels(); // 确保先加载模型
        const modelsRes = await fetch(`${apiBase}/models/all`);
        let availableModels = [];
        if (modelsRes.ok) {
            const modelsData = await modelsRes.json();
            availableModels = modelsData.models || [];
        }
        
        // 更新自动命名模型选择器（按Provider分组，只显示有对话功能的模型）
        const autoTitleSelect = document.getElementById("auto-title-model-select");
        if (autoTitleSelect) {
            autoTitleSelect.innerHTML = "";
            
            // 添加默认选项
            const currentOpt = document.createElement("option");
            currentOpt.value = "current";
            currentOpt.textContent = "使用当前对话模型";
            autoTitleSelect.appendChild(currentOpt);
            
            // 按Provider分组添加模型（只显示有对话功能的）
            const modelsData = await fetch(`${apiBase}/models/all`).then(r => r.json());
            const providers = modelsData.providers || [];
            const modelsNamesMap = modelsData.models_names || {};
            const modelsCapsMap = modelsData.models_caps || {};
            
            providers.forEach(provider => {
                // 获取该Provider的所有模型（包括默认模型）
                let providerModels = provider.models || [];
                if (provider.default_model && !providerModels.includes(provider.default_model)) {
                    providerModels = [provider.default_model, ...providerModels];
                }
                
                // 过滤只有对话功能的模型
                const chatModels = providerModels.filter(model => {
                    const caps = modelsCapsMap[model];
                    // 如果没有配置功能信息，默认认为有对话功能
                    return !caps || caps.chat;
                });
                
                if (chatModels.length > 0) {
                    const optgroup = document.createElement("optgroup");
                    optgroup.label = provider.name;
                    
                    chatModels.forEach(model => {
                        const opt = document.createElement("option");
                        opt.value = model;
                        // 优先使用自定义名称
                        const displayName = modelsNamesMap[model] || model;
                        opt.textContent = displayName;
                        optgroup.appendChild(opt);
                    });
                    
                    autoTitleSelect.appendChild(optgroup);
                }
            });
            
            autoTitleSelect.value = settings.auto_title_model || "current";
            refreshCustomSelect(autoTitleSelect);
        }
        
        // 加载视觉模型
        await loadVisionModels();
        
        // 更新默认对话模型选择器（按Provider分组，只显示有对话或生图功能的模型）
        const defaultChatModelSelect = document.getElementById("default-chat-model-select");
        if (defaultChatModelSelect) {
            defaultChatModelSelect.innerHTML = "";
            
            // 添加特殊选项
            const rememberOpt = document.createElement("option");
            rememberOpt.value = "remember_last";
            rememberOpt.textContent = "记忆上次选择";
            defaultChatModelSelect.appendChild(rememberOpt);
            
            const defaultOpt = document.createElement("option");
            defaultOpt.value = "";
            defaultOpt.textContent = "使用 Provider 默认模型";
            defaultChatModelSelect.appendChild(defaultOpt);
            
            // 按Provider分组添加模型（只显示有对话或生图功能的）
            const chatModelData = await fetch(`${apiBase}/models/all`).then(r => r.json());
            const chatProviders = chatModelData.providers || [];
            const chatModelsNamesMap = chatModelData.models_names || {};
            const chatModelsCapsMap = chatModelData.models_caps || {};
            
            chatProviders.forEach(provider => {
                let providerModels = provider.models || [];
                if (provider.default_model && !providerModels.includes(provider.default_model)) {
                    providerModels = [provider.default_model, ...providerModels];
                }
                
                // 过滤：只显示有对话或生图功能的模型
                const filteredModels = providerModels.filter(model => {
                    const caps = chatModelsCapsMap[model];
                    // 如果没有配置功能信息，默认认为有对话功能
                    return !caps || caps.chat || caps.image_gen;
                });
                
                if (filteredModels.length > 0) {
                    const optgroup = document.createElement("optgroup");
                    optgroup.label = provider.name;
                    
                    filteredModels.forEach(model => {
                        const opt = document.createElement("option");
                        opt.value = model;
                        const displayName = chatModelsNamesMap[model] || model;
                        opt.textContent = displayName;
                        optgroup.appendChild(opt);
                    });
                    
                    defaultChatModelSelect.appendChild(optgroup);
                }
            });
            
            // 设置当前值，默认为 remember_last
            defaultChatModelSelect.value = settings.default_chat_model || "remember_last";
            refreshCustomSelect(defaultChatModelSelect);
        }
        
        // 应用设置
        applySettings(settings);
        currentSettings = {...settings, available_models: availableModels};
        
        // 设置搜索源默认值
        if (settings.default_search_source) {
            selectedWebSource = settings.default_search_source;
        }
    } catch(e) { 
        console.error("加载设置失败:", e); 
    }
}

function applySettings(settings) {
    // 应用界面比例
    if (settings.layout_scale) {
        currentSettings.layout_scale = settings.layout_scale;
        document.body.setAttribute('data-layout-scale', settings.layout_scale);
    }
    
    // 应用主题模式
    const theme = settings.theme || "light";
    currentSettings.theme = theme;
    document.body.setAttribute('data-theme', theme);
    // 缓存到localStorage
    try {
        localStorage.setItem('linga_theme', theme);
    } catch (e) {}
    
    // 应用气泡样式
    const bubbleStyle = settings.bubble_style || "default";
    currentSettings.bubble_style = bubbleStyle;
    document.body.setAttribute('data-bubble-style', bubbleStyle);
    // 缓存到localStorage
    try {
        localStorage.setItem('linga_bubble_style', bubbleStyle);
    } catch (e) {}
    
    // 应用头像显示设置
    const showAvatar = settings.show_avatar !== "false";
    currentSettings.show_avatar = showAvatar;
    document.body.setAttribute('data-show-avatar', showAvatar ? 'true' : 'false');
    try {
        localStorage.setItem('linga_show_avatar', showAvatar ? 'true' : 'false');
    } catch (e) {}
    
    // 应用用户头像
    if (settings.user_avatar) {
        currentSettings.user_avatar = settings.user_avatar;
        try {
            localStorage.setItem('linga_user_avatar', settings.user_avatar);
        } catch (e) {}
    }
    
    // 应用上下文长度
    currentSettings.context_length = settings.context_length || "20";
    
    // 应用默认系统提示词
    currentSettings.default_system_prompt = settings.default_system_prompt || "";
    
    // 应用搜索结果数量
    currentSettings.search_results_count = settings.search_results_count || "5";
}

// 更新消息样式预览
function updateBubblePreview(style, showAvatar = null) {
    const preview = document.getElementById("bubble-preview");
    if (preview) {
        preview.setAttribute('data-style', style);
        if (showAvatar !== null) {
            preview.setAttribute('data-show-avatar', showAvatar ? 'true' : 'false');
        }
    }
}

// 更新头像预览
function updateAvatarPreview(avatarData) {
    const previewEl = document.getElementById("user-avatar-preview");
    if (previewEl) {
        if (avatarData) {
            previewEl.innerHTML = `<img src="${avatarData}" alt="用户头像">`;
        } else {
            previewEl.innerHTML = '<span class="avatar-placeholder">👤</span>';
        }
    }
    
    // 同时更新预览区域的用户头像
    const previewUserAvatar = document.querySelector('.preview-user-avatar');
    if (previewUserAvatar) {
        if (avatarData) {
            previewUserAvatar.innerHTML = `<img src="${avatarData}" alt="用户头像" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        } else {
            previewUserAvatar.textContent = '👤';
        }
    }
}

// 初始化设置页面导航
function initSettingsNavigation() {
    const navItems = document.querySelectorAll('.settings-nav-item');
    const panels = document.querySelectorAll('.settings-panel');
    
    navItems.forEach(item => {
        item.addEventListener('click', async () => {
            const tab = item.dataset.tab;
            
            // 更新导航项状态
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // 更新面板显示
            panels.forEach(panel => {
                panel.classList.toggle('active', panel.id === `settings-panel-${tab}`);
            });
            
            // 根据选中的面板加载相应数据
            if (tab === 'provider') {
                await loadProviders();
                renderProviderListInline();
            } else if (tab === 'knowledge') {
                await loadKnowledgeBases();
                await loadEmbeddingModels();
                renderKnowledgeBaseListInline();
            } else if (tab === 'mcp') {
                await loadMCPServers();
                renderMCPServerListInline();
            }
        });
    });
}

// 初始化设置页面事件
function initSettingsEvents() {
    // 主题切换按钮
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const theme = btn.dataset.theme;
            
            // 更新按钮状态
            document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // 应用主题
            document.body.setAttribute('data-theme', theme);
            currentSettings.theme = theme;
            
            // 缓存到localStorage（用于下次加载时立即应用，避免闪烁）
            try {
                localStorage.setItem('linga_theme', theme);
            } catch (e) {}
            
            // 保存设置到服务器
            await saveSettingItem("theme", theme);
        });
    });
    
    // 消息布局样式选择器
    const bubbleStyleSelect = document.getElementById("bubble-style-select");
    if (bubbleStyleSelect) {
        bubbleStyleSelect.addEventListener("change", async (e) => {
            const style = e.target.value;
            
            // 更新预览
            updateBubblePreview(style);
            
            // 应用样式
            document.body.setAttribute('data-bubble-style', style);
            currentSettings.bubble_style = style;
            
            // 缓存到localStorage
            try {
                localStorage.setItem('linga_bubble_style', style);
            } catch (e) {}
            
            // 保存设置到服务器
            await saveSettingItem("bubble_style", style);
        });
    }
    
    // 头像显示开关
    const showAvatarToggle = document.getElementById("show-avatar-toggle");
    const avatarUploadRow = document.getElementById("avatar-upload-row");
    if (showAvatarToggle) {
        // 初始化状态
        const savedShowAvatar = currentSettings.show_avatar !== false;
        showAvatarToggle.checked = savedShowAvatar;
        if (avatarUploadRow) {
            avatarUploadRow.style.display = savedShowAvatar ? 'flex' : 'none';
        }
        updateBubblePreview(currentSettings.bubble_style || 'default', savedShowAvatar);
        
        showAvatarToggle.addEventListener("change", async (e) => {
            const showAvatar = e.target.checked;
            
            // 显示/隐藏头像上传行
            if (avatarUploadRow) {
                avatarUploadRow.style.display = showAvatar ? 'flex' : 'none';
            }
            
            // 更新预览
            updateBubblePreview(currentSettings.bubble_style || 'default', showAvatar);
            
            // 应用设置
            document.body.setAttribute('data-show-avatar', showAvatar ? 'true' : 'false');
            currentSettings.show_avatar = showAvatar;
            
            // 缓存到localStorage
            try {
                localStorage.setItem('linga_show_avatar', showAvatar ? 'true' : 'false');
            } catch (e) {}
            
            // 保存设置到服务器
            await saveSettingItem("show_avatar", showAvatar ? "true" : "false");
        });
    }
    
    // 头像上传
    const avatarUploadInput = document.getElementById("avatar-upload-input");
    if (avatarUploadInput) {
        avatarUploadInput.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            // 验证文件类型
            if (!file.type.startsWith('image/')) {
                await showAlert('请选择图片文件', { type: 'warning' });
                return;
            }
            
            // 验证文件大小（最大1MB）
            if (file.size > 1024 * 1024) {
                await showAlert('图片大小不能超过1MB', { type: 'warning' });
                return;
            }
            
            // 读取并压缩图片
            const reader = new FileReader();
            reader.onload = async (event) => {
                const img = new Image();
                img.onload = async () => {
                    // 压缩图片到64x64
                    const canvas = document.createElement('canvas');
                    const size = 64;
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext('2d');
                    
                    // 居中裁剪
                    const minDim = Math.min(img.width, img.height);
                    const sx = (img.width - minDim) / 2;
                    const sy = (img.height - minDim) / 2;
                    ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
                    
                    const avatarData = canvas.toDataURL('image/jpeg', 0.8);
                    
                    // 更新预览
                    updateAvatarPreview(avatarData);
                    
                    // 保存设置
                    currentSettings.user_avatar = avatarData;
                    try {
                        localStorage.setItem('linga_user_avatar', avatarData);
                    } catch (e) {}
                    
                    await saveSettingItem("user_avatar", avatarData);
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }
    
    // 重置头像按钮
    const avatarResetBtn = document.getElementById("avatar-reset-btn");
    if (avatarResetBtn) {
        avatarResetBtn.addEventListener("click", async () => {
            // 清除头像
            updateAvatarPreview(null);
            currentSettings.user_avatar = "";
            try {
                localStorage.removeItem('linga_user_avatar');
            } catch (e) {}
            
            await saveSettingItem("user_avatar", "");
        });
    }
    
    // 上下文长度选择器
    const contextLengthSelect = document.getElementById("context-length-select");
    if (contextLengthSelect) {
        contextLengthSelect.addEventListener("change", async (e) => {
            const length = e.target.value;
            currentSettings.context_length = length;
            await saveSettingItem("context_length", length);
        });
    }
    
    // 默认系统提示词
    const defaultSystemPrompt = document.getElementById("default-system-prompt");
    if (defaultSystemPrompt) {
        // 使用防抖保存
        let promptSaveTimeout;
        defaultSystemPrompt.addEventListener("input", (e) => {
            clearTimeout(promptSaveTimeout);
            promptSaveTimeout = setTimeout(async () => {
                const prompt = e.target.value;
                currentSettings.default_system_prompt = prompt;
                await saveSettingItem("default_system_prompt", prompt);
            }, 500);
        });
    }
    
    // 搜索结果数量
    const searchResultsCount = document.getElementById("search-results-count");
    if (searchResultsCount) {
        searchResultsCount.addEventListener("change", async (e) => {
            const count = e.target.value;
            currentSettings.search_results_count = count;
            await saveSettingItem("search_results_count", count);
        });
    }
    
    // 重置设置按钮
    const resetSettingsBtn = document.getElementById("reset-settings-btn");
    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener("click", async () => {
            const confirmed = await showConfirm("此操作将恢复所有设置为默认值，但不会删除对话记录和知识库。", { 
                title: "确定要重置所有设置吗？",
                danger: true,
                confirmText: "重置"
            });
            if (!confirmed) {
                return;
            }
            
            try {
                const res = await fetch(`${apiBase}/settings/reset`, { method: "POST" });
                if (res.ok) {
                    await showSuccess("设置已重置，页面将刷新");
                    window.location.reload();
                } else {
                    await showError("重置设置失败");
                }
            } catch (e) {
                console.error("重置设置失败:", e);
                await showError("重置设置失败: " + e.message);
            }
        });
    }
}

// 数据加载函数
let modelsCaps = {};  // 存储模型功能信息
let modelsNames = {};  // 存储模型自定义显示名称
let modelsProviders = [];  // 存储Provider信息用于分组显示

async function loadModels() {
    try {
        const res = await fetch(`${apiBase}/models/all`);
        if (!res.ok) return;
        const raw = await res.json();
        const data = normalizeApiResponse(raw) || {};
        
        if (!modelSelectEl) {
            console.warn("modelSelectEl not found, skipping loadModels");
            return;
        }
        
        // 保存模型功能信息和自定义名称
        modelsCaps = data.models_caps || {};
        modelsNames = data.models_names || {};
        modelsProviders = data.providers || [];
        
        // 保存当前选择的模型（如果有）
        const currentSelectedModel = modelSelectEl.value;
        
        // 更新隐藏的原生 select（用于表单提交等）
        modelSelectEl.innerHTML = "";
        const models = data.models || [];
        models.forEach(m => {
            const opt = document.createElement("option");
            opt.value = m;
            const displayName = modelsNames[m] || m;
            opt.textContent = displayName + (m === data.default ? " (默认)" : "");
            modelSelectEl.appendChild(opt);
        });
        
        // 恢复之前选择的模型，如果不存在则使用默认值
        if (currentSelectedModel && models.includes(currentSelectedModel)) {
            modelSelectEl.value = currentSelectedModel;
        } else if (data.default) {
            modelSelectEl.value = data.default;
        }
        
        // 更新自定义下拉组件（按Provider分组）
        updateCustomModelSelect(models, data.default);
        
        // 更新模型功能标识（显示在选择框外）
        updateModelCapsBadge();
        
        // 添加模型选择变化监听
        modelSelectEl.removeEventListener("change", updateModelCapsBadge);
        modelSelectEl.addEventListener("change", updateModelCapsBadge);
        
        // 模型变化时也更新视觉识别开关
        modelSelectEl.removeEventListener("change", updateVisionToggleVisibility);
        modelSelectEl.addEventListener("change", updateVisionToggleVisibility);
    } catch(e) { console.error(e); }
}

// 收藏模型的缓存
let favoriteModelsCache = null;

// 获取收藏的模型列表（从数据库）
async function getFavoriteModels() {
    // 如果有缓存，直接返回
    if (favoriteModelsCache !== null) {
        return favoriteModelsCache;
    }
    
    try {
        const res = await fetch(`${apiBase}/settings/favorite-models`);
        if (res.ok) {
            const data = await res.json();
            favoriteModelsCache = data.favorites || [];
            return favoriteModelsCache;
        }
    } catch (e) {
        console.error("获取收藏模型失败:", e);
    }
    return [];
}

// 保存收藏的模型列表（到数据库）
async function saveFavoriteModels(favorites) {
    try {
        const formData = new FormData();
        formData.append("favorites", JSON.stringify(favorites));
        
        const res = await fetch(`${apiBase}/settings/favorite-models`, {
            method: "POST",
            body: formData
        });
        
        if (res.ok) {
            favoriteModelsCache = favorites;
            return true;
        }
    } catch (e) {
        console.error("保存收藏模型失败:", e);
    }
    return false;
}

// 切换模型收藏状态
async function toggleModelFavorite(modelId, event) {
    event.stopPropagation();
    
    const favorites = await getFavoriteModels();
    const index = favorites.indexOf(modelId);
    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push(modelId);
    }
    
    await saveFavoriteModels(favorites);
    // 重新渲染下拉框
    loadModels();
}

// 更新自定义模型下拉组件（按Provider分组，只显示有对话功能的模型，收藏的模型在最上面）
async function updateCustomModelSelect(models, defaultModel) {
    const dropdown = document.getElementById("model-select-dropdown");
    const trigger = document.getElementById("model-select-trigger");
    const valueEl = trigger?.querySelector(".custom-select-value");
    
    if (!dropdown || !trigger || !valueEl) return;
    
    dropdown.innerHTML = "";
    
    if (!models || models.length === 0) {
        valueEl.textContent = "未配置";
        return;
    }
    
    const favorites = await getFavoriteModels();
    
    // 过滤有对话功能的模型
    const filterChatModels = (modelList) => {
        return modelList.filter(m => {
            const caps = modelsCaps[m];
            // 如果没有配置功能信息，默认认为有对话功能
            return !caps || caps.chat;
        });
    };
    
    // 创建模型选项元素的函数
    const createModelOption = (m, isFavorite) => {
        const displayName = modelsNames[m] || m;
        const caps = modelsCaps[m] || {};
        
        const optionEl = document.createElement("div");
        optionEl.className = "custom-select-option";
        optionEl.dataset.value = m;
        
        // 收藏按钮
        const favBtn = document.createElement("span");
        favBtn.className = "model-favorite-btn" + (isFavorite ? " favorited" : "");
        favBtn.innerHTML = isFavorite ? "⭐" : "☆";
        favBtn.title = isFavorite ? "取消收藏" : "收藏";
        favBtn.addEventListener("click", (e) => toggleModelFavorite(m, e));
        optionEl.appendChild(favBtn);
        
        // 模型名称
        const nameEl = document.createElement("span");
        nameEl.className = "option-name";
        nameEl.textContent = displayName + (m === defaultModel ? " (默认)" : "");
        nameEl.style.flex = "1";
        optionEl.appendChild(nameEl);
        
        // 功能图标（右对齐）
        const capsEl = document.createElement("span");
        capsEl.className = "option-caps";
        if (caps.vision) capsEl.innerHTML += '<span title="视觉">👁</span>';
        if (caps.reasoning) capsEl.innerHTML += '<span title="推理">🧠</span>';
        if (caps.chat) capsEl.innerHTML += '<span title="对话">💬</span>';
        if (caps.image_gen) capsEl.innerHTML += '<span title="生图">🎨</span>';
        optionEl.appendChild(capsEl);
        
        // 点击选择
        optionEl.addEventListener("click", () => {
            selectModelOption(m, displayName + (m === defaultModel ? " (默认)" : ""));
        });
        
        return optionEl;
    };
    
    // 先显示收藏的模型
    if (favorites.length > 0) {
        const favoriteChatModels = filterChatModels(favorites.filter(m => models.includes(m)));
        if (favoriteChatModels.length > 0) {
            const favHeader = document.createElement("div");
            favHeader.className = "custom-select-favorites-header";
            favHeader.textContent = "⭐ 收藏";
            dropdown.appendChild(favHeader);
            
            favoriteChatModels.forEach(m => {
                dropdown.appendChild(createModelOption(m, true));
            });
        }
    }
    
    // 按Provider分组显示
    if (modelsProviders && modelsProviders.length > 0) {
        modelsProviders.forEach(provider => {
            // 获取该Provider的所有模型（包括默认模型）
            let providerModels = provider.models || [];
            if (provider.default_model && !providerModels.includes(provider.default_model)) {
                providerModels = [provider.default_model, ...providerModels];
            }
            
            // 过滤只有对话功能的模型
            const chatModels = filterChatModels(providerModels);
            if (chatModels.length === 0) return;
            
            // 创建分组标题
            const groupHeader = document.createElement("div");
            groupHeader.className = "custom-select-group-header";
            groupHeader.textContent = provider.name;
            dropdown.appendChild(groupHeader);
            
            // 添加该Provider下的模型
            chatModels.forEach(m => {
                const isFavorite = favorites.includes(m);
                dropdown.appendChild(createModelOption(m, isFavorite));
            });
        });
    } else {
        // 没有Provider信息时，直接显示所有有对话功能的模型
        const chatModels = filterChatModels(models);
        chatModels.forEach(m => {
            const isFavorite = favorites.includes(m);
            dropdown.appendChild(createModelOption(m, isFavorite));
        });
    }
    
    // 设置当前选中值
    const currentValue = modelSelectEl?.value || defaultModel;
    if (currentValue) {
        const currentDisplayName = modelsNames[currentValue] || currentValue;
        valueEl.textContent = currentDisplayName + (currentValue === defaultModel ? " (默认)" : "");
        // 标记选中项
        dropdown.querySelectorAll(".custom-select-option").forEach(opt => {
            opt.classList.toggle("selected", opt.dataset.value === currentValue);
        });
    }
}

// 选择模型选项
function selectModelOption(value, displayText) {
    const wrapper = document.getElementById("model-select-wrapper");
    const trigger = document.getElementById("model-select-trigger");
    const dropdown = document.getElementById("model-select-dropdown");
    const valueEl = trigger?.querySelector(".custom-select-value");
    
    if (modelSelectEl) {
        modelSelectEl.value = value;
        modelSelectEl.dispatchEvent(new Event("change"));
    }
    
    if (valueEl) {
        valueEl.textContent = displayText;
    }
    
    // 更新选中状态
    dropdown?.querySelectorAll(".custom-select-option").forEach(opt => {
        opt.classList.toggle("selected", opt.dataset.value === value);
    });
    
    // 关闭下拉框
    wrapper?.classList.remove("open");
    
    // 更新功能标识
    updateModelCapsBadge();
    
    // 保存用户选择的模型到数据库（用于记忆功能）
    if (value) {
        saveSettingItem("last_selected_model", value + "|" + displayText);
    }
}

// 初始化自定义下拉组件事件
function initCustomModelSelect() {
    const wrapper = document.getElementById("model-select-wrapper");
    const trigger = document.getElementById("model-select-trigger");
    
    if (!wrapper || !trigger) return;
    
    // 点击触发器切换下拉框
    trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        wrapper.classList.toggle("open");
    });
    
    // 点击外部关闭下拉框
    document.addEventListener("click", (e) => {
        if (!wrapper.contains(e.target)) {
            wrapper.classList.remove("open");
        }
    });
}

// 更新模型功能标识
function updateModelCapsBadge() {
    const badge = document.getElementById("model-caps-badge");
    if (!badge || !modelSelectEl) return;
    const selectedModel = modelSelectEl.value;
    
    // 如果没有选择模型，清空标识
    if (!selectedModel) {
        badge.innerHTML = "";
        return;
    }
    
    // 调试：检查 modelsCaps 是否包含当前模型
    const caps = modelsCaps[selectedModel] || {};
    
    let html = "";
    if (caps.vision) {
        html += '<span class="cap-icon active" title="视觉">👁</span>';
    }
    if (caps.reasoning) {
        html += '<span class="cap-icon active" title="推理">🧠</span>';
    }
    if (caps.chat) {
        html += '<span class="cap-icon active" title="对话">💬</span>';
    }
    if (caps.image_gen) {
        html += '<span class="cap-icon active" title="生图">🎨</span>';
    }
    
    // 如果没有任何功能标识，显示默认的对话图标
    if (!html && selectedModel) {
        html = '<span class="cap-icon" title="对话">💬</span>';
    }
    
    badge.innerHTML = html;
    
    // 更新深度思考开关的显示状态
    updateThinkingToggleVisibility(caps.reasoning);
    
    // 更新生图按钮的显示状态（只有生图模型才显示）
    updateImageGenToggleVisibility(caps.image_gen);
}

// 更新生图按钮的显示状态
function updateImageGenToggleVisibility(hasImageGen) {
    const imageGenWrapper = document.getElementById("image-gen-toggle-wrapper");
    const imageGenCheckbox = document.getElementById("toggle-image-gen");
    if (imageGenWrapper) {
        imageGenWrapper.style.display = hasImageGen ? "flex" : "none";
        // 如果模型不支持生图，取消勾选
        if (!hasImageGen && imageGenCheckbox) {
            imageGenCheckbox.checked = false;
        }
    }
}

// 更新深度思考开关的显示状态
function updateThinkingToggleVisibility(hasReasoning) {
    const thinkingWrapper = document.getElementById("thinking-toggle-wrapper");
    if (thinkingWrapper) {
        thinkingWrapper.style.display = hasReasoning ? "flex" : "none";
    }
}

// 初始化深度思考开关
function initThinkingToggle() {
    toggleThinkingEl = document.getElementById("toggle-thinking");
    if (!toggleThinkingEl) return;
    
    // 从数据库设置恢复状态
    const saved = currentSettings.enable_thinking;
    enableThinking = saved !== undefined && saved !== null ? saved === "true" : true; // 默认开启
    toggleThinkingEl.checked = enableThinking;
    
    // 监听变化
    toggleThinkingEl.addEventListener("change", () => {
        enableThinking = toggleThinkingEl.checked;
        saveSettingItem("enable_thinking", String(enableThinking));
    });
}

async function loadConversations() {
    try {
        const res = await fetch(`${apiBase}/conversations`);
        if (!res.ok) return;
        const raw = await res.json();
        const data = normalizeApiResponse(raw);
        conversations = Array.isArray(data) ? data : (data?.conversations || []);
        renderConversationList();
    } catch(e) { console.error(e); }
}

async function loadProviders() {
    try {
        const res = await fetch(`${apiBase}/providers`);
        if (!res.ok) return;
        const raw = await res.json();
        providers = normalizeApiResponse(raw) || [];
        renderProviderSelect();
    } catch(e) { console.error(e); }
}


function renderProviderSelect() {
    if (!providerSelectEl) return;
    
    const currentVal = providerSelectEl.value;
    providerSelectEl.innerHTML = "";
    
    if (providers.length === 0) {
        providerSelectEl.innerHTML = `<option value="">未配置</option>`;
        refreshCustomSelect(providerSelectEl);
        return;
    }
    
    providers.forEach(p => {
        const opt = document.createElement("option");
        opt.value = String(p.id);
        opt.textContent = p.name;
        providerSelectEl.appendChild(opt);
    });
    
    // 如果之前有选中值则保持，否则选中第一个
    if (currentVal && providers.some(p => String(p.id) === currentVal)) {
        providerSelectEl.value = currentVal;
    } else if (providers.length > 0) {
        providerSelectEl.value = String(providers[0].id);
    }
    refreshCustomSelect(providerSelectEl);
}

async function loadKnowledgeBases() {
    try {
        const res = await fetch(`${apiBase}/knowledge/bases`);
        if (!res.ok) return;
        const raw = await res.json();
        knowledgeBases = normalizeApiResponse(raw) || [];
    } catch(e) { console.error(e); }
}

async function loadMCPServers() {
    try {
        const res = await fetch(`${apiBase}/mcp/servers`);
        if (!res.ok) return;
        const data = await res.json();
        const servers = data.servers || [];
        
        // 从 localStorage 获取之前选中的服务器
        let savedSelectedServers = [];
        try {
            const saved = localStorage.getItem(TOOL_SETTINGS_KEY);
            if (saved) {
                const settings = JSON.parse(saved);
                savedSelectedServers = settings.selectedMcpServers || [];
            }
        } catch (e) {}
        
        // 更新全局变量（用于主页面 MCP 弹出框）
        mcpServers = servers.map(s => ({
            ...s,
            id: s.name,  // 用 name 作为 id
            // 恢复之前的选中状态
            selected: savedSelectedServers.includes(s.name)
        }));
        
        // 保存服务器数据供编辑使用
        window._mcpServers = servers;
        
        // 渲染折叠面板列表
        renderMCPAccordionList(servers);
        
        // 更新主页面 MCP 弹出框选项（如果弹出框打开的话）
        updateMcpPopupOptions();
        
        // 更新 MCP 按钮状态（根据选中状态）
        updateMcpToggleState();
    } catch(e) { 
        console.error("加载MCP服务器失败:", e); 
    }
}

// 渲染MCP折叠面板列表
function renderMCPAccordionList(servers) {
    const listEl = document.getElementById("mcp-accordion-list");
    if (!listEl) return;
    
    if (!servers || servers.length === 0) {
        listEl.innerHTML = `
            <div class="mcp-empty-state">
                <div class="empty-icon">🔌</div>
                <div class="empty-text">暂无 MCP Server 配置</div>
            </div>
        `;
        return;
    }
    
    listEl.innerHTML = servers.map(s => {
        const statusClass = s.running ? "running" : "stopped";
        const statusText = s.running ? "运行中" : "未启动";
        const typeText = s.type === "http" ? "HTTP" : "本地";
        const desc = s.type === "http" ? (s.url || "") : (s.command || "");
        const toolsCount = s.tools ? s.tools.length : 0;
        
        return `
            <div class="mcp-accordion-item" data-name="${s.name}">
                <div class="mcp-accordion-header" onclick="toggleMCPAccordion('${s.name}')">
                    <span class="mcp-accordion-arrow">▶</span>
                    <div class="mcp-accordion-info">
                        <div class="mcp-accordion-name">
                            ${s.name}
                            <span class="mcp-accordion-type">${typeText}</span>
                        </div>
                        <div class="mcp-accordion-desc">${desc}</div>
                    </div>
                    <div class="mcp-accordion-status ${statusClass}">
                        <span class="status-dot"></span>
                        ${statusText}
                    </div>
                    <button class="mcp-accordion-edit-btn" onclick="event.stopPropagation(); openMCPEditPopup('${s.name}')">编辑</button>
                </div>
                <div class="mcp-accordion-content">
                    <div class="mcp-accordion-details">
                        ${s.type === "http" ? `
                            <div class="mcp-detail-item full-width">
                                <span class="mcp-detail-label">URL</span>
                                <span class="mcp-detail-value">${s.url || "-"}</span>
                            </div>
                        ` : `
                            <div class="mcp-detail-item">
                                <span class="mcp-detail-label">命令</span>
                                <span class="mcp-detail-value">${s.command || "-"}</span>
                            </div>
                            <div class="mcp-detail-item">
                                <span class="mcp-detail-label">参数</span>
                                <span class="mcp-detail-value">${(s.args || []).join(" ") || "-"}</span>
                            </div>
                        `}
                        ${toolsCount > 0 ? `
                            <div class="mcp-detail-item full-width">
                                <span class="mcp-detail-label">工具 (${toolsCount})</span>
                                <div class="mcp-tools-list">
                                    ${s.tools.slice(0, 10).map(t => `<span class="mcp-tool-tag">${t.name || t}</span>`).join("")}
                                    ${toolsCount > 10 ? `<span class="mcp-tool-tag">+${toolsCount - 10} 更多</span>` : ""}
                                </div>
                            </div>
                        ` : ""}
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

// 切换MCP折叠面板
function toggleMCPAccordion(name) {
    const item = document.querySelector(`.mcp-accordion-item[data-name="${name}"]`);
    if (item) {
        item.classList.toggle("open");
    }
}

// 打开MCP编辑弹窗
function openMCPEditPopup(name) {
    const popup = document.getElementById("mcp-edit-popup");
    if (!popup) return;
    
    const servers = window._mcpServers || [];
    const server = name ? servers.find(s => s.name === name) : null;
    
    const titleEl = document.getElementById("mcp-edit-title");
    const editNameEl = document.getElementById("mcp-edit-name");
    const nameEl = document.getElementById("mcp-name");
    const commandEl = document.getElementById("mcp-command");
    const argsEl = document.getElementById("mcp-args");
    const urlEl = document.getElementById("mcp-url");
    const envEl = document.getElementById("mcp-env");
    const deleteBtn = document.getElementById("mcp-delete-btn");
    const statusEl = document.getElementById("mcp-status");
    
    if (titleEl) titleEl.textContent = server ? "编辑 MCP Server" : "新建 MCP Server";
    if (editNameEl) editNameEl.value = server ? server.name : "";
    if (nameEl) nameEl.value = server ? server.name : "";
    if (commandEl) commandEl.value = server ? (server.command || "") : "";
    if (argsEl) argsEl.value = server ? (server.args || []).join(" ") : "";
    if (urlEl) urlEl.value = server ? (server.url || "") : "";
    if (envEl) envEl.value = server && server.env ? Object.entries(server.env).map(([k,v]) => `${k}=${v}`).join("\n") : "";
    if (deleteBtn) deleteBtn.style.display = server ? "inline-block" : "none";
    if (statusEl) {
        if (server && server.running) {
            statusEl.textContent = "✓ 运行中";
            statusEl.className = "mcp-test-status success";
        } else {
            statusEl.textContent = "";
            statusEl.className = "mcp-test-status";
        }
    }
    
    // 设置类型
    const typeRadios = document.querySelectorAll('input[name="mcp-type"]');
    const serverType = server ? (server.type || "stdio") : "stdio";
    typeRadios.forEach(r => r.checked = r.value === serverType);
    updateMCPTypeFields();
    
    popup.style.display = "flex";
}

// 关闭MCP编辑弹窗
function closeMCPEditPopup() {
    const popup = document.getElementById("mcp-edit-popup");
    if (popup) popup.style.display = "none";
}

// 选择 MCP 服务器进行编辑（兼容旧版）
function selectMCPServer(name) {
    openMCPEditPopup(name);
}

// 重置 MCP 表单
function resetMCPForm() {
    const editNameEl = document.getElementById("mcp-edit-name");
    const nameEl = document.getElementById("mcp-name");
    const commandEl = document.getElementById("mcp-command");
    const argsEl = document.getElementById("mcp-args");
    const urlEl = document.getElementById("mcp-url");
    const envEl = document.getElementById("mcp-env");
    const deleteBtn = document.getElementById("mcp-delete-btn");
    const statusEl = document.getElementById("mcp-status");
    
    if (editNameEl) editNameEl.value = "";
    if (nameEl) nameEl.value = "";
    if (commandEl) commandEl.value = "";
    if (argsEl) argsEl.value = "";
    if (urlEl) urlEl.value = "";
    if (envEl) envEl.value = "";
    if (deleteBtn) deleteBtn.style.display = "none";
    if (statusEl) {
        statusEl.textContent = "";
        statusEl.className = "mcp-test-status";
    }
    
    const stdioRadio = document.querySelector('input[name="mcp-type"][value="stdio"]');
    if (stdioRadio) stdioRadio.checked = true;
    updateMCPTypeFields();
}

// 根据类型切换显示字段
function updateMCPTypeFields() {
    const type = document.querySelector('input[name="mcp-type"]:checked')?.value || "stdio";
    document.getElementById("mcp-command-row").style.display = type === "stdio" ? "" : "none";
    document.getElementById("mcp-args-row").style.display = type === "stdio" ? "" : "none";
    document.getElementById("mcp-url-row").style.display = type === "http" ? "" : "none";
}

// MCP 表单初始化
function initMCPForm() {
    const form = document.getElementById("mcp-form");
    if (!form) return;
    
    // 类型切换
    document.querySelectorAll('input[name="mcp-type"]').forEach(r => {
        r.addEventListener("change", updateMCPTypeFields);
    });
    
    // 新建按钮（折叠面板布局）
    const addBtn = document.getElementById("mcp-add-btn");
    if (addBtn) {
        addBtn.addEventListener("click", () => openMCPEditPopup(null));
    }
    
    // 关闭弹窗按钮
    const closeBtn = document.getElementById("mcp-edit-close");
    if (closeBtn) {
        closeBtn.addEventListener("click", closeMCPEditPopup);
    }
    
    // 点击弹窗背景关闭
    const popup = document.getElementById("mcp-edit-popup");
    if (popup) {
        popup.addEventListener("click", (e) => {
            if (e.target === popup) closeMCPEditPopup();
        });
    }
    
    // 删除按钮
    const deleteBtn = document.getElementById("mcp-delete-btn");
    if (deleteBtn) {
        deleteBtn.addEventListener("click", async () => {
            const editName = document.getElementById("mcp-edit-name")?.value;
            if (!editName) return;
            const confirmed = await showConfirm(`此操作不可恢复`, { 
                title: `确定要删除 MCP Server "${editName}" 吗？`,
                danger: true,
                confirmText: "删除"
            });
            if (!confirmed) return;
            
            const statusEl = document.getElementById("mcp-status");
            if (statusEl) statusEl.textContent = "正在删除...";
            
            try {
                const res = await fetch(`${apiBase}/mcp/servers/${editName}`, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) {
                    closeMCPEditPopup();
                    await loadMCPServers();
                } else {
                    if (statusEl) statusEl.textContent = "✗ " + (data.error || "删除失败");
                }
            } catch(e) {
                if (statusEl) statusEl.textContent = "✗ 删除失败: " + e.message;
            }
        });
    }
    
    // 测试按钮 - 只测试连接，不保存
    const testBtn = document.getElementById("mcp-test-btn");
    if (testBtn) {
        testBtn.addEventListener("click", async () => {
            const name = document.getElementById("mcp-name").value.trim();
            const type = document.querySelector('input[name="mcp-type"]:checked')?.value || "stdio";
            const command = document.getElementById("mcp-command").value.trim();
            const args = document.getElementById("mcp-args").value.trim();
            const url = document.getElementById("mcp-url").value.trim();
            const envText = document.getElementById("mcp-env").value.trim();
            
            if (!name) {
                await showAlert("请先填写名称", { type: "warning" });
                return;
            }
            
            if (type === "stdio" && !command) {
                await showAlert("请填写命令", { type: "warning" });
                return;
            }
            
            const statusEl = document.getElementById("mcp-status");
            statusEl.textContent = "正在测试...";
            statusEl.className = "mcp-test-status";
            
            try {
                // 只测试，不保存到数据库
                const formData = new FormData();
                formData.append("name", name);
                formData.append("type", type);
                formData.append("command", command);
                formData.append("args", args);
                formData.append("url", url);
                formData.append("env", envText);
                
                const res = await fetch(`${apiBase}/mcp/servers/test`, {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                
                if (data.success) {
                    const toolCount = data.tools ? data.tools.length : 0;
                    statusEl.textContent = `✓ 连接成功，${toolCount}个工具`;
                    statusEl.className = "mcp-test-status success";
                } else {
                    statusEl.textContent = "✗ 连接失败";
                    statusEl.className = "mcp-test-status error";
                }
            } catch(e) {
                statusEl.textContent = "✗ 测试失败";
                statusEl.className = "mcp-test-status error";
            }
        });
    }
    
    // 表单提交
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const editName = document.getElementById("mcp-edit-name").value;
        const name = document.getElementById("mcp-name").value.trim();
        const type = document.querySelector('input[name="mcp-type"]:checked')?.value || "stdio";
        const command = document.getElementById("mcp-command").value.trim();
        const args = document.getElementById("mcp-args").value.trim();
        const url = document.getElementById("mcp-url").value.trim();
        const envText = document.getElementById("mcp-env").value.trim();
        
        if (!name) {
            await showAlert("请填写名称", { type: "warning" });
            return;
        }
        
        if (type === "stdio" && !command) {
            await showAlert("请填写命令", { type: "warning" });
            return;
        }
        
        if (type === "http" && !url) {
            await showAlert("请填写 URL", { type: "warning" });
            return;
        }
        
        const statusEl = document.getElementById("mcp-status");
        statusEl.textContent = "正在保存...";
        
        try {
            // 如果是编辑且名称变了，先删除旧的
            if (editName && editName !== name) {
                await fetch(`${apiBase}/mcp/servers/${editName}`, { method: 'DELETE' });
            }
            
            const formData = new FormData();
            formData.append("name", name);
            formData.append("type", type);
            formData.append("command", command);
            formData.append("args", args);
            formData.append("url", url);
            formData.append("env", envText);
            formData.append("enabled", "true");
            
            const res = await fetch(`${apiBase}/mcp/servers`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            
            if (data.success) {
                statusEl.textContent = "✓ 保存成功";
                statusEl.className = "mcp-test-status success";
                closeMCPEditPopup();
                await loadMCPServers();
            } else {
                statusEl.textContent = "✗ 保存失败";
                statusEl.className = "mcp-test-status error";
            }
        } catch(e) {
            statusEl.textContent = "✗ 保存失败: " + e.message;
        }
    });
    
    // 初始隐藏删除按钮
    if (deleteBtn) deleteBtn.style.display = "none";
}

// 加载向量模型列表
async function loadEmbeddingModels() {
    try {
        const res = await fetch(`${apiBase}/knowledge/embedding-models`);
        if (!res.ok) return;
        const raw = await res.json();
        const data = normalizeApiResponse(raw) || {};
        
        if (!embeddingModelSelectEl) {
            console.warn("embeddingModelSelectEl not found, skipping loadEmbeddingModels");
            return;
        }
        
        embeddingModelSelectEl.innerHTML = "";
        
        // 添加默认选项
        const defaultOpt = document.createElement("option");
        defaultOpt.value = "";
        defaultOpt.textContent = "请选择向量模型";
        embeddingModelSelectEl.appendChild(defaultOpt);
        
        if (!data.models || data.models.length === 0) {
            const opt = document.createElement("option");
            opt.value = "";
            opt.textContent = data.message || "无可用向量模型，请在Provider中配置";
            opt.disabled = true;
            embeddingModelSelectEl.appendChild(opt);
            refreshCustomSelect(embeddingModelSelectEl);
            return;
        }
        
        // 按Provider分组添加模型
        const modelsByProvider = data.models_by_provider || [];
        const modelsNamesMap = data.models_names || {};
        
        if (modelsByProvider.length > 0) {
            // 按Provider分组
            const providerGroups = {};
            modelsByProvider.forEach(item => {
                const providerName = item.provider_name || "其他";
                if (!providerGroups[providerName]) {
                    providerGroups[providerName] = [];
                }
                providerGroups[providerName].push(item);
            });
            
            // 为每个Provider创建optgroup
            Object.entries(providerGroups).forEach(([providerName, items]) => {
                const optgroup = document.createElement("optgroup");
                optgroup.label = providerName;
                items.forEach(item => {
                    const opt = document.createElement("option");
                    opt.value = item.model;
                    const displayName = item.custom_name || modelsNamesMap[item.model] || item.model;
                    opt.textContent = displayName + (item.model === data.default ? " (默认)" : "");
                    optgroup.appendChild(opt);
                });
                embeddingModelSelectEl.appendChild(optgroup);
            });
        } else {
            // 兼容旧格式：直接显示模型列表
            const models = data.models || [];
            if (models.length > 0) {
                const optgroup = document.createElement("optgroup");
                optgroup.label = "API 向量模型";
                models.forEach(m => {
                    const opt = document.createElement("option");
                    opt.value = m;
                    const displayName = modelsNamesMap[m] || m;
                    opt.textContent = displayName + (m === data.default ? " (默认)" : "");
                    optgroup.appendChild(opt);
                });
                embeddingModelSelectEl.appendChild(optgroup);
            }
        }
        
        if(data.default) embeddingModelSelectEl.value = data.default;
        refreshCustomSelect(embeddingModelSelectEl);
    } catch(e) { console.error(e); }
}
// 加载视觉模型列表 - 从已配置的模型中筛选支持视觉的
async function loadVisionModels() {
    try {
        // 获取支持视觉的模型列表
        const visionModels = [];
        for (const [model, caps] of Object.entries(modelsCaps)) {
            if (caps.vision) {
                visionModels.push(model);
            }
        }
        
        // 也尝试从后端获取（兼容旧数据）
        try {
            const res = await fetch(`${apiBase}/models/vision`);
            if (res.ok) {
                const data = await res.json();
                if (data.models) {
                    data.models.forEach(m => {
                        if (!visionModels.includes(m)) {
                            visionModels.push(m);
                        }
                    });
                }
            }
        } catch (e) {}
        
        // 更新知识库页面的图片识别方案选择器
        const kbVisionModelSelect = document.getElementById("kb-vision-model-select");
        if (kbVisionModelSelect) {
            const currentValue = kbVisionModelSelect.value;
            kbVisionModelSelect.innerHTML = '<option value="">不启用</option>';
            
            // 添加视觉模型选项
            if (visionModels.length > 0) {
                const optgroup = document.createElement("optgroup");
                optgroup.label = "视觉模型";
                visionModels.forEach(m => {
                    const opt = document.createElement("option");
                    opt.value = `vision:${m}`;
                    const displayName = modelsNames[m] || m;
                    opt.textContent = displayName;
                    optgroup.appendChild(opt);
                });
                kbVisionModelSelect.appendChild(optgroup);
            }
            
            // 恢复之前的选择
            if (currentValue) {
                kbVisionModelSelect.value = currentValue;
            }
            refreshCustomSelect(kbVisionModelSelect);
        }
        
        // 更新设置页面的默认视觉模型选择器
        const defaultVisionModelSelect = document.getElementById("default-vision-model-select");
        if (defaultVisionModelSelect) {
            const currentValue = defaultVisionModelSelect.value;
            defaultVisionModelSelect.innerHTML = '<option value="">不启用</option>';
            
            // 按 Provider 分组添加视觉模型，value 格式为 provider_id:model_name
            if (modelsProviders.length > 0) {
                modelsProviders.forEach(provider => {
                    let providerModels = provider.models || [];
                    if (provider.default_model && !providerModels.includes(provider.default_model)) {
                        providerModels = [provider.default_model, ...providerModels];
                    }
                    
                    // 过滤只有视觉功能的模型
                    const providerVisionModels = providerModels.filter(model => {
                        const caps = modelsCaps[model];
                        return caps && caps.vision;
                    });
                    
                    if (providerVisionModels.length > 0) {
                        const optgroup = document.createElement("optgroup");
                        optgroup.label = provider.name;
                        
                        providerVisionModels.forEach(model => {
                            const opt = document.createElement("option");
                            // 保存格式：provider_id:model_name，这样后端可以知道用哪个 provider
                            opt.value = `${provider.id}:${model}`;
                            const displayName = modelsNames[model] || model;
                            opt.textContent = displayName;
                            optgroup.appendChild(opt);
                        });
                        
                        defaultVisionModelSelect.appendChild(optgroup);
                    }
                });
            } else if (visionModels.length > 0) {
                // 如果没有 Provider 信息，直接列出所有视觉模型（兼容旧格式）
                visionModels.forEach(m => {
                    const opt = document.createElement("option");
                    opt.value = m;
                    const displayName = modelsNames[m] || m;
                    opt.textContent = displayName;
                    defaultVisionModelSelect.appendChild(opt);
                });
            }
            
            // 恢复之前的选择或从设置中读取
            if (currentValue) {
                defaultVisionModelSelect.value = currentValue;
            } else if (currentSettings.default_vision_model) {
                defaultVisionModelSelect.value = currentSettings.default_vision_model;
            }
            refreshCustomSelect(defaultVisionModelSelect);
        }
    } catch(e) { console.error(e); }
}

// 加载重排模型列表
async function loadRerankModels() {
    try {
        const res = await fetch(`${apiBase}/models/rerank`);
        if (!res.ok) return;
        const data = await res.json();
        
        const rerankModelSelect = document.getElementById("rerank-model-select");
        if (rerankModelSelect) {
            rerankModelSelect.innerHTML = '<option value="">不使用重排模型</option>';
            
            const modelsByProvider = data.models_by_provider || [];
            const modelsNamesMap = data.models_names || {};
            
            if (modelsByProvider.length > 0) {
                // 按Provider分组
                const providerGroups = {};
                modelsByProvider.forEach(item => {
                    const providerName = item.provider_name || "其他";
                    if (!providerGroups[providerName]) {
                        providerGroups[providerName] = [];
                    }
                    providerGroups[providerName].push(item);
                });
                
                // 为每个Provider创建optgroup
                Object.entries(providerGroups).forEach(([providerName, items]) => {
                    const optgroup = document.createElement("optgroup");
                    optgroup.label = providerName;
                    items.forEach(item => {
                        const opt = document.createElement("option");
                        opt.value = item.model;
                        const displayName = item.custom_name || modelsNamesMap[item.model] || item.model;
                        opt.textContent = displayName;
                        optgroup.appendChild(opt);
                    });
                    rerankModelSelect.appendChild(optgroup);
                });
            } else if (data.models && data.models.length > 0) {
                // 兼容旧格式
                data.models.forEach(m => {
                    const opt = document.createElement("option");
                    opt.value = m;
                    const displayName = modelsNamesMap[m] || m;
                    opt.textContent = displayName;
                    rerankModelSelect.appendChild(opt);
                });
            }
            refreshCustomSelect(rerankModelSelect);
        }
    } catch(e) { console.error(e); }
}

// 对话列表渲染
function renderConversationList() {
    if (!conversationListEl) {
        console.warn("conversationListEl not found, skipping renderConversationList");
        return;
    }
    
    conversationListEl.innerHTML = "";
    
    // 按置顶状态排序
    const sortedConversations = [...conversations].sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return b.id - a.id; // 按ID降序
    });
    
    sortedConversations.forEach(conv => {
        const item = document.createElement("div");
        item.className = "conversation-item";
        const pinIcon = conv.is_pinned ? "📌 " : "";
        item.innerHTML = `
            <div class="conversation-title">${pinIcon}${conv.title || "无标题对话"}</div>
            <button class="conversation-menu-btn" data-id="${conv.id}">⋮</button>
            <div class="conversation-actions">
                <button class="action-btn" data-action="rename" data-id="${conv.id}">✏️ 重命名</button>
                <button class="action-btn" data-action="pin" data-id="${conv.id}">${conv.is_pinned ? '📌 取消置顶' : '📌 置顶'}</button>
                <button class="action-btn" data-action="delete" data-id="${conv.id}">🗑️ 删除</button>
            </div>
        `;
        
        if (conv.id === currentConversationId) item.classList.add("active");
        
        // 整个对话项都可以点击切换对话
        item.addEventListener("click", (e) => {
            // 如果点击的是菜单按钮或菜单内容，不触发切换对话
            if (e.target.closest(".conversation-menu-btn") || e.target.closest(".conversation-actions")) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            
            // 如果正在流式输出且不是当前对话，直接切换
            if (isStreaming && conv.id !== currentConversationId) {
                // 停止当前输出
                if (typeof stopStreaming === 'function') {
                    stopStreaming();
                }
            }
            
            selectConversation(conv.id);
        });
        
        conversationListEl.appendChild(item);
    });
    
    // 添加对话菜单按钮的事件监听器
    document.querySelectorAll('.conversation-menu-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            try {
                const conversationId = btn.getAttribute('data-id');
                const actionsEl = btn.nextElementSibling;
                
                if (!actionsEl) {
                    console.warn('Actions element not found for conversation menu');
                    return;
                }
                
                // 关闭其他打开的菜单
                document.querySelectorAll('.conversation-actions.show').forEach(menu => {
                    if (menu !== actionsEl) {
                        menu.classList.remove('show');
                    }
                });
                
                // 切换当前菜单
                actionsEl.classList.toggle('show');
            } catch (error) {
                console.error('Error handling conversation menu click:', error);
            }
        });
    });
    
    // 添加菜单项的事件监听器
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            try {
                const action = btn.getAttribute('data-action');
                const conversationId = parseInt(btn.getAttribute('data-id'));
                
                if (!action || isNaN(conversationId)) {
                    console.warn('Invalid action or conversation ID');
                    return;
                }
                
                // 关闭菜单
                const actionsEl = btn.closest('.conversation-actions');
                if (actionsEl) {
                    actionsEl.classList.remove('show');
                }
                
                if (action === 'delete') {
                    try {
                        const res = await fetch(`${apiBase}/conversations/${conversationId}`, {
                                method: 'DELETE'
                            });
                            if (!res.ok) throw new Error('删除失败');
                            
                            // 如果删除的是当前对话，清空聊天区域
                            if (conversationId === currentConversationId) {
                                currentConversationId = null;
                                if (chatTitleEl) chatTitleEl.textContent = '请选择一个对话';
                                if (chatMessagesEl) chatMessagesEl.innerHTML = '';
                            }
                            
                        await loadConversations();
                    } catch (error) {
                        console.error('Delete conversation error:', error);
                        await showError('删除对话失败: ' + error.message);
                    }
                } else if (action === 'rename') {
                    try {
                        const conversation = conversations.find(c => c.id === conversationId);
                        if (!conversation) {
                            throw new Error('对话不存在');
                        }
                        
                        const newTitle = await showPrompt('请输入新的对话标题', { defaultValue: conversation.title || '' });
                        if (newTitle === null) return; // 用户取消
                        if (!newTitle.trim()) {
                            await showAlert('标题不能为空', { type: 'warning' });
                            return;
                        }
                        
                        const formData = new FormData();
                        formData.append('title', newTitle.trim());
                        
                        const res = await fetch(`${apiBase}/conversations/${conversationId}/title`, {
                            method: 'POST',
                            body: formData
                        });
                        if (!res.ok) throw new Error('重命名失败');
                        
                        // 如果重命名的是当前对话，更新标题显示
                        if (conversationId === currentConversationId && chatTitleEl) {
                            chatTitleEl.textContent = newTitle.trim();
                        }
                        
                        await loadConversations();
                    } catch (error) {
                        console.error('Rename conversation error:', error);
                        await showError('重命名失败: ' + error.message);
                    }
                } else if (action === 'pin') {
                    try {
                        const formData = new FormData();
                        const conversation = conversations.find(c => c.id === conversationId);
                        if (!conversation) {
                            throw new Error('对话不存在');
                        }
                        formData.append('is_pinned', conversation.is_pinned ? 'false' : 'true');
                        
                        const res = await fetch(`${apiBase}/conversations/${conversationId}/pin`, {
                            method: 'POST',
                            body: formData
                        });
                        if (!res.ok) throw new Error('置顶操作失败');
                        
                        await loadConversations();
                    } catch (error) {
                        console.error('Pin conversation error:', error);
                        await showError('置顶操作失败: ' + error.message);
                    }
                }

            } catch (error) {
                console.error('Error handling action button click:', error);
            }
        });
    });
    
    // 点击其他地方关闭菜单
    document.addEventListener('click', (e) => {
        try {
            if (!e.target.closest('.conversation-menu-btn') && !e.target.closest('.conversation-actions')) {
                document.querySelectorAll('.conversation-actions.show').forEach(menu => {
                    menu.classList.remove('show');
                });
            }
        } catch (error) {
            console.error('Error handling document click:', error);
        }
    });
}

/**
 * 添加消息到聊天区域
 * @param {string} role - 'user' 或 'assistant'
 * @param {string} content - 消息内容（Markdown 格式）
 * @param {object} tokenInfo - token 统计信息
 * @param {boolean} showFooter - 是否显示底部操作栏
 * @param {object} extraData - 额外数据 {tool_calls, thinking_content}
 * @returns {HTMLElement} 消息元素
 */
function appendMessage(role, content, tokenInfo = null, showFooter = true, extraData = null) {
    if (!chatMessagesEl) return null;
    
    // 创建消息包装器（用于头像布局）
    const wrapperEl = document.createElement("div");
    wrapperEl.className = "message-wrapper " + (role === "user" ? "user-wrapper" : "assistant-wrapper");
    
    // 创建头像元素
    const avatarEl = document.createElement("div");
    avatarEl.className = "message-avatar " + (role === "user" ? "user-avatar" : "assistant-avatar");
    
    if (role === "user") {
        // 用户头像：使用自定义头像或默认
        const userAvatar = currentSettings.user_avatar;
        if (userAvatar) {
            avatarEl.innerHTML = `<img src="${userAvatar}" alt="用户头像">`;
        } else {
            avatarEl.textContent = "👤";
        }
    } else {
        avatarEl.textContent = "🤖";
    }
    
    wrapperEl.appendChild(avatarEl);
    
    const msgEl = document.createElement("div");
    msgEl.className = "message " + (role === "user" ? "message-user" : "message-assistant");
    
    if (role === "assistant") {
        // AI 消息：创建提示区域和正文区域
        // 提示区域（用于工具调用、深度思考等提示）
        const hintsEl = document.createElement("div");
        hintsEl.className = "message-hints";
        msgEl.appendChild(hintsEl);
        
        // 如果有历史的消息事件，按顺序显示它们
        if (extraData) {
            // 优先使用新的 message_events 格式（按时间顺序记录的事件流）
            if (extraData.message_events) {
                try {
                    const events = typeof extraData.message_events === 'string' 
                        ? JSON.parse(extraData.message_events) 
                        : extraData.message_events;
                    
                    if (events && events.length > 0) {
                        // 用于合并连续的同类型事件
                        let toolCallsGroup = [];
                        let textContentGroup = [];  // 合并连续的 text 事件
                        
                        const flushToolCalls = () => {
                            if (toolCallsGroup.length > 0) {
                                const toolHint = document.createElement("div");
                                toolHint.className = "tool-hint completed";
                                
                                const toolDetails = document.createElement("details");
                                toolDetails.className = "tool-details";
                                
                                const hasMcpTool = toolCallsGroup.some(tc => tc.name && tc.name.startsWith("mcp_"));
                                const toolIcon = hasMcpTool ? "🔌" : "🛠️";
                                
                                const toolSummary = document.createElement("summary");
                                toolSummary.innerHTML = `<span class="tool-icon">${toolIcon}</span> <span class="tool-status">工具调用完成 (${toolCallsGroup.length}次)</span>`;
                                toolDetails.appendChild(toolSummary);
                                
                                const toolContent = document.createElement("div");
                                toolContent.className = "tool-details-content";
                                toolCallsGroup.forEach((tc, idx) => {
                                    let displayName = tc.name || '未知工具';
                                    if (tc.name && tc.name.startsWith("mcp_")) {
                                        const parts = tc.name.split("_");
                                        if (parts.length >= 3) {
                                            displayName = "MCP:" + parts[1] + ":" + parts.slice(2).join("_");
                                        }
                                    }
                                    
                                    const callDiv = document.createElement("div");
                                    callDiv.className = "tool-call-item";
                                    callDiv.innerHTML = `
                                        <div class="tool-call-name">${idx + 1}. ${displayName}</div>
                                        <div class="tool-call-args">${typeof tc.args === 'string' ? tc.args : JSON.stringify(tc.args, null, 2)}</div>
                                        ${tc.result_preview ? `<div class="tool-call-result">结果: ${tc.result_preview}</div>` : ""}
                                    `;
                                    toolContent.appendChild(callDiv);
                                });
                                toolDetails.appendChild(toolContent);
                                toolHint.appendChild(toolDetails);
                                hintsEl.appendChild(toolHint);
                                toolCallsGroup = [];
                            }
                        };
                        
                        // 合并并渲染连续的 text 事件
                        const flushTextContent = () => {
                            if (textContentGroup.length > 0) {
                                const combinedText = textContentGroup.join('');
                                const textBlock = document.createElement("div");
                                textBlock.className = "text-block markdown-body completed";
                                if (window.MarkdownEngine && window.MarkdownEngine.renderFinal) {
                                    window.MarkdownEngine.renderFinal(textBlock, combinedText);
                                } else {
                                    textBlock.innerHTML = combinedText.replace(/\n/g, '<br>');
                                }
                                hintsEl.appendChild(textBlock);
                                textContentGroup = [];
                            }
                        };
                        
                        events.forEach(event => {
                            if (event.type === "vision") {
                                flushToolCalls();
                                flushTextContent();  // 先渲染之前的文本
                                const visionHint = document.createElement("div");
                                visionHint.className = "vision-hint completed";
                                
                                const visionDetails = document.createElement("details");
                                visionDetails.className = "vision-details";
                                
                                const visionSummary = document.createElement("summary");
                                visionSummary.innerHTML = `<span class="vision-icon">👁️</span> <span class="vision-status">图片识别完成</span>`;
                                visionDetails.appendChild(visionSummary);
                                
                                const visionContent = document.createElement("div");
                                visionContent.className = "vision-content";
                                visionContent.innerHTML = event.content.replace(/\n/g, '<br>');
                                visionDetails.appendChild(visionContent);
                                
                                visionHint.appendChild(visionDetails);
                                hintsEl.appendChild(visionHint);
                            } else if (event.type === "tool_call") {
                                flushTextContent();  // 先渲染之前的文本
                                // 收集连续的工具调用
                                toolCallsGroup.push(event.content);
                            } else if (event.type === "thinking") {
                                flushToolCalls();
                                flushTextContent();  // 先渲染之前的文本
                                const thinkingHint = document.createElement("div");
                                thinkingHint.className = "thinking-hint completed";
                                
                                const thinkingDetails = document.createElement("details");
                                thinkingDetails.className = "thinking-details";
                                
                                const thinkingSummary = document.createElement("summary");
                                thinkingSummary.innerHTML = `<span class="thinking-icon">🧠</span> <span class="thinking-status">深度思考完成</span>`;
                                thinkingDetails.appendChild(thinkingSummary);
                                
                                const thinkingContent = document.createElement("div");
                                thinkingContent.className = "thinking-content";
                                // 使用 Markdown 渲染思考内容
                                if (window.MarkdownEngine && window.MarkdownEngine.renderFinal) {
                                    window.MarkdownEngine.renderFinal(thinkingContent, event.content);
                                } else {
                                    thinkingContent.innerHTML = event.content.replace(/\n/g, '<br>');
                                }
                                thinkingDetails.appendChild(thinkingContent);
                                
                                thinkingHint.appendChild(thinkingDetails);
                                hintsEl.appendChild(thinkingHint);
                            } else if (event.type === "text") {
                                flushToolCalls();
                                // 收集连续的 text 事件，稍后合并渲染
                                textContentGroup.push(event.content);
                            }
                        });
                        
                        // 处理剩余的工具调用和文本内容
                        flushToolCalls();
                        flushTextContent();
                    }
                } catch (e) {
                    console.warn("解析消息事件失败:", e);
                }
            } else {
                // 回退到旧格式：按固定顺序显示（视觉识别 → 工具调用 → 深度思考）
                // 1. 首先显示视觉识别历史
                if (extraData.vision_content) {
                    const visionHint = document.createElement("div");
                    visionHint.className = "vision-hint completed";
                    
                    const visionDetails = document.createElement("details");
                    visionDetails.className = "vision-details";
                    
                    const visionSummary = document.createElement("summary");
                    visionSummary.innerHTML = `<span class="vision-icon">👁️</span> <span class="vision-status">图片识别完成</span>`;
                    visionDetails.appendChild(visionSummary);
                    
                    const visionContent = document.createElement("div");
                    visionContent.className = "vision-content";
                    visionContent.innerHTML = extraData.vision_content.replace(/\n/g, '<br>');
                    visionDetails.appendChild(visionContent);
                    
                    visionHint.appendChild(visionDetails);
                    hintsEl.appendChild(visionHint);
                }
                
                // 2. 然后显示工具调用历史
                if (extraData.tool_calls) {
                    try {
                        const toolCalls = typeof extraData.tool_calls === 'string' 
                            ? JSON.parse(extraData.tool_calls) 
                            : extraData.tool_calls;
                        if (toolCalls && toolCalls.length > 0) {
                            const toolHint = document.createElement("div");
                            toolHint.className = "tool-hint completed";
                            
                            const toolDetails = document.createElement("details");
                            toolDetails.className = "tool-details";
                            
                            const hasMcpTool = toolCalls.some(tc => tc.name && tc.name.startsWith("mcp_"));
                            const toolIcon = hasMcpTool ? "🔌" : "🛠️";
                            
                            const toolSummary = document.createElement("summary");
                            toolSummary.innerHTML = `<span class="tool-icon">${toolIcon}</span> <span class="tool-status">工具调用完成 (${toolCalls.length}次)</span>`;
                            toolDetails.appendChild(toolSummary);
                            
                            const toolContent = document.createElement("div");
                            toolContent.className = "tool-details-content";
                            toolCalls.forEach((tc, idx) => {
                                let displayName = tc.name || '未知工具';
                                if (tc.name && tc.name.startsWith("mcp_")) {
                                    const parts = tc.name.split("_");
                                    if (parts.length >= 3) {
                                        displayName = "MCP:" + parts[1] + ":" + parts.slice(2).join("_");
                                    }
                                }
                                
                                const callDiv = document.createElement("div");
                                callDiv.className = "tool-call-item";
                                callDiv.innerHTML = `
                                    <div class="tool-call-name">${idx + 1}. ${displayName}</div>
                                    <div class="tool-call-args">${typeof tc.args === 'string' ? tc.args : JSON.stringify(tc.args, null, 2)}</div>
                                    ${tc.result_preview ? `<div class="tool-call-result">结果: ${tc.result_preview}</div>` : ""}
                                `;
                                toolContent.appendChild(callDiv);
                            });
                            toolDetails.appendChild(toolContent);
                            toolHint.appendChild(toolDetails);
                            hintsEl.appendChild(toolHint);
                        }
                    } catch (e) {
                        console.warn("解析工具调用历史失败:", e);
                    }
                }
                
                // 3. 最后显示深度思考历史
                if (extraData.thinking_content) {
                    const thinkingHint = document.createElement("div");
                    thinkingHint.className = "thinking-hint completed";
                    
                    const thinkingDetails = document.createElement("details");
                    thinkingDetails.className = "thinking-details";
                    
                    const thinkingSummary = document.createElement("summary");
                    thinkingSummary.innerHTML = `<span class="thinking-icon">🧠</span> <span class="thinking-status">深度思考完成</span>`;
                    thinkingDetails.appendChild(thinkingSummary);
                    
                    const thinkingContent = document.createElement("div");
                    thinkingContent.className = "thinking-content";
                    // 使用 Markdown 渲染思考内容
                    if (window.MarkdownEngine && window.MarkdownEngine.renderFinal) {
                        window.MarkdownEngine.renderFinal(thinkingContent, extraData.thinking_content);
                    } else {
                        thinkingContent.innerHTML = extraData.thinking_content.replace(/\n/g, '<br>');
                    }
                    thinkingDetails.appendChild(thinkingContent);
                    
                    thinkingHint.appendChild(thinkingDetails);
                    hintsEl.appendChild(thinkingHint);
                }
            }
        }
        
        // 正文区域（用于 Markdown 渲染）
        const contentEl = document.createElement("div");
        contentEl.className = "message-content";
        msgEl.appendChild(contentEl);
        
        // 存储原始 Markdown 内容
        msgEl.dataset.rawContent = content || "";
        
        // 只有当有内容时才渲染
        if (content && content.length > 0) {
            renderMarkdown(contentEl, content, true);
        }
        
        // 添加底部操作栏
        if (showFooter) {
            addMessageFooter(msgEl, content, tokenInfo);
        }
    } else {
        // 用户消息：纯文本显示 + 附件显示
        const textNode = document.createTextNode(content || "");
        msgEl.appendChild(textNode);
        
        // 保存文件信息到消息元素上（用于编辑时恢复）
        if (extraData && extraData.files && extraData.files.length > 0) {
            msgEl.dataset.files = JSON.stringify(extraData.files);
            
            // 显示附件列表
            const filesEl = document.createElement("div");
            filesEl.className = "user-message-files";
            extraData.files.forEach(file => {
                const fileEl = document.createElement("span");
                fileEl.className = "user-message-file";
                fileEl.textContent = `📎 ${file.filename || file.name || '文件'}`;
                filesEl.appendChild(fileEl);
            });
            msgEl.appendChild(filesEl);
        }
        
        // 添加编辑按钮
        const actionsEl = document.createElement("div");
        actionsEl.className = "user-message-actions";
        const editBtn = document.createElement("button");
        editBtn.textContent = "✏️";
        editBtn.onclick = () => editAndResendMessage(content, msgEl.dataset.files);
        actionsEl.appendChild(editBtn);
        msgEl.appendChild(actionsEl);
    }
    
    // 将消息添加到包装器
    wrapperEl.appendChild(msgEl);
    
    // 将包装器添加到聊天区域
    chatMessagesEl.appendChild(wrapperEl);
    scrollToBottom();
    return msgEl;
}

/**
 * 统一的 Markdown 渲染函数 - 唯一入口
 * @param {HTMLElement} el - 目标元素
 * @param {string} markdown - Markdown 内容
 * @param {boolean} isComplete - 是否为最终渲染
 */
// 节流渲染，避免频繁重绘
let _renderThrottleTimer = null;
let _pendingRender = null;

function renderMarkdown(el, markdown, isComplete = true) {
    if (!el) return;
    
    // 最终渲染立即执行
    if (isComplete) {
        if (_renderThrottleTimer) {
            clearTimeout(_renderThrottleTimer);
            _renderThrottleTimer = null;
        }
        _pendingRender = null;
        _doRenderMarkdown(el, markdown, true);
        return;
    }
    
    // 流式渲染使用节流（每50ms最多渲染一次）
    _pendingRender = { el, markdown, isComplete };
    if (!_renderThrottleTimer) {
        _renderThrottleTimer = setTimeout(() => {
            _renderThrottleTimer = null;
            if (_pendingRender) {
                _doRenderMarkdown(_pendingRender.el, _pendingRender.markdown, _pendingRender.isComplete);
                _pendingRender = null;
            }
        }, 50);
    }
}

function _doRenderMarkdown(el, markdown, isComplete) {
    // 如果 MarkdownEngine 可用且 marked 已加载
    if (window.MarkdownEngine && window.MarkdownEngine.renderToEl && window.MarkdownEngine.isReady && window.MarkdownEngine.isReady()) {
        window.MarkdownEngine.renderToEl(el, markdown, isComplete);
        if (isComplete && window.MarkdownEngine.addCopyButtons) {
            window.MarkdownEngine.addCopyButtons(el);
        }
    } else if (typeof marked !== 'undefined') {
        // 降级：使用 marked 直接渲染
        try {
            let html = marked.parse(markdown || '');
            el.innerHTML = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(html) : html;
        } catch (e) {
            el.textContent = markdown;
        }
    } else {
        // 最终降级：纯文本显示，保留换行
        el.innerHTML = (markdown || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    }
}

// 添加消息底部信息和按钮的函数
// isLoading: 是否显示"统计中"状态
function addMessageFooter(msgEl, content, tokenInfo, isLoading = false) {
    // 如果已经有footer，先移除
    const existingFooter = msgEl.querySelector(".message-footer");
    if (existingFooter) {
        existingFooter.remove();
    }
    
    const footerEl = document.createElement("div");
    footerEl.className = "message-footer";
    
    // 操作按钮
    const actionsEl = document.createElement("div");
    actionsEl.className = "message-actions";
    
    // Markdown复制按钮
    const copyMdBtn = document.createElement("button");
    copyMdBtn.textContent = "📋 Markdown";
    copyMdBtn.onclick = () => {
        // 获取当前最新的内容（从message-content获取原始markdown）
        const contentEl = msgEl.querySelector(".message-content");
        // 尝试获取存储的原始markdown，如果没有则使用textContent
        const currentContent = msgEl.dataset.rawContent || (contentEl ? contentEl.textContent : content);
        navigator.clipboard.writeText(currentContent).then(() => {
            const originalText = copyMdBtn.textContent;
            copyMdBtn.textContent = "✓ 已复制";
            copyMdBtn.classList.add("success");
            setTimeout(() => {
                copyMdBtn.textContent = originalText;
                copyMdBtn.classList.remove("success");
            }, 2000);
        }).catch(() => {
            copyMdBtn.textContent = "✗ 复制失败";
            setTimeout(() => copyMdBtn.textContent = "📋 Markdown", 2000);
        });
    };
    actionsEl.appendChild(copyMdBtn);
    
    // 纯文本复制按钮（去除Markdown符号）
    const copyTxtBtn = document.createElement("button");
    copyTxtBtn.textContent = "📄 纯文本";
    copyTxtBtn.onclick = () => {
        // 获取原始Markdown内容
        const rawContent = msgEl.dataset.rawContent || content;
        // 去除Markdown符号，转为纯文本
        const plainText = stripMarkdown(rawContent);
        navigator.clipboard.writeText(plainText).then(() => {
            const originalText = copyTxtBtn.textContent;
            copyTxtBtn.textContent = "✓ 已复制";
            copyTxtBtn.classList.add("success");
            setTimeout(() => {
                copyTxtBtn.textContent = originalText;
                copyTxtBtn.classList.remove("success");
            }, 2000);
        }).catch(() => {
            copyTxtBtn.textContent = "✗ 复制失败";
            setTimeout(() => copyTxtBtn.textContent = "📄 纯文本", 2000);
        });
    };
    actionsEl.appendChild(copyTxtBtn);
    
    // 重新输出按钮
    const regenerateBtn = document.createElement("button");
    regenerateBtn.textContent = "🔄 重新输出";
    regenerateBtn.onclick = () => regenerateLastMessage();
    actionsEl.appendChild(regenerateBtn);
    
    footerEl.appendChild(actionsEl);
    
    // Token信息
    const tokenEl = document.createElement("div");
    tokenEl.className = "token-info";
    
    if (isLoading) {
        tokenEl.textContent = `模型: ${modelSelectEl ? modelSelectEl.value || "default" : "default"} | 统计中...`;
    } else if (tokenInfo && (tokenInfo.input_tokens > 0 || tokenInfo.output_tokens > 0)) {
        tokenEl.textContent = `输入: ${tokenInfo.input_tokens} tokens | 输出: ${tokenInfo.output_tokens} tokens | 模型: ${tokenInfo.model}`;
    } else if (tokenInfo && tokenInfo.model) {
        tokenEl.textContent = `模型: ${tokenInfo.model} | 无token统计`;
    } else {
        tokenEl.textContent = `模型: ${modelSelectEl ? modelSelectEl.value || "default" : "default"} | 无token统计`;
    }
    footerEl.appendChild(tokenEl);
    
    msgEl.appendChild(footerEl);
}

// 更新消息底部的token信息
function updateMessageTokenInfo(msgEl, tokenInfo) {
    const tokenEl = msgEl.querySelector(".token-info");
    if (tokenEl) {
        if (tokenInfo && (tokenInfo.input_tokens > 0 || tokenInfo.output_tokens > 0)) {
            tokenEl.textContent = `输入: ${tokenInfo.input_tokens} tokens | 输出: ${tokenInfo.output_tokens} tokens | 模型: ${tokenInfo.model}`;
        } else if (tokenInfo && tokenInfo.model) {
            tokenEl.textContent = `模型: ${tokenInfo.model} | 无token统计`;
        } else {
            tokenEl.textContent = `模型: ${modelSelectEl ? modelSelectEl.value || "default" : "default"} | 无token统计`;
        }
    }
}

// 重新生成最后一条AI回复
async function regenerateLastMessage() {
    if (!chatMessagesEl || !currentConversationId) return;
    
    if (isStreaming) {
        await showAlert("请等待当前输出完成", { type: "warning" });
        return;
    }
    
    // 找到最后一条用户消息和AI回复
    const messages = chatMessagesEl.querySelectorAll(".message");
    let lastUserMessage = null;
    let lastAssistantMessage = null;
    
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].classList.contains("message-assistant") && !lastAssistantMessage) {
            lastAssistantMessage = messages[i];
        }
        if (messages[i].classList.contains("message-user")) {
            lastUserMessage = messages[i];
            break;
        }
    }
    
    if (!lastUserMessage) {
        await showAlert("没有找到可以重新生成的消息", { type: "warning" });
        return;
    }
    
    // 获取用户消息文本（排除操作按钮的文本）
    const userText = lastUserMessage.childNodes[0].textContent.trim();
    
    // 只删除最后一条AI回复，保留用户消息
    if (lastAssistantMessage) {
        lastAssistantMessage.remove();
    }
    
    // 重新发送用户消息（不需要重新添加用户消息到界面，因为已经存在）
    const formData = new FormData();
    formData.append("user_text", userText);
    formData.append("model", modelSelectEl ? modelSelectEl.value || "" : "");
    formData.append("enable_knowledge_base", toggleKnowledgeEl && toggleKnowledgeEl.checked ? "true" : "false");
    formData.append("enable_mcp", toggleMcpEl && toggleMcpEl.checked ? "true" : "false");
    formData.append("enable_web_search", toggleWebEl && toggleWebEl.checked ? "true" : "false");
    if (toggleWebEl && toggleWebEl.checked) {
        formData.append("web_search_source", selectedWebSource || "duckduckgo");
    }
    const providerId = providerSelectEl && providerSelectEl.value ? parseInt(providerSelectEl.value) : null;
    if (providerId !== null && !isNaN(providerId)) {
        formData.append("provider_id", String(providerId));
    }
    // 始终使用流式输出
    formData.append("stream", "true");
    
    // 深度思考开关 - 只有当模型支持推理且用户勾选了开关时才启用
    const selectedModel = modelSelectEl ? modelSelectEl.value : "";
    const caps = modelsCaps[selectedModel] || {};
    const thinkingToggle = document.getElementById("toggle-thinking");
    const isThinkingChecked = thinkingToggle && thinkingToggle.checked;
    if (caps.reasoning && isThinkingChecked) {
        formData.append("enable_thinking", "true");
    }
    
    // 视觉识别模式
    const visionMode = getVisionMode();
    if (!caps.vision && uploadedFiles.length > 0 && visionMode !== "none") {
        formData.append("vision_mode", visionMode);
    }
    
    // 流式传输
    isStreaming = true;
    updateSendButton();
    currentStreamController = new AbortController();

    
    // 创建AI消息元素，不显示底部（等输出完成后再添加）
    const assistantEl = appendMessage("assistant", "", null, false);
    currentStreamingMessageEl = assistantEl;
    
    // 用于存储原始markdown内容
    let fullText = "";
    let tokenInfo = null;
    
    // 辅助函数：结束当前正文块（如果有的话）
    const finalizeCurrentTextBlock = () => {
        const currentTextId = assistantEl.dataset.currentTextId;
        if (currentTextId) {
            const textBlock = document.getElementById(currentTextId);
            if (textBlock) {
                // 最终渲染 Markdown
                const rawContent = textBlock.dataset.rawContent || "";
                if (rawContent && window.MarkdownEngine && window.MarkdownEngine.renderFinal) {
                    window.MarkdownEngine.renderFinal(textBlock, rawContent);
                }
                textBlock.classList.add("completed");
            }
            delete assistantEl.dataset.currentTextId;
        }
    };
    
    // 辅助函数：获取或创建当前正文块
    const getOrCreateTextBlock = () => {
        const hintsEl = assistantEl?.querySelector(".message-hints");
        if (!hintsEl) return null;
        
        const currentTextId = assistantEl.dataset.currentTextId;
        if (currentTextId) {
            const existing = document.getElementById(currentTextId);
            if (existing) return existing;
        }
        
        // 创建新的正文块
        const textId = `text-${Date.now()}`;
        const textBlock = document.createElement("div");
        textBlock.className = "text-block markdown-body";
        textBlock.id = textId;
        textBlock.dataset.rawContent = "";
        hintsEl.appendChild(textBlock);
        assistantEl.dataset.currentTextId = textId;
        return textBlock;
    };
    
    try {
        const res = await fetch(`${apiBase}/conversations/${currentConversationId}/chat`, {
            method: "POST",
            body: formData,
            signal: currentStreamController.signal,
            headers: {
                'Accept': 'text/event-stream',
            }
        });
        
        if (!res.ok) {
            const err = await res.text();
            console.error("重新生成：请求失败", err);
            throw new Error(err || res.statusText);
        }
        if (!res.body) throw new Error("ReadableStream not supported");
        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        
        // 更稳定 SSE 解析：按 \n\n 分隔事件，保留 data 多行换行
        let sseBuffer = "";
        let eventName = "message";
        let streamDone = false; // 使用单独的标志来标记流式输出完成

        while (!currentStreamController.signal.aborted && !streamDone) {
            const { done, value } = await reader.read();
            if (done) break;

            sseBuffer += decoder.decode(value, { stream: true });

            // 统一换行符（防止 \r\n 干扰分割）
            sseBuffer = sseBuffer.replace(/\r\n/g, "\n");

            // SSE 事件用空行分隔
            let sepIndex;
            while ((sepIndex = sseBuffer.indexOf("\n\n")) !== -1) {
                const rawEvent = sseBuffer.slice(0, sepIndex);
                sseBuffer = sseBuffer.slice(sepIndex + 2);

                if (!rawEvent.trim()) continue;

                let localEventName = "message";
                const dataLines = [];

                for (const line of rawEvent.split("\n")) {
                    if (line.startsWith("event:")) {
                        localEventName = line.slice(6).trim() || "message";
                    } else if (line.startsWith("data:")) {
                        // SSE 标准格式: "data: content" 或 "data:content"
                        let data = line.slice(5);
                        // 如果第一个字符是空格，去掉它（SSE 标准允许 data: 后有一个空格）
                        if (data.startsWith(' ')) {
                            data = data.slice(1);
                        }
                        dataLines.push(data);
                    }
                }

                // 重要：多行 data 用 \n 连接（SSE 规范）
                const payload = dataLines.join("\n");

                if (localEventName === "meta") {
                    try {
                        tokenInfo = JSON.parse(payload);
                    } catch (e) {}
                    continue;
                }

                if (localEventName === "ack") {
                    continue;
                }

                // 处理视觉识别开始事件
                if (localEventName === "vision_start") {
                    // 先结束当前正文块
                    finalizeCurrentTextBlock();
                    try {
                        const visionData = JSON.parse(payload);
                        const hintsEl = assistantEl?.querySelector(".message-hints");
                        if (hintsEl) {
                            let visionHint = hintsEl.querySelector(".vision-hint");
                            if (!visionHint) {
                                visionHint = document.createElement("div");
                                visionHint.className = "vision-hint";
                                hintsEl.appendChild(visionHint);
                            }
                            const fileTypeMap = {
                                "pdf": "PDF",
                                "image": "图片",
                                "document": "文档"
                            };
                            const fileTypeText = fileTypeMap[visionData.file_type] || "文件";
                            const statusMessage = visionData.message || `${visionData.model} 正在识别${fileTypeText}...`;
                            // 创建可展开的折叠框，实时显示识别过程
                            visionHint.innerHTML = `
                                <details class="vision-details" open>
                                    <summary><span class="vision-icon">👁️</span> <span class="vision-status">${statusMessage}</span></summary>
                                    <div class="vision-content markdown-body"></div>
                                </details>
                            `;
                            scrollToBottom();
                        }
                    } catch (e) {
                        console.error("解析视觉识别开始事件失败:", e);
                    }
                    continue;
                }

                // 处理视觉识别进度事件
                if (localEventName === "vision_progress") {
                    try {
                        const progressData = JSON.parse(payload);
                        const hintsEl = assistantEl?.querySelector(".message-hints");
                        if (hintsEl) {
                            const visionStatus = hintsEl.querySelector(".vision-hint .vision-status");
                            if (visionStatus && progressData.message) {
                                // 更新状态文本
                                const modelName = visionStatus.textContent.split(" ")[0];
                                visionStatus.textContent = `${modelName} ${progressData.message}`;
                            }
                        }
                    } catch (e) {}
                    continue;
                }

                // 处理视觉识别内容块事件（实时追加到折叠框中）
                if (localEventName === "vision_chunk") {
                    try {
                        const chunkText = JSON.parse(payload);
                        const hintsEl = assistantEl?.querySelector(".message-hints");
                        if (hintsEl) {
                            const visionHint = hintsEl.querySelector(".vision-hint");
                            const visionContent = visionHint?.querySelector(".vision-content");
                            if (visionContent && chunkText) {
                                // 累积原始文本
                                if (!visionContent.dataset.rawContent) {
                                    visionContent.dataset.rawContent = "";
                                }
                                visionContent.dataset.rawContent += chunkText;
                                
                                // 使用 Markdown 流式渲染
                                if (window.MarkdownEngine && window.MarkdownEngine.renderStreaming) {
                                    window.MarkdownEngine.renderStreaming(visionContent, visionContent.dataset.rawContent);
                                } else {
                                    visionContent.innerHTML = visionContent.dataset.rawContent.replace(/\n/g, '<br>');
                                }
                                scrollToBottom();
                            }
                        }
                    } catch (e) {}
                    continue;
                }

                // 处理视觉识别结束事件
                if (localEventName === "vision_end") {
                    try {
                        const visionData = JSON.parse(payload);
                        const hintsEl = assistantEl?.querySelector(".message-hints");
                        if (hintsEl) {
                            let visionHint = hintsEl.querySelector(".vision-hint");
                            if (visionHint) {
                                // 获取累积的原始内容
                                const visionContentEl = visionHint.querySelector(".vision-content");
                                const rawContent = visionContentEl?.dataset?.rawContent || visionContentEl?.textContent || "";
                                
                                const fileTypeMap = {
                                    "pdf": "PDF",
                                    "image": "图片",
                                    "document": "文档"
                                };
                                const fileTypeText = fileTypeMap[visionData.file_type] || "文件";
                                
                                // 更新为完成状态（默认折叠）
                                visionHint.innerHTML = `
                                    <details class="vision-details">
                                        <summary><span class="vision-icon">👁️</span> ${fileTypeText}识别完成</summary>
                                        <div class="vision-content markdown-body"></div>
                                    </details>
                                `;
                                visionHint.classList.add("completed");
                                
                                // 使用 Markdown 渲染视觉识别内容
                                const visionContentNewEl = visionHint.querySelector('.vision-content');
                                if (visionContentNewEl) {
                                    if (window.MarkdownEngine && window.MarkdownEngine.renderFinal) {
                                        window.MarkdownEngine.renderFinal(visionContentNewEl, rawContent);
                                    } else {
                                        visionContentNewEl.innerHTML = rawContent.replace(/\n/g, '<br>');
                                    }
                                }
                                
                                scrollToBottom();
                            }
                        }
                    } catch (e) {
                        console.error("解析视觉识别结束事件失败:", e);
                    }
                    continue;
                }

                // 处理深度思考开始事件
                if (localEventName === "thinking_start") {
                    // 先结束当前正文块
                    finalizeCurrentTextBlock();
                    try {
                        const thinkingData = JSON.parse(payload);
                        const hintsEl = assistantEl?.querySelector(".message-hints");
                        if (hintsEl) {
                            // 每次都创建新的思考块，使用时间戳作为唯一ID
                            const thinkingId = `thinking-${Date.now()}`;
                            const thinkingHint = document.createElement("div");
                            thinkingHint.className = "thinking-hint";
                            thinkingHint.id = thinkingId;
                            thinkingHint.dataset.rawThinking = "";
                            hintsEl.appendChild(thinkingHint);
                            
                            // 记录当前活跃的思考块ID
                            assistantEl.dataset.currentThinkingId = thinkingId;
                            
                            // 创建可展开的折叠框，实时显示思考过程
                            thinkingHint.innerHTML = `
                                <details class="thinking-details" open>
                                    <summary><span class="thinking-icon">🧠</span> <span class="thinking-status">${thinkingData.message || "正在深度思考..."}</span></summary>
                                    <div class="thinking-content"></div>
                                </details>
                            `;
                            scrollToBottom();
                        }
                    } catch (e) {}
                    continue;
                }

                // 处理深度思考内容事件（实时追加到当前活跃的思考块中）
                if (localEventName === "thinking") {
                    try {
                        const thinkingText = JSON.parse(payload);
                        const hintsEl = assistantEl?.querySelector(".message-hints");
                        if (hintsEl && thinkingText) {
                            // 获取当前活跃的思考块
                            const currentThinkingId = assistantEl.dataset.currentThinkingId;
                            let thinkingHint = currentThinkingId ? document.getElementById(currentThinkingId) : null;
                            
                            // 如果没有活跃的思考块，创建一个新的
                            if (!thinkingHint) {
                                const thinkingId = `thinking-${Date.now()}`;
                                thinkingHint = document.createElement("div");
                                thinkingHint.className = "thinking-hint";
                                thinkingHint.id = thinkingId;
                                thinkingHint.dataset.rawThinking = "";
                                thinkingHint.innerHTML = `
                                    <details class="thinking-details" open>
                                        <summary><span class="thinking-icon">🧠</span> <span class="thinking-status">正在深度思考...</span></summary>
                                        <div class="thinking-content"></div>
                                    </details>
                                `;
                                hintsEl.appendChild(thinkingHint);
                                assistantEl.dataset.currentThinkingId = thinkingId;
                            }
                            
                            // 保存原始文本用于最后的 Markdown 渲染
                            thinkingHint.dataset.rawThinking = (thinkingHint.dataset.rawThinking || "") + thinkingText;
                            
                            // 实时显示（简单换行处理）
                            const thinkingContent = thinkingHint.querySelector(".thinking-content");
                            if (thinkingContent) {
                                thinkingContent.innerHTML += thinkingText.replace(/\n/g, '<br>');
                                scrollToBottom();
                            }
                        }
                    } catch (e) {}
                    continue;
                }

                // 处理深度思考结束事件
                if (localEventName === "thinking_end") {
                    try {
                        const thinkingData = JSON.parse(payload);
                        const hintsEl = assistantEl?.querySelector(".message-hints");
                        if (hintsEl) {
                            // 获取当前活跃的思考块
                            const currentThinkingId = assistantEl.dataset.currentThinkingId;
                            let thinkingHint = currentThinkingId ? document.getElementById(currentThinkingId) : null;
                            
                            if (!thinkingHint) {
                                // 如果没有活跃的思考块，创建一个新的
                                const thinkingId = `thinking-${Date.now()}`;
                                thinkingHint = document.createElement("div");
                                thinkingHint.className = "thinking-hint";
                                thinkingHint.id = thinkingId;
                                hintsEl.appendChild(thinkingHint);
                            }
                            
                            // 获取已有的思考内容（原始文本）
                            const existingRawContent = thinkingHint.dataset.rawThinking || "";
                            const rawContent = existingRawContent || thinkingData.thinking || "思考过程未记录";
                            
                            // 更新为完成状态（默认折叠）
                            thinkingHint.innerHTML = `
                                <details class="thinking-details">
                                    <summary><span class="thinking-icon">🧠</span> 深度思考完成</summary>
                                    <div class="thinking-content markdown-body"></div>
                                </details>
                            `;
                            thinkingHint.classList.add("completed");
                            
                            // 使用 Markdown 渲染思考内容
                            const thinkingContentEl = thinkingHint.querySelector('.thinking-content');
                            if (thinkingContentEl) {
                                if (window.MarkdownEngine && window.MarkdownEngine.renderFinal) {
                                    window.MarkdownEngine.renderFinal(thinkingContentEl, rawContent);
                                } else {
                                    thinkingContentEl.innerHTML = rawContent.replace(/\n/g, '<br>');
                                }
                            }
                            
                            // 清除当前活跃的思考块ID，以便下次创建新的
                            delete assistantEl.dataset.currentThinkingId;
                            
                            scrollToBottom();
                        }
                    } catch (e) {
                        console.error("解析思考结束事件失败:", e);
                    }
                    continue;
                }

                // 处理工具调用开始事件
                if (localEventName === "tool_start") {
                    // 先结束当前正文块
                    finalizeCurrentTextBlock();
                    try {
                        const toolData = JSON.parse(payload);
                        const hintsEl = assistantEl?.querySelector(".message-hints");
                        if (hintsEl) {
                            // 每次都创建新的工具块，使用时间戳作为唯一ID
                            const toolId = `tool-${Date.now()}`;
                            const toolHint = document.createElement("div");
                            toolHint.className = "tool-hint";
                            toolHint.id = toolId;
                            hintsEl.appendChild(toolHint);
                            
                            // 记录当前活跃的工具块ID
                            assistantEl.dataset.currentToolId = toolId;
                            
                            const toolMessages = {
                                "thinking": "正在分析问题...",
                                "search_knowledge": "正在检索知识库...",
                                "web_search": "正在联网搜索...",
                                "deep_thinking": "正在深度思考...",
                                "mcp": "正在调用工具..."
                            };
                            const toolIcons = {
                                "thinking": "🔍",
                                "search_knowledge": "📚",
                                "web_search": "🌐",
                                "deep_thinking": "🧠",
                                "mcp": "🔧"
                            };
                            const msg = toolMessages[toolData.status] || toolData.message || "正在处理...";
                            const icon = toolIcons[toolData.status] || "🔍";
                            toolHint.innerHTML = `<span class="tool-icon">${icon}</span> <span class="tool-status">${msg}</span><div class="tool-progress-list"></div>`;
                            scrollToBottom();
                        }
                    } catch (e) {}
                    continue;
                }

                // 处理工具调用进度事件（实时显示每次搜索）
                if (localEventName === "tool_progress") {
                    try {
                        const progressData = JSON.parse(payload);
                        const hintsEl = assistantEl?.querySelector(".message-hints");
                        if (hintsEl) {
                            // 获取当前活跃的工具块
                            const currentToolId = assistantEl.dataset.currentToolId;
                            let toolHint = currentToolId ? document.getElementById(currentToolId) : null;
                            
                            // 如果没有活跃的工具块，创建一个新的
                            if (!toolHint) {
                                const toolId = `tool-${Date.now()}`;
                                toolHint = document.createElement("div");
                                toolHint.className = "tool-hint";
                                toolHint.id = toolId;
                                toolHint.innerHTML = `<span class="tool-icon">🔍</span> <span class="tool-status">正在处理...</span><div class="tool-progress-list"></div>`;
                                hintsEl.appendChild(toolHint);
                                assistantEl.dataset.currentToolId = toolId;
                            }
                            
                            let progressList = toolHint.querySelector(".tool-progress-list");
                            if (!progressList) {
                                progressList = document.createElement("div");
                                progressList.className = "tool-progress-list";
                                toolHint.appendChild(progressList);
                            }
                            
                            if (progressData.stage === "start") {
                                // 添加新的进度项
                                const progressItem = document.createElement("div");
                                progressItem.className = "tool-progress-item";
                                progressItem.dataset.tool = progressData.tool;
                                progressItem.innerHTML = `<span class="progress-icon">⏳</span> ${progressData.message}`;
                                progressList.appendChild(progressItem);
                            } else if (progressData.stage === "done") {
                                // 更新最后一个进度项为完成状态
                                const items = progressList.querySelectorAll(".tool-progress-item");
                                if (items.length > 0) {
                                    const lastItem = items[items.length - 1];
                                    lastItem.innerHTML = `<span class="progress-icon">✓</span> ${progressData.message}`;
                                    lastItem.classList.add("done");
                                }
                            } else if (progressData.stage === "error") {
                                // 更新为错误状态
                                const items = progressList.querySelectorAll(".tool-progress-item");
                                if (items.length > 0) {
                                    const lastItem = items[items.length - 1];
                                    lastItem.innerHTML = `<span class="progress-icon">✗</span> ${progressData.message}`;
                                    lastItem.classList.add("error");
                                }
                            }
                            scrollToBottom();
                        }
                    } catch (e) {
                        console.error("解析工具进度事件失败:", e);
                    }
                    continue;
                }

                // 处理工具调用结束事件
                if (localEventName === "tool_end") {
                    try {
                        const toolData = JSON.parse(payload);
                        const hintsEl = assistantEl?.querySelector(".message-hints");
                        if (hintsEl) {
                            // 获取当前活跃的工具块
                            const currentToolId = assistantEl.dataset.currentToolId;
                            let toolHint = currentToolId ? document.getElementById(currentToolId) : null;
                            
                            // 如果模型跳过了工具调用，直接移除当前工具提示
                            if (toolData.status === "skipped") {
                                if (toolHint) {
                                    toolHint.remove();
                                }
                                delete assistantEl.dataset.currentToolId;
                                scrollToBottom();
                                continue;
                            }
                            
                            if (!toolHint) {
                                const toolId = `tool-${Date.now()}`;
                                toolHint = document.createElement("div");
                                toolHint.className = "tool-hint";
                                toolHint.id = toolId;
                                hintsEl.appendChild(toolHint);
                            }
                            
                            if (toolData.tools && toolData.tools.length > 0) {
                                const toolCount = toolData.tools.length;
                                
                                // 判断是否包含 MCP 工具
                                const hasMcpTool = toolData.tools.some(t => t.name && t.name.startsWith("mcp_"));
                                const toolIcon = hasMcpTool ? "🔌" : "🛠️";
                                
                                const htmlContent = `
                                    <details class="tool-details">
                                        <summary><span class="tool-icon">${toolIcon}</span> <span class="tool-status">工具调用完成 (${toolCount}次)</span></summary>
                                        <div class="tool-details-content">
                                            ${toolData.tools.map((t, idx) => {
                                                // 格式化 MCP 工具名称显示
                                                let displayName = t.name;
                                                if (t.name && t.name.startsWith("mcp_")) {
                                                    const parts = t.name.split("_");
                                                    if (parts.length >= 3) {
                                                        displayName = "MCP:" + parts[1] + ":" + parts.slice(2).join("_");
                                                    }
                                                }
                                                return '<div class="tool-call-item">' +
                                                    '<div class="tool-call-name">' + (idx + 1) + '. ' + displayName + '</div>' +
                                                    '<div class="tool-call-args">' + JSON.stringify(t.args, null, 2) + '</div>' +
                                                    (t.result_preview ? '<div class="tool-call-result">结果: ' + t.result_preview + '</div>' : '') +
                                                    (t.error ? '<div class="tool-call-error">错误: ' + t.error + '</div>' : '') +
                                                '</div>';
                                            }).join("")}
                                        </div>
                                    </details>
                                `;
                                
                                toolHint.innerHTML = htmlContent;
                                toolHint.classList.add("completed");
                            } else {
                                // 没有工具调用，移除提示
                                toolHint.remove();
                            }
                            
                            // 清除当前活跃的工具块ID，以便下次创建新的
                            delete assistantEl.dataset.currentToolId;
                            
                            scrollToBottom();
                        }
                    } catch (e) {
                        console.error("解析工具结束事件失败:", e);
                    }
                    continue;
                }

                // message 正文
                if (payload === "[DONE]") {
                    streamDone = true;
                    break;
                }

                if (payload.startsWith("[错误]")) {
                    const contentEl = assistantEl?.querySelector(".message-content");
                    if (contentEl) contentEl.innerHTML += "<span style='color:red;'>" + payload + "</span>";
                    streamDone = true;
                    break;
                }

                // 兜底：疑似 token JSON 不进入正文
                if (/\b(input_tokens|output_tokens|total_tokens)\b\s*:/.test(payload)) {
                    try { tokenInfo = JSON.parse(payload); } catch (e) {}
                    continue;
                }
                
                // 过滤掉工具调用相关的 JSON（不应该显示在消息内容中）
                // 检测 tool_start 事件的数据格式
                if (payload.includes('"status"') && (payload.includes('"search_knowledge"') || payload.includes('"web_search"') || payload.includes('"thinking"') || payload.includes('"done"'))) {
                    continue;
                }
                // 检测 tool_end 事件的数据格式
                if (payload.includes('"tools"') && payload.includes('[')) {
                    continue;
                }
                // 检测包含 message 字段的工具提示
                if (payload.includes('"message"') && (payload.includes('正在') || payload.includes('深度思考') || payload.includes('查询') || payload.includes('搜索'))) {
                    continue;
                }
                // 检测深度思考内容
                if (payload.includes('"thinking"') && payload.includes(':')) {
                    continue;
                }
                
                // 尝试解析 JSON 文本块（后端用 JSON 发送以保留换行）
                let parsedPayload = payload;
                try {
                    const obj = JSON.parse(payload);
                    if (typeof obj === "string") {
                        parsedPayload = obj;
                    } else if (obj && typeof obj.text === "string") {
                        parsedPayload = obj.text;
                    }
                } catch (_) {
                    // 非 JSON 保持原样
                }
                
                if (parsedPayload) {
                    // 流式处理：累积内容到当前正文块
                    fullText += parsedPayload;
                    assistantEl.dataset.rawContent = fullText;
                    
                    // 获取或创建当前正文块
                    const textBlock = getOrCreateTextBlock();
                    if (textBlock) {
                        textBlock.dataset.rawContent = (textBlock.dataset.rawContent || "") + parsedPayload;
                        // 实时渲染（简单处理）
                        renderMarkdown(textBlock, textBlock.dataset.rawContent, false);
                        scrollToBottom();
                    }
                }

            }
        }

        // 流式输出完成后，进行最终渲染
        // 先结束当前正文块
        finalizeCurrentTextBlock();
        
        if (assistantEl) {
            assistantEl.dataset.rawContent = fullText;
            
            if (window.MarkdownEngine && window.MarkdownEngine.cancelRender) {
                // 取消所有正文块的渲染
                const textBlocks = assistantEl.querySelectorAll(".text-block");
                textBlocks.forEach(block => {
                    window.MarkdownEngine.cancelRender(block);
                });
            }
            
            // 最终渲染所有思考内容块
            const thinkingContents = assistantEl.querySelectorAll(".thinking-content");
            thinkingContents.forEach(el => {
                const rawContent = el.dataset.rawThinking || el.textContent;
                if (rawContent && window.MarkdownEngine && window.MarkdownEngine.renderFinal) {
                    window.MarkdownEngine.renderFinal(el, rawContent);
                }
            });
            
            // 最终渲染：删除流式输出的 text-block，统一渲染到 message-content
            // 这样可以修正流式输出中的渲染错误
            const textBlocksToRemove = assistantEl.querySelectorAll(".text-block");
            textBlocksToRemove.forEach(block => block.remove());
            
            const contentEl = assistantEl.querySelector(".message-content");
            if (contentEl && fullText) {
                renderMarkdown(contentEl, fullText, true);
            }
            
            const finalTokenInfo = tokenInfo || {
                model: modelSelectEl ? modelSelectEl.value || "default" : "default",
                input_tokens: 0,
                output_tokens: 0,
                total_tokens: 0
            };
            
            addMessageFooter(assistantEl, fullText, finalTokenInfo, false);
            scrollToBottom();
        }

    } catch (e) {
        if (e.name !== 'AbortError') {
            // 在最后一个正文块中显示错误
            const textBlock = getOrCreateTextBlock();
            if (textBlock) {
                textBlock.innerHTML += "<br><span style='color:red;'>[请求异常] " + e.message + "</span>";
            }
        }
        // 无论是否是 AbortError，都添加消息底部操作按钮
        if (assistantEl && !assistantEl.querySelector(".message-footer")) {
            addMessageFooter(assistantEl, fullText, null, false);
        }
    } finally {
        isStreaming = false;
        currentStreamController = null;
        currentStreamingMessageEl = null;
        updateSendButton();
    }
}

// 工具函数 - 现在使用 MarkdownEngine 模块中的函数

// 修改并重新发送消息
function editAndResendMessage(originalText, filesJson) {
    // 将原文本填入输入框
    if (userInputEl) {
        userInputEl.value = originalText;
        resetInputHeight();
        userInputEl.style.height = Math.min(userInputEl.scrollHeight, 150) + 'px';
        
        // 聚焦到输入框
        userInputEl.focus();
    }
    
    // 恢复文件到输入框上方
    if (filesJson) {
        try {
            const files = JSON.parse(filesJson);
            if (files && files.length > 0) {
                uploadedFiles = files.map(f => ({
                    id: f.id,
                    filename: f.filename || f.name,
                    filepath: f.filepath,
                    uploading: false
                }));
                renderUploadedFiles();
                updateVisionToggleVisibility();
            }
        } catch (e) {
            console.error('解析文件信息失败:', e);
        }
    }
    
    // 删除当前用户消息和其后的AI回复
    if (chatMessagesEl) {
        const messages = chatMessagesEl.querySelectorAll(".message");
        if (messages.length > 0) {
            // 找到包含原文本的用户消息并删除它及其后的所有消息
            let foundUserMsg = false;
            const toRemove = [];
            for (let i = messages.length - 1; i >= 0; i--) {
                const msg = messages[i];
                if (msg.classList.contains("message-assistant") && !foundUserMsg) {
                    toRemove.push(msg);
                } else if (msg.classList.contains("message-user")) {
                    // 找到用户消息，删除它
                    toRemove.push(msg);
                    foundUserMsg = true;
                    break;
                }
            }
            toRemove.forEach(msg => msg.remove());
        }
    }
}

// 停止流式输出
function stopStreaming() {
    if (currentStreamController) {
        currentStreamController.abort();
        currentStreamController = null;
    }
    
    // 保存已输出的部分内容
    if (currentStreamingMessageEl && currentConversationId) {
        const content = currentStreamingMessageEl.dataset.rawContent || '';
        const thinkingEl = currentStreamingMessageEl.querySelector('.thinking-content');
        const thinkingContent = thinkingEl ? thinkingEl.textContent : '';
        const model = modelSelectEl ? modelSelectEl.value : '';
        
        if (content && content.trim()) {
            // 异步保存，不阻塞 UI
            savePartialMessage(currentConversationId, content, model, thinkingContent);
        }
    }
    
    isStreaming = false;
    currentStreamingMessageEl = null;
    updateSendButton();
}

// 保存部分消息（用户中断时）
async function savePartialMessage(conversationId, content, model, thinkingContent) {
    try {
        const formData = new FormData();
        formData.append('content', content);
        if (model) formData.append('model', model);
        if (thinkingContent) formData.append('thinking_content', thinkingContent);
        
        await fetch(`${apiBase}/conversations/${conversationId}/messages/partial`, {
            method: 'POST',
            body: formData
        });
    } catch (e) {
        console.warn('保存部分消息失败:', e);
    }
}

// 更新发送按钮状态
function updateSendButton() {
    const sendBtn = document.getElementById("send-btn");
    if (!sendBtn) return;
    sendBtn.textContent = isStreaming ? "停止" : "发送";
}

// 发送消息函数
async function sendMessage() {
    if (isStreaming) {
        stopStreaming();
        return;
    }
    
    if (!currentConversationId) {
        await showAlert("请先选择或创建一个对话", { type: "warning" });
        return;
    }
    
    // 检查是否是新对话（第一条消息），如果是则根据项目筛选状态关联项目
    await maybeAssignProjectToNewConversation();
    
    // 检查是否开启了生图模式
    const toggleImageGen = document.getElementById('toggle-image-gen');
    if (toggleImageGen && toggleImageGen.checked) {
        const text = userInputEl ? userInputEl.value.trim() : "";
        if (!text) return;
        userInputEl.value = "";
        resetInputHeight();
        await sendImageGenRequest(text);
        return;
    }
    
    // 检查是否有可用的Provider
    const selectedProviderId = providerSelectEl ? providerSelectEl.value : "";
    if (!selectedProviderId && providers.length === 0) {
        await showAlert("请先配置 Provider（API服务商）\n\n点击左下角 ⚙️ 设置 → 管理 Provider", { type: "warning", title: "未配置 Provider" });
        openModal("settings-modal");
        return;
    }
    
    if (!userInputEl) return;
    
    const text = userInputEl.value.trim();
    if (!text) return;
    
    userInputEl.value = "";
    resetInputHeight();
    
    // 传递当前上传的文件列表给用户消息显示
    const filesForDisplay = uploadedFiles.length > 0 ? { files: [...uploadedFiles] } : null;
    const hadUploadedFiles = uploadedFiles.length > 0;  // 保存文件状态
    
    // 在清空文件之前，保存视觉识别模式（因为updateVisionToggleVisibility会重置）
    const visionMode = getVisionMode();
    
    appendMessage("user", text, null, true, filesForDisplay);
    
    // 清空文件预览（文件已关联到对话，不需要再显示）
    uploadedFiles = [];
    renderUploadedFiles();
    updateVisionToggleVisibility();
    
    maybeAutoTitleConversation(text);
    
    const formData = new FormData();

    formData.append("user_text", text);
    formData.append("model", modelSelectEl ? modelSelectEl.value || "" : "");
    formData.append("enable_knowledge_base", toggleKnowledgeEl && toggleKnowledgeEl.checked ? "true" : "false");
    formData.append("enable_mcp", toggleMcpEl && toggleMcpEl.checked ? "true" : "false");
    formData.append("enable_web_search", toggleWebEl && toggleWebEl.checked ? "true" : "false");
    if (toggleWebEl && toggleWebEl.checked) {
        formData.append("web_search_source", selectedWebSource || "duckduckgo");
    }
    
    // 获取 Provider ID：优先使用选中的，否则使用第一个可用的
    let providerId = providerSelectEl && providerSelectEl.value ? parseInt(providerSelectEl.value) : null;
    if ((providerId === null || isNaN(providerId)) && providers.length > 0) {
        providerId = providers[0].id;
    }
    if (providerId !== null && !isNaN(providerId)) {
        formData.append("provider_id", String(providerId));
    }
    
    // 始终使用流式输出
    formData.append("stream", "true");
    
    // 深度思考开关 - 只有当模型支持推理且用户勾选了开关时才启用
    const selectedModel = modelSelectEl ? modelSelectEl.value : "";
    const caps = modelsCaps[selectedModel] || {};
    const thinkingToggle = document.getElementById("toggle-thinking");
    const isThinkingChecked = thinkingToggle && thinkingToggle.checked;
    if (caps.reasoning && isThinkingChecked) {
        formData.append("enable_thinking", "true");
    }
    
    // 视觉识别模式（仅当模型不支持视觉且有文件时有效）
    if (hadUploadedFiles && !caps.vision && visionMode !== "none") {
        formData.append("vision_mode", visionMode);
    }
    
    // 流式传输
    isStreaming = true;
    updateSendButton();
    currentStreamController = new AbortController();
    
    // 创建AI消息元素，不显示底部（等输出完成后再添加）
    const assistantEl = appendMessage("assistant", "", null, false);
    currentStreamingMessageEl = assistantEl;
    
    // 用于存储原始markdown内容
    let fullText = "";
    let tokenInfo = null;
    
    // 辅助函数：结束当前正文块（如果有的话）
    const finalizeCurrentTextBlock = () => {
        const currentTextId = assistantEl.dataset.currentTextId;
        if (currentTextId) {
            const textBlock = document.getElementById(currentTextId);
            if (textBlock) {
                // 最终渲染 Markdown
                const rawContent = textBlock.dataset.rawContent || "";
                if (rawContent && window.MarkdownEngine && window.MarkdownEngine.renderFinal) {
                    window.MarkdownEngine.renderFinal(textBlock, rawContent);
                }
                textBlock.classList.add("completed");
            }
            delete assistantEl.dataset.currentTextId;
        }
    };
    
    // 辅助函数：获取或创建当前正文块
    const getOrCreateTextBlock = () => {
        const hintsEl = assistantEl?.querySelector(".message-hints");
        if (!hintsEl) return null;
        
        const currentTextId = assistantEl.dataset.currentTextId;
        if (currentTextId) {
            const existing = document.getElementById(currentTextId);
            if (existing) return existing;
        }
        
        // 创建新的正文块
        const textId = `text-${Date.now()}`;
        const textBlock = document.createElement("div");
        textBlock.className = "text-block markdown-body";
        textBlock.id = textId;
        textBlock.dataset.rawContent = "";
        hintsEl.appendChild(textBlock);
        assistantEl.dataset.currentTextId = textId;
        return textBlock;
    };
    
    try {
        const res = await fetch(`${apiBase}/conversations/${currentConversationId}/chat`, {
            method: "POST",
            body: formData,
            signal: currentStreamController.signal,
            headers: {
                'Accept': 'text/event-stream',
            }
        });
        
        if (!res.ok) {
            const err = await res.text();
            throw new Error(err || res.statusText);
        }
        if (!res.body) throw new Error("ReadableStream not supported");
        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        
        // 更稳定 SSE 解析：按 \n\n 分隔事件，保留 data 多行换行
        let sseBuffer = "";
        let streamDone = false;
        
        while (!currentStreamController.signal.aborted && !streamDone) {
            const { done, value } = await reader.read();
            if (done) break;
            
            sseBuffer += decoder.decode(value, { stream: true });
            
            // 统一换行符（防止 \r\n 干扰分割）
            sseBuffer = sseBuffer.replace(/\r\n/g, "\n");
            
            // SSE 事件用空行分隔
            let sepIndex;
            while ((sepIndex = sseBuffer.indexOf("\n\n")) !== -1) {
                const rawEvent = sseBuffer.slice(0, sepIndex);
                sseBuffer = sseBuffer.slice(sepIndex + 2);
                
                if (!rawEvent.trim()) continue;
                
                let eventName = "message";
                const dataLines = [];
                
                for (const line of rawEvent.split("\n")) {
                    if (line.startsWith("event:")) {
                        eventName = line.slice(6).trim() || "message";
                    } else if (line.startsWith("data:")) {
                        // SSE 标准格式: "data: content" 或 "data:content"
                        let data = line.slice(5);
                        if (data.startsWith(' ')) {
                            data = data.slice(1);
                        }
                        dataLines.push(data);
                    }
                }
                
                // 重要：多行 data 用 \n 连接（SSE 规范）
                const payload = dataLines.join("\n");
                
                if (!payload) continue;
                
                // 调试：打印所有非 message 事件
                if (eventName !== "message") {
                    console.log("[SSE] 事件类型:", eventName, "payload:", payload.substring(0, 100));
                } else {
                    // 也打印 message 事件的前100个字符，帮助调试
                    console.log("[SSE] message 事件:", payload.substring(0, 100));
                }
                
                if (eventName === "meta") {
                    try { 
                        tokenInfo = JSON.parse(payload);
                    } catch (e) {}
                    continue;
                }
                
                if (eventName === "ack") {
                    continue;
                }
                
                // 处理深度思考开始事件
                if (eventName === "thinking_start") {
                    // 先结束当前正文块
                    finalizeCurrentTextBlock();
                    try {
                        const thinkingData = JSON.parse(payload);
                        const hintsEl = assistantEl?.querySelector(".message-hints");
                        if (hintsEl) {
                            // 每次都创建新的思考块，使用时间戳作为唯一ID
                            const thinkingId = `thinking-${Date.now()}`;
                            const thinkingHint = document.createElement("div");
                            thinkingHint.className = "thinking-hint";
                            thinkingHint.id = thinkingId;
                            thinkingHint.dataset.rawThinking = "";
                            hintsEl.appendChild(thinkingHint);
                            
                            // 记录当前活跃的思考块ID
                            assistantEl.dataset.currentThinkingId = thinkingId;
                            
                            // 创建可展开的折叠框，实时显示思考过程
                            thinkingHint.innerHTML = `
                                <details class="thinking-details" open>
                                    <summary><span class="thinking-icon">🧠</span> <span class="thinking-status">${thinkingData.message || "正在深度思考..."}</span></summary>
                                    <div class="thinking-content"></div>
                                </details>
                            `;
                            scrollToBottom();
                        }
                    } catch (e) {}
                    continue;
                }

                // 处理深度思考内容事件（实时追加到当前活跃的思考块中）
                if (eventName === "thinking") {
                    console.log("[SSE] 收到 thinking 事件");
                    try {
                        const thinkingText = JSON.parse(payload);
                        const hintsEl = assistantEl?.querySelector(".message-hints");
                        if (hintsEl && thinkingText) {
                            // 获取当前活跃的思考块
                            const currentThinkingId = assistantEl.dataset.currentThinkingId;
                            let thinkingHint = currentThinkingId ? document.getElementById(currentThinkingId) : null;
                            
                            // 如果没有活跃的思考块，创建一个新的
                            if (!thinkingHint) {
                                const thinkingId = `thinking-${Date.now()}`;
                                thinkingHint = document.createElement("div");
                                thinkingHint.className = "thinking-hint";
                                thinkingHint.id = thinkingId;
                                thinkingHint.dataset.rawThinking = "";
                                thinkingHint.innerHTML = `
                                    <details class="thinking-details" open>
                                        <summary><span class="thinking-icon">🧠</span> <span class="thinking-status">正在深度思考...</span></summary>
                                        <div class="thinking-content"></div>
                                    </details>
                                `;
                                hintsEl.appendChild(thinkingHint);
                                assistantEl.dataset.currentThinkingId = thinkingId;
                            }
                            
                            if (thinkingHint && thinkingText) {
                                // 保存原始文本用于最后的 Markdown 渲染
                                thinkingHint.dataset.rawThinking = (thinkingHint.dataset.rawThinking || "") + thinkingText;
                                
                                // 实时显示（简单换行处理）
                                const thinkingContent = thinkingHint.querySelector(".thinking-content");
                                if (thinkingContent) {
                                    thinkingContent.innerHTML += thinkingText.replace(/\n/g, '<br>');
                                    scrollToBottom();
                                }
                            }
                        }
                    } catch (e) {}
                    continue;
                }

                // 处理深度思考结束事件
                if (eventName === "thinking_end") {
                    console.log("[SSE] 收到 thinking_end 事件");
                    try {
                        const thinkingData = JSON.parse(payload);
                        const hintsEl = assistantEl?.querySelector(".message-hints");
                        if (hintsEl) {
                            // 获取当前活跃的思考块
                            const currentThinkingId = assistantEl.dataset.currentThinkingId;
                            let thinkingHint = currentThinkingId ? document.getElementById(currentThinkingId) : null;
                            
                            if (!thinkingHint) {
                                // 如果没有活跃的思考块，创建一个新的
                                const thinkingId = `thinking-${Date.now()}`;
                                thinkingHint = document.createElement("div");
                                thinkingHint.className = "thinking-hint";
                                thinkingHint.id = thinkingId;
                                hintsEl.appendChild(thinkingHint);
                            }
                            
                            // 获取已有的思考内容（原始文本）
                            const existingRawContent = thinkingHint.dataset.rawThinking || "";
                            const rawContent = existingRawContent || thinkingData.thinking || "思考过程未记录";
                            
                            // 更新为完成状态（默认折叠）
                            thinkingHint.innerHTML = `
                                <details class="thinking-details">
                                    <summary><span class="thinking-icon">🧠</span> 深度思考完成</summary>
                                    <div class="thinking-content markdown-body"></div>
                                </details>
                            `;
                            thinkingHint.classList.add("completed");
                            
                            // 使用 Markdown 渲染思考内容
                            const thinkingContentEl = thinkingHint.querySelector('.thinking-content');
                            if (thinkingContentEl) {
                                if (window.MarkdownEngine && window.MarkdownEngine.renderFinal) {
                                    window.MarkdownEngine.renderFinal(thinkingContentEl, rawContent);
                                } else {
                                    thinkingContentEl.innerHTML = rawContent.replace(/\n/g, '<br>');
                                }
                            }
                            
                            // 清除当前活跃的思考块ID，以便下次创建新的
                            delete assistantEl.dataset.currentThinkingId;
                            
                            scrollToBottom();
                        }
                    } catch (e) {}
                    continue;
                }

                // 处理工具调用开始事件
                if (eventName === "tool_start") {
                    console.log("[SSE] 收到 tool_start 事件");
                    // 先结束当前正文块
                    finalizeCurrentTextBlock();
                    try {
                        const toolData = JSON.parse(payload);
                        const hintsEl = assistantEl?.querySelector(".message-hints");
                        if (hintsEl) {
                            // 每次都创建新的工具块，使用时间戳作为唯一ID
                            const toolId = `tool-${Date.now()}`;
                            const toolHint = document.createElement("div");
                            toolHint.className = "tool-hint";
                            toolHint.id = toolId;
                            hintsEl.appendChild(toolHint);
                            
                            // 记录当前活跃的工具块ID
                            assistantEl.dataset.currentToolId = toolId;
                            
                            const toolMessages = {
                                "thinking": "正在分析问题...",
                                "search_knowledge": "正在检索知识库...",
                                "web_search": "正在联网搜索...",
                                "deep_thinking": "正在深度思考...",
                                "mcp": "正在调用工具..."
                            };
                            const toolIcons = {
                                "thinking": "🔍",
                                "search_knowledge": "📚",
                                "web_search": "🌐",
                                "deep_thinking": "🧠",
                                "mcp": "🔧"
                            };
                            const msg = toolMessages[toolData.status] || toolData.message || "正在处理...";
                            const icon = toolIcons[toolData.status] || "🔍";
                            toolHint.innerHTML = `<span class="tool-icon">${icon}</span> <span class="tool-status">${msg}</span><div class="tool-progress-list"></div>`;
                            scrollToBottom();
                        }
                    } catch (e) {}
                    continue;
                }

                // 处理工具调用进度事件（实时显示每次搜索）
                if (eventName === "tool_progress") {
                    console.log("[SSE] 收到 tool_progress 事件");
                    try {
                        const progressData = JSON.parse(payload);
                        const hintsEl = assistantEl?.querySelector(".message-hints");
                        if (hintsEl) {
                            // 获取当前活跃的工具块
                            const currentToolId = assistantEl.dataset.currentToolId;
                            let toolHint = currentToolId ? document.getElementById(currentToolId) : null;
                            
                            // 如果没有活跃的工具块，创建一个新的
                            if (!toolHint) {
                                const toolId = `tool-${Date.now()}`;
                                toolHint = document.createElement("div");
                                toolHint.className = "tool-hint";
                                toolHint.id = toolId;
                                toolHint.innerHTML = `<span class="tool-icon">🔍</span> <span class="tool-status">正在处理...</span><div class="tool-progress-list"></div>`;
                                hintsEl.appendChild(toolHint);
                                assistantEl.dataset.currentToolId = toolId;
                            }
                            
                            let progressList = toolHint.querySelector(".tool-progress-list");
                            if (!progressList) {
                                progressList = document.createElement("div");
                                progressList.className = "tool-progress-list";
                                toolHint.appendChild(progressList);
                            }
                            
                            if (progressData.stage === "start") {
                                // 添加新的进度项
                                const progressItem = document.createElement("div");
                                progressItem.className = "tool-progress-item";
                                progressItem.dataset.tool = progressData.tool;
                                progressItem.innerHTML = `<span class="progress-icon">⏳</span> ${progressData.message}`;
                                progressList.appendChild(progressItem);
                            } else if (progressData.stage === "done") {
                                // 更新最后一个进度项为完成状态
                                const items = progressList.querySelectorAll(".tool-progress-item");
                                if (items.length > 0) {
                                    const lastItem = items[items.length - 1];
                                    lastItem.innerHTML = `<span class="progress-icon">✓</span> ${progressData.message}`;
                                    lastItem.classList.add("done");
                                }
                            } else if (progressData.stage === "error") {
                                // 更新为错误状态
                                const items = progressList.querySelectorAll(".tool-progress-item");
                                if (items.length > 0) {
                                    const lastItem = items[items.length - 1];
                                    lastItem.innerHTML = `<span class="progress-icon">✗</span> ${progressData.message}`;
                                    lastItem.classList.add("error");
                                }
                            }
                            scrollToBottom();
                        }
                    } catch (e) {
                        console.error("解析工具进度事件失败:", e);
                    }
                    continue;
                }

                // 处理工具调用结束事件
                if (eventName === "tool_end") {
                    console.log("[SSE-2] 收到 tool_end 事件");
                    try {
                        const toolData = JSON.parse(payload);
                        console.log("[tool_end-2] 解析的数据:", toolData);
                        const hintsEl = assistantEl?.querySelector(".message-hints");
                        console.log("[tool_end-2] hintsEl:", hintsEl);
                        if (hintsEl) {
                            // 获取当前活跃的工具块
                            const currentToolId = assistantEl.dataset.currentToolId;
                            let toolHint = currentToolId ? document.getElementById(currentToolId) : null;
                            
                            // 如果模型跳过了工具调用，直接移除当前工具提示
                            if (toolData.status === "skipped") {
                                if (toolHint) {
                                    toolHint.remove();
                                }
                                delete assistantEl.dataset.currentToolId;
                                scrollToBottom();
                                continue;
                            }
                            
                            if (!toolHint) {
                                const toolId = `tool-${Date.now()}`;
                                toolHint = document.createElement("div");
                                toolHint.className = "tool-hint";
                                toolHint.id = toolId;
                                hintsEl.appendChild(toolHint);
                            }
                            console.log("[tool_end-2] toolHint元素:", toolHint);
                            
                            if (toolData.tools && toolData.tools.length > 0) {
                                const toolCount = toolData.tools.length;
                                
                                // 判断是否包含 MCP 工具
                                const hasMcpTool = toolData.tools.some(t => t.name && t.name.startsWith("mcp_"));
                                const toolIcon = hasMcpTool ? "🔌" : "🛠️";
                                
                                const htmlContent = `
                                    <details class="tool-details">
                                        <summary><span class="tool-icon">${toolIcon}</span> <span class="tool-status">工具调用完成 (${toolCount}次)</span></summary>
                                        <div class="tool-details-content">
                                            ${toolData.tools.map((t, idx) => {
                                                // 格式化 MCP 工具名称显示
                                                let displayName = t.name;
                                                if (t.name && t.name.startsWith("mcp_")) {
                                                    const parts = t.name.split("_");
                                                    if (parts.length >= 3) {
                                                        displayName = "MCP:" + parts[1] + ":" + parts.slice(2).join("_");
                                                    }
                                                }
                                                return '<div class="tool-call-item">' +
                                                    '<div class="tool-call-name">' + (idx + 1) + '. ' + displayName + '</div>' +
                                                    '<div class="tool-call-args">' + JSON.stringify(t.args, null, 2) + '</div>' +
                                                    (t.result_preview ? '<div class="tool-call-result">结果: ' + t.result_preview + '</div>' : '') +
                                                    (t.error ? '<div class="tool-call-error">错误: ' + t.error + '</div>' : '') +
                                                '</div>';
                                            }).join("")}
                                        </div>
                                    </details>
                                `;
                                
                                console.log("[tool_end-2] 设置的HTML:", htmlContent.substring(0, 200));
                                toolHint.innerHTML = htmlContent;
                                toolHint.classList.add("completed");
                            } else {
                                // 没有工具调用，移除提示
                                toolHint.remove();
                            }
                            
                            // 清除当前活跃的工具块ID，以便下次创建新的
                            delete assistantEl.dataset.currentToolId;
                            
                            scrollToBottom();
                        }
                    } catch (e) {
                        console.error("[tool_end-2] 解析失败:", e);
                    }
                    continue;
                }

                // 处理视觉识别开始事件
                if (eventName === "vision_start") {
                    console.log("[SSE] 收到 vision_start 事件");
                    try {
                        const visionData = JSON.parse(payload);
                        const hintsEl = assistantEl?.querySelector(".message-hints");
                        if (hintsEl) {
                            let visionHint = hintsEl.querySelector(".vision-hint");
                            if (!visionHint) {
                                visionHint = document.createElement("div");
                                visionHint.className = "vision-hint";
                                hintsEl.appendChild(visionHint);
                            }
                            const fileTypeMap = {
                                "pdf": "PDF",
                                "image": "图片",
                                "document": "文档"
                            };
                            const fileTypeText = fileTypeMap[visionData.file_type] || "文件";
                            const statusMessage = visionData.message || `${visionData.model} 正在识别${fileTypeText}...`;
                            visionHint.innerHTML = `
                                <details class="vision-details" open>
                                    <summary><span class="vision-icon">👁️</span> <span class="vision-status">${statusMessage}</span></summary>
                                    <div class="vision-content markdown-body"></div>
                                </details>
                            `;
                            scrollToBottom();
                        }
                    } catch (e) {
                        console.error("解析视觉识别开始事件失败:", e);
                    }
                    continue;
                }

                // 处理视觉识别进度事件
                if (eventName === "vision_progress") {
                    console.log("[SSE] 收到 vision_progress 事件");
                    try {
                        const progressData = JSON.parse(payload);
                        const hintsEl = assistantEl?.querySelector(".message-hints");
                        if (hintsEl) {
                            const visionStatus = hintsEl.querySelector(".vision-hint .vision-status");
                            if (visionStatus && progressData.message) {
                                const modelName = visionStatus.textContent.split(" ")[0];
                                visionStatus.textContent = `${modelName} ${progressData.message}`;
                            }
                        }
                    } catch (e) {}
                    continue;
                }

                // 处理视觉识别内容块事件
                if (eventName === "vision_chunk") {
                    try {
                        const chunkText = JSON.parse(payload);
                        const hintsEl = assistantEl?.querySelector(".message-hints");
                        if (hintsEl) {
                            const visionHint = hintsEl.querySelector(".vision-hint");
                            const visionContent = visionHint?.querySelector(".vision-content");
                            if (visionContent && chunkText) {
                                // 累积原始文本
                                if (!visionContent.dataset.rawContent) {
                                    visionContent.dataset.rawContent = "";
                                }
                                visionContent.dataset.rawContent += chunkText;
                                
                                // 使用 Markdown 流式渲染
                                if (window.MarkdownEngine && window.MarkdownEngine.renderStreaming) {
                                    window.MarkdownEngine.renderStreaming(visionContent, visionContent.dataset.rawContent);
                                } else {
                                    visionContent.innerHTML = visionContent.dataset.rawContent.replace(/\n/g, '<br>');
                                }
                                scrollToBottom();
                            }
                        }
                    } catch (e) {}
                    continue;
                }

                // 处理视觉识别结束事件
                if (eventName === "vision_end") {
                    console.log("[SSE] 收到 vision_end 事件");
                    try {
                        const visionData = JSON.parse(payload);
                        const hintsEl = assistantEl?.querySelector(".message-hints");
                        if (hintsEl) {
                            let visionHint = hintsEl.querySelector(".vision-hint");
                            if (visionHint) {
                                // 获取累积的原始内容
                                const visionContentEl = visionHint.querySelector(".vision-content");
                                const rawContent = visionContentEl?.dataset?.rawContent || visionContentEl?.textContent || "";
                                
                                const fileTypeMap = {
                                    "pdf": "PDF",
                                    "image": "图片",
                                    "document": "文档"
                                };
                                const fileTypeText = fileTypeMap[visionData.file_type] || "文件";
                                
                                visionHint.innerHTML = `
                                    <details class="vision-details">
                                        <summary><span class="vision-icon">👁️</span> <span class="vision-status">${fileTypeText}识别完成</span></summary>
                                        <div class="vision-content markdown-body"></div>
                                    </details>
                                `;
                                visionHint.classList.add("completed");
                                
                                // 使用 Markdown 渲染视觉识别内容
                                const visionContentNewEl = visionHint.querySelector('.vision-content');
                                if (visionContentNewEl) {
                                    if (window.MarkdownEngine && window.MarkdownEngine.renderFinal) {
                                        window.MarkdownEngine.renderFinal(visionContentNewEl, rawContent);
                                    } else {
                                        visionContentNewEl.innerHTML = rawContent.replace(/\n/g, '<br>');
                                    }
                                }
                                
                                scrollToBottom();
                            }
                        }
                    } catch (e) {
                        console.error("解析视觉识别结束事件失败:", e);
                    }
                    continue;
                }
                
                // message 正文
                // 忽略 user_message_id / message_id 等元数据
                if (payload.includes("user_message_id") || payload.includes("message_id")) {
                    continue;
                }
                
                // 过滤掉深度思考和工具调用相关的 JSON（防止显示在正文中）
                if (payload.includes('"status"') && (payload.includes('"thinking"') || payload.includes('"search_knowledge"') || payload.includes('"web_search"') || payload.includes('"done"'))) {
                    console.log("[SSE] 过滤状态JSON:", payload.substring(0, 50));
                    continue;
                }
                if (payload.includes('"tools"') && payload.includes('[')) {
                    console.log("[SSE] 过滤工具结果JSON:", payload.substring(0, 50));
                    continue;
                }
                if (payload.includes('"message"') && (payload.includes('正在') || payload.includes('深度思考') || payload.includes('查询') || payload.includes('搜索'))) {
                    console.log("[SSE] 过滤消息JSON:", payload.substring(0, 50));
                    continue;
                }
                if (payload.includes('"thinking"') && payload.includes(':')) {
                    console.log("[SSE] 过滤思考内容JSON:", payload.substring(0, 50));
                    continue;
                }

                // 尝试解析 JSON 文本块（后端用 JSON text 发送以保留换行）
                let parsedPayload = payload;
                try {
                    const obj = JSON.parse(payload);
                    if (typeof obj === "string") {
                        parsedPayload = obj;
                    } else if (obj && typeof obj.text === "string") {
                        parsedPayload = obj.text;
                    }
                } catch (_) {
                    // 非 JSON 保持原样
                }

                if (parsedPayload === "[DONE]") {
                    streamDone = true;
                    break;
                }

                if (parsedPayload && typeof parsedPayload === "string" && parsedPayload.startsWith("[错误]")) {
                    const contentEl = assistantEl?.querySelector(".message-content");
                    if (contentEl) {
                        contentEl.innerHTML += `<br><span style="color:red;">${parsedPayload}</span>`;
                    }
                    streamDone = true;
                    break;
                }
                
                // 兜底：疑似 token JSON 不进入正文
                if (/\"(input_tokens|output_tokens|total_tokens)\"\s*:/.test(parsedPayload)) {
                    try { 
                        tokenInfo = JSON.parse(parsedPayload); 
                    } catch (e) {}
                    continue;
                }
                
                if (parsedPayload) {
                    // 流式处理：累积内容到当前正文块
                    fullText += parsedPayload;
                    assistantEl.dataset.rawContent = fullText;
                    
                    // 获取或创建当前正文块
                    const textBlock = getOrCreateTextBlock();
                    if (textBlock) {
                        textBlock.dataset.rawContent = (textBlock.dataset.rawContent || "") + parsedPayload;
                        // 实时渲染（简单处理）
                        renderMarkdown(textBlock, textBlock.dataset.rawContent, false);
                        scrollToBottom();
                    }
                }
            }
        }
        
        // 流式输出完成后，进行最终渲染
        // 先结束当前正文块
        finalizeCurrentTextBlock();
        
        if (assistantEl) {
            assistantEl.dataset.rawContent = fullText;
            
            // 取消待处理的渲染
            if (window.MarkdownEngine && window.MarkdownEngine.cancelRender) {
                const textBlocks = assistantEl.querySelectorAll(".text-block");
                textBlocks.forEach(block => {
                    window.MarkdownEngine.cancelRender(block);
                });
            }
            
            // 最终渲染所有思考内容块
            const thinkingContents = assistantEl.querySelectorAll(".thinking-content");
            thinkingContents.forEach(el => {
                const rawContent = el.dataset.rawThinking || el.textContent;
                if (rawContent && window.MarkdownEngine && window.MarkdownEngine.renderFinal) {
                    window.MarkdownEngine.renderFinal(el, rawContent);
                }
            });
            
            // 最终渲染：删除流式输出的 text-block，统一渲染到 message-content
            // 这样可以修正流式输出中的渲染错误
            const textBlocksToRemove = assistantEl.querySelectorAll(".text-block");
            textBlocksToRemove.forEach(block => block.remove());
            
            const contentEl = assistantEl.querySelector(".message-content");
            if (contentEl && fullText) {
                renderMarkdown(contentEl, fullText, true);
            }
            
            // 添加底部信息
            const finalTokenInfo = tokenInfo || {
                model: modelSelectEl ? modelSelectEl.value || "default" : "default",
                input_tokens: 0,
                output_tokens: 0,
                total_tokens: 0
            };
            addMessageFooter(assistantEl, fullText, finalTokenInfo, false);
            scrollToBottom();
        }

    } catch (e) {
        if (e.name !== 'AbortError') {
            const contentEl = assistantEl ? assistantEl.querySelector(".message-content") : null;
            if (contentEl) {
                contentEl.innerHTML += "<br><span style='color:red;'>[请求异常] " + e.message + "</span>";
            }
        }
        // 无论是否是 AbortError，都添加消息底部操作按钮
        if (assistantEl && !assistantEl.querySelector(".message-footer")) {
            addMessageFooter(assistantEl, fullText, null, false);
        }
    } finally {
        isStreaming = false;
        currentStreamController = null;
        currentStreamingMessageEl = null;
        updateSendButton();
    }
}

// 对话管理函数
let isSelectingConversation = false;

async function selectConversation(id) {
    if (isSelectingConversation) {
        return;
    }

    isSelectingConversation = true;

    try {
        // 切换前：停止流式
        if (isStreaming) {
            stopStreaming();
            await new Promise(resolve => setTimeout(resolve, 80));
        }

        if (currentStreamingMessageEl) {
            const oldContentEl = currentStreamingMessageEl.querySelector(".message-content");
        }

        // 重置运行态引用
        isStreaming = false;
        currentStreamController = null;
        currentStreamingMessageEl = null;

        // 2) 正常切换逻辑
        currentConversationId = id;
        const conv = conversations.find(c => c.id === id);
        if (!conv) return;

        if (chatTitleEl) chatTitleEl.textContent = conv.title;

        await loadMessages(id);
        
        // 加载对话的已上传文件
        await loadConversationFiles(id);

        if (conv.model && modelSelectEl) modelSelectEl.value = conv.model;

        if (conv.provider_id && providerSelectEl) {
            providerSelectEl.value = String(conv.provider_id);
        } else if (providerSelectEl) {
            providerSelectEl.value = "";
        }

        if (toggleKnowledgeEl) toggleKnowledgeEl.checked = !!conv.enable_knowledge_base;
        // MCP 按钮状态根据是否有选中的服务来判断，而不是根据会话设置
        updateMcpToggleState();
        if (toggleWebEl) toggleWebEl.checked = !!conv.enable_web_search;

        renderConversationList();
    } catch (error) {
        console.error("切换对话失败:", error);
        await showError("切换对话失败，请重试");
    } finally {
        isSelectingConversation = false;
    }
}


async function loadMessages(conversationId) {
    try {
        const res = await fetch(`${apiBase}/conversations/${conversationId}/messages`);
        if (!res.ok) {
            console.error("加载消息失败:", res.status);
            return;
        }
        const raw = await res.json();
        const msgs = normalizeApiResponse(raw) || [];
        
        if (chatMessagesEl) chatMessagesEl.innerHTML = "";
        
        // 标记是否需要为第一条用户消息加载文件
        let firstUserMsgEl = null;
        
        msgs.forEach(msg => {

            // 使用数据库中保存的token信息
            let tokenInfo = null;
            
            if (msg.role === "assistant") {
                // 检查是否有保存的token信息
                if (msg.input_tokens !== null || msg.output_tokens !== null || msg.total_tokens !== null) {
                    tokenInfo = {
                        input_tokens: msg.input_tokens || 0,
                        output_tokens: msg.output_tokens || 0,
                        total_tokens: msg.total_tokens || 0,
                        model: msg.model || "未知模型"
                    };
                } else {
                    // 如果没有token信息，显示为历史消息
                    tokenInfo = {
                        input_tokens: 0,
                        output_tokens: 0,
                        total_tokens: 0,
                        model: "历史消息"
                    };
                }
            }

            // 构建额外数据（工具调用、深度思考内容、视觉识别内容和消息事件流）
            let extraData = null;
            if (msg.role === "assistant" && (msg.tool_calls || msg.thinking_content || msg.vision_content || msg.message_events)) {
                extraData = {
                    tool_calls: msg.tool_calls,
                    thinking_content: msg.thinking_content,
                    vision_content: msg.vision_content,
                    message_events: msg.message_events
                };
            }

            const msgEl = appendMessage(msg.role, msg.content, tokenInfo, true, extraData);
            
            // 记录第一条用户消息元素，稍后异步加载文件
            if (msg.role === "user" && !firstUserMsgEl) {
                firstUserMsgEl = msgEl;
            }
        });

        scrollToBottom();
        
        // 异步加载文件并显示在用户消息中
        // 由于文件是关联到对话而不是单条消息，所以显示在第一条用户消息上
        if (firstUserMsgEl) {
            loadAndShowFilesForMessage(conversationId, firstUserMsgEl);
        }
    } catch(e) { 
        console.error("加载消息失败:", e);
        if (chatMessagesEl) {
            chatMessagesEl.innerHTML = "<div style='color: #e74c3c; padding: 20px; text-align: center;'>加载消息失败，请重试</div>";
        }
    }
}

// 异步加载对话文件并显示在消息中
async function loadAndShowFilesForMessage(conversationId, msgEl) {
    try {
        console.log('[Files] 加载对话文件, conversationId:', conversationId);
        const filesRes = await fetch(`${apiBase}/conversations/${conversationId}/files`);
        if (!filesRes.ok) {
            console.warn('[Files] 加载文件失败, status:', filesRes.status);
            return;
        }
        
        const files = await filesRes.json();
        console.log('[Files] 获取到文件:', files);
        if (!files || files.length === 0) return;
        
        // 检查是否已经有文件显示
        if (msgEl.querySelector('.user-message-files')) return;
        
        // 创建文件显示元素
        const filesEl = document.createElement("div");
        filesEl.className = "user-message-files";
        files.forEach(file => {
            const fileEl = document.createElement("span");
            fileEl.className = "user-message-file";
            fileEl.textContent = `📎 ${file.filename || '文件'}`;
            filesEl.appendChild(fileEl);
        });
        
        // 插入到编辑按钮之前
        const actionsEl = msgEl.querySelector('.user-message-actions');
        if (actionsEl) {
            msgEl.insertBefore(filesEl, actionsEl);
        } else {
            msgEl.appendChild(filesEl);
        }
    } catch (e) {
        console.warn("加载对话文件失败:", e);
    }
}

function getFirstUserMessageText() {
    try {
        const msgEls = document.querySelectorAll('#chat-messages .message');
        for (const el of msgEls) {
            if (el.classList.contains('message-user')) {
                const txt = (el.textContent || '').trim();
                if (txt) return txt;
            }
        }
    } catch (e) {
        console.warn('读取首条用户消息失败:', e);
    }
    return "";
}

async function maybeAutoTitleConversation(firstUserMessage = null) {
    if (!currentConversationId) return;
    const conv = conversations.find(c => c.id === currentConversationId);
    if (!conv) return;
    const currentTitle = (conv.title || "").trim();
    if (currentTitle && currentTitle !== "新对话" && currentTitle !== "无标题对话") {
        autoTitleRequested.add(conv.id);
        return;
    }
    if (autoTitling || autoTitleRequested.has(conv.id)) return;

    autoTitling = true;
    autoTitleRequested.add(conv.id);
    try {
        const formData = new FormData();
        if (modelSelectEl && modelSelectEl.value) {
            formData.append("model", modelSelectEl.value);
        }
        const first = firstUserMessage || getFirstUserMessageText();
        if (first) formData.append('first_user_message', first);

        const res = await fetch(`${apiBase}/conversations/${currentConversationId}/auto-title`, {
            method: "POST",
            body: formData
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(text || "自动命名失败");
        }
        const raw = await res.json();
        const data = normalizeApiResponse(raw);
        const newTitle = data?.title || data?.conversation?.title || raw?.title || raw?.conversation?.title;
        if (newTitle) {
            if (chatTitleEl) chatTitleEl.textContent = newTitle;
            const idx = conversations.findIndex(c => c.id === currentConversationId);
            if (idx >= 0) {
                conversations[idx] = { ...conversations[idx], title: newTitle };
            }
            renderConversationList();
        }
    } catch (err) {
        console.warn("自动命名失败", err);
        autoTitleRequested.delete(currentConversationId);
    } finally {
        autoTitling = false;
    }
}

// 事件监听器设置
function setupEventListeners() {

    // Modal关闭按钮
    document.querySelectorAll(".modal-close").forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.getAttribute("data-target");
            const returnTo = btn.getAttribute("data-return");
            if (target) closeModal(target);
            // 如果有返回目标，打开返回的modal
            if (returnTo) openModal(returnTo);
        });
    });

    // 点击Modal外部关闭
    window.addEventListener("click", (e) => {
        if (e.target.classList.contains("modal")) {
            e.target.classList.remove("open");
        }
    });

    // 新对话按钮
    const newConvBtn = document.getElementById("new-conversation-btn");
    if (newConvBtn) {
        newConvBtn.addEventListener("click", async () => {
            await createNewConversation();
        });
    }

    // 设置按钮
    const settingsBtn = document.getElementById("settings-btn");
    if (settingsBtn) {
        settingsBtn.addEventListener("click", async () => {
            try {
                await loadSettings();
                openModal("settings-modal");
            } catch(e) {
                console.error("打开设置失败:", e);
                await showError("打开设置失败: " + e.message);
            }
        });
    }

    // 发送按钮
    const sendBtn = document.getElementById("send-btn");
    if (sendBtn) {
        sendBtn.addEventListener("click", () => {
            sendMessage();
        });
    }

    // 输入框键盘事件
    if (userInputEl) {
        userInputEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!isStreaming) {
                    sendMessage();
                }
            }
        });
    }

    // 管理按钮事件
    const manageProvidersBtn = document.getElementById("manage-providers-btn");
    if (manageProvidersBtn) {
        manageProvidersBtn.addEventListener("click", async () => {
            closeModal("settings-modal");
            await loadProviders();
            renderProviderList();
            openModal("provider-modal");
        });
    }

    const manageKnowledgeBtn = document.getElementById("manage-knowledge-btn");
    if (manageKnowledgeBtn) {
        manageKnowledgeBtn.addEventListener("click", async () => {
            closeModal("settings-modal");
            await loadKnowledgeBases();
            await loadEmbeddingModels();
            openModal("knowledge-modal");
        });
    }

    const manageMcpBtn = document.getElementById("manage-mcp-btn");
    if (manageMcpBtn) {
        manageMcpBtn.addEventListener("click", async () => {
            closeModal("settings-modal");
            await loadMCPServers();
            openModal("mcp-modal");
        });
    }

    // 导出日志按钮
    const exportLogsBtn = document.getElementById("export-logs-btn");
    if (exportLogsBtn) {
        exportLogsBtn.addEventListener("click", async () => {
            const hoursSelect = document.getElementById("export-logs-hours");
            const hours = hoursSelect ? hoursSelect.value : 24;
            
            exportLogsBtn.disabled = true;
            exportLogsBtn.textContent = "导出中...";
            
            try {
                const response = await fetch(`${apiBase}/logs/export?hours=${hours}`);
                if (!response.ok) {
                    throw new Error("导出失败");
                }
                
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                
                // 从响应头获取文件名
                const disposition = response.headers.get("Content-Disposition");
                let filename = "debug_logs.zip";
                if (disposition) {
                    const match = disposition.match(/filename=(.+)/);
                    if (match) filename = match[1];
                }
                
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                exportLogsBtn.textContent = "✓ 已导出";
                setTimeout(() => {
                    exportLogsBtn.textContent = "导出日志";
                    exportLogsBtn.disabled = false;
                }, 2000);
            } catch (e) {
                await showError("导出日志失败: " + e.message);
                exportLogsBtn.textContent = "导出日志";
                exportLogsBtn.disabled = false;
            }
        });
    }

    const manageSearchKeysBtn = document.getElementById("manage-search-keys-btn");
    if (manageSearchKeysBtn) {
        manageSearchKeysBtn.addEventListener("click", async () => {
            closeModal("settings-modal");
            openModal("search-config-modal");
        });
    }

    // Provider form submission - 已在 initProviderForms 中处理，这里跳过
    // Provider form reset - 已在 initProviderForms 中处理，这里跳过
    
    // 模型和Provider选择器自动保存
    if (modelSelectEl) {
        modelSelectEl.addEventListener("change", async () => {
            // 自动保存当前对话的模型设置
            if (currentConversationId) {
                try {
                    const formData = new FormData();
                    formData.append("model", modelSelectEl.value);
                    
                    const res = await fetch(`${apiBase}/conversations/${currentConversationId}/model`, {
                        method: "POST",
                        body: formData
                    });
                    
                    if (!res.ok) {
                        console.error("保存模型设置失败:", await res.text());
                    }
                } catch (e) {
                    console.error("保存模型设置失败:", e);
                }
            }
            
            // 更新视觉识别开关的显示状态
            updateVisionToggleVisibility();
        });
    }
    
    if (providerSelectEl) {
        providerSelectEl.addEventListener("change", async () => {
            // 自动保存当前对话的Provider设置
            if (currentConversationId) {
                try {
                    const formData = new FormData();
                    formData.append("provider_id", providerSelectEl.value || "");
                    
                    const res = await fetch(`${apiBase}/conversations/${currentConversationId}/provider`, {
                        method: "POST",
                        body: formData
                    });
                    
                    if (!res.ok) {
                        console.error("保存Provider设置失败:", await res.text());
                    }
                } catch (e) {
                    console.error("保存Provider设置失败:", e);
                }
            }
        });
    }
    
    // MCP 弹出选择框
    initMcpTogglePopup();
    
    // 生图弹出选择框
    initImageGenTogglePopup();
}

// 初始化 MCP 弹出选择框
function initMcpTogglePopup() {
    const wrapper = document.getElementById('mcp-toggle-wrapper');
    const checkbox = document.getElementById('toggle-mcp');
    const popup = document.getElementById('mcp-popup');
    
    console.log('[MCP] 初始化弹窗:', { wrapper: !!wrapper, checkbox: !!checkbox, popup: !!popup });
    
    if (!wrapper || !checkbox || !popup) {
        console.warn('[MCP] 弹窗元素未找到');
        return;
    }
    
    const label = wrapper.querySelector('label');
    if (!label) {
        console.warn('[MCP] label 元素未找到');
        return;
    }
    
    // 点击 label 时直接弹出选择框
    label.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('[MCP] label 被点击');
        
        // 关闭其他弹窗
        document.querySelectorAll('.toggle-with-popup.open').forEach(el => {
            if (el !== wrapper) el.classList.remove('open');
        });
        
        const isOpen = wrapper.classList.contains('open');
        
        if (isOpen) {
            wrapper.classList.remove('open');
        } else {
            wrapper.classList.add('open');
            updateTogglePopupPosition(wrapper, popup);
            updateMcpPopupOptions();
        }
    });
}

// 更新弹出框位置
function updateTogglePopupPosition(wrapper, popup) {
    const label = wrapper.querySelector('label');
    if (!label) return;
    
    const rect = label.getBoundingClientRect();
    const popupWidth = popup.offsetWidth || 200;
    
    // 计算居中位置
    let left = rect.left + (rect.width / 2) - (popupWidth / 2);
    
    // 确保不超出屏幕左边
    if (left < 10) left = 10;
    // 确保不超出屏幕右边
    if (left + popupWidth > window.innerWidth - 10) {
        left = window.innerWidth - popupWidth - 10;
    }
    
    popup.style.left = left + 'px';
    popup.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
}

// 更新 MCP 弹出框选项
function updateMcpPopupOptions() {
    const optionsContainer = document.getElementById('mcp-options');
    const toggleMcp = document.getElementById('toggle-mcp');
    if (!optionsContainer) return;
    
    console.log('[MCP] 更新弹出框选项, mcpServers:', mcpServers);
    
    optionsContainer.innerHTML = '';
    
    // 显示所有已启用的 MCP 服务器（不管是否运行中）
    const availableServers = mcpServers.filter(s => s.enabled !== false);
    
    console.log('[MCP] 可用服务器:', availableServers);
    
    if (availableServers.length === 0) {
        optionsContainer.innerHTML = '<div class="toggle-popup-empty">暂无可用的 MCP 服务</div>';
        // 没有可用服务时，关闭按钮
        if (toggleMcp) toggleMcp.checked = false;
        return;
    }
    
    availableServers.forEach(server => {
        const option = document.createElement('label');
        option.className = 'toggle-popup-option';
        
        // 显示运行状态
        const statusIcon = server.running ? '🟢' : '⚪';
        const toolsInfo = server.running && server.tools ? `${server.tools.length}个工具` : '未启动';
        
        option.innerHTML = `
            <input type="checkbox" value="${server.name}" ${server.selected ? 'checked' : ''}>
            <span>${statusIcon} ${server.name}</span>
            <small style="color: var(--text-muted); margin-left: 8px;">${toolsInfo}</small>
        `;
        
        const checkbox = option.querySelector('input');
        checkbox.addEventListener('change', async () => {
            // 更新服务器选中状态
            server.selected = checkbox.checked;
            
            // 先保存工具设置（确保状态被保存）
            saveToolSettings();
            
            if (checkbox.checked) {
                // 勾选时启动服务器（如果未运行）
                if (!server.running) {
                    // 显示启动中状态
                    const small = option.querySelector('small');
                    if (small) small.textContent = '启动中...';
                    
                    await startMcpServerIfNeeded(server.name);
                    // startMcpServerIfNeeded 内部会调用 loadMCPServers -> updateMcpPopupOptions
                    // 所以这里不需要再调用 updateMcpPopupOptions
                }
            }
            
            // 根据是否有任何选中项来更新主 toggle 状态
            updateMcpToggleState();
        });
        
        optionsContainer.appendChild(option);
    });
    
    // 初始化时同步主 toggle 状态
    updateMcpToggleState();
}

// 更新 MCP 主按钮状态（根据是否有选中的服务）
function updateMcpToggleState() {
    const toggleMcp = document.getElementById('toggle-mcp');
    if (!toggleMcp) return;
    
    // 检查是否有任何选中的服务器
    const anySelected = mcpServers.some(s => s.selected);
    toggleMcp.checked = anySelected;
}

// ========== 生图功能 ==========

// 初始化生图弹出选择框
function initImageGenTogglePopup() {
    const wrapper = document.getElementById('image-gen-toggle-wrapper');
    const checkbox = document.getElementById('toggle-image-gen');
    const popup = document.getElementById('image-gen-popup');
    
    if (!wrapper || !checkbox || !popup) {
        return;
    }
    
    const label = wrapper.querySelector('label');
    if (!label) {
        return;
    }
    
    // 点击 label 时弹出选择框
    label.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 关闭其他弹窗
        document.querySelectorAll('.toggle-with-popup.open').forEach(el => {
            if (el !== wrapper) el.classList.remove('open');
        });
        
        const isOpen = wrapper.classList.contains('open');
        
        if (isOpen) {
            wrapper.classList.remove('open');
        } else {
            wrapper.classList.add('open');
            updateTogglePopupPosition(wrapper, popup);
        }
    });
}

// 发送生图请求
async function sendImageGenRequest(prompt) {
    // 使用当前选择的模型
    const selectedModel = modelSelectEl ? modelSelectEl.value : '';
    const selectedProviderId = providerSelectEl ? providerSelectEl.value : '';
    
    if (!selectedModel) {
        await showAlert('请先选择生图模型', { type: 'warning' });
        return null;
    }
    
    // 获取尺寸输入框的值
    const widthInput = document.getElementById('image-gen-width');
    const heightInput = document.getElementById('image-gen-height');
    const width = widthInput?.value || '1024';
    const height = heightInput?.value || '1024';
    const size = `${width}x${height}`;
    
    // 显示生成中的消息
    appendMessage('user', `[生图] ${prompt}`);
    const assistantEl = appendMessage('assistant', '🎨 正在生成图片，请稍候...', null, false);
    
    try {
        const formData = new FormData();
        formData.append('prompt', prompt);
        formData.append('model', selectedModel);
        formData.append('size', size);
        formData.append('n', '1');
        if (selectedProviderId) {
            formData.append('provider_id', selectedProviderId);
        }
        if (currentConversationId) {
            formData.append('conversation_id', currentConversationId);
        }
        
        const res = await fetch(`${apiBase}/images/generate`, {
            method: 'POST',
            body: formData
        });
        
        const result = await res.json();
        
        if (result.success && result.images && result.images.length > 0) {
            // 构建图片显示内容
            let content = `**生成完成** (模型: ${selectedModel}, 尺寸: ${size})\n\n`;
            result.images.forEach((img, i) => {
                if (img.url) {
                    content += `![生成的图片 ${i + 1}](${img.url})\n\n`;
                } else if (img.b64_json) {
                    content += `![生成的图片 ${i + 1}](data:image/png;base64,${img.b64_json})\n\n`;
                }
            });
            
            // 更新消息内容
            const contentEl = assistantEl?.querySelector('.message-content');
            if (contentEl) {
                renderMarkdown(contentEl, content, true);
            }
            
            // 添加底部操作栏
            addMessageFooter(assistantEl, content, null);
            
            return result;
        } else {
            const errorMsg = result.error || '生成失败，请重试';
            const contentEl = assistantEl?.querySelector('.message-content');
            if (contentEl) {
                contentEl.innerHTML = `<span style="color: red;">❌ ${errorMsg}</span>`;
            }
            return null;
        }
    } catch (e) {
        console.error('生图请求失败:', e);
        const contentEl = assistantEl?.querySelector('.message-content');
        if (contentEl) {
            contentEl.innerHTML = `<span style="color: red;">❌ 请求失败: ${e.message}</span>`;
        }
        return null;
    }
}

// 全局点击关闭弹出框
document.addEventListener('click', (e) => {
    if (!e.target.closest('.toggle-with-popup')) {
        document.querySelectorAll('.toggle-with-popup.open').forEach(el => {
            el.classList.remove('open');
        });
    }
});

// 设置事件监听器
function setupSettingsEventListeners() {
    // 界面比例选择器
    const layoutScaleSelect = document.getElementById("layout-scale-select");
    if (layoutScaleSelect) {
        layoutScaleSelect.addEventListener("change", async (e) => {
            const layoutScale = e.target.value;
            document.body.setAttribute('data-layout-scale', layoutScale);
            currentSettings.layout_scale = layoutScale;
            await saveSettingItem("layout_scale", layoutScale);
        });
    }
    
    // 默认对话模型选择器
    const defaultChatModelSelect = document.getElementById("default-chat-model-select");
    if (defaultChatModelSelect) {
        defaultChatModelSelect.addEventListener("change", async (e) => {
            const defaultChatModel = e.target.value;
            currentSettings.default_chat_model = defaultChatModel;
            await saveSettingItem("default_chat_model", defaultChatModel);
        });
    }
    
    const autoTitleModelSelect = document.getElementById("auto-title-model-select");
    if (autoTitleModelSelect) {
        autoTitleModelSelect.addEventListener("change", async (e) => {
            const autoTitleModel = e.target.value;
            currentSettings.auto_title_model = autoTitleModel;
            await saveSettingItem("auto_title_model", autoTitleModel);
        });
    }
    
    // 默认视觉模型选择器
    const defaultVisionModelSelect = document.getElementById("default-vision-model-select");
    if (defaultVisionModelSelect) {
        defaultVisionModelSelect.addEventListener("change", async (e) => {
            const defaultVisionModel = e.target.value;
            currentSettings.default_vision_model = defaultVisionModel;
            await saveSettingItem("default_vision_model", defaultVisionModel);
        });
    }
}

async function saveSettingItem(key, value) {
    const formData = new FormData();
    formData.append(key, value);
    
    try {
        const res = await fetch(`${apiBase}/settings`, {method: "POST", body: formData});
        if (!res.ok) {
            console.error("保存设置失败:", await res.text());
        }
    } catch(e) {
        console.error("保存设置失败:", e);
    }
}
// 初始化函数
async function init() {
    try {
        // 等待一小段时间确保 markdown.js 已加载
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 检查 MarkdownEngine 是否加载
        if (!window.MarkdownEngine) {
            console.error("[初始化] MarkdownEngine 未加载！");
        }
        
        initDOMElements();
        initCustomDialog();  // 初始化自定义弹窗
        
        setupInputAutoResize();
        initCustomModelSelect();
        
        await loadSettings();
        await loadModels();
        await loadConversations();
        await loadProviders();
        await loadKnowledgeBases();
        await loadEmbeddingModels();
        await loadVisionModels();
        await loadRerankModels();
        await loadMCPServers();
        await loadProjects();  // 加载项目列表
        
        // 数据加载完成后再初始化自定义下拉框
        initSettingsCustomSelects();
        
        initModelInputs();
        initMCPInputs();
        loadToolSettings();
        setupToolSettingsListeners();
        initThinkingToggle();
        initVisionPopup();  // 初始化视觉识别弹出框
        initProjectFeature();  // 初始化项目功能
        initSettingsNavigation();  // 初始化设置页面导航
        initSettingsEvents();  // 初始化设置页面事件
        initInlinePanelEvents();  // 初始化内嵌面板事件
        setupEventListeners();
        setupSettingsEventListeners();
        
        // 初始化文件上传功能
        initFileUpload();
        
        // 自动选择或创建对话
        await autoSelectOrCreateConversation();
    } catch (error) {
        console.error("初始化过程中出现错误:", error);
        // 即使出现错误，也要确保基本的事件监听器被设置
        try {
            if (typeof initModelInputs === 'function') initModelInputs();
            if (typeof initMCPInputs === 'function') initMCPInputs();
            if (typeof setupToolSettingsListeners === 'function') setupToolSettingsListeners();
            if (typeof initProjectFeature === 'function') initProjectFeature();
            if (typeof setupEventListeners === 'function') setupEventListeners();
            if (typeof setupSettingsEventListeners === 'function') setupSettingsEventListeners();
        } catch (e) {
            console.error("设置基本功能失败:", e);
        }
        
        // 显示用户友好的错误信息
        const errorMsg = `前端初始化出现问题: ${error.message}\n\n基本功能可能仍然可用，但某些高级功能可能无法正常工作。\n\n请检查浏览器控制台获取详细错误信息。`;
        showWarning(errorMsg, { title: "初始化警告" });
    }
}

// 自动选择或创建对话
async function autoSelectOrCreateConversation() {
    // 如果已有对话，选择最新的一个
    if (conversations.length > 0) {
        // 优先选择未置顶的最新对话，如果都是置顶的则选第一个
        const unpinnedConversations = conversations.filter(c => !c.is_pinned);
        const targetConversation = unpinnedConversations.length > 0 
            ? unpinnedConversations[0] 
            : conversations[0];
        await selectConversation(targetConversation.id);
    } else {
        // 没有对话，创建一个新的
        await createNewConversation();
    }
}

// 创建新对话
async function createNewConversation() {
    try {
        const formData = new FormData();
        formData.append("title", "新对话");
        
        // 如果当前选中了某个项目（不是"全部对话"），则创建时直接关联该项目
        if (currentProjectFilter && currentProjectFilter !== 'all') {
            formData.append("project_id", currentProjectFilter);
        }
        
        const res = await fetch(`${apiBase}/conversations`, {method: "POST", body: formData});
        if (!res.ok) throw new Error("创建失败");
        const raw = await res.json();
        const convData = normalizeApiResponse(raw);
        const conv = (convData && convData.conversation) ? convData.conversation : raw.conversation || raw;
        await loadConversations();
        if (conv && conv.id) {
            await selectConversation(conv.id);
            // 新对话创建后，恢复模型选择
            restoreModelSelection();
        }
    } catch(e) {
        console.error("创建对话失败:", e);
    }
}

// 恢复模型选择（新对话时调用）
function restoreModelSelection() {
    const defaultChatModel = currentSettings.default_chat_model || "remember_last";
    
    let targetModel = "";
    let targetDisplayText = "";
    
    if (defaultChatModel === "remember_last") {
        // 使用上次选择的模型（从数据库设置中获取）
        const lastSelected = currentSettings.last_selected_model || "";
        if (lastSelected && lastSelected.includes("|")) {
            const parts = lastSelected.split("|");
            targetModel = parts[0];
            targetDisplayText = parts[1] || targetModel;
        } else {
            targetModel = lastSelected;
            targetDisplayText = lastSelected;
        }
        console.log("[模型恢复] 使用上次选择的模型:", targetModel);
    } else if (defaultChatModel) {
        // 使用设置的默认模型
        targetModel = defaultChatModel;
        targetDisplayText = defaultChatModel;
        console.log("[模型恢复] 使用默认对话模型:", targetModel);
    }
    
    if (targetModel) {
        // 检查模型是否存在于当前可用模型列表中
        const dropdown = document.getElementById("model-select-dropdown");
        const option = dropdown?.querySelector(`.custom-select-option[data-value="${targetModel}"]`);
        
        if (option) {
            // 模型存在，选择它
            const displayText = option.querySelector(".option-name")?.textContent || targetDisplayText;
            selectModelOption(targetModel, displayText);
        } else {
            console.log("[模型恢复] 目标模型不在可用列表中:", targetModel);
        }
    }
}

// 确保DOM加载完成后再执行初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        init().catch(error => {
            console.error("前端初始化失败", error);
            showError("前端初始化失败: " + error.message);
        });
    });
} else {
    // DOM已经加载完成
    init().catch(error => {
        console.error("前端初始化失败", error);
        showError("前端初始化失败: " + error.message);
    });
}
// 模型输入管理函数
function createModelInputGroup(modelValue = "", nameValue = "", capabilities = {}) {
    const group = document.createElement("div");
    group.className = "models-input-group";
    group.innerHTML = `
        <input type="text" class="model-input" placeholder="输入模型名称，如 gpt-4o" value="${modelValue}">
        <input type="text" class="model-name-input" placeholder="自定义名称（可选）" value="${nameValue}">
        <div class="model-capabilities">
            <label><input type="checkbox" class="cap-vision" ${capabilities.vision ? 'checked' : ''}> 视觉</label>
            <label><input type="checkbox" class="cap-reasoning" ${capabilities.reasoning ? 'checked' : ''}> 推理</label>
            <label><input type="checkbox" class="cap-chat" ${capabilities.chat ? 'checked' : ''}> 对话</label>
            <label><input type="checkbox" class="cap-image-gen" ${capabilities.image_gen ? 'checked' : ''}> 生图</label>
        </div>
        <button type="button" class="add-model-btn">+</button>
        <button type="button" class="remove-model-btn">×</button>
    `;
    
    // 添加按钮事件 - 在当前组的下方添加新组
    group.querySelector(".add-model-btn").addEventListener("click", () => {
        const newGroup = createModelInputGroup();
        group.parentNode.insertBefore(newGroup, group.nextSibling);
    });
    
    // 删除按钮事件
    group.querySelector(".remove-model-btn").addEventListener("click", () => {
        group.remove();
    });
    
    return group;
}

function initModelInputs() {
    const container = document.getElementById("provider-models-container");
    if (!container) {
        console.warn("provider-models-container not found, skipping initModelInputs");
        return;
    }
    
    // 为初始的模型输入组添加事件
    const initialGroup = container.querySelector(".models-input-group");
    if (initialGroup) {
        const addBtn = initialGroup.querySelector(".add-model-btn");
        if (addBtn) {
            addBtn.addEventListener("click", () => {
                const newGroup = createModelInputGroup();
                initialGroup.parentNode.insertBefore(newGroup, initialGroup.nextSibling);
            });
        }
    }
}

function getModelInputValues() {
    const groups = document.querySelectorAll("#provider-models-container .models-input-group");
    const values = [];
    
    groups.forEach(group => {
        const modelInput = group.querySelector(".model-input");
        const nameInput = group.querySelector(".model-name-input");
        const visionCap = group.querySelector(".cap-vision");
        const reasoningCap = group.querySelector(".cap-reasoning");
        const chatCap = group.querySelector(".cap-chat");
        const imageGenCap = group.querySelector(".cap-image-gen");
        
        const modelValue = modelInput ? modelInput.value.trim() : "";
        const customName = nameInput ? nameInput.value.trim() : "";
        if (modelValue) {
            values.push({
                model: modelValue,
                name: customName,
                capabilities: {
                    vision: visionCap ? visionCap.checked : false,
                    reasoning: reasoningCap ? reasoningCap.checked : false,
                    chat: chatCap ? chatCap.checked : false,
                    image_gen: imageGenCap ? imageGenCap.checked : false,
                    custom_name: customName
                }
            });
        }
    });
    
    return values;
}

function setModelInputValues(modelsData) {
    const container = document.getElementById("provider-models-container");
    if (!container) return;
    
    // 清除现有的输入组（除了第一个）
    const existingGroups = container.querySelectorAll(".models-input-group");
    for (let i = 1; i < existingGroups.length; i++) {
        existingGroups[i].remove();
    }
    
    if (modelsData && modelsData.length > 0) {
        // 更新第一个输入组
        const firstGroup = container.querySelector(".models-input-group");
        if (firstGroup && modelsData[0]) {
            const modelInput = firstGroup.querySelector(".model-input");
            const nameInput = firstGroup.querySelector(".model-name-input");
            const visionCap = firstGroup.querySelector(".cap-vision");
            const reasoningCap = firstGroup.querySelector(".cap-reasoning");
            const chatCap = firstGroup.querySelector(".cap-chat");
            const imageGenCap = firstGroup.querySelector(".cap-image-gen");
            
            if (modelInput) modelInput.value = modelsData[0].model || "";
            if (nameInput) nameInput.value = modelsData[0].name || "";
            if (visionCap) visionCap.checked = modelsData[0].capabilities?.vision || false;
            if (reasoningCap) reasoningCap.checked = modelsData[0].capabilities?.reasoning || false;
            if (chatCap) chatCap.checked = modelsData[0].capabilities?.chat || false;
            if (imageGenCap) imageGenCap.checked = modelsData[0].capabilities?.image_gen || false;
        }
        
        // 添加其余的输入组
        for (let i = 1; i < modelsData.length; i++) {
            const newGroup = createModelInputGroup(
                modelsData[i].model || "",
                modelsData[i].name || "",
                modelsData[i].capabilities || {}
            );
            container.insertBefore(newGroup, container.lastElementChild);
        }
    }
}

// MCP输入管理函数
function initMCPInputs() {
    const connectionTypeEl = document.getElementById("mcp-connection-type");
    const stdioConfigEl = document.getElementById("mcp-stdio-config");
    const httpConfigEl = document.getElementById("mcp-http-config");
    
    if (!connectionTypeEl || !stdioConfigEl || !httpConfigEl) {
        console.warn("MCP elements not found, skipping initMCPInputs");
        return;
    }
    
    connectionTypeEl.addEventListener("change", () => {
        const type = connectionTypeEl.value;
        stdioConfigEl.style.display = type === "stdio" ? "block" : "none";
        httpConfigEl.style.display = type === "http" ? "block" : "none";
    });
    
    const argsContainer = document.getElementById("mcp-args-container");
    if (argsContainer) {
        const addArgBtn = argsContainer.querySelector(".add-arg-btn");
        if (addArgBtn) {
            addArgBtn.addEventListener("click", () => {
                const newGroup = createArgInputGroup();
                argsContainer.insertBefore(newGroup, argsContainer.lastElementChild);
            });
        }
    }
    
    const envContainer = document.getElementById("mcp-env-container");
    if (envContainer) {
        const addEnvBtn = envContainer.querySelector(".add-env-btn");
        if (addEnvBtn) {
            addEnvBtn.addEventListener("click", () => {
                const newGroup = createEnvInputGroup();
                envContainer.insertBefore(newGroup, envContainer.lastElementChild);
            });
        }
    }
}

function createArgInputGroup(value = "") {
    const group = document.createElement("div");
    group.className = "args-input-group";
    group.innerHTML = `
        <input type="text" class="arg-input" placeholder="输入参数" value="${value}">
        <button type="button" class="remove-arg-btn">×</button>
    `;
    
    group.querySelector(".remove-arg-btn").addEventListener("click", () => {
        group.remove();
    });
    
    return group;
}

function createEnvInputGroup(key = "", value = "") {
    const group = document.createElement("div");
    group.className = "env-input-group";
    group.innerHTML = `
        <input type="text" class="env-key-input" placeholder="变量名" value="${key}">
        <input type="text" class="env-value-input" placeholder="变量值" value="${value}">
        <button type="button" class="remove-env-btn">×</button>
    `;
    
    group.querySelector(".remove-env-btn").addEventListener("click", () => {
        group.remove();
    });
    
    return group;
}


// ========== 知识库管理功能 ==========

// 当前选中的知识库ID
let selectedKbId = null;

// 渲染知识库列表
function renderKnowledgeBaseList() {
    if (!kbListEl) return;
    
    kbListEl.innerHTML = "";
    
    if (knowledgeBases.length === 0) {
        kbListEl.innerHTML = '<div class="empty-list">暂无知识库，请先创建</div>';
        selectedKbId = null;
        onKbSelectChange();
        return;
    }
    
    knowledgeBases.forEach(kb => {
        const item = document.createElement("div");
        item.className = "kb-item" + (selectedKbId == kb.id ? " selected" : "");
        item.dataset.kbId = kb.id;
        item.innerHTML = `
            <div class="kb-info">
                <div class="kb-name">${kb.name}</div>
                <div class="kb-desc">${kb.description || '无描述'}</div>
            </div>
            <div class="kb-actions">
                <button type="button" class="delete-kb-btn" data-id="${kb.id}">🗑️ 删除</button>
            </div>
        `;
        kbListEl.appendChild(item);
        
        // 点击选中知识库
        item.querySelector(".kb-info").addEventListener("click", () => {
            selectKnowledgeBase(kb.id);
        });
    });
    
    // 添加删除按钮事件
    kbListEl.querySelectorAll(".delete-kb-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            const kbId = btn.getAttribute("data-id");
            try {
                const res = await fetch(`${apiBase}/knowledge/bases/${kbId}`, { method: "DELETE" });
                if (!res.ok) throw new Error("删除失败");
                // 如果删除的是当前选中的，清空选中
                if (selectedKbId == kbId) {
                    selectedKbId = null;
                }
                await loadKnowledgeBases();
                renderKnowledgeBaseList();
            } catch (e) {
                console.error("删除知识库失败:", e);
            }
        });
    });
    
    // 如果有知识库但没有选中，自动选中第一个
    if (knowledgeBases.length > 0 && !selectedKbId) {
        selectKnowledgeBase(knowledgeBases[0].id);
    }
}

// 选中知识库
function selectKnowledgeBase(kbId) {
    selectedKbId = kbId;
    
    // 更新选中样式
    if (kbListEl) {
        kbListEl.querySelectorAll(".kb-item").forEach(item => {
            item.classList.toggle("selected", item.dataset.kbId == kbId);
        });
    }
    
    // 加载已有文件列表
    onKbSelectChange();
}

// 更新知识库选择器（保留兼容性，但不再使用下拉框）
function updateKnowledgeBaseSelect() {
    // 不再需要下拉框，直接触发文件列表刷新
    onKbSelectChange();
}

// 知识库选择变化时加载已有文件
async function onKbSelectChange() {
    const kbId = selectedKbId;
    const existingFilesEl = document.getElementById("kb-existing-files");
    
    if (!existingFilesEl) return;
    
    if (!kbId) {
        existingFilesEl.style.display = "none";
        return;
    }
    
    try {
        const res = await fetch(`${apiBase}/knowledge/documents?kb_id=${kbId}`);
        if (!res.ok) throw new Error("加载失败");
        
        const docs = await res.json();
        
        if (docs.length === 0) {
            existingFilesEl.innerHTML = '<div class="kb-existing-empty">该知识库暂无文件</div>';
        } else {
            let html = `<div class="kb-existing-title">📁 已有 ${docs.length} 个文件：</div><div class="kb-existing-list">`;
            docs.forEach(doc => {
                const ext = doc.file_name.split('.').pop().toLowerCase();
                const icons = {
                    'pdf': '📄', 'docx': '📝', 'doc': '📝', 
                    'pptx': '📊', 'xlsx': '📈', 'xls': '📈',
                    'txt': '📃', 'md': '📃', 'csv': '📃',
                    'json': '📋', 'xml': '📋', 'html': '🌐', 'htm': '🌐',
                    'png': '🖼️', 'jpg': '🖼️', 'jpeg': '🖼️', 'gif': '🖼️', 'bmp': '🖼️', 'webp': '🖼️'
                };
                const icon = icons[ext] || '📄';
                const date = doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '';
                html += `<div class="kb-existing-item" data-doc-id="${doc.id}"><span class="file-icon">${icon}</span><span class="file-name">${doc.file_name}</span><span class="file-date">${date}</span><button type="button" class="kb-doc-delete-btn" title="删除">×</button></div>`;
            });
            html += '</div>';
            existingFilesEl.innerHTML = html;
            
            // 绑定删除按钮事件
            existingFilesEl.querySelectorAll('.kb-doc-delete-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const item = btn.closest('.kb-existing-item');
                    const docId = item.dataset.docId;
                    
                    try {
                        const res = await fetch(`${apiBase}/knowledge/documents/${docId}`, { method: 'DELETE' });
                        if (!res.ok) throw new Error("删除失败");
                        item.remove(); // 直接移除DOM元素
                        // 更新标题数量
                        const remaining = existingFilesEl.querySelectorAll('.kb-existing-item').length;
                        const titleEl = existingFilesEl.querySelector('.kb-existing-title');
                        if (remaining === 0) {
                            existingFilesEl.innerHTML = '<div class="kb-existing-empty">该知识库暂无文件</div>';
                        } else if (titleEl) {
                            titleEl.textContent = `📁 已有 ${remaining} 个文件：`;
                        }
                    } catch (e) {
                        await showError("删除失败: " + e.message);
                    }
                });
            });
        }
        existingFilesEl.style.display = "block";
    } catch (e) {
        console.error("加载知识库文件列表失败:", e);
        existingFilesEl.style.display = "none";
    }
}

// 初始化知识库表单事件
function initKnowledgeBaseForms() {
    // 创建知识库表单
    if (kbFormEl) {
        kbFormEl.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const name = document.getElementById("kb-name").value.trim();
            const description = document.getElementById("kb-description").value.trim();
            
            if (!name) {
                await showAlert("请输入知识库名称", { type: "warning" });
                return;
            }
            
            const formData = new FormData();
            formData.append("name", name);
            if (description) formData.append("description", description);
            
            try {
                const res = await fetch(`${apiBase}/knowledge/bases`, {
                    method: "POST",
                    body: formData
                });
                if (!res.ok) throw new Error(await res.text());
                
                await loadKnowledgeBases();
                renderKnowledgeBaseList();
                updateKnowledgeBaseSelect();
                kbFormEl.reset();
                await showSuccess("知识库创建成功");
            } catch (e) {
                await showError("创建知识库失败: " + e.message);
            }
        });
    }
    
    // 上传文档表单
    if (kbUploadFormEl) {
        // 文件选择变化时显示已选文件列表
        const fileInput = document.getElementById("kb-file");
        const fileListEl = document.getElementById("kb-file-list");
        
        if (fileInput && fileListEl) {
            // 存储待上传文件列表（用于支持删除）
            let pendingFiles = [];
            
            fileInput.addEventListener("change", () => {
                const files = fileInput.files;
                if (files && files.length > 0) {
                    // 合并新选择的文件到待上传列表
                    pendingFiles = Array.from(files);
                    renderPendingFiles();
                } else {
                    pendingFiles = [];
                    fileListEl.style.display = "none";
                }
            });
            
            // 渲染待上传文件列表
            function renderPendingFiles() {
                if (pendingFiles.length === 0) {
                    fileListEl.style.display = "none";
                    return;
                }
                
                let html = `<div class="kb-file-list-title">已选择 ${pendingFiles.length} 个文件：</div>`;
                pendingFiles.forEach((file, index) => {
                    const size = file.size < 1024 * 1024 
                        ? (file.size / 1024).toFixed(1) + ' KB'
                        : (file.size / 1024 / 1024).toFixed(1) + ' MB';
                    const ext = file.name.split('.').pop().toLowerCase();
                    const icons = {
                        'pdf': '📄', 'docx': '📝', 'doc': '📝', 
                        'pptx': '📊', 'xlsx': '📈', 'xls': '📈',
                        'txt': '📃', 'md': '📃', 'csv': '📃',
                        'json': '📋', 'xml': '📋', 'html': '🌐', 'htm': '🌐',
                        'png': '🖼️', 'jpg': '🖼️', 'jpeg': '🖼️', 'gif': '🖼️', 'bmp': '🖼️', 'webp': '🖼️'
                    };
                    const icon = icons[ext] || '📄';
                    html += `<div class="kb-file-item">
                        <span class="file-icon">${icon}</span>
                        <span class="file-name">${file.name}</span>
                        <span class="file-size">${size}</span>
                        <button type="button" class="kb-pending-delete-btn" data-index="${index}" title="移除">×</button>
                    </div>`;
                });
                fileListEl.innerHTML = html;
                fileListEl.style.display = "block";
                
                // 绑定删除按钮事件
                fileListEl.querySelectorAll(".kb-pending-delete-btn").forEach(btn => {
                    btn.addEventListener("click", (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const index = parseInt(btn.dataset.index);
                        pendingFiles.splice(index, 1);
                        renderPendingFiles();
                        // 清空原始 input（因为无法直接修改 FileList）
                        fileInput.value = "";
                    });
                });
            }
            
            // 暴露 pendingFiles 供上传使用
            window._kbPendingFiles = () => pendingFiles;
            window._kbClearPendingFiles = () => { pendingFiles = []; renderPendingFiles(); };
        }
        
        kbUploadFormEl.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const kbId = selectedKbId;
            const embeddingModel = embeddingModelSelectEl ? embeddingModelSelectEl.value : "";
            const fileInput = document.getElementById("kb-file");
            const extractImages = document.getElementById("kb-extract-images")?.checked ?? false;
            const visionModel = document.getElementById("kb-vision-model-select")?.value || "";
            const uploadBtn = document.getElementById("kb-upload-btn");
            
            if (!kbId) {
                await showAlert("请选择目标知识库", { type: "warning" });
                return;
            }
            
            // 优先使用 pendingFiles，否则使用 fileInput.files
            const pendingFiles = window._kbPendingFiles ? window._kbPendingFiles() : [];
            const files = pendingFiles.length > 0 ? pendingFiles : (fileInput && fileInput.files ? Array.from(fileInput.files) : []);
            
            if (files.length === 0) {
                await showAlert("请选择要上传的文件", { type: "warning" });
                return;
            }
            
            // 如果启用了图片提取但没有配置视觉模型，提示用户
            if (extractImages && !visionModel) {
                await showAlert("启用图片提取需要先配置图片识别方案（视觉模型）", { type: "warning" });
                return;
            }
            
            const totalFiles = files.length;
            let successCount = 0;
            let failCount = 0;
            let totalChunks = 0;
            
            // 禁用按钮防止重复点击
            if (uploadBtn) {
                uploadBtn.disabled = true;
                uploadBtn.textContent = "上传中...";
            }
            
            if (kbUploadStatusEl) {
                kbUploadStatusEl.textContent = `上传中... (0/${totalFiles})`;
                kbUploadStatusEl.style.display = "block";
            }
            
            // 逐个上传文件
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const formData = new FormData();
                formData.append("kb_id", kbId);
                formData.append("file", file);
                formData.append("extract_images", extractImages ? "true" : "false");
                if (embeddingModel) formData.append("embedding_model", embeddingModel);
                if (visionModel) formData.append("vision_model", visionModel);
                
                if (kbUploadStatusEl) {
                    const statusText = extractImages ? `上传并识别图片中... (${i + 1}/${totalFiles}) - ${file.name}` : `上传中... (${i + 1}/${totalFiles}) - ${file.name}`;
                    kbUploadStatusEl.textContent = statusText;
                }
                
                try {
                    const res = await fetch(`${apiBase}/knowledge/upload`, {
                        method: "POST",
                        body: formData
                    });
                    
                    if (!res.ok) throw new Error(await res.text());
                    
                    const result = await res.json();
                    successCount++;
                    
                    if (result.chunks_count > 0) {
                        totalChunks += result.chunks_count;
                    }
                } catch (e) {
                    failCount++;
                    console.error(`上传文件 ${file.name} 失败:`, e);
                }
            }
            
            // 显示最终结果
            let statusMsg = `✅ 上传完成: ${successCount}/${totalFiles} 个文件成功`;
            if (failCount > 0) {
                statusMsg = `⚠️ 上传完成: ${successCount} 成功, ${failCount} 失败`;
            }
            if (totalChunks > 0) {
                statusMsg += `，共创建 ${totalChunks} 个向量块`;
            }
            
            if (kbUploadStatusEl) {
                kbUploadStatusEl.textContent = statusMsg;
            }
            kbUploadFormEl.reset();
            
            // 清空待上传文件列表
            if (window._kbClearPendingFiles) window._kbClearPendingFiles();
            
            // 隐藏文件列表
            const fileListEl = document.getElementById("kb-file-list");
            if (fileListEl) fileListEl.style.display = "none";
            
            // 恢复按钮状态
            if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.textContent = "上传并构建知识库";
            }
            
            // 刷新已有文件列表
            onKbSelectChange();
            
            setTimeout(() => {
                if (kbUploadStatusEl) kbUploadStatusEl.style.display = "none";
            }, 5000);
        });
    }
}

// ========== 联网搜索配置功能 ==========

function initSearchConfigForm() {
    const searchConfigForm = document.getElementById("search-config-form");
    if (searchConfigForm) {
        searchConfigForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const defaultSource = document.getElementById("search-default-source").value;
            const tavilyApiKey = document.getElementById("search-tavily-api-key").value;
            
            try {
                // 保存默认搜索源
                await saveSettingItem("default_search_source", defaultSource);
                
                // 保存 Tavily API Key
                if (tavilyApiKey) {
                    await saveSettingItem("tavily_api_key", tavilyApiKey);
                }
                
                await showSuccess("搜索配置保存成功");
                closeModal("search-config-modal");
            } catch (e) {
                await showError("保存失败: " + e.message);
            }
        });
    }
    
    // 重置按钮
    const searchConfigResetBtn = document.getElementById("search-config-reset");
    if (searchConfigResetBtn) {
        searchConfigResetBtn.addEventListener("click", () => {
            const form = document.getElementById("search-config-form");
            if (form) form.reset();
        });
    }
}

// 在初始化时调用这些函数
// 修改 init 函数中的调用
(function() {
    // 等待DOM加载完成后初始化表单
    const originalInit = window.init || (async () => {});
    
    // 添加额外的初始化
    document.addEventListener("DOMContentLoaded", () => {
        setTimeout(() => {
            initKnowledgeBaseForms();
            initSearchConfigForm();
            
            // 当打开知识库模态框时渲染列表
            const knowledgeModal = document.getElementById("knowledge-modal");
            if (knowledgeModal) {
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.target.classList.contains("open")) {
                            renderKnowledgeBaseList();
                            updateKnowledgeBaseSelect();
                        }
                    });
                });
                observer.observe(knowledgeModal, { attributes: true, attributeFilter: ["class"] });
            }
            
            // 当打开MCP模态框时渲染列表
            const mcpModal = document.getElementById("mcp-modal");
            if (mcpModal) {
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.target.classList.contains("open")) {
                            loadMCPServers();
                        }
                    });
                });
                observer.observe(mcpModal, { attributes: true, attributeFilter: ["class"] });
            }
        }, 500);
    });
})();


// ========== Provider管理功能 ==========

// 当前选中的Provider ID（用于标签页）
let currentProviderTabId = null;

// 渲染Provider标签页布局
function renderProviderList() {
    const tabsEl = document.getElementById("provider-tabs");
    const contentEl = document.getElementById("provider-tab-content");
    const emptyStateEl = document.getElementById("provider-empty-state");
    const formEl = document.getElementById("provider-form");
    
    if (!tabsEl || !contentEl) return;
    
    // 渲染标签页
    tabsEl.innerHTML = "";
    
    providers.forEach(provider => {
        const tab = document.createElement("button");
        tab.className = "provider-tab" + (provider.id == currentProviderTabId ? " active" : "");
        tab.dataset.id = provider.id;
        const keyIcon = provider.has_api_key ? "🔑" : "⚠️";
        tab.innerHTML = `${provider.name} <span style="font-size:11px;opacity:0.7;">${keyIcon}</span>`;
        tab.addEventListener("click", () => selectProviderTab(provider.id));
        tabsEl.appendChild(tab);
    });
    
    // 添加"+"按钮
    const addTab = document.createElement("button");
    addTab.className = "provider-tab-add";
    addTab.textContent = "+";
    addTab.title = "添加 Provider";
    addTab.addEventListener("click", () => {
        currentProviderTabId = null;
        resetProviderForm();
        if (emptyStateEl) emptyStateEl.style.display = "none";
        if (formEl) formEl.style.display = "block";
        // 取消所有标签的选中状态
        tabsEl.querySelectorAll(".provider-tab").forEach(t => t.classList.remove("active"));
    });
    tabsEl.appendChild(addTab);
    
    // 如果没有Provider，显示空状态
    if (providers.length === 0) {
        if (emptyStateEl) emptyStateEl.style.display = "flex";
        if (formEl) formEl.style.display = "none";
        currentProviderTabId = null;
    } else {
        // 如果没有选中的标签，选中第一个
        if (!currentProviderTabId || !providers.find(p => p.id == currentProviderTabId)) {
            selectProviderTab(providers[0].id);
        } else {
            selectProviderTab(currentProviderTabId);
        }
    }
}

// 选中Provider标签
function selectProviderTab(providerId) {
    currentProviderTabId = providerId;
    const provider = providers.find(p => p.id == providerId);
    if (!provider) return;
    
    const tabsEl = document.getElementById("provider-tabs");
    const emptyStateEl = document.getElementById("provider-empty-state");
    const formEl = document.getElementById("provider-form");
    
    // 更新标签选中状态
    if (tabsEl) {
        tabsEl.querySelectorAll(".provider-tab").forEach(tab => {
            tab.classList.toggle("active", tab.dataset.id == providerId);
        });
    }
    
    // 显示表单，隐藏空状态
    if (emptyStateEl) emptyStateEl.style.display = "none";
    if (formEl) formEl.style.display = "block";
    
    // 填充表单数据
    fillProviderFormNew(provider);
}

// 新版填充Provider表单（适配标签页布局）
function fillProviderFormNew(provider) {
    const idEl = document.getElementById("provider-id");
    const nameEl = document.getElementById("provider-name");
    const apiBaseEl = document.getElementById("provider-api-base");
    const apiKeyEl = document.getElementById("provider-api-key");
    
    if (idEl) idEl.value = provider.id;
    if (nameEl) nameEl.value = provider.name;
    if (apiBaseEl) apiBaseEl.value = provider.api_base;
    if (apiKeyEl) {
        apiKeyEl.value = "";
        apiKeyEl.placeholder = provider.has_api_key ? "已配置，留空保持不变" : "输入 API Key";
    }
    
    // 解析模型配置
    let modelsConfig = {};
    if (provider.models_config) {
        try {
            modelsConfig = JSON.parse(provider.models_config);
        } catch (e) {}
    }
    
    // 渲染模型Tag网格
    renderModelTagsGrid(provider, modelsConfig);
}

// 渲染模型Tag网格
function renderModelTagsGrid(provider, modelsConfig) {
    const gridEl = document.getElementById("provider-models-grid");
    if (!gridEl) return;
    
    gridEl.innerHTML = "";
    
    // 收集所有模型（默认模型 + 其他模型）
    const allModels = [];
    if (provider.default_model) {
        allModels.push({ id: provider.default_model, isDefault: true });
    }
    if (provider.models) {
        provider.models.split(",").map(m => m.trim()).filter(m => m && m !== provider.default_model).forEach(m => {
            allModels.push({ id: m, isDefault: false });
        });
    }
    
    if (allModels.length === 0) {
        gridEl.innerHTML = '<div class="model-table-empty">暂无模型，点击上方"+ 添加模型"按钮添加</div>';
        return;
    }
    
    // 创建表格
    const table = document.createElement("div");
    table.className = "model-table";
    
    // 表头
    table.innerHTML = `
        <div class="model-table-header">
            <span class="col-id">模型ID</span>
            <span class="col-name">显示名</span>
            <span class="col-caps">功能</span>
            <span class="col-actions">操作</span>
        </div>
    `;
    
    // 表格内容
    allModels.forEach((model, index) => {
        const caps = modelsConfig[model.id] || {};
        const row = document.createElement("div");
        row.className = "model-table-row" + (model.isDefault ? " default" : "");
        row.dataset.modelId = model.id;
        
        // 构建功能标签
        let capsHtml = "";
        if (caps.vision) capsHtml += '<span class="cap-tag">视觉</span>';
        if (caps.reasoning) capsHtml += '<span class="cap-tag">推理</span>';
        if (caps.chat) capsHtml += '<span class="cap-tag">对话</span>';
        if (caps.image_gen) capsHtml += '<span class="cap-tag">生图</span>';
        if (!capsHtml) capsHtml = '<span class="cap-tag empty">-</span>';
        
        const displayName = caps.custom_name || "-";
        row.innerHTML = `
            <span class="col-id">${model.id}${model.isDefault ? '<span class="default-badge">默认</span>' : ''}</span>
            <span class="col-name">${displayName}</span>
            <span class="col-caps">${capsHtml}</span>
            <span class="col-actions">
                <button class="model-edit-btn" onclick="openModelEditPopup('${model.id}', ${model.isDefault}, ${JSON.stringify(caps).replace(/"/g, '&quot;')})">编辑</button>
                <button class="model-delete-btn" onclick="deleteModelDirect('${model.id}', ${model.isDefault})">删除</button>
            </span>
        `;
        
        table.appendChild(row);
    });
    
    gridEl.appendChild(table);
}

// 直接删除模型（不通过弹窗）
async function deleteModelDirect(modelId, isDefault) {
    if (isDefault) {
        await showAlert("不能删除默认模型，请先设置其他模型为默认", { type: "warning" });
        return;
    }
    
    const confirmed = await showConfirm(`确定删除模型 "${modelId}" 吗？`, { title: "删除模型", danger: true });
    if (!confirmed) return;
    
    const provider = providers.find(p => p.id == currentProviderTabId);
    if (!provider) return;
    
    let modelsConfig = {};
    try {
        modelsConfig = JSON.parse(provider.models_config || "{}");
    } catch (e) {}
    
    delete modelsConfig[modelId];
    
    let modelsList = provider.models ? provider.models.split(",").map(m => m.trim()).filter(m => m && m !== modelId) : [];
    
    await saveProviderModels(provider.id, provider.default_model, modelsList, modelsConfig);
}

// 打开模型编辑弹窗
function openModelEditPopup(modelId, isDefault, caps = {}) {
    const popup = document.getElementById("model-edit-popup");
    if (!popup) return;
    
    const titleEl = document.getElementById("model-edit-title");
    const idInput = document.getElementById("model-edit-id");
    const nameInput = document.getElementById("model-edit-name");
    const visionCap = document.getElementById("model-edit-cap-vision");
    const reasoningCap = document.getElementById("model-edit-cap-reasoning");
    const chatCap = document.getElementById("model-edit-cap-chat");
    const imageGenCap = document.getElementById("model-edit-cap-image-gen");
    const isDefaultCheck = document.getElementById("model-edit-is-default");
    const deleteBtn = document.getElementById("model-edit-delete");
    
    if (titleEl) titleEl.textContent = modelId ? "编辑模型" : "添加模型";
    if (idInput) idInput.value = modelId || "";
    if (nameInput) nameInput.value = caps.custom_name || "";
    if (visionCap) visionCap.checked = caps.vision || false;
    if (reasoningCap) reasoningCap.checked = caps.reasoning || false;
    if (chatCap) chatCap.checked = caps.chat !== false;
    if (imageGenCap) imageGenCap.checked = caps.image_gen || false;
    if (isDefaultCheck) isDefaultCheck.checked = isDefault;
    if (deleteBtn) deleteBtn.style.display = modelId ? "inline-block" : "none";
    
    // 存储原始模型ID用于编辑
    popup.dataset.originalModelId = modelId || "";
    popup.dataset.wasDefault = isDefault ? "true" : "false";
    
    popup.style.display = "flex";
}

// 关闭模型编辑弹窗
function closeModelEditPopup() {
    const popup = document.getElementById("model-edit-popup");
    if (popup) popup.style.display = "none";
}

// 保存模型编辑
async function saveModelEdit() {
    const popup = document.getElementById("model-edit-popup");
    const idInput = document.getElementById("model-edit-id");
    const nameInput = document.getElementById("model-edit-name");
    const visionCap = document.getElementById("model-edit-cap-vision");
    const reasoningCap = document.getElementById("model-edit-cap-reasoning");
    const chatCap = document.getElementById("model-edit-cap-chat");
    const imageGenCap = document.getElementById("model-edit-cap-image-gen");
    const isDefaultCheck = document.getElementById("model-edit-is-default");
    
    const newModelId = idInput?.value.trim();
    if (!newModelId) {
        await showAlert("请输入模型ID", { type: "warning" });
        return;
    }
    
    const originalModelId = popup?.dataset.originalModelId || "";
    const wasDefault = popup?.dataset.wasDefault === "true";
    const isDefault = isDefaultCheck?.checked || false;
    
    // 获取当前Provider
    const provider = providers.find(p => p.id == currentProviderTabId);
    if (!provider) return;
    
    // 解析现有配置
    let modelsConfig = {};
    try {
        modelsConfig = JSON.parse(provider.models_config || "{}");
    } catch (e) {}
    
    // 收集现有模型列表
    let modelsList = provider.models ? provider.models.split(",").map(m => m.trim()).filter(m => m) : [];
    
    // 处理模型ID变更
    if (originalModelId && originalModelId !== newModelId) {
        // 删除旧配置
        delete modelsConfig[originalModelId];
        // 从列表中移除旧ID
        modelsList = modelsList.filter(m => m !== originalModelId);
    }
    
    // 添加/更新新配置
    modelsConfig[newModelId] = {
        vision: visionCap?.checked || false,
        reasoning: reasoningCap?.checked || false,
        chat: chatCap?.checked || false,
        image_gen: imageGenCap?.checked || false,
        custom_name: nameInput?.value.trim() || ""
    };
    
    // 处理默认模型变更
    let newDefaultModel = provider.default_model;
    if (isDefault) {
        newDefaultModel = newModelId;
        // 从模型列表中移除（因为它是默认模型）
        modelsList = modelsList.filter(m => m !== newModelId);
        // 如果原来的默认模型不是当前模型，把它加入列表
        if (provider.default_model && provider.default_model !== newModelId && provider.default_model !== originalModelId) {
            if (!modelsList.includes(provider.default_model)) {
                modelsList.unshift(provider.default_model);
            }
        }
    } else {
        // 不是默认模型，确保在列表中
        if (!modelsList.includes(newModelId) && newModelId !== newDefaultModel) {
            modelsList.push(newModelId);
        }
    }
    
    // 保存到后端
    await saveProviderModels(provider.id, newDefaultModel, modelsList, modelsConfig);
    closeModelEditPopup();
}

// 删除模型
async function deleteModelFromProvider() {
    const popup = document.getElementById("model-edit-popup");
    const originalModelId = popup?.dataset.originalModelId;
    const wasDefault = popup?.dataset.wasDefault === "true";
    
    if (!originalModelId) return;
    
    if (wasDefault) {
        await showAlert("不能删除默认模型，请先设置其他模型为默认", { type: "warning" });
        return;
    }
    
    const confirmed = await showConfirm(`确定删除模型 "${originalModelId}" 吗？`, { title: "删除模型", danger: true });
    if (!confirmed) return;
    
    const provider = providers.find(p => p.id == currentProviderTabId);
    if (!provider) return;
    
    let modelsConfig = {};
    try {
        modelsConfig = JSON.parse(provider.models_config || "{}");
    } catch (e) {}
    
    // 从配置中删除
    delete modelsConfig[originalModelId];
    
    // 从列表中删除
    let modelsList = provider.models ? provider.models.split(",").map(m => m.trim()).filter(m => m && m !== originalModelId) : [];
    
    await saveProviderModels(provider.id, provider.default_model, modelsList, modelsConfig);
    closeModelEditPopup();
}

// 保存Provider的模型配置
async function saveProviderModels(providerId, defaultModel, modelsList, modelsConfig) {
    const formData = new FormData();
    const provider = providers.find(p => p.id == providerId);
    if (!provider) return;
    
    formData.append("name", provider.name);
    formData.append("api_base", provider.api_base);
    formData.append("default_model", defaultModel);
    formData.append("models_str", modelsList.join(","));
    formData.append("models_config", JSON.stringify(modelsConfig));
    
    try {
        const res = await fetch(`${apiBase}/providers/${providerId}`, { method: "POST", body: formData });
        if (!res.ok) throw new Error(await res.text());
        
        await loadProviders();
        await loadModels();
        renderProviderList();
    } catch (e) {
        await showError("保存失败: " + e.message);
    }
}

// 删除当前Provider
async function deleteCurrentProvider() {
    if (!currentProviderTabId) return;
    
    const provider = providers.find(p => p.id == currentProviderTabId);
    if (!provider) return;
    
    const confirmed = await showConfirm(`这将删除所有相关的模型配置。`, { title: `确定删除 Provider "${provider.name}" 吗？`, danger: true });
    if (!confirmed) return;
    
    try {
        const res = await fetch(`${apiBase}/providers/${currentProviderTabId}`, { method: "DELETE" });
        if (!res.ok) throw new Error("删除失败");
        
        currentProviderTabId = null;
        await loadProviders();
        await loadModels();
        await loadSettings();
        renderProviderList();
        renderProviderSelect();
    } catch (e) {
        console.error("删除Provider失败:", e);
        await showError("删除失败");
    }
}

// 填充Provider表单（保留兼容性）
function fillProviderForm(provider) {
    fillProviderFormNew(provider);
}

// 添加模型卡片（保留兼容性，用于旧版布局）
function addModelCard(container, modelName = "", customName = "", capabilities = {}) {
    const card = document.createElement("div");
    card.className = "model-config-card removable";
    card.innerHTML = `
        <div class="model-inputs">
            <input type="text" class="model-input" placeholder="输入模型名称，如 gpt-4o" value="${modelName}">
            <input type="text" class="model-name-input" placeholder="自定义名称（可选）" value="${customName}">
        </div>
        <div class="model-capabilities">
            <label><input type="checkbox" class="cap-vision" ${capabilities.vision ? 'checked' : ''}> 视觉</label>
            <label><input type="checkbox" class="cap-reasoning" ${capabilities.reasoning ? 'checked' : ''}> 推理</label>
            <label><input type="checkbox" class="cap-chat" ${capabilities.chat ? 'checked' : ''}> 对话</label>
            <label><input type="checkbox" class="cap-image-gen" ${capabilities.image_gen ? 'checked' : ''}> 生图</label>
        </div>
        <button type="button" class="remove-model-btn">×</button>
    `;
    
    // 删除按钮事件
    card.querySelector(".remove-model-btn").addEventListener("click", () => {
        card.remove();
    });
    
    container.appendChild(card);
    return card;
}

// 收集模型列表数据
function collectModelsData() {
    const container = document.getElementById("provider-models-container");
    if (!container) return { models: "", modelsConfig: {} };
    
    const cards = container.querySelectorAll(".model-config-card");
    const models = [];
    const modelsConfig = {};
    
    cards.forEach(card => {
        const modelInput = card.querySelector(".model-input");
        const nameInput = card.querySelector(".model-name-input");
        const visionCap = card.querySelector(".cap-vision");
        const reasoningCap = card.querySelector(".cap-reasoning");
        const chatCap = card.querySelector(".cap-chat");
        const imageGenCap = card.querySelector(".cap-image-gen");
        
        const modelName = modelInput ? modelInput.value.trim() : "";
        if (modelName) {
            models.push(modelName);
            modelsConfig[modelName] = {
                vision: visionCap ? visionCap.checked : false,
                reasoning: reasoningCap ? reasoningCap.checked : false,
                chat: chatCap ? chatCap.checked : false,
                image_gen: imageGenCap ? imageGenCap.checked : false,
                custom_name: nameInput ? nameInput.value.trim() : ""
            };
        }
    });
    
    return { models: models.join(","), modelsConfig };
}

// 初始化Provider表单事件
function initProviderForms() {
    // 添加模型按钮（新版标签页布局）
    const addModelBtn = document.getElementById("add-model-btn");
    if (addModelBtn) {
        addModelBtn.addEventListener("click", () => {
            openModelEditPopup("", false, { chat: true });
        });
    }
    
    // 模型编辑弹窗事件
    const modelEditClose = document.getElementById("model-edit-close");
    const modelEditSave = document.getElementById("model-edit-save");
    const modelEditDelete = document.getElementById("model-edit-delete");
    
    if (modelEditClose) {
        modelEditClose.addEventListener("click", closeModelEditPopup);
    }
    if (modelEditSave) {
        modelEditSave.addEventListener("click", saveModelEdit);
    }
    if (modelEditDelete) {
        modelEditDelete.addEventListener("click", deleteModelFromProvider);
    }
    
    // 点击弹窗背景关闭
    const modelEditPopup = document.getElementById("model-edit-popup");
    if (modelEditPopup) {
        modelEditPopup.addEventListener("click", (e) => {
            if (e.target === modelEditPopup) closeModelEditPopup();
        });
    }
    
    // Provider删除按钮
    const providerDeleteBtn = document.getElementById("provider-delete-btn");
    if (providerDeleteBtn) {
        providerDeleteBtn.addEventListener("click", deleteCurrentProvider);
    }
    
    // Provider表单提交
    if (providerFormEl) {
        providerFormEl.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const id = document.getElementById("provider-id")?.value || "";
            const name = document.getElementById("provider-name")?.value.trim() || "";
            const providerApiBase = document.getElementById("provider-api-base")?.value.trim() || "";
            const providerApiKey = document.getElementById("provider-api-key")?.value || "";
            
            if (!name || !providerApiBase) {
                await showAlert("请填写必填字段：名称、API Base URL", { type: "warning" });
                return;
            }
            
            // 获取当前Provider的模型配置（如果是编辑模式）
            let defaultModel = "";
            let models = "";
            let modelsConfig = {};
            
            if (id) {
                const provider = providers.find(p => p.id == id);
                if (provider) {
                    defaultModel = provider.default_model;
                    models = provider.models || "";
                    try {
                        modelsConfig = JSON.parse(provider.models_config || "{}");
                    } catch (e) {}
                }
            }
            
            // 如果是新建且没有默认模型，提示用户
            if (!id && !defaultModel) {
                defaultModel = "gpt-4o"; // 默认模型
                modelsConfig[defaultModel] = { chat: true };
            }
            
            const formData = new FormData();
            formData.append("name", name);
            formData.append("api_base", providerApiBase);
            if (providerApiKey) {
                formData.append("api_key", providerApiKey);
            }
            formData.append("default_model", defaultModel);
            formData.append("models_str", models);
            formData.append("models_config", JSON.stringify(modelsConfig));
            
            try {
                const url = id ? `${apiBase}/providers/${id}` : `${apiBase}/providers`;
                const res = await fetch(url, { method: "POST", body: formData });
                if (!res.ok) throw new Error(await res.text());
                
                const result = await res.json();
                
                await loadProviders();
                await loadModels();
                await loadSettings();
                await loadEmbeddingModels();
                await loadVisionModels();
                await loadRerankModels();
                
                // 如果是新建，选中新创建的Provider
                if (!id && result.id) {
                    currentProviderTabId = result.id;
                }
                
                renderProviderList();
                renderProviderSelect();
                
            } catch (e) {
                await showError("保存失败: " + e.message);
            }
        });
    }
}

// 重置Provider表单
function resetProviderForm() {
    if (providerFormEl) {
        providerFormEl.reset();
    }
    const idEl = document.getElementById("provider-id");
    if (idEl) idEl.value = "";
    
    // 清空所有输入框
    const nameEl = document.getElementById("provider-name");
    const apiBaseEl = document.getElementById("provider-api-base");
    const apiKeyEl = document.getElementById("provider-api-key");
    
    if (nameEl) nameEl.value = "";
    if (apiBaseEl) apiBaseEl.value = "";
    if (apiKeyEl) {
        apiKeyEl.value = "";
        apiKeyEl.placeholder = "输入 API Key";
    }
    
    // 清空模型Tag网格
    const gridEl = document.getElementById("provider-models-grid");
    if (gridEl) gridEl.innerHTML = "";
}

// 重置API Key输入框为新建状态
function resetApiKeyInput() {
    const apiKeyInput = document.getElementById("provider-api-key");
    const apiKeyHint = document.getElementById("api-key-hint");
    
    if (apiKeyInput) {
        apiKeyInput.placeholder = "输入 API Key（可选）";
        apiKeyInput.value = "";
    }
    if (apiKeyHint) apiKeyHint.style.display = "none";
}

// 在页面加载时初始化Provider表单
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        initProviderForms();
        initMCPForm();
        renderProviderList();
    }, 600);
});

// ========== 首次启动检查 ==========
async function checkFirstTimeSetup() {
    try {
        const response = await fetch("/providers");
        const providers = await response.json();
        
        // 如果没有任何 Provider，直接弹出Provider配置弹窗
        if (!providers || providers.length === 0) {
            // 延迟一点打开弹窗，确保页面已完全加载
            setTimeout(() => {
                openModal("provider-modal");
            }, 300);
            return true;
        }
        return false;
    } catch (error) {
        console.error("检查首次启动失败:", error);
        return false;
    }
}

// 知识库页面复制命令按钮
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".copy-cmd-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const cmd = btn.dataset.cmd;
            navigator.clipboard.writeText(cmd).then(() => {
                const originalText = btn.textContent;
                btn.textContent = "已复制";
                setTimeout(() => { btn.textContent = originalText; }, 2000);
            });
        });
    });
});

// 修改原有的 init 函数，添加首次启动检查
const originalInitFunction = init;
init = async function() {
    // 先正常初始化
    await originalInitFunction();
    
    // 然后检查是否首次启动（没有Provider时弹出配置弹窗）
    await checkFirstTimeSetup();
};


// ========== 模型帮助弹出框 ==========
const modelHelpData = {
    embedding: {
        title: "📊 支持的向量模型",
        models: [
            { name: "text-embedding-3-small", provider: "OpenAI" },
            { name: "text-embedding-3-large", provider: "OpenAI" },
            { name: "text-embedding-ada-002", provider: "OpenAI" },
            { name: "embedding-3", provider: "智谱AI" },
            { name: "embedding-2", provider: "智谱AI" },
            { name: "text-embedding-v3", provider: "通义千问" },
            { name: "text-embedding-v2", provider: "通义千问" },
        ],
        note: "向量模型用于将文本转换为数值向量，不同 Provider 支持的模型不同。请确保你的 Provider 支持所选模型。"
    },
    rerank: {
        title: "🔄 支持的重排模型",
        models: [
            { name: "rerank-v3.5", provider: "Cohere" },
            { name: "rerank-multilingual-v3.0", provider: "Cohere" },
            { name: "rerank-english-v3.0", provider: "Cohere" },
            { name: "bge-reranker-v2-m3", provider: "智谱AI" },
            { name: "gte-rerank", provider: "通义千问" },
        ],
        note: "重排模型对检索结果进行重新排序，提高相关性。这是可选功能，不使用也能正常工作。"
    },
    vision: {
        title: "👁️ 图片识别方案",
        models: [
            { name: "gpt-4o", provider: "OpenAI" },
            { name: "gpt-4o-mini", provider: "OpenAI" },
            { name: "gpt-4-vision-preview", provider: "OpenAI" },
            { name: "glm-4v", provider: "智谱AI" },
            { name: "qwen-vl-max", provider: "通义千问" },
            { name: "qwen-vl-plus", provider: "通义千问" },
        ],
        note: "视觉模型用于识别扫描件/图片 PDF 中的文字。如果你的 PDF 是文字版（可选中文字），则不需要此功能。"
    }
};

function showModelHelp(type, anchorElement) {
    const popup = document.getElementById("model-help-popup");
    const titleEl = document.getElementById("model-help-title");
    const contentEl = document.getElementById("model-help-content");
    
    if (!popup || !modelHelpData[type]) return;
    
    const data = modelHelpData[type];
    titleEl.textContent = data.title;
    
    let html = '<h4>可用模型列表：</h4><ul>';
    data.models.forEach(m => {
        html += `<li><span>${m.name}</span><span class="model-provider">${m.provider}</span></li>`;
    });
    html += '</ul>';
    html += `<div class="help-note"><strong>💡 提示</strong>${data.note}</div>`;
    
    contentEl.innerHTML = html;
    
    // 定位弹出框
    const rect = anchorElement.getBoundingClientRect();
    const modalBody = anchorElement.closest('.modal-body');
    const modalRect = modalBody ? modalBody.getBoundingClientRect() : { left: 0, top: 0 };
    
    popup.style.display = "block";
    popup.style.left = (rect.left - modalRect.left + 20) + "px";
    popup.style.top = (rect.bottom - modalRect.top + 5) + "px";
}

function hideModelHelp() {
    const popup = document.getElementById("model-help-popup");
    if (popup) {
        popup.style.display = "none";
    }
}

// 初始化模型帮助事件
document.addEventListener("DOMContentLoaded", () => {
    // 帮助图标点击
    document.querySelectorAll(".model-help-icon").forEach(icon => {
        icon.addEventListener("click", (e) => {
            e.stopPropagation();
            const type = icon.dataset.modelType;
            showModelHelp(type, icon);
        });
    });
    
    // 关闭按钮
    document.addEventListener("click", (e) => {
        if (e.target.classList.contains("model-help-close")) {
            hideModelHelp();
        }
    });
    
    // 点击其他地方关闭
    document.addEventListener("click", (e) => {
        const popup = document.getElementById("model-help-popup");
        if (popup && popup.style.display === "block") {
            if (!popup.contains(e.target) && !e.target.classList.contains("model-help-icon")) {
                hideModelHelp();
            }
        }
    });
});

// ========== 对话文件上传功能 ==========

// 获取文件图标
function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const iconMap = {
        'pdf': '📄',
        'doc': '📝', 'docx': '📝',
        'txt': '📃', 'md': '📃',
        'csv': '📊', 'xlsx': '📊', 'xls': '📊',
        'json': '📋', 'xml': '📋',
        'html': '🌐', 'htm': '🌐',
        'png': '🖼️', 'jpg': '🖼️', 'jpeg': '🖼️', 'gif': '🖼️', 'webp': '🖼️', 'bmp': '🖼️'
    };
    return iconMap[ext] || '📎';
}

// 渲染已上传文件列表
function renderUploadedFiles() {
    if (!uploadedFilesListEl || !uploadedFilesPreviewEl) return;
    
    if (uploadedFiles.length === 0) {
        uploadedFilesPreviewEl.style.display = 'none';
        return;
    }
    
    uploadedFilesPreviewEl.style.display = 'block';
    uploadedFilesListEl.innerHTML = uploadedFiles.map((file, index) => `
        <div class="uploaded-file-item ${file.uploading ? 'uploading' : ''} ${file.error ? 'error' : ''}" data-index="${index}">
            <span class="file-icon">${getFileIcon(file.filename)}</span>
            <span class="file-name" title="${file.filename}">${file.filename}</span>
            <button class="file-remove" data-file-id="${file.id}" title="删除">×</button>
        </div>
    `).join('');
    
    // 绑定删除按钮事件
    uploadedFilesListEl.querySelectorAll('.file-remove').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const fileId = btn.dataset.fileId;
            await removeUploadedFile(fileId);
        });
    });
    
    // 更新视觉识别开关的显示状态
    updateVisionToggleVisibility();
}

// 更新视觉识别开关的显示状态
async function updateVisionToggleVisibility() {
    const visionToggleWrapper = document.getElementById('vision-toggle-wrapper');
    if (!visionToggleWrapper) return;
    
    // 检查当前模型是否支持视觉
    const currentModel = modelSelectEl ? modelSelectEl.value : '';
    const caps = modelsCaps[currentModel] || {};
    
    // 检查是否有上传的文件（当前待发送的文件）
    let hasFiles = uploadedFiles.length > 0;
    
    // 如果当前没有待发送的文件，检查对话是否有历史文件
    if (!hasFiles && currentConversationId) {
        try {
            const res = await fetch(`${apiBase}/conversations/${currentConversationId}/files`);
            if (res.ok) {
                const files = await res.json();
                hasFiles = files && files.length > 0;
            }
        } catch (e) {
            // 忽略错误
        }
    }
    
    // 只有当模型明确配置了 vision: true 时才认为支持视觉
    const supportsVision = caps.vision === true;
    
    if (!supportsVision && hasFiles) {
        // 模型不支持视觉且有文件，显示开关
        visionToggleWrapper.style.display = '';
    } else {
        // 模型支持视觉或没有文件，隐藏开关
        visionToggleWrapper.style.display = 'none';
        // 隐藏时重置为不启用
        const noneRadio = document.querySelector('input[name="vision-mode"][value="none"]');
        if (noneRadio) noneRadio.checked = true;
        const visionToggle = document.getElementById('toggle-vision-recognition');
        if (visionToggle) visionToggle.checked = false;
    }
}

// 获取当前选择的视觉识别模式
function getVisionMode() {
    const checkedRadio = document.querySelector('input[name="vision-mode"]:checked');
    return checkedRadio ? checkedRadio.value : 'none';
}

// 初始化视觉识别弹出框
function initVisionPopup() {
    const wrapper = document.getElementById('vision-toggle-wrapper');
    const toggle = document.getElementById('toggle-vision-recognition');
    const popup = document.getElementById('vision-popup');
    const label = wrapper?.querySelector('label');
    
    if (!wrapper || !toggle || !popup) return;
    
    // 更新弹出框位置
    function updatePopupPosition() {
        const rect = wrapper.getBoundingClientRect();
        popup.style.left = rect.left + 'px';
        popup.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
    }
    
    // 阻止 checkbox 的默认行为，改为只控制弹出框
    if (label) {
        label.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const isOpening = !wrapper.classList.contains('open');
            
            // 关闭其他弹出框
            document.querySelectorAll('.toggle-with-popup.open').forEach(el => {
                if (el !== wrapper) el.classList.remove('open');
            });
            
            if (isOpening) {
                wrapper.classList.add('open');
                updatePopupPosition();
            } else {
                wrapper.classList.remove('open');
            }
        });
    }
    
    // 阻止弹出框内的点击事件冒泡
    popup.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    // 选择选项时更新复选框状态（控制按钮是否亮起）
    document.querySelectorAll('input[name="vision-mode"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const mode = radio.value;
            // 选择 ocr 或 vision 时按钮亮起，选择 none 时不亮
            toggle.checked = (mode !== 'none');
            // 选择后关闭弹出框
            wrapper.classList.remove('open');
        });
    });
    
    // 点击外部关闭弹出框
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            wrapper.classList.remove('open');
        }
    });
}

// 上传文件到服务器
async function uploadFileToServer(file) {
    if (!currentConversationId) {
        await showAlert('请先选择或创建一个对话', { type: 'warning' });
        return null;
    }
    
    const formData = new FormData();
    formData.append('conversation_id', currentConversationId);
    formData.append('file', file);
    
    try {
        const res = await fetch(`${apiBase}/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!res.ok) {
            const err = await res.text();
            throw new Error(err || '上传失败');
        }
        
        return await res.json();
    } catch (e) {
        console.error('文件上传失败:', e);
        throw e;
    }
}

// 处理文件上传
async function handleFileUpload(files) {
    if (!files || files.length === 0) return;
    if (!currentConversationId) {
        await showAlert('请先选择或创建一个对话', { type: 'warning' });
        return;
    }
    
    for (const file of files) {
        // 检查文件大小（限制 20MB）
        if (file.size > 20 * 1024 * 1024) {
            await showAlert(`文件 "${file.name}" 超过 20MB 限制`, { type: 'warning' });
            continue;
        }
        
        // 添加到列表（显示上传中状态）
        const tempFile = {
            id: 'temp_' + Date.now() + '_' + Math.random(),
            filename: file.name,
            uploading: true
        };
        uploadedFiles.push(tempFile);
        renderUploadedFiles();
        
        try {
            const result = await uploadFileToServer(file);
            // 更新文件信息
            const index = uploadedFiles.findIndex(f => f.id === tempFile.id);
            if (index !== -1) {
                uploadedFiles[index] = {
                    id: result.id,
                    filename: result.filename,
                    filepath: result.filepath,
                    uploading: false
                };
            }
        } catch (e) {
            // 标记为错误状态
            const index = uploadedFiles.findIndex(f => f.id === tempFile.id);
            if (index !== -1) {
                uploadedFiles[index].uploading = false;
                uploadedFiles[index].error = true;
            }
        }
        
        renderUploadedFiles();
        updateVisionToggleVisibility();  // 更新视觉识别开关显示状态
    }
}

// 删除已上传的文件
async function removeUploadedFile(fileId) {
    // 如果是临时文件（上传中或错误），直接从列表移除
    if (String(fileId).startsWith('temp_')) {
        uploadedFiles = uploadedFiles.filter(f => f.id !== fileId);
        renderUploadedFiles();
        updateVisionToggleVisibility();  // 更新视觉识别开关显示状态
        return;
    }
    
    try {
        const res = await fetch(`${apiBase}/files/${fileId}`, {
            method: 'DELETE'
        });
        
        if (res.ok) {
            uploadedFiles = uploadedFiles.filter(f => f.id !== parseInt(fileId));
            renderUploadedFiles();
            updateVisionToggleVisibility();  // 更新视觉识别开关显示状态
        }
    } catch (e) {
        console.error('删除文件失败:', e);
    }
}

// 加载对话的已上传文件
async function loadConversationFiles(conversationId) {
    // 清空输入框上方的预览区
    uploadedFiles = [];
    renderUploadedFiles();
    
    // 注意：历史文件已经在 loadMessages -> loadAndShowFilesForMessage 中显示
    // 这里不需要再加载，但需要更新视觉识别开关状态
    updateVisionToggleVisibility();
}

// 初始化文件上传功能
function initFileUpload() {
    // 文件选择按钮
    if (fileUploadInputEl) {
        fileUploadInputEl.addEventListener('change', (e) => {
            handleFileUpload(e.target.files);
            e.target.value = ''; // 清空以便重复选择同一文件
        });
    }
    
    // 拖拽上传
    if (mainPanelEl && dropOverlayEl) {
        let dragCounter = 0;
        
        mainPanelEl.addEventListener('dragenter', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounter++;
            dropOverlayEl.classList.add('active');
        });
        
        mainPanelEl.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounter--;
            if (dragCounter === 0) {
                dropOverlayEl.classList.remove('active');
            }
        });
        
        mainPanelEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        
        mainPanelEl.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounter = 0;
            dropOverlayEl.classList.remove('active');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFileUpload(files);
            }
        });
    }
    
    // Ctrl+V 粘贴文件
    document.addEventListener('paste', (e) => {
        // 如果焦点在输入框且粘贴的是文本，不处理
        if (document.activeElement === userInputEl && !e.clipboardData.files.length) {
            return;
        }
        
        const files = e.clipboardData.files;
        if (files.length > 0) {
            e.preventDefault();
            handleFileUpload(files);
        }
    });
}


// ========== 项目管理功能 ==========

// 项目相关全局变量
let projects = [];
let currentProjectFilter = ""; // 当前筛选的项目ID，空字符串表示全部

// 加载项目列表
async function loadProjects() {
    try {
        const res = await fetch(`${apiBase}/projects`);
        if (!res.ok) return;
        const data = await res.json();
        // API直接返回数组
        projects = Array.isArray(data) ? data : (data.projects || []);
        renderProjectFilter();
        renderProjectList();
    } catch (e) {
        console.error("加载项目列表失败:", e);
    }
}

// 渲染项目筛选器下拉框
function renderProjectFilter() {
    const filterList = document.getElementById("project-filter-list");
    const submenu = document.getElementById("move-to-project-submenu");
    if (!filterList) return;
    
    filterList.innerHTML = "";
    
    // 计算每个项目的对话数量
    const projectCounts = {};
    conversations.forEach(conv => {
        const pid = conv.project_id || "";
        projectCounts[pid] = (projectCounts[pid] || 0) + 1;
    });
    
    // 渲染项目选项
    projects.forEach(project => {
        const count = projectCounts[project.id] || 0;
        const option = document.createElement("div");
        option.className = "project-filter-option";
        if (currentProjectFilter === String(project.id)) {
            option.classList.add("selected");
        }
        option.dataset.projectId = project.id;
        option.innerHTML = `
            <span class="project-option-icon">${project.icon || '📁'}</span>
            <span class="project-option-name">${project.name}</span>
            <span class="project-option-count">${count}</span>
        `;
        option.addEventListener("click", () => selectProjectFilter(String(project.id)));
        filterList.appendChild(option);
    });
    
    // 更新"全部对话"和"未分类"的数量
    const allCount = conversations.length;
    const uncategorizedCount = projectCounts[""] || 0;
    
    const allOption = document.querySelector('.project-filter-option[data-project-id=""]');
    const uncategorizedOption = document.querySelector('.project-filter-option[data-project-id="uncategorized"]');
    
    if (allOption) {
        const countEl = allOption.querySelector(".project-option-count");
        if (countEl) countEl.textContent = allCount;
        else {
            const span = document.createElement("span");
            span.className = "project-option-count";
            span.textContent = allCount;
            allOption.appendChild(span);
        }
    }
    
    if (uncategorizedOption) {
        const countEl = uncategorizedOption.querySelector(".project-option-count");
        if (countEl) countEl.textContent = uncategorizedCount;
        else {
            const span = document.createElement("span");
            span.className = "project-option-count";
            span.textContent = uncategorizedCount;
            uncategorizedOption.appendChild(span);
        }
    }
    
    // 更新右键菜单的项目子菜单
    if (submenu) {
        // 保留"未分类"选项
        submenu.innerHTML = `
            <div class="context-submenu-item" data-project-id="">
                <span class="submenu-icon">📄</span>
                <span>未分类</span>
            </div>
        `;
        
        projects.forEach(project => {
            const item = document.createElement("div");
            item.className = "context-submenu-item";
            item.dataset.projectId = project.id;
            item.innerHTML = `
                <span class="submenu-icon">${project.icon || '📁'}</span>
                <span>${project.name}</span>
            `;
            submenu.appendChild(item);
        });
    }
}

// 选择项目筛选
function selectProjectFilter(projectId) {
    currentProjectFilter = projectId;
    
    // 更新选中状态
    document.querySelectorAll(".project-filter-option").forEach(opt => {
        const optId = opt.dataset.projectId;
        opt.classList.toggle("selected", optId === projectId || (projectId === "" && optId === ""));
    });
    
    // 更新触发器显示
    const trigger = document.getElementById("project-filter-trigger");
    if (trigger) {
        const iconEl = trigger.querySelector(".project-filter-icon");
        const textEl = trigger.querySelector(".project-filter-text");
        
        if (projectId === "") {
            iconEl.textContent = "📋";
            textEl.textContent = "全部对话";
        } else if (projectId === "uncategorized") {
            iconEl.textContent = "📄";
            textEl.textContent = "未分类";
        } else {
            const project = projects.find(p => String(p.id) === projectId);
            if (project) {
                iconEl.textContent = project.icon || "📁";
                textEl.textContent = project.name;
            }
        }
    }
    
    // 关闭下拉框
    document.getElementById("project-filter")?.classList.remove("open");
    
    // 重新渲染对话列表
    renderConversationListFiltered();
}

// 渲染筛选后的对话列表
function renderConversationListFiltered() {
    if (!conversationListEl) return;
    
    conversationListEl.innerHTML = "";
    
    // 根据项目筛选对话
    let filteredConversations = [...conversations];
    
    if (currentProjectFilter === "uncategorized") {
        // 未分类：只显示没有项目的对话
        filteredConversations = filteredConversations.filter(c => !c.project_id);
        renderFlatConversationList(filteredConversations);
    } else if (currentProjectFilter !== "") {
        // 特定项目：只显示该项目的对话
        filteredConversations = filteredConversations.filter(c => String(c.project_id) === currentProjectFilter);
        renderFlatConversationList(filteredConversations);
    } else {
        // 全部对话：按项目分组显示
        renderGroupedConversationList(filteredConversations);
    }
    
    // 添加对话菜单监听器
    setupConversationMenuListeners();
}

// 渲染扁平对话列表（用于特定项目或未分类）
function renderFlatConversationList(convList) {
    // 按置顶状态排序
    const sortedConversations = convList.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return b.id - a.id;
    });
    
    if (sortedConversations.length === 0) {
        conversationListEl.innerHTML = `
            <div class="empty-hint">
                ${currentProjectFilter === "uncategorized" ? "没有未分类的对话" : "该项目下暂无对话"}
            </div>
        `;
        return;
    }
    
    sortedConversations.forEach(conv => {
        conversationListEl.appendChild(createConversationItem(conv, false));
    });
}

// 渲染分组对话列表（用于全部对话视图）
function renderGroupedConversationList(convList) {
    if (convList.length === 0) {
        conversationListEl.innerHTML = '<div class="empty-hint">暂无对话</div>';
        return;
    }
    
    // 按置顶状态排序
    const sortedConversations = convList.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return b.id - a.id;
    });
    
    // 分组：按项目ID分组
    const groups = {};
    const uncategorized = [];
    
    sortedConversations.forEach(conv => {
        if (conv.project_id) {
            if (!groups[conv.project_id]) {
                groups[conv.project_id] = [];
            }
            groups[conv.project_id].push(conv);
        } else {
            uncategorized.push(conv);
        }
    });
    
    // 计算有对话的分组数量
    const projectGroupCount = Object.keys(groups).length;
    const hasUncategorized = uncategorized.length > 0;
    const totalGroups = projectGroupCount + (hasUncategorized ? 1 : 0);
    
    // 如果只有一个分组，不显示分组标题，直接扁平显示
    if (totalGroups <= 1) {
        renderFlatConversationList(sortedConversations);
        return;
    }
    
    // 多个分组时，按项目分组显示
    const sortedProjectIds = Object.keys(groups).sort((a, b) => {
        const projectA = projects.find(p => p.id === parseInt(a));
        const projectB = projects.find(p => p.id === parseInt(b));
        return (projectA?.name || '').localeCompare(projectB?.name || '');
    });
    
    sortedProjectIds.forEach(projectId => {
        const project = projects.find(p => p.id === parseInt(projectId));
        const projectConvs = groups[projectId];
        
        // 项目分组标题
        const groupHeader = document.createElement("div");
        groupHeader.className = "conversation-group-header";
        groupHeader.innerHTML = `
            <span class="group-icon">${project?.icon || '📁'}</span>
            <span class="group-name">${project?.name || '未知项目'}</span>
            <span class="group-count">${projectConvs.length}</span>
        `;
        conversationListEl.appendChild(groupHeader);
        
        // 该项目下的对话
        projectConvs.forEach(conv => {
            conversationListEl.appendChild(createConversationItem(conv, true));
        });
    });
    
    // 最后渲染未分类的对话
    if (hasUncategorized) {
        const groupHeader = document.createElement("div");
        groupHeader.className = "conversation-group-header";
        groupHeader.innerHTML = `
            <span class="group-icon">📄</span>
            <span class="group-name">未分类</span>
            <span class="group-count">${uncategorized.length}</span>
        `;
        conversationListEl.appendChild(groupHeader);
        
        uncategorized.forEach(conv => {
            conversationListEl.appendChild(createConversationItem(conv, true));
        });
    }
}

// 创建对话项元素
function createConversationItem(conv, inGroup) {
    const item = document.createElement("div");
    // 统一使用带左边框的样式
    item.className = "conversation-item in-group";
    item.dataset.conversationId = conv.id;
    
    const pinIcon = conv.is_pinned ? "📌 " : "";
    
    item.innerHTML = `
        <div class="conversation-title">${pinIcon}${conv.title || "无标题对话"}</div>
        <button class="conversation-menu-btn" data-id="${conv.id}">⋮</button>
        <div class="conversation-actions">
            <button class="action-btn" data-action="rename" data-id="${conv.id}">✏️ 重命名</button>
            <button class="action-btn" data-action="pin" data-id="${conv.id}">${conv.is_pinned ? '📌 取消置顶' : '📌 置顶'}</button>
            <button class="action-btn" data-action="delete" data-id="${conv.id}">🗑️ 删除</button>
        </div>
    `;
    
    if (conv.id === currentConversationId) item.classList.add("active");
    
    // 点击切换对话
    item.addEventListener("click", (e) => {
        if (e.target.closest(".conversation-menu-btn") || e.target.closest(".conversation-actions")) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        
        if (isStreaming && conv.id !== currentConversationId) {
            if (typeof stopStreaming === 'function') {
                stopStreaming();
            }
        }
        
        selectConversation(conv.id);
    });
    
    // 右键菜单
    item.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        showConversationContextMenu(e, conv);
    });
    
    return item;
}

// 设置对话菜单监听器
function setupConversationMenuListeners() {
    document.querySelectorAll('.conversation-menu-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const actionsEl = btn.nextElementSibling;
            if (!actionsEl) return;
            
            document.querySelectorAll('.conversation-actions.show').forEach(menu => {
                if (menu !== actionsEl) menu.classList.remove('show');
            });
            
            actionsEl.classList.toggle('show');
        });
    });
    
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const action = btn.getAttribute('data-action');
            const conversationId = parseInt(btn.getAttribute('data-id'));
            
            const actionsEl = btn.closest('.conversation-actions');
            if (actionsEl) actionsEl.classList.remove('show');
            
            await handleConversationAction(action, conversationId);
        });
    });
}

// 处理对话操作
async function handleConversationAction(action, conversationId) {
    if (action === 'delete') {
        try {
            const res = await fetch(`${apiBase}/conversations/${conversationId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('删除失败');
            
            if (conversationId === currentConversationId) {
                currentConversationId = null;
                if (chatTitleEl) chatTitleEl.textContent = '请选择一个对话';
                if (chatMessagesEl) chatMessagesEl.innerHTML = '';
            }
            
            await loadConversations();
            renderProjectFilter();
        } catch (error) {
            console.error('删除对话失败:', error);
            await showError('删除对话失败: ' + error.message);
        }
    } else if (action === 'rename') {
        const conversation = conversations.find(c => c.id === conversationId);
        if (!conversation) return;
        
        const newTitle = await showPrompt('请输入新的对话标题', { defaultValue: conversation.title || '' });
        if (newTitle === null || !newTitle.trim()) return;
        
        try {
            const formData = new FormData();
            formData.append('title', newTitle.trim());
            
            const res = await fetch(`${apiBase}/conversations/${conversationId}/title`, {
                method: 'PUT',
                body: formData
            });
            
            if (!res.ok) throw new Error('重命名失败');
            
            const idx = conversations.findIndex(c => c.id === conversationId);
            if (idx !== -1) {
                conversations[idx] = { ...conversations[idx], title: newTitle.trim() };
            }
            renderConversationListFiltered();
            
            if (conversationId === currentConversationId && chatTitleEl) {
                chatTitleEl.textContent = newTitle.trim();
            }
        } catch (error) {
            console.error('重命名失败:', error);
            await showError('重命名失败: ' + error.message);
        }
    } else if (action === 'pin') {
        const conversation = conversations.find(c => c.id === conversationId);
        if (!conversation) return;
        
        try {
            const formData = new FormData();
            formData.append('is_pinned', !conversation.is_pinned);
            
            const res = await fetch(`${apiBase}/conversations/${conversationId}/pin`, {
                method: 'PUT',
                body: formData
            });
            
            if (!res.ok) throw new Error('操作失败');
            
            const idx = conversations.findIndex(c => c.id === conversationId);
            if (idx !== -1) {
                conversations[idx] = { ...conversations[idx], is_pinned: !conversation.is_pinned };
            }
            renderConversationListFiltered();
        } catch (error) {
            console.error('置顶操作失败:', error);
            await showError('操作失败: ' + error.message);
        }
    }
}

// 显示对话右键菜单
let contextMenuConversation = null;

function showConversationContextMenu(e, conversation) {
    const menu = document.getElementById("conversation-context-menu");
    if (!menu) return;
    
    contextMenuConversation = conversation;
    
    // 更新置顶文本
    const pinText = menu.querySelector(".pin-text");
    if (pinText) {
        pinText.textContent = conversation.is_pinned ? "取消置顶" : "置顶";
    }
    
    // 定位菜单
    menu.style.left = e.clientX + "px";
    menu.style.top = e.clientY + "px";
    
    // 确保菜单不超出屏幕
    const rect = menu.getBoundingClientRect();
    if (e.clientX + rect.width > window.innerWidth) {
        menu.style.left = (window.innerWidth - rect.width - 10) + "px";
    }
    if (e.clientY + rect.height > window.innerHeight) {
        menu.style.top = (window.innerHeight - rect.height - 10) + "px";
    }
    
    menu.classList.add("show");
}

// 隐藏右键菜单
function hideContextMenu() {
    const menu = document.getElementById("conversation-context-menu");
    if (menu) menu.classList.remove("show");
    contextMenuConversation = null;
}

// 移动对话到项目
async function moveConversationToProject(conversationId, projectId) {
    try {
        const formData = new FormData();
        formData.append("project_id", projectId || "");
        
        const res = await fetch(`${apiBase}/conversations/${conversationId}/move`, {
            method: "POST",
            body: formData
        });
        
        if (!res.ok) throw new Error("移动失败");
        
        // 更新本地数据
        const idx = conversations.findIndex(c => c.id === conversationId);
        if (idx !== -1) {
            conversations[idx] = { ...conversations[idx], project_id: projectId ? parseInt(projectId) : null };
        }
        
        renderProjectFilter();
        renderConversationListFiltered();
    } catch (error) {
        console.error("移动对话失败:", error);
        await showError("移动失败: " + error.message);
    }
}

// 渲染项目管理列表
function renderProjectList() {
    const listEl = document.getElementById("project-list");
    if (!listEl) return;
    
    listEl.innerHTML = "";
    
    if (projects.length === 0) {
        listEl.innerHTML = '<div class="empty-hint">暂无项目，点击下方按钮创建</div>';
        return;
    }
    
    // 计算每个项目的对话数量
    const projectCounts = {};
    conversations.forEach(conv => {
        if (conv.project_id) {
            projectCounts[conv.project_id] = (projectCounts[conv.project_id] || 0) + 1;
        }
    });
    
    projects.forEach(project => {
        const count = projectCounts[project.id] || 0;
        const item = document.createElement("div");
        item.className = "project-list-item";
        item.dataset.projectId = project.id;
        item.innerHTML = `
            <span class="project-icon">${project.icon || '📁'}</span>
            <div class="project-info">
                <div class="project-name">${project.name}</div>
                ${project.description ? `<div class="project-desc">${project.description}</div>` : ''}
            </div>
            <span class="project-count">${count} 对话</span>
        `;
        
        item.addEventListener("click", () => selectProjectForEdit(project));
        listEl.appendChild(item);
    });
}

// 选择项目进行编辑
function selectProjectForEdit(project) {
    // 更新选中状态
    document.querySelectorAll(".project-list-item").forEach(item => {
        item.classList.toggle("selected", item.dataset.projectId === String(project.id));
    });
    
    // 填充表单
    document.getElementById("project-form-title").textContent = "编辑项目";
    document.getElementById("project-edit-id").value = project.id;
    document.getElementById("project-name-input").value = project.name;
    document.getElementById("project-desc-input").value = project.description || "";
    document.getElementById("project-prompt-input").value = project.system_prompt || "";
    
    // 选择图标
    document.querySelectorAll("#project-icon-selector .icon-option").forEach(opt => {
        opt.classList.toggle("selected", opt.dataset.icon === project.icon);
    });
    
    // 选择颜色
    document.querySelectorAll("#project-color-selector .color-option").forEach(opt => {
        opt.classList.toggle("selected", opt.dataset.color === project.color);
    });
    
    // 显示删除按钮
    document.getElementById("project-delete-btn").style.display = "inline-block";
    document.getElementById("project-submit-btn").textContent = "保存修改";
}

// 重置项目表单
function resetProjectForm() {
    document.getElementById("project-form-title").textContent = "新建项目";
    document.getElementById("project-edit-id").value = "";
    document.getElementById("project-name-input").value = "";
    document.getElementById("project-desc-input").value = "";
    document.getElementById("project-prompt-input").value = "";
    
    // 重置图标选择
    document.querySelectorAll("#project-icon-selector .icon-option").forEach((opt, idx) => {
        opt.classList.toggle("selected", idx === 0);
    });
    
    // 重置颜色选择
    document.querySelectorAll("#project-color-selector .color-option").forEach((opt, idx) => {
        opt.classList.toggle("selected", idx === 0);
    });
    
    // 隐藏删除按钮
    document.getElementById("project-delete-btn").style.display = "none";
    document.getElementById("project-submit-btn").textContent = "创建项目";
    
    // 取消列表选中
    document.querySelectorAll(".project-list-item").forEach(item => {
        item.classList.remove("selected");
    });
}

// 创建或更新项目
async function saveProject(e) {
    e.preventDefault();
    
    const editId = document.getElementById("project-edit-id").value;
    const name = document.getElementById("project-name-input").value.trim();
    const description = document.getElementById("project-desc-input").value.trim();
    const systemPrompt = document.getElementById("project-prompt-input").value.trim();
    
    const selectedIcon = document.querySelector("#project-icon-selector .icon-option.selected");
    const selectedColor = document.querySelector("#project-color-selector .color-option.selected");
    
    const icon = selectedIcon?.dataset.icon || "📁";
    const color = selectedColor?.dataset.color || "#6366f1";
    
    if (!name) {
        await showAlert("请输入项目名称", { type: "warning" });
        return;
    }
    
    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("icon", icon);
    formData.append("color", color);
    formData.append("system_prompt", systemPrompt);
    
    try {
        let res;
        if (editId) {
            // 更新
            res = await fetch(`${apiBase}/projects/${editId}`, {
                method: "PUT",
                body: formData
            });
        } else {
            // 创建
            res = await fetch(`${apiBase}/projects`, {
                method: "POST",
                body: formData
            });
        }
        
        if (!res.ok) throw new Error(editId ? "更新失败" : "创建失败");
        
        await loadProjects();
        resetProjectForm();
    } catch (error) {
        console.error("保存项目失败:", error);
        await showError("保存失败: " + error.message);
    }
}

// 删除项目
async function deleteProject() {
    const editId = document.getElementById("project-edit-id").value;
    if (!editId) return;
    
    const project = projects.find(p => p.id === parseInt(editId));
    if (!project) return;
    
    const confirmed = await showConfirm(`该项目下的对话将变为未分类。`, { title: `确定要删除项目"${project.name}"吗？`, danger: true });
    if (!confirmed) {
        return;
    }
    
    try {
        const res = await fetch(`${apiBase}/projects/${editId}`, {
            method: "DELETE"
        });
        
        if (!res.ok) throw new Error("删除失败");
        
        // 更新本地对话数据
        conversations.forEach(conv => {
            if (conv.project_id === parseInt(editId)) {
                conv.project_id = null;
            }
        });
        
        await loadProjects();
        resetProjectForm();
        renderConversationListFiltered();
    } catch (error) {
        console.error("删除项目失败:", error);
        await showError("删除失败: " + error.message);
    }
}

// 初始化项目功能
function initProjectFeature() {
    // 项目筛选器下拉框
    const filterTrigger = document.getElementById("project-filter-trigger");
    const filterEl = document.getElementById("project-filter");
    
    if (filterTrigger && filterEl) {
        filterTrigger.addEventListener("click", (e) => {
            e.stopPropagation();
            filterEl.classList.toggle("open");
        });
    }
    
    // 筛选选项点击
    document.querySelectorAll(".project-filter-option").forEach(opt => {
        opt.addEventListener("click", () => {
            selectProjectFilter(opt.dataset.projectId);
        });
    });
    
    // 管理项目按钮
    const manageBtn = document.getElementById("manage-projects-btn");
    if (manageBtn) {
        manageBtn.addEventListener("click", () => {
            filterEl?.classList.remove("open");
            openModal("project-modal");
            renderProjectList();
        });
    }
    
    // 新建项目按钮
    const addBtn = document.getElementById("add-project-btn");
    if (addBtn) {
        addBtn.addEventListener("click", resetProjectForm);
    }
    
    // 项目表单
    const projectForm = document.getElementById("project-form");
    if (projectForm) {
        projectForm.addEventListener("submit", saveProject);
    }
    
    // 取消按钮
    const resetBtn = document.getElementById("project-form-reset");
    if (resetBtn) {
        resetBtn.addEventListener("click", resetProjectForm);
    }
    
    // 删除按钮
    const deleteBtn = document.getElementById("project-delete-btn");
    if (deleteBtn) {
        deleteBtn.addEventListener("click", deleteProject);
    }
    
    // 图标选择器
    document.querySelectorAll("#project-icon-selector .icon-option").forEach(opt => {
        opt.addEventListener("click", () => {
            document.querySelectorAll("#project-icon-selector .icon-option").forEach(o => o.classList.remove("selected"));
            opt.classList.add("selected");
        });
    });
    
    // 颜色选择器
    document.querySelectorAll("#project-color-selector .color-option").forEach(opt => {
        opt.addEventListener("click", () => {
            document.querySelectorAll("#project-color-selector .color-option").forEach(o => o.classList.remove("selected"));
            opt.classList.add("selected");
        });
    });
    
    // 右键菜单事件
    const contextMenu = document.getElementById("conversation-context-menu");
    if (contextMenu) {
        // 菜单项点击
        contextMenu.querySelectorAll(".context-menu-item").forEach(item => {
            if (item.classList.contains("context-menu-submenu")) return;
            
            item.addEventListener("click", async () => {
                const action = item.dataset.action;
                if (contextMenuConversation) {
                    await handleConversationAction(action, contextMenuConversation.id);
                }
                hideContextMenu();
            });
        });
        
        // 移动到项目子菜单
        const submenu = document.getElementById("move-to-project-submenu");
        if (submenu) {
            submenu.addEventListener("click", async (e) => {
                const item = e.target.closest(".context-submenu-item");
                if (item && contextMenuConversation) {
                    const projectId = item.dataset.projectId;
                    await moveConversationToProject(contextMenuConversation.id, projectId);
                    hideContextMenu();
                }
            });
        }
    }
    
    // 点击其他地方关闭菜单
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".context-menu")) {
            hideContextMenu();
        }
        if (!e.target.closest(".project-filter")) {
            document.getElementById("project-filter")?.classList.remove("open");
        }
    });
    
    // 关闭弹窗按钮
    document.querySelectorAll('.modal-close[data-target="project-modal"]').forEach(btn => {
        btn.addEventListener("click", () => closeModal("project-modal"));
    });
}

// 重写原来的 renderConversationList 函数，使用带筛选的版本
const originalRenderConversationList = renderConversationList;
renderConversationList = function() {
    renderConversationListFiltered();
    renderProjectFilter();
};

// 检查是否是新对话，如果是则根据项目筛选状态关联项目
async function maybeAssignProjectToNewConversation() {
    if (!currentConversationId) return;
    
    // 查找当前对话
    const conv = conversations.find(c => c.id === currentConversationId);
    if (!conv) return;
    
    // 如果对话已经有项目，或者对话标题不是"新对话"，说明不是新对话
    if (conv.project_id || conv.title !== "新对话") return;
    
    // 检查对话是否有消息（通过聊天区域判断）
    const messagesEl = document.getElementById("chat-messages");
    const hasMessages = messagesEl && messagesEl.querySelectorAll(".message").length > 0;
    if (hasMessages) return;
    
    // 是新对话，根据项目筛选状态关联项目
    let targetProjectId = null;
    
    if (currentProjectFilter && currentProjectFilter !== "" && currentProjectFilter !== "uncategorized") {
        // 在某个项目下，关联到该项目
        targetProjectId = currentProjectFilter;
    }
    // 如果是"全部对话"或"未分类"，不关联项目（保持未分类）
    
    if (targetProjectId) {
        try {
            await moveConversationToProject(currentConversationId, targetProjectId);
            console.log(`[项目] 新对话已关联到项目 ${targetProjectId}`);
        } catch (e) {
            console.error("关联项目失败:", e);
        }
    }
}


// ========== 内嵌设置面板渲染函数 ==========

// 当前选中的内嵌Provider ID
let currentProviderTabIdInline = null;

// 渲染内嵌Provider列表
function renderProviderListInline() {
    const tabsEl = document.getElementById("provider-tabs-inline");
    const contentEl = document.getElementById("provider-tab-content-inline");
    const emptyStateEl = document.getElementById("provider-empty-state-inline");
    const formEl = document.getElementById("provider-form-inline");
    
    if (!tabsEl || !contentEl) return;
    
    // 渲染标签页
    tabsEl.innerHTML = "";
    
    providers.forEach(provider => {
        const tab = document.createElement("button");
        tab.className = "provider-tab" + (provider.id == currentProviderTabIdInline ? " active" : "");
        tab.dataset.id = provider.id;
        const keyIcon = provider.has_api_key ? "🔑" : "⚠️";
        tab.innerHTML = `${provider.name} <span style="font-size:11px;opacity:0.7;">${keyIcon}</span>`;
        tab.addEventListener("click", () => selectProviderTabInline(provider.id));
        tabsEl.appendChild(tab);
    });
    
    // 添加"+"按钮
    const addTab = document.createElement("button");
    addTab.className = "provider-tab-add";
    addTab.textContent = "+";
    addTab.title = "添加 Provider";
    addTab.addEventListener("click", () => {
        currentProviderTabIdInline = null;
        resetProviderFormInline();
        if (emptyStateEl) emptyStateEl.style.display = "none";
        if (formEl) formEl.style.display = "block";
        tabsEl.querySelectorAll(".provider-tab").forEach(t => t.classList.remove("active"));
    });
    tabsEl.appendChild(addTab);
    
    // 如果没有Provider，显示空状态
    if (providers.length === 0) {
        if (emptyStateEl) emptyStateEl.style.display = "flex";
        if (formEl) formEl.style.display = "none";
        currentProviderTabIdInline = null;
    } else {
        if (!currentProviderTabIdInline || !providers.find(p => p.id == currentProviderTabIdInline)) {
            selectProviderTabInline(providers[0].id);
        } else {
            selectProviderTabInline(currentProviderTabIdInline);
        }
    }
}

// 选中内嵌Provider标签
function selectProviderTabInline(providerId) {
    currentProviderTabIdInline = providerId;
    
    const tabsEl = document.getElementById("provider-tabs-inline");
    const emptyStateEl = document.getElementById("provider-empty-state-inline");
    const formEl = document.getElementById("provider-form-inline");
    
    // 更新标签页选中状态
    if (tabsEl) {
        tabsEl.querySelectorAll(".provider-tab").forEach(tab => {
            tab.classList.toggle("active", tab.dataset.id == providerId);
        });
    }
    
    // 显示表单，隐藏空状态
    if (emptyStateEl) emptyStateEl.style.display = "none";
    if (formEl) formEl.style.display = "block";
    
    // 填充表单
    const provider = providers.find(p => p.id == providerId);
    if (provider) {
        fillProviderFormInline(provider);
    }
}

// 填充内嵌Provider表单
function fillProviderFormInline(provider) {
    const nameInput = document.getElementById("provider-name-inline");
    const apiBaseInput = document.getElementById("provider-api-base-inline");
    const apiKeyInput = document.getElementById("provider-api-key-inline");
    const modelsGrid = document.getElementById("provider-models-grid-inline");
    const deleteBtn = document.getElementById("provider-delete-btn-inline");
    
    if (nameInput) nameInput.value = provider.name || "";
    if (apiBaseInput) apiBaseInput.value = provider.api_base || "";
    if (apiKeyInput) {
        apiKeyInput.value = "";
        apiKeyInput.placeholder = provider.has_api_key ? "已设置（留空保持不变）" : "输入 API Key";
    }
    if (deleteBtn) deleteBtn.style.display = "inline-block";
    
    // 渲染模型列表
    renderModelsGridInline(provider);
}

// 渲染内嵌模型表格
function renderModelsGridInline(provider) {
    const gridEl = document.getElementById("provider-models-grid-inline");
    if (!gridEl) return;
    
    let modelsConfig = {};
    try {
        modelsConfig = JSON.parse(provider.models_config || "{}");
    } catch (e) {}
    
    // 收集所有模型
    const allModels = [];
    if (provider.default_model) {
        allModels.push({ id: provider.default_model, isDefault: true });
    }
    if (provider.models) {
        provider.models.split(",").map(m => m.trim()).filter(m => m && m !== provider.default_model).forEach(m => {
            allModels.push({ id: m, isDefault: false });
        });
    }
    
    if (allModels.length === 0) {
        gridEl.innerHTML = '<div class="model-table-empty">暂无模型，点击"+ 添加模型"按钮添加</div>';
        return;
    }
    
    // 创建表格
    let html = `
        <div class="model-table">
            <div class="model-table-header">
                <span class="col-id">模型ID</span>
                <span class="col-name">显示名</span>
                <span class="col-caps">功能</span>
                <span class="col-actions">操作</span>
            </div>
    `;
    
    allModels.forEach(model => {
        const caps = modelsConfig[model.id] || {};
        let capsHtml = "";
        if (caps.vision) capsHtml += '<span class="cap-tag">视觉</span>';
        if (caps.reasoning) capsHtml += '<span class="cap-tag">推理</span>';
        if (caps.chat) capsHtml += '<span class="cap-tag">对话</span>';
        if (caps.image_gen) capsHtml += '<span class="cap-tag">生图</span>';
        if (!capsHtml) capsHtml = '<span class="cap-tag empty">-</span>';
        
        const displayName = caps.custom_name || "-";
        html += `
            <div class="model-table-row${model.isDefault ? ' default' : ''}" data-model-id="${model.id}">
                <span class="col-id">${model.id}${model.isDefault ? '<span class="default-badge">默认</span>' : ''}</span>
                <span class="col-name">${displayName}</span>
                <span class="col-caps">${capsHtml}</span>
                <span class="col-actions">
                    <button class="model-edit-btn" onclick="openModelEditPopup('${model.id}', ${model.isDefault}, ${JSON.stringify(caps).replace(/"/g, '&quot;')})">编辑</button>
                    <button class="model-delete-btn" onclick="deleteModelDirect('${model.id}', ${model.isDefault})">删除</button>
                </span>
            </div>
        `;
    });
    
    html += '</div>';
    gridEl.innerHTML = html;
}

// 重置内嵌Provider表单
function resetProviderFormInline() {
    const nameInput = document.getElementById("provider-name-inline");
    const apiBaseInput = document.getElementById("provider-api-base-inline");
    const apiKeyInput = document.getElementById("provider-api-key-inline");
    const modelsGrid = document.getElementById("provider-models-grid-inline");
    const deleteBtn = document.getElementById("provider-delete-btn-inline");
    
    if (nameInput) nameInput.value = "";
    if (apiBaseInput) apiBaseInput.value = "";
    if (apiKeyInput) {
        apiKeyInput.value = "";
        apiKeyInput.placeholder = "输入 API Key";
    }
    if (modelsGrid) modelsGrid.innerHTML = '<div class="model-table-empty">保存 Provider 后可添加模型</div>';
    if (deleteBtn) deleteBtn.style.display = "none";
}

// 保存内嵌Provider
async function saveProviderInline(e) {
    e.preventDefault();
    
    const name = document.getElementById("provider-name-inline")?.value.trim();
    const providerApiBase = document.getElementById("provider-api-base-inline")?.value.trim();
    const providerApiKey = document.getElementById("provider-api-key-inline")?.value.trim();
    
    if (!name) {
        await showAlert("请输入 Provider 名称", { type: "warning" });
        return;
    }
    
    const formData = new FormData();
    formData.append("name", name);
    formData.append("api_base", providerApiBase || "");
    if (providerApiKey) formData.append("api_key", providerApiKey);
    
    try {
        let res;
        if (currentProviderTabIdInline) {
            // 更新
            const provider = providers.find(p => p.id == currentProviderTabIdInline);
            if (provider) {
                formData.append("default_model", provider.default_model || "");
                formData.append("models_str", provider.models || "");
                formData.append("models_config", provider.models_config || "{}");
            }
            res = await fetch(`${apiBase}/providers/${currentProviderTabIdInline}`, {
                method: "POST",
                body: formData
            });
        } else {
            // 创建
            res = await fetch(`${apiBase}/providers`, {
                method: "POST",
                body: formData
            });
        }
        
        if (!res.ok) throw new Error(await res.text());
        
        const result = await res.json();
        await loadProviders();
        await loadModels();
        
        // 如果是新建，选中新创建的Provider
        if (!currentProviderTabIdInline && result.id) {
            currentProviderTabIdInline = result.id;
        }
        
        renderProviderListInline();
        renderProviderSelect();
    } catch (e) {
        await showError("保存失败: " + e.message);
    }
}

// 删除内嵌Provider
async function deleteProviderInline() {
    if (!currentProviderTabIdInline) return;
    
    const provider = providers.find(p => p.id == currentProviderTabIdInline);
    if (!provider) return;
    
    const confirmed = await showConfirm(`此操作不可恢复`, { title: `确定删除 Provider "${provider.name}" 吗？`, danger: true });
    if (!confirmed) return;
    
    try {
        const res = await fetch(`${apiBase}/providers/${currentProviderTabIdInline}`, {
            method: "DELETE"
        });
        if (!res.ok) throw new Error("删除失败");
        
        currentProviderTabIdInline = null;
        await loadProviders();
        await loadModels();
        renderProviderListInline();
        renderProviderSelect();
    } catch (e) {
        await showAlert("删除失败: " + e.message, { type: "error" });
    }
}

// ========== 内嵌知识库面板 ==========

// 删除知识库
async function deleteKnowledgeBase(kbId) {
    try {
        const res = await fetch(`${apiBase}/knowledge/bases/${kbId}`, { method: "DELETE" });
        if (!res.ok) throw new Error("删除失败");
        
        // 如果删除的是当前选中的，清空选中
        if (selectedKbId == kbId) {
            selectedKbId = null;
        }
        
        await loadKnowledgeBases();
        renderKnowledgeBaseListInline();
    } catch (e) {
        await showAlert("删除失败: " + e.message, { type: "error" });
    }
}

// 渲染内嵌知识库列表（标签页形式，类似Provider）
function renderKnowledgeBaseListInline() {
    const tabsEl = document.getElementById("kb-tabs-inline");
    const emptyState = document.getElementById("kb-empty-state-inline");
    const detailEl = document.getElementById("kb-detail-inline");
    
    if (!tabsEl) return;
    
    tabsEl.innerHTML = "";
    
    if (knowledgeBases.length === 0) {
        if (emptyState) emptyState.style.display = "flex";
        if (detailEl) detailEl.style.display = "none";
        
        // 添加"+"按钮
        const addTab = document.createElement("div");
        addTab.className = "kb-tab kb-tab-add";
        addTab.innerHTML = "+";
        addTab.title = "新建知识库";
        addTab.addEventListener("click", () => createNewKnowledgeBase());
        tabsEl.appendChild(addTab);
        return;
    }
    
    if (emptyState) emptyState.style.display = "none";
    if (detailEl) detailEl.style.display = "block";
    
    // 渲染知识库标签
    knowledgeBases.forEach((kb, index) => {
        const tab = document.createElement("div");
        tab.className = "kb-tab" + (kb.id == selectedKbId ? " active" : "");
        tab.dataset.kbId = kb.id;
        tab.innerHTML = `<span class="kb-tab-name">📚 ${kb.name}</span>`;
        tab.addEventListener("click", () => selectKnowledgeBaseInline(kb.id));
        tabsEl.appendChild(tab);
    });
    
    // 添加"+"按钮
    const addTab = document.createElement("div");
    addTab.className = "kb-tab kb-tab-add";
    addTab.innerHTML = "+";
    addTab.title = "新建知识库";
    addTab.addEventListener("click", () => createNewKnowledgeBase());
    tabsEl.appendChild(addTab);
    
    // 如果没有选中的知识库，选中第一个
    if (!selectedKbId && knowledgeBases.length > 0) {
        selectKnowledgeBaseInline(knowledgeBases[0].id);
    } else if (selectedKbId) {
        // 更新详情表单
        updateKbDetailForm(selectedKbId);
    }
}

// 创建新知识库
async function createNewKnowledgeBase() {
    const name = await showPrompt("请输入知识库名称", { title: "新建知识库" });
    if (!name || !name.trim()) return;
    
    const formData = new FormData();
    formData.append("name", name.trim());
    
    try {
        const res = await fetch(`${apiBase}/knowledge/bases`, {
            method: "POST",
            body: formData
        });
        if (!res.ok) throw new Error(await res.text());
        
        const newKb = await res.json();
        await loadKnowledgeBases();
        selectedKbId = newKb.id;
        renderKnowledgeBaseListInline();
    } catch (e) {
        await showAlert("创建失败: " + e.message, { type: "error" });
    }
}

// 更新知识库详情表单
function updateKbDetailForm(kbId) {
    const kb = knowledgeBases.find(k => k.id == kbId);
    if (!kb) return;
    
    const nameInput = document.getElementById("kb-name-inline");
    const descInput = document.getElementById("kb-description-inline");
    const idInput = document.getElementById("kb-id-inline");
    
    if (nameInput) nameInput.value = kb.name || "";
    if (descInput) descInput.value = kb.description || "";
    if (idInput) idInput.value = kb.id;
    
    // 加载文件列表
    loadKbFilesInline(kbId);
}

// 选中内嵌知识库
function selectKnowledgeBaseInline(kbId) {
    selectedKbId = kbId;
    
    // 更新标签页状态
    const tabsEl = document.getElementById("kb-tabs-inline");
    if (tabsEl) {
        tabsEl.querySelectorAll(".kb-tab").forEach(tab => {
            tab.classList.toggle("active", tab.dataset.kbId == kbId);
        });
    }
    
    // 更新详情表单
    updateKbDetailForm(kbId);
}

// 加载内嵌知识库文件列表
async function loadKbFilesInline(kbId) {
    const filesEl = document.getElementById("kb-files-inline");
    if (!filesEl || !kbId) {
        if (filesEl) filesEl.innerHTML = '<div class="kb-files-empty">请选择知识库</div>';
        return;
    }
    
    try {
        const res = await fetch(`${apiBase}/knowledge/documents?kb_id=${kbId}`);
        if (!res.ok) throw new Error("加载失败");
        
        const docs = await res.json();
        
        if (docs.length === 0) {
            filesEl.innerHTML = '<div class="kb-files-empty">该知识库暂无文件</div>';
        } else {
            let html = '';
            docs.forEach(doc => {
                const ext = doc.file_name.split('.').pop().toLowerCase();
                const icons = { 'pdf': '📄', 'docx': '📝', 'txt': '📃', 'md': '📃' };
                const icon = icons[ext] || '📄';
                html += `
                    <div class="kb-file-item" data-doc-id="${doc.id}">
                        <span class="file-icon">${icon}</span>
                        <span class="file-name">${doc.file_name}</span>
                        <button class="file-delete" data-id="${doc.id}">×</button>
                    </div>
                `;
            });
            filesEl.innerHTML = html;
            
            // 绑定删除事件
            filesEl.querySelectorAll(".file-delete").forEach(btn => {
                btn.addEventListener("click", async () => {
                    const docId = btn.dataset.id;
                    try {
                        await fetch(`${apiBase}/knowledge/documents/${docId}`, { method: "DELETE" });
                        loadKbFilesInline(kbId);
                    } catch (e) {
                        await showAlert("删除失败", { type: "error" });
                    }
                });
            });
        }
    } catch (e) {
        filesEl.innerHTML = '<div class="kb-files-empty">加载失败</div>';
    }
}

// ========== 内嵌MCP面板 ==========

// 渲染内嵌MCP服务器列表（折叠面板形式）
function renderMCPServerListInline() {
    const listEl = document.getElementById("mcp-accordion-list-inline");
    if (!listEl) return;
    
    listEl.innerHTML = "";
    
    if (mcpServers.length === 0) {
        listEl.innerHTML = '<div class="mcp-empty">暂无 MCP 服务器，点击下方按钮添加</div>';
        return;
    }
    
    mcpServers.forEach(server => {
        const item = document.createElement("div");
        item.className = "mcp-accordion-item" + (server.enabled ? "" : " disabled");
        item.dataset.serverId = server.id;
        
        const statusText = server.enabled ? "已启用" : "未启用";
        const statusClass = server.enabled ? "status-enabled" : "status-disabled";
        const toolCount = server.tools ? server.tools.length : 0;
        const toolsHtml = server.tools && server.tools.length > 0 
            ? server.tools.map(t => `<div class="mcp-tool-item">🔧 ${t.name}</div>`).join("")
            : '<div class="mcp-no-tools">暂无工具</div>';
        
        item.innerHTML = `
            <div class="mcp-accordion-header">
                <span class="mcp-accordion-arrow">▶</span>
                <span class="mcp-name">${server.name}</span>
                <span class="mcp-status-text ${statusClass}">${statusText}</span>
                <span class="mcp-tools-count">${toolCount} 工具</span>
                <div class="mcp-actions">
                    <button class="mcp-edit-btn" data-id="${server.id}">编辑</button>
                    <button class="mcp-delete-btn" data-id="${server.id}">删除</button>
                </div>
            </div>
            <div class="mcp-accordion-content">
                ${server.description ? `<div class="mcp-desc">${server.description}</div>` : ''}
                <div class="mcp-tools-list">
                    <div class="mcp-tools-title">可用工具：</div>
                    ${toolsHtml}
                </div>
            </div>
        `;
        
        // 折叠展开事件
        const header = item.querySelector(".mcp-accordion-header");
        header.addEventListener("click", (e) => {
            if (e.target.closest(".mcp-actions")) return;
            item.classList.toggle("expanded");
        });
        
        // 绑定编辑按钮事件
        item.querySelector(".mcp-edit-btn").addEventListener("click", async (e) => {
            e.stopPropagation();
            openMCPEditForm(server);
        });
        
        // 绑定删除按钮事件
        item.querySelector(".mcp-delete-btn").addEventListener("click", async (e) => {
            e.stopPropagation();
            const confirmed = await showConfirm(`此操作不可恢复`, { title: `确定删除 MCP 服务器"${server.name}"吗？`, danger: true });
            if (confirmed) {
                await deleteMCPServer(server.id);
            }
        });
        
        listEl.appendChild(item);
    });
}

// 切换MCP服务器状态
async function toggleMCPServer(serverId, enabled) {
    try {
        const formData = new FormData();
        formData.append("enabled", enabled ? "true" : "false");
        
        const res = await fetch(`${apiBase}/mcp/servers/${serverId}/toggle`, {
            method: "POST",
            body: formData
        });
        
        if (!res.ok) throw new Error("操作失败");
        
        await loadMCPServers();
        renderMCPServerListInline();
    } catch (e) {
        await showAlert("操作失败: " + e.message, { type: "error" });
    }
}

// 删除MCP服务器
async function deleteMCPServer(serverId) {
    try {
        const res = await fetch(`${apiBase}/mcp/servers/${serverId}`, {
            method: "DELETE"
        });
        
        if (!res.ok) throw new Error("删除失败");
        
        await loadMCPServers();
        renderMCPServerListInline();
    } catch (e) {
        await showAlert("删除失败: " + e.message, { type: "error" });
    }
}

// 打开MCP编辑表单
function openMCPEditForm(server) {
    const mcpAddFormInline = document.getElementById("mcp-add-form-inline");
    const mcpAddBtnInline = document.getElementById("mcp-add-btn-inline");
    const mcpFormTitle = mcpAddFormInline?.querySelector(".mcp-form-title");
    
    if (!mcpAddFormInline) return;
    
    // 显示表单
    mcpAddFormInline.style.display = "block";
    if (mcpAddBtnInline) mcpAddBtnInline.style.display = "none";
    
    // 更新标题
    if (mcpFormTitle) mcpFormTitle.textContent = "编辑 MCP Server";
    
    // 填充表单数据
    const nameInput = document.getElementById("mcp-name-inline");
    const connectionTypeSelect = document.getElementById("mcp-connection-type-inline");
    const commandInput = document.getElementById("mcp-command-inline");
    const argsInput = document.getElementById("mcp-args-inline");
    const urlInput = document.getElementById("mcp-url-inline");
    const descriptionInput = document.getElementById("mcp-description-inline");
    const stdioConfig = document.getElementById("mcp-stdio-config-inline");
    const httpConfig = document.getElementById("mcp-http-config-inline");
    
    if (nameInput) nameInput.value = server.name || "";
    if (descriptionInput) descriptionInput.value = server.description || "";
    
    // 判断连接类型
    const isHttp = server.url && server.url.startsWith("http");
    if (connectionTypeSelect) {
        connectionTypeSelect.value = isHttp ? "http" : "stdio";
        if (stdioConfig) stdioConfig.style.display = isHttp ? "none" : "block";
        if (httpConfig) httpConfig.style.display = isHttp ? "block" : "none";
    }
    
    if (isHttp) {
        if (urlInput) urlInput.value = server.url || "";
    } else {
        if (commandInput) commandInput.value = server.command || "";
        if (argsInput) argsInput.value = server.args ? server.args.join(", ") : "";
    }
    
    // 存储编辑的服务器ID
    mcpAddFormInline.dataset.editId = server.id;
}

// ========== 设置页面导航初始化 ==========

function initSettingsNavigation() {
    const navItems = document.querySelectorAll(".settings-nav-item");
    const panels = document.querySelectorAll(".settings-panel");
    
    navItems.forEach(item => {
        item.addEventListener("click", () => {
            const targetPanel = item.dataset.tab;
            
            // 更新导航选中状态
            navItems.forEach(nav => nav.classList.remove("active"));
            item.classList.add("active");
            
            // 切换面板
            panels.forEach(panel => {
                panel.classList.toggle("active", panel.id === `settings-panel-${targetPanel}`);
            });
            
            // 根据面板加载数据
            if (targetPanel === "provider") {
                renderProviderListInline();
            } else if (targetPanel === "knowledge") {
                renderKnowledgeBaseListInline();
                populateKbModelSelectsInline();
            } else if (targetPanel === "mcp") {
                renderMCPServerListInline();
            }
        });
    });
}

// 初始化内嵌面板事件（Provider、知识库、MCP）
function initInlinePanelEvents() {
    // 内嵌Provider表单提交
    const providerFormInline = document.getElementById("provider-form-inline");
    if (providerFormInline) {
        providerFormInline.addEventListener("submit", saveProviderInline);
    }
    
    // 内嵌Provider删除按钮
    const providerDeleteBtnInline = document.getElementById("provider-delete-btn-inline");
    if (providerDeleteBtnInline) {
        providerDeleteBtnInline.addEventListener("click", deleteProviderInline);
    }
    
    // 内嵌添加模型按钮
    const addModelBtnInline = document.getElementById("add-model-btn-inline");
    if (addModelBtnInline) {
        addModelBtnInline.addEventListener("click", () => {
            openModelEditPopup("", false, {});
        });
    }
    
    // 内嵌知识库保存按钮
    const kbSaveBtnInline = document.getElementById("kb-save-btn-inline");
    if (kbSaveBtnInline) {
        kbSaveBtnInline.addEventListener("click", async () => {
            const kbId = document.getElementById("kb-id-inline")?.value;
            const name = document.getElementById("kb-name-inline")?.value.trim();
            const description = document.getElementById("kb-description-inline")?.value.trim();
            
            if (!kbId || !name) {
                await showAlert("请输入知识库名称", { type: "warning" });
                return;
            }
            
            const formData = new FormData();
            formData.append("name", name);
            if (description) formData.append("description", description);
            
            try {
                const res = await fetch(`${apiBase}/knowledge/bases/${kbId}`, {
                    method: "PUT",
                    body: formData
                });
                if (!res.ok) throw new Error(await res.text());
                
                await loadKnowledgeBases();
                renderKnowledgeBaseListInline();
            } catch (e) {
                await showAlert("保存失败: " + e.message, { type: "error" });
            }
        });
    }
    
    // 内嵌知识库删除按钮
    const kbDeleteBtnInline = document.getElementById("kb-delete-btn-inline");
    if (kbDeleteBtnInline) {
        kbDeleteBtnInline.addEventListener("click", async () => {
            const kbId = document.getElementById("kb-id-inline")?.value;
            const kb = knowledgeBases.find(k => k.id == kbId);
            if (!kbId || !kb) return;
            
            const confirmed = await showConfirm(`此操作不可恢复`, { title: `确定删除知识库"${kb.name}"吗？`, danger: true });
            if (confirmed) {
                await deleteKnowledgeBase(kbId);
            }
        });
    }
    
    // 内嵌知识库上传表单
    const kbUploadFormInline = document.getElementById("kb-upload-form-inline");
    if (kbUploadFormInline) {
        kbUploadFormInline.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            if (!selectedKbId) {
                await showAlert("请先选择目标知识库", { type: "warning" });
                return;
            }
            
            const fileInput = document.getElementById("kb-file-inline");
            const embeddingModel = document.getElementById("embedding-model-select-inline")?.value;
            const extractImages = document.getElementById("kb-extract-images-inline")?.checked;
            const visionModel = document.getElementById("kb-vision-model-select-inline")?.value;
            const uploadBtn = document.getElementById("kb-upload-btn-inline");
            const statusEl = document.getElementById("kb-upload-status-inline");
            
            const files = fileInput?.files;
            if (!files || files.length === 0) {
                await showAlert("请选择要上传的文件", { type: "warning" });
                return;
            }
            
            if (uploadBtn) {
                uploadBtn.disabled = true;
                uploadBtn.textContent = "上传中...";
            }
            
            let successCount = 0;
            let failCount = 0;
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const formData = new FormData();
                formData.append("kb_id", selectedKbId);
                formData.append("file", file);
                formData.append("extract_images", extractImages ? "true" : "false");
                if (embeddingModel) formData.append("embedding_model", embeddingModel);
                if (visionModel) formData.append("vision_model", visionModel);
                
                if (statusEl) {
                    statusEl.textContent = `上传中... (${i + 1}/${files.length}) - ${file.name}`;
                }
                
                try {
                    const res = await fetch(`${apiBase}/knowledge/upload`, {
                        method: "POST",
                        body: formData
                    });
                    if (!res.ok) throw new Error();
                    successCount++;
                } catch (e) {
                    failCount++;
                }
            }
            
            if (statusEl) {
                statusEl.textContent = `✅ 上传完成: ${successCount} 成功${failCount > 0 ? `, ${failCount} 失败` : ''}`;
            }
            
            if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.textContent = "上传并构建";
            }
            
            kbUploadFormInline.reset();
            loadKbFilesInline(selectedKbId);
        });
    }
    
    // 内嵌MCP添加按钮 - 显示内嵌表单
    const mcpAddBtnInline = document.getElementById("mcp-add-btn-inline");
    const mcpAddFormInline = document.getElementById("mcp-add-form-inline");
    const mcpFormCloseInline = document.getElementById("mcp-form-close-inline");
    const mcpCancelInline = document.getElementById("mcp-cancel-inline");
    const mcpFormInline = document.getElementById("mcp-form-inline");
    const mcpConnectionTypeInline = document.getElementById("mcp-connection-type-inline");
    
    if (mcpAddBtnInline && mcpAddFormInline) {
        mcpAddBtnInline.addEventListener("click", () => {
            // 重置为添加模式
            const mcpFormTitle = mcpAddFormInline.querySelector(".mcp-form-title");
            if (mcpFormTitle) mcpFormTitle.textContent = "添加 MCP Server";
            delete mcpAddFormInline.dataset.editId;
            
            mcpAddFormInline.style.display = "block";
            mcpAddBtnInline.style.display = "none";
        });
    }
    
    // 关闭/取消按钮
    const closeMcpForm = () => {
        if (mcpAddFormInline) {
            mcpAddFormInline.style.display = "none";
            delete mcpAddFormInline.dataset.editId;
            const mcpFormTitle = mcpAddFormInline.querySelector(".mcp-form-title");
            if (mcpFormTitle) mcpFormTitle.textContent = "添加 MCP Server";
        }
        if (mcpAddBtnInline) mcpAddBtnInline.style.display = "block";
        if (mcpFormInline) mcpFormInline.reset();
    };
    
    if (mcpFormCloseInline) {
        mcpFormCloseInline.addEventListener("click", closeMcpForm);
    }
    if (mcpCancelInline) {
        mcpCancelInline.addEventListener("click", closeMcpForm);
    }
    
    // 连接类型切换
    if (mcpConnectionTypeInline) {
        mcpConnectionTypeInline.addEventListener("change", () => {
            const type = mcpConnectionTypeInline.value;
            const stdioConfig = document.getElementById("mcp-stdio-config-inline");
            const httpConfig = document.getElementById("mcp-http-config-inline");
            if (stdioConfig) stdioConfig.style.display = type === "stdio" ? "block" : "none";
            if (httpConfig) httpConfig.style.display = type === "http" ? "block" : "none";
        });
    }
    
    // MCP 表单提交
    if (mcpFormInline) {
        mcpFormInline.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const name = document.getElementById("mcp-name-inline")?.value.trim();
            const connectionType = document.getElementById("mcp-connection-type-inline")?.value;
            const description = document.getElementById("mcp-description-inline")?.value.trim();
            const editId = mcpAddFormInline?.dataset.editId;
            
            if (!name) {
                await showAlert("请输入名称", { type: "warning" });
                return;
            }
            
            const formData = new FormData();
            formData.append("name", name);
            formData.append("connection_type", connectionType);
            if (description) formData.append("description", description);
            
            if (connectionType === "stdio") {
                const command = document.getElementById("mcp-command-inline")?.value.trim();
                const args = document.getElementById("mcp-args-inline")?.value.trim();
                if (command) formData.append("command", command);
                if (args) formData.append("args", args);
            } else {
                const url = document.getElementById("mcp-url-inline")?.value.trim();
                if (url) formData.append("url", url);
            }
            
            try {
                let url = `${apiBase}/mcp/servers`;
                let method = "POST";
                
                // 如果是编辑模式，使用PUT方法
                if (editId) {
                    url = `${apiBase}/mcp/servers/${editId}`;
                    method = "PUT";
                }
                
                const res = await fetch(url, {
                    method: method,
                    body: formData
                });
                if (!res.ok) throw new Error(await res.text());
                
                await loadMCPServers();
                renderMCPServerListInline();
                closeMcpForm();
            } catch (e) {
                await showAlert((editId ? "更新" : "添加") + "失败: " + e.message, { type: "error" });
            }
        });
    }
    
    // 填充内嵌知识库的模型选择器
    populateKbModelSelectsInline();
}

// 填充内嵌知识库的模型选择器
function populateKbModelSelectsInline() {
    const embeddingSelectInline = document.getElementById("embedding-model-select-inline");
    const rerankSelectInline = document.getElementById("rerank-model-select-inline");
    const visionSelectInline = document.getElementById("kb-vision-model-select-inline");
    
    // 从原有的 select 元素复制选项
    const embeddingSelectOriginal = document.getElementById("embedding-model-select");
    const rerankSelectOriginal = document.getElementById("rerank-model-select");
    const visionSelectOriginal = document.getElementById("kb-vision-model-select");
    
    // 填充向量模型
    if (embeddingSelectInline && embeddingSelectOriginal) {
        embeddingSelectInline.innerHTML = embeddingSelectOriginal.innerHTML;
    } else if (embeddingSelectInline) {
        embeddingSelectInline.innerHTML = '<option value="">请选择向量模型</option>';
    }
    
    // 填充重排模型
    if (rerankSelectInline && rerankSelectOriginal) {
        rerankSelectInline.innerHTML = rerankSelectOriginal.innerHTML;
    } else if (rerankSelectInline) {
        rerankSelectInline.innerHTML = '<option value="">不使用重排模型</option>';
    }
    
    // 填充视觉模型
    if (visionSelectInline && visionSelectOriginal) {
        visionSelectInline.innerHTML = visionSelectOriginal.innerHTML;
    } else if (visionSelectInline) {
        visionSelectInline.innerHTML = '<option value="">不启用</option>';
    }
}
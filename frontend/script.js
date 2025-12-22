// 本地 AI 助手 - JavaScript 主文件

// 检查并配置外部库
function initializeExternalLibraries() {
    // 检查marked库
    if (typeof marked === 'undefined') {
        console.warn("marked库未加载，使用fallback");
        window.marked = {
            parse: function(text) {
                // 简单的文本处理，将换行转换为<br>
                return text.replace(/\n/g, '<br>');
            }
        };
    } else {
        console.log("marked库已加载，版本:", marked.version || "未知");
        try {
            // 配置marked选项
            const markedOptions = {
                breaks: true,      // 启用换行符转换为<br>
                gfm: true,         // 启用GitHub风格的Markdown
                headerIds: false,  // 禁用标题ID
                mangle: false      // 禁用邮箱地址混淆
            };
            
            if (typeof marked.setOptions === 'function') {
                marked.setOptions(markedOptions);
                console.log("marked配置完成");
            } else if (typeof marked.use === 'function') {
                // 新版本的marked使用use方法
                marked.use(markedOptions);
                console.log("marked配置完成(新版本)");
            }
        } catch (e) {
            console.error("marked配置失败:", e);
        }
    }

    // 检查DOMPurify库
    if (typeof DOMPurify === 'undefined') {
        console.warn("DOMPurify库未加载，XSS防护功能不可用");
    } else {
        console.log("DOMPurify库已加载，XSS防护已启用");
    }
}

// 初始化外部库
initializeExternalLibraries();

// API基础URL配置
const apiBase = "";

// 常量定义
const TOOL_SETTINGS_KEY = "tool_settings_v1";
const DEBUG_STREAM = false; // 调试开关，控制流式输出日志
// 你可以按体验调整：更大 = 更快但"跳字"更明显；更小 = 更丝滑但更吃 CPU
const STREAM_FLUSH_INTERVAL_MS = 80;   // 建议 60~120
const STREAM_FLUSH_MIN_CHARS = 120;    // 建议 80~200

// 全局状态变量
let currentConversationId = null;
let conversations = [];
let providers = [];
let knowledgeBases = [];
let mcpServers = [];
let currentSettings = {
    fontSize: "14px",
    autoTitleModel: "current",
    theme: "original",
    density: "normal",  // 间距风格：compact / normal / airy
    availableModels: []
};

// 流式传输控制变量
let isStreaming = false;
let currentStreamController = null;
let currentStreamingMessageEl = null; // 跟踪当前正在流式输出的消息元素
let currentFullText = ""; // 跟踪当前流式输出的完整文本

// 流式UI状态管理
let streamUiState = {
    pending: "",
    flushTimer: null,
    scrollTimer: null,
    lastFlushAt: 0
};

// DOM元素变量 - 统一声明，避免重复声明错误
let conversationListEl, chatMessagesEl, chatTitleEl, modelSelectEl, providerSelectEl;
let userInputEl, toggleKnowledgeEl, toggleMcpEl, toggleWebEl, toggleStreamEl, webSearchSourceEl;
let providerModalEl, providerListEl, providerFormEl;
let knowledgeModalEl, kbListEl, kbFormEl, kbSelectEl, kbUploadFormEl, kbUploadStatusEl, embeddingModelSelectEl;
let mcpModalEl, mcpListEl, mcpFormEl, settingsModalEl;

// 针对单个消息的渲染节流（每条消息一个定时器，避免互相抢）
const renderTimers = new WeakMap();



function scheduleScrollToBottom() {
    if (streamUiState.scrollTimer) return;
    streamUiState.scrollTimer = setTimeout(() => {
        streamUiState.scrollTimer = null;
        scrollToBottom();
    }, 120);
}

function cancelScheduledRender(contentEl) {
    const t = renderTimers.get(contentEl);
    if (t) clearTimeout(t);
    renderTimers.delete(contentEl);
}


function renderMarkdownToEl(contentEl, rawMd) {
    if (!contentEl) return;

    // 保存原始 markdown，后续重渲染/复制都用它
    const msgEl = contentEl.closest(".message");
    if (msgEl) msgEl.dataset.rawContent = rawMd;

    try {
        if (typeof marked !== "undefined" && typeof marked.parse === "function") {
            const htmlContent = marked.parse(rawMd || "");
            // 使用DOMPurify清理HTML内容，防止XSS攻击
            if (typeof DOMPurify !== "undefined" && typeof DOMPurify.sanitize === "function") {
                contentEl.innerHTML = DOMPurify.sanitize(htmlContent);
            } else {
                // 如果DOMPurify不可用，仍然使用原始HTML（开发环境）
                console.warn("DOMPurify不可用，建议在生产环境中使用");
                contentEl.innerHTML = htmlContent;
            }
        } else {
            // fallback: 当marked库不可用时，使用纯文本显示
            console.warn("marked库不可用，使用纯文本显示");
            contentEl.textContent = rawMd || "";
        }
    } catch (e) {
        // 解析失败时退回纯文本（避免页面炸掉）
        console.error("Markdown解析失败:", e);
        contentEl.textContent = rawMd || "";
    }
}

function scheduleMarkdownRender(contentEl, rawMd, wait = 80) {
    if (!contentEl) return;

    // 记住最新 rawMd（节流期间可能继续增长）
    contentEl._latestRawMd = rawMd;

    // 取消上一次计划
    cancelScheduledRender(contentEl);

    const t = setTimeout(() => {
        // 如果切换对话导致 DOM 被清空，元素已不在文档中，则跳过，避免串台/错位
        if (!document.contains(contentEl)) return;

        renderMarkdownToEl(contentEl, contentEl._latestRawMd);
    }, wait);

    renderTimers.set(contentEl, t);
}

// ===== 流式 UI 缓冲：把高频 token 合并成低频渲染，显著提升速度与稳定性 =====

function resetStreamUiState() {
    streamUiState.pending = "";
    streamUiState.lastFlushAt = 0;
    if (streamUiState.flushTimer) clearTimeout(streamUiState.flushTimer);
    if (streamUiState.scrollTimer) clearTimeout(streamUiState.scrollTimer);
    streamUiState.flushTimer = null;
    streamUiState.scrollTimer = null;
}

function enqueueStreamText(text) {
    if (!text) return;
    streamUiState.pending += text;
}

function scheduleScrollToBottom() {
    if (streamUiState.scrollTimer) return;
    streamUiState.scrollTimer = setTimeout(() => {
        streamUiState.scrollTimer = null;
        scrollToBottom();
    }, 120);
}

/**
 * 批量 flush：把 pending 合并进 fullText，并对"当前这条assistant消息"做全量重渲染
 * @param {HTMLElement} assistantEl - 当前这条assistant message的根节点
 * @param {Function} applyAppend - (appendText) => fullText （由 sendMessage 提供闭包）
 */
function scheduleFlushStream(assistantEl, applyAppend) {
    if (!assistantEl) return;
    const now = Date.now();
    const dueByTime = (now - streamUiState.lastFlushAt) >= STREAM_FLUSH_INTERVAL_MS;
    const dueBySize = streamUiState.pending.length >= STREAM_FLUSH_MIN_CHARS;

    const doFlush = () => {
        streamUiState.flushTimer = null;
        if (!streamUiState.pending) return;
        const contentEl = assistantEl.querySelector(".message-content");
        if (!contentEl) return;

        // 如果切换对话导致 DOM 已经被清空，直接不渲染，避免串台
        if (!document.contains(contentEl)) {
            streamUiState.pending = "";
            return;
        }

        const appendText = streamUiState.pending;
        streamUiState.pending = "";
        streamUiState.lastFlushAt = Date.now();

        const fullText = applyAppend(appendText);

        // 我们已经在 flush 级别节流了，这里直接渲染（wait=0）
        scheduleMarkdownRender(contentEl, fullText, 0);
        scheduleScrollToBottom();
    };

    if (dueByTime || dueBySize) {
        doFlush();
        return;
    }

    if (streamUiState.flushTimer) return;
    streamUiState.flushTimer = setTimeout(doFlush, STREAM_FLUSH_INTERVAL_MS);
}

function doFlush(assistantEl, fullTextGetter) {
    if (!assistantEl) return;
    const contentEl = assistantEl.querySelector(".message-content");
    if (!contentEl) return;
    if (!streamUiState.pendingText) return;

    // 合并
    const append = streamUiState.pendingText;
    streamUiState.pendingText = "";
    streamUiState.lastFlushAt = Date.now();

    // 取 fullText（由外部闭包提供），做“全量重渲染”
    const fullText = fullTextGetter(append); // 由 sendMessage 提供一个合并方法
    scheduleMarkdownRender(contentEl, fullText, 0); // 这里 wait=0，因为我们已经做了 flush 节流

    scheduleScrollToBottom();
}

function scheduleScrollToBottom() {
    if (streamUiState.scrollTimer) return;
    streamUiState.scrollTimer = setTimeout(() => {
        streamUiState.scrollTimer = null;
        scrollToBottom();
    }, 120);
}

function resetStreamUiState() {
    streamUiState.pendingText = "";
    streamUiState.lastFlushAt = 0;
    if (streamUiState.flushTimer) clearTimeout(streamUiState.flushTimer);
    if (streamUiState.scrollTimer) clearTimeout(streamUiState.scrollTimer);
    streamUiState.flushTimer = null;
    streamUiState.scrollTimer = null;
}



// 重新渲染所有消息（用于切换模式或手动刷新）
function rerenderAllMessages() {
    document.querySelectorAll(".message.message-assistant .message-content").forEach(el => {
        const msgEl = el.closest(".message");
        const raw = msgEl?.dataset?.rawContent ?? el.textContent ?? "";
        renderMarkdownToEl(el, raw);
        addCopyButtonsToCodeBlocks(el);
    });
}

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
    toggleStreamEl = document.getElementById("toggle-stream");
    webSearchSourceEl = document.getElementById("web-search-source");
    providerModalEl = document.getElementById("provider-modal");
    providerListEl = document.getElementById("provider-list");
    providerFormEl = document.getElementById("provider-form");
    knowledgeModalEl = document.getElementById("knowledge-modal");
    kbListEl = document.getElementById("kb-list");
    kbFormEl = document.getElementById("kb-form");
    kbSelectEl = document.getElementById("kb-select");
    kbUploadFormEl = document.getElementById("kb-upload-form");
    kbUploadStatusEl = document.getElementById("kb-upload-status");
    embeddingModelSelectEl = document.getElementById("embedding-model-select");
    mcpModalEl = document.getElementById("mcp-modal");
    mcpListEl = document.getElementById("mcp-list");
    mcpFormEl = document.getElementById("mcp-form");
    settingsModalEl = document.getElementById("settings-modal");
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
            if (toggleMcpEl) toggleMcpEl.checked = settings.mcp || false;
            if (toggleWebEl) toggleWebEl.checked = settings.web || false;
            if (toggleStreamEl) toggleStreamEl.checked = settings.stream !== undefined ? settings.stream : true;
            
            // 更新搜索源选择器的显示状态
            if (webSearchSourceEl && toggleWebEl) {
                webSearchSourceEl.style.display = toggleWebEl.checked ? "inline-block" : "none";
                if (settings.webSearchSource) {
                    webSearchSourceEl.value = settings.webSearchSource;
                }
            }
        }
    } catch (e) {
        console.error("加载工具设置失败:", e);
    }
}

// 保存工具设置
function saveToolSettings() {
    try {
        const settings = {
            knowledge: toggleKnowledgeEl ? toggleKnowledgeEl.checked : false,
            mcp: toggleMcpEl ? toggleMcpEl.checked : false,
            web: toggleWebEl ? toggleWebEl.checked : false,
            stream: toggleStreamEl ? toggleStreamEl.checked : true,
            webSearchSource: webSearchSourceEl ? webSearchSourceEl.value : "bing"
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
    if (toggleStreamEl) toggleStreamEl.addEventListener('change', saveToolSettings);
    if (webSearchSourceEl) webSearchSourceEl.addEventListener('change', saveToolSettings);
    
    // 联网搜索开关控制搜索源选择器显示
    if (toggleWebEl && webSearchSourceEl) {
        toggleWebEl.addEventListener("change", () => {
            webSearchSourceEl.style.display = toggleWebEl.checked ? "inline-block" : "none";
        });
    }
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
        
        // 更新设置界面
        const fontSizeSelect = document.getElementById("font-size-select");
        if (fontSizeSelect) fontSizeSelect.value = settings.font_size || "13px";
        
        // 更新间距风格选择器
        const densitySelect = document.getElementById("density-select");
        if (densitySelect) densitySelect.value = settings.density || "normal";
        
        const searchDefaultSource = document.getElementById("search-default-source");
        if (searchDefaultSource) searchDefaultSource.value = settings.default_search_source || "bing";
        
        // 获取所有可用模型
        await loadModels(); // 确保先加载模型
        const modelsRes = await fetch(`${apiBase}/models/all`);
        let availableModels = [];
        if (modelsRes.ok) {
            const modelsData = await modelsRes.json();
            availableModels = modelsData.models || [];
        }
        
        // 更新自动命名模型选择器
        const autoTitleSelect = document.getElementById("auto-title-model-select");
        if (autoTitleSelect) {
            autoTitleSelect.innerHTML = "";
            
            // 添加默认选项
            const currentOpt = document.createElement("option");
            currentOpt.value = "current";
            currentOpt.textContent = "使用当前对话模型";
            autoTitleSelect.appendChild(currentOpt);
            
            // 添加具体模型选项
            if (availableModels.length > 0) {
                availableModels.forEach(model => {
                    const opt = document.createElement("option");
                    opt.value = model;
                    opt.textContent = model;
                    autoTitleSelect.appendChild(opt);
                });
            }
            
            autoTitleSelect.value = settings.auto_title_model || "current";
        }
        
        // 应用设置
        applySettings(settings);
        currentSettings = {...settings, available_models: availableModels};
        
        // 设置搜索源默认值
        if (webSearchSourceEl) {
            webSearchSourceEl.value = settings.default_search_source || "bing";
        }
    } catch(e) { 
        console.error("加载设置失败:", e); 
    }
}

function applySettings(settings) {
    // 应用字体大小到整个页面和聊天消息容器
    if (settings.font_size) {
        document.body.style.fontSize = settings.font_size;
        // 同时更新CSS变量，影响所有元素
        document.documentElement.style.setProperty('--base-font-size', settings.font_size);
        
        // 将字体大小应用到聊天消息容器，让em单位的间距随之缩放
        const chatMessages = document.getElementById("chat-messages");
        if (chatMessages) {
            chatMessages.style.fontSize = settings.font_size;
        }
        
        // 根据字体大小调整侧边栏缩放比例
        const baseFontSize = 13; // 基准字体大小
        const currentFontSize = parseInt(settings.font_size);
        const scale = currentFontSize / baseFontSize;
        
        // 字体越小，侧边栏越小
        const sidebarScale = Math.max(0.7, Math.min(1.3, scale));
        document.documentElement.style.setProperty('--sidebar-scale', sidebarScale);
    }
    
    // 应用间距风格到聊天消息容器
    if (settings.density) {
        currentSettings.density = settings.density;
        const chatMessages = document.getElementById("chat-messages");
        if (chatMessages) {
            chatMessages.setAttribute('data-density', settings.density);
        }
    }
}
// 数据加载函数
async function loadModels() {
    try {
        const res = await fetch(`${apiBase}/models/all`);
        if (!res.ok) return;
        const data = await res.json();
        
        if (!modelSelectEl) {
            console.warn("modelSelectEl not found, skipping loadModels");
            return;
        }
        
        modelSelectEl.innerHTML = "";
        const models = data.models || [];
        models.forEach(m => {
            const opt = document.createElement("option");
            opt.value = m;
            opt.textContent = m === data.default ? `${m} (默认)` : m;
            modelSelectEl.appendChild(opt);
        });
        if(data.default) modelSelectEl.value = data.default;
    } catch(e) { console.error(e); }
}

async function loadConversations() {
    try {
        const res = await fetch(`${apiBase}/conversations`);
        if (!res.ok) return;
        conversations = await res.json();
        renderConversationList();
    } catch(e) { console.error(e); }
}

async function loadProviders() {
    try {
        const res = await fetch(`${apiBase}/providers`);
        if (!res.ok) return;
        providers = await res.json();
        renderProviderSelect();
    } catch(e) { console.error(e); }
}

function renderProviderSelect() {
    if (!providerSelectEl) return;
    
    const currentVal = providerSelectEl.value;
    providerSelectEl.innerHTML = `<option value="">(使用系统默认)</option>`;
    providers.forEach(p => {
        const opt = document.createElement("option");
        opt.value = String(p.id);
        opt.textContent = p.name + (p.is_default ? " (默认)" : "");
        providerSelectEl.appendChild(opt);
    });
    if (currentVal) providerSelectEl.value = currentVal;
}

async function loadKnowledgeBases() {
    try {
        const res = await fetch(`${apiBase}/knowledge/bases`);
        if (!res.ok) return;
        knowledgeBases = await res.json();
    } catch(e) { console.error(e); }
}

async function loadMCPServers() {
    try {
        const res = await fetch(`${apiBase}/mcp/servers`);
        if (!res.ok) return;
        mcpServers = await res.json();
    } catch(e) { console.error(e); }
}

// 加载向量模型列表
async function loadEmbeddingModels() {
    try {
        const res = await fetch(`${apiBase}/knowledge/embedding-models`);
        if (!res.ok) return;
        const data = await res.json();
        
        if (!embeddingModelSelectEl) {
            console.warn("embeddingModelSelectEl not found, skipping loadEmbeddingModels");
            return;
        }
        
        embeddingModelSelectEl.innerHTML = "";
        
        if (!data.models || data.models.length === 0) {
            const opt = document.createElement("option");
            opt.value = "";
            opt.textContent = data.message || "无可用向量模型";
            opt.disabled = true;
            embeddingModelSelectEl.appendChild(opt);
            return;
        }
        
        const models = data.models || [];
        models.forEach(m => {
            const opt = document.createElement("option");
            opt.value = m;
            opt.textContent = m === data.default ? `${m} (默认)` : m;
            embeddingModelSelectEl.appendChild(opt);
        });
        if(data.default) embeddingModelSelectEl.value = data.default;
    } catch(e) { console.error(e); }
}
// 加载视觉模型列表
async function loadVisionModels() {
    try {
        const res = await fetch(`${apiBase}/models/vision`);
        if (!res.ok) return;
        const data = await res.json();
        
        // 更新设置页面的视觉模型选择器
        const visionModelSelect = document.getElementById("vision-model-select");
        if (visionModelSelect) {
            visionModelSelect.innerHTML = '<option value="">选择视觉模型</option>';
            if (data.models && data.models.length > 0) {
                data.models.forEach(m => {
                    const opt = document.createElement("option");
                    opt.value = m;
                    opt.textContent = m === data.default ? `${m} (默认)` : m;
                    visionModelSelect.appendChild(opt);
                });
                if(data.default) visionModelSelect.value = data.default;
            }
        }
        
        // 更新知识库页面的视觉模型选择器
        const kbVisionModelSelect = document.getElementById("kb-vision-model-select");
        if (kbVisionModelSelect) {
            kbVisionModelSelect.innerHTML = '<option value="">不使用视觉模型</option>';
            if (data.models && data.models.length > 0) {
                data.models.forEach(m => {
                    const opt = document.createElement("option");
                    opt.value = m;
                    opt.textContent = m;
                    kbVisionModelSelect.appendChild(opt);
                });
            }
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
            if (data.models && data.models.length > 0) {
                data.models.forEach(m => {
                    const opt = document.createElement("option");
                    opt.value = m;
                    opt.textContent = m;
                    rerankModelSelect.appendChild(opt);
                });
            }
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
            
            // 如果正在流式输出且不是当前对话，给出提示
            if (isStreaming && conv.id !== currentConversationId) {
                const confirmSwitch = confirm("当前正在进行AI对话，切换对话将停止当前输出。确定要切换吗？");
                if (!confirmSwitch) {
                    return;
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
                        alert('删除对话失败: ' + error.message);
                    }
                } else if (action === 'rename') {
                    try {
                        const conversation = conversations.find(c => c.id === conversationId);
                        if (!conversation) {
                            throw new Error('对话不存在');
                        }
                        
                        const newTitle = prompt('请输入新的对话标题:', conversation.title || '');
                        if (newTitle === null) return; // 用户取消
                        if (!newTitle.trim()) {
                            alert('标题不能为空');
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
                        alert('重命名失败: ' + error.message);
                    }
                } else if (action === 'pin') {
                    try {
                        const formData = new FormData();
                        const conversation = conversations.find(c => c.id === conversationId);
                        if (!conversation) {
                            throw new Error('对话不存在');
                        }
                        formData.append('is_pinned', conversation.is_pinned ? 'false' : 'true');
                        
                        const res = await fetch(`${apiBase}/conversations/${conversationId}`, {
                            method: 'PUT',
                            body: formData
                        });
                        if (!res.ok) throw new Error('置顶操作失败');
                        
                        await loadConversations();
                    } catch (error) {
                        console.error('Pin conversation error:', error);
                        alert('置顶操作失败: ' + error.message);
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
// 消息相关函数
function scrollToBottom() {
    if (chatMessagesEl) {
        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    }
}

function appendMessage(role, content, tokenInfo = null, showFooter = true) {
    if (!chatMessagesEl) return null;
    
    const msgEl = document.createElement("div");
    msgEl.className = "message " + (role === "user" ? "message-user" : "message-assistant");
    
    if (role === "assistant") {
        const contentEl = document.createElement("div");
        contentEl.className = "message-content";
        
        // 存储原始markdown内容，供复制按钮使用
        msgEl.dataset.rawContent = content || "";
        
        try {
            // 使用统一的渲染函数
            renderMarkdownToEl(contentEl, content || "");
            // 为代码块添加复制按钮
            addCopyButtonsToCodeBlocks(contentEl);
        } catch (e) {
            console.error("Markdown解析失败:", e);
            contentEl.textContent = content || "";
        }
        
        msgEl.appendChild(contentEl);
        
        // 只有在showFooter为true时才添加底部信息和按钮
        if (showFooter) {
            addMessageFooter(msgEl, content, tokenInfo);
        }
    } else {
        // 用户消息
        msgEl.textContent = content || "";
        
        // 添加用户消息的操作按钮
        const actionsEl = document.createElement("div");
        actionsEl.className = "user-message-actions";
        
        const editBtn = document.createElement("button");
        editBtn.textContent = "✏️";
        editBtn.onclick = () => editAndResendMessage(content);
        actionsEl.appendChild(editBtn);
        
        msgEl.appendChild(actionsEl);
    }
    
    chatMessagesEl.appendChild(msgEl);
    scrollToBottom();
    return msgEl;
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
        copyToClipboard(currentContent, copyMdBtn, "Markdown");
    };
    actionsEl.appendChild(copyMdBtn);
    
    // 纯文本复制按钮
    const copyTxtBtn = document.createElement("button");
    copyTxtBtn.textContent = "📄 纯文本";
    copyTxtBtn.onclick = () => {
        // 获取当前最新的纯文本内容
        const contentEl = msgEl.querySelector(".message-content");
        const currentContent = contentEl ? contentEl.textContent : content;
        copyToClipboard(currentContent, copyTxtBtn, "纯文本");
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
        alert("请等待当前输出完成");
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
        alert("没有找到可以重新生成的消息");
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
    if (toggleWebEl && toggleWebEl.checked && webSearchSourceEl) {
        formData.append("web_search_source", webSearchSourceEl.value || "bing");
    }
    const providerId = providerSelectEl && providerSelectEl.value ? parseInt(providerSelectEl.value) : null;
    if (providerId !== null && !isNaN(providerId)) {
        formData.append("provider_id", String(providerId));
    }
    const useStream = toggleStreamEl ? toggleStreamEl.checked : true;
    formData.append("stream", useStream ? "true" : "false");
    
    // 直接调用聊天API，不通过sendMessage函数（避免重复添加用户消息）
    if (!useStream) {
        try {
            const res = await fetch(`${apiBase}/conversations/${currentConversationId}/chat`, {
                method: "POST",
                body: formData,
            });
            
            if (!res.ok) {
                const err = await res.text();
                throw new Error(err || res.statusText);
            }
            const data = await res.json();
            appendMessage("assistant", data.assistant_message.content, data.token_info);
        } catch (e) {
            appendMessage("assistant", "[错误] " + e.message);
        }
        return;
    }
    
    // 流式传输
    isStreaming = true;
    updateSendButton();
    currentStreamController = new AbortController();
    
    resetStreamUiState(); // 重置流式UI状态
    
    console.log("重新生成：开始流式传输，对话ID:", currentConversationId);
    
    // 创建AI消息元素，不显示底部（等输出完成后再添加）
    const assistantEl = appendMessage("assistant", "", null, false);
    currentStreamingMessageEl = assistantEl;
    
    // 用于存储原始markdown内容
    let fullText = "";
    let tokenInfo = null;
    
    try {
        const res = await fetch(`${apiBase}/conversations/${currentConversationId}/chat`, {
            method: "POST",
            body: formData,
            signal: currentStreamController.signal,
            headers: {
                'Accept': 'text/event-stream',
            }
        });
        
        console.log("重新生成：收到响应，状态:", res.status);
        
        if (!res.ok) {
            const err = await res.text();
            console.error("重新生成：请求失败:", err);
            throw new Error(err || res.statusText);
        }
        if (!res.body) throw new Error("ReadableStream not supported");
        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        
        console.log("重新生成：开始读取流式数据...");
        
        // 更稳的 SSE 解析：按 \n\n 分隔事件，保留 data 多行换行
        let sseBuffer = "";
        let eventName = "message";

        while (!currentStreamController.signal.aborted) {
            const { done, value } = await reader.read();
            if (done) {
                console.log("流式数据读取完成");
                break;
            }

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
                        // 重要：不要 trimStart，SSE data: 后的前导空格可能是内容的一部分
                        dataLines.push(line.slice(5));
                    }
                }

                // 重要：多行 data 用 \n 连接（SSE 规范）
                const payload = dataLines.join("\n");

                if (DEBUG_STREAM) {
                    console.log(`处理事件 ${localEventName}:`, payload.length > 80 ? payload.substring(0, 80) + "…" : payload);
                }

                if (localEventName === "meta") {
                    try {
                        tokenInfo = JSON.parse(payload);
                        console.log("解析到token信息:", tokenInfo);
                    } catch (e) {
                        console.warn("解析meta信息失败:", e);
                    }
                    continue;
                }

                if (localEventName === "ack") {
                    console.log("收到ack确认");
                    continue;
                }

                // message 正文
                if (payload === "[DONE]") {
                    console.log("收到完成标记");
                    
                    // DONE：把最后残留的 pending 强制刷到 DOM
                    if (streamUiState.pending) {
                        scheduleFlushStream(assistantEl, (appendText) => {
                            fullText += appendText;
                            assistantEl.dataset.rawContent = fullText;
                            return fullText;
                        });
                        // 立即再触发一次（防止 flushTimer 还没到）
                        streamUiState.lastFlushAt = 0;
                        scheduleFlushStream(assistantEl, (appendText) => {
                            fullText += appendText;
                            assistantEl.dataset.rawContent = fullText;
                            return fullText;
                        });
                    }
                    
                    // 直接退出两层循环：标记 aborted 以便跳出外层 while
                    currentStreamController.abort();
                    break;
                }

                if (payload.startsWith("[错误]")) {
                    const contentEl = assistantEl?.querySelector(".message-content");
                    if (contentEl) contentEl.textContent += payload;
                    console.error("收到错误消息:", payload);
                    currentStreamController.abort();
                    break;
                }

                // 兜底：疑似 token JSON 不进入正文
                if (/\b(input_tokens|output_tokens|total_tokens)\b\s*:/.test(payload)) {
                    try { tokenInfo = JSON.parse(payload); } catch (e) {}
                } else {
                    // 把高频 token 先放进队列
                    enqueueStreamText(payload);
                    // 由 flush 机制批量合并并渲染
                    scheduleFlushStream(assistantEl, (appendText) => {
                        // 这里真正把 pending 合并到 fullText
                        fullText += appendText;
                        // 同时把 rawContent 持续写入（方便切换/重渲染）
                        assistantEl.dataset.rawContent = fullText;
                        return fullText;
                    });
                }

            }
        }

        
        console.log("重新生成：流式输出完成，总文本长度:", currentFullText.length);
        
        // 流式输出完成后，添加底部按钮和token信息
        if (assistantEl && !currentStreamController.signal.aborted) {
            // 存储原始markdown内容，供复制按钮使用
            assistantEl.dataset.rawContent = currentFullText;
            
            // 流式输出完成后，进行最终的markdown渲染
            const contentEl = assistantEl.querySelector(".message-content");
            if (contentEl && currentFullText) {
                // 使用统一的渲染函数进行最终渲染
                renderMarkdownToEl(contentEl, currentFullText);
            }
            
            // 为代码块添加复制按钮（只在输出完成后添加一次）
            if (contentEl) {
                addCopyButtonsToCodeBlocks(contentEl);
            }
            
            // 使用从SSE获取的token信息，如果没有则使用默认值
            const finalTokenInfo = tokenInfo || {
                model: modelSelectEl ? modelSelectEl.value || "default" : "default",
                input_tokens: 0,
                output_tokens: 0,
                total_tokens: 0
            };
            
            // 添加底部信息
            addMessageFooter(assistantEl, fullText, finalTokenInfo, false);
            scrollToBottom();
        }
    } catch (e) {
        if (e.name !== 'AbortError') {
            const contentEl = assistantEl ? assistantEl.querySelector(".message-content") : null;
            if (contentEl) {
                contentEl.textContent += "\n[请求异常] " + e.message;
            }
            // 即使出错也添加footer
            if (assistantEl) {
                addMessageFooter(assistantEl, fullText, null, false);
            }
        }
    } finally {
        isStreaming = false;
        currentStreamController = null;
        currentStreamingMessageEl = null;
        updateSendButton();
    }
}
// 工具函数
function addCopyButtonsToCodeBlocks(messageEl) {
    const codeBlocks = messageEl.querySelectorAll("pre code");
    codeBlocks.forEach(codeBlock => {
        const pre = codeBlock.parentElement;
        
        // 检查是否已经添加过复制按钮，避免重复添加
        if (pre.querySelector(".code-header")) {
            return;
        }
        
        // 创建代码头部
        const header = document.createElement("div");
        header.className = "code-header";
        
        // 创建复制按钮
        const copyBtn = document.createElement("button");
        copyBtn.className = "copy-code-btn";
        copyBtn.innerHTML = "📋"; // 使用剪贴板图标
        copyBtn.onclick = () => {
            const code = codeBlock.textContent;
            navigator.clipboard.writeText(code).then(() => {
                copyBtn.innerHTML = "✓";
                copyBtn.classList.add("copied");
                setTimeout(() => {
                    copyBtn.innerHTML = "📋";
                    copyBtn.classList.remove("copied");
                }, 2000);
            }).catch(err => {
                console.error("复制失败:", err);
                copyBtn.innerHTML = "✗";
                setTimeout(() => {
                    copyBtn.innerHTML = "📋";
                }, 2000);
            });
        };
        
        header.appendChild(copyBtn);
        pre.insertBefore(header, codeBlock);
    });
}

// 复制到剪贴板的通用函数
function copyToClipboard(text, buttonEl, type) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = buttonEl.textContent;
        buttonEl.textContent = "✓ 已复制";
        buttonEl.classList.add("success");
        setTimeout(() => {
            buttonEl.textContent = originalText;
            buttonEl.classList.remove("success");
        }, 2000);
    }).catch(err => {
        console.error("复制失败:", err);
        const originalText = buttonEl.textContent;
        buttonEl.textContent = "✗ 复制失败";
        setTimeout(() => {
            buttonEl.textContent = originalText;
        }, 2000);
    });
}

// 修改并重新发送消息
function editAndResendMessage(originalText) {
    // 将原文本填入输入框
    if (userInputEl) {
        userInputEl.value = originalText;
        resetInputHeight();
        userInputEl.style.height = Math.min(userInputEl.scrollHeight, 150) + 'px';
        
        // 聚焦到输入框
        userInputEl.focus();
    }
    
    // 删除最后一条AI回复（如果存在）
    if (chatMessagesEl) {
        const messages = chatMessagesEl.querySelectorAll(".message");
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.classList.contains("message-assistant")) {
                lastMessage.remove();
            }
        }
    }
}

// 停止流式输出
function stopStreaming() {
    if (currentStreamController) {
        currentStreamController.abort();
        currentStreamController = null;
    }
    isStreaming = false;
    currentStreamingMessageEl = null; // 清除流式消息元素引用
    resetStreamUiState(); // 重置流式UI状态，避免残留token污染下一次
    updateSendButton();
}

// 更新发送按钮状态
function updateSendButton() {
    const sendBtn = document.getElementById("send-btn");
    if (sendBtn) {
        if (isStreaming) {
            sendBtn.textContent = "停止";
            sendBtn.onclick = stopStreaming;
        } else {
            sendBtn.textContent = "发送";
            sendBtn.onclick = sendMessage;
        }
    }
}
// 发送消息函数
async function sendMessage() {
    if (isStreaming) {
        stopStreaming();
        return;
    }
    
    if (!currentConversationId) {
        alert("请先选择或创建一个对话");
        return;
    }
    
    if (!userInputEl) return;
    
    const text = userInputEl.value.trim();
    if (!text) return;
    
    userInputEl.value = "";
    resetInputHeight(); // 重置输入框高度
    resetStreamUiState(); // 重置流式UI状态
    appendMessage("user", text);
    
    const formData = new FormData();
    formData.append("user_text", text);
    formData.append("model", modelSelectEl ? modelSelectEl.value || "" : "");
    formData.append("enable_knowledge_base", toggleKnowledgeEl && toggleKnowledgeEl.checked ? "true" : "false");
    formData.append("enable_mcp", toggleMcpEl && toggleMcpEl.checked ? "true" : "false");
    formData.append("enable_web_search", toggleWebEl && toggleWebEl.checked ? "true" : "false");
    if (toggleWebEl && toggleWebEl.checked && webSearchSourceEl) {
        formData.append("web_search_source", webSearchSourceEl.value || "bing");
    }
    const providerId = providerSelectEl && providerSelectEl.value ? parseInt(providerSelectEl.value) : null;
    if (providerId !== null && !isNaN(providerId)) {
        formData.append("provider_id", String(providerId));
    }
    const useStream = toggleStreamEl ? toggleStreamEl.checked : true;
    formData.append("stream", useStream ? "true" : "false");
    
    // 检查是否是第一次对话（用于自动命名）- 功能暂时禁用，等待后续实现
    // const conversation = conversations.find(c => c.id === currentConversationId);
    // const isFirstMessage = conversation && (conversation.title === "新对话" || conversation.title === "无标题对话");
    
    if (!useStream) {
        try {
            const res = await fetch(`${apiBase}/conversations/${currentConversationId}/chat`, {
                method: "POST",
                body: formData,
            });
            
            if (!res.ok) {
                const err = await res.text();
                throw new Error(err || res.statusText);
            }
            const data = await res.json();
            console.log("收到的完整响应数据:", JSON.stringify(data, null, 2));
            console.log("Token信息:", data.token_info);
            
            appendMessage("assistant", data.assistant_message.content, data.token_info);
        } catch (e) {
            appendMessage("assistant", "[错误] " + e.message);
        }
        return;
    }
    
    // 流式传输
    isStreaming = true;
    updateSendButton();
    currentStreamController = new AbortController();
    
    resetStreamUiState(); // 重置流式UI状态
    
    console.log("开始流式传输，对话ID:", currentConversationId);
    
    // 创建AI消息元素，不显示底部（等输出完成后再添加）
    const assistantEl = appendMessage("assistant", "", null, false);
    currentStreamingMessageEl = assistantEl;
    
    // 用于存储原始markdown内容
    let fullText = "";
    let tokenInfo = null;
    
    try {
        const res = await fetch(`${apiBase}/conversations/${currentConversationId}/chat`, {
            method: "POST",
            body: formData,
            signal: currentStreamController.signal,
            headers: {
                'Accept': 'text/event-stream',
            }
        });
        
        console.log("收到响应，状态:", res.status);
        
        if (!res.ok) {
            const err = await res.text();
            console.error("请求失败:", err);
            throw new Error(err || res.statusText);
        }
        if (!res.body) throw new Error("ReadableStream not supported");
        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        
        console.log("开始读取流式数据...");
        
        // 按 event/data + 空行结束 的方式正确解析 SSE
        let eventName = "message";
        let dataBuf = "";
        
        while (!currentStreamController.signal.aborted) {
            const { done, value } = await reader.read();
            if (done) {
                console.log("流式数据读取完成");
                break;
            }
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");
            
            for (const line of lines) {
                if (line.startsWith("event:")) {
                    eventName = line.slice(6).trim(); // e.g. "message" | "meta" | "ack"
                    console.log("收到事件:", eventName);
                    continue;
                }
                if (line.startsWith("data:")) {
                    dataBuf += line.slice(5).trimStart(); // accumulate
                    continue;
                }
                // SSE events end with a blank line
                if (line.trim() === "") {
                    if (!dataBuf) { 
                        eventName = "message"; 
                        continue; 
                    }
                    
                    const payload = dataBuf;
                    dataBuf = "";
                    
                    if (DEBUG_STREAM) {
                        console.log(`处理事件 ${eventName}:`, payload.length > 80 ? payload.substring(0, 80) + "…" : payload);
                    }
                    
                    if (eventName === "meta") {
                        // token 信息只存起来，不进正文
                        try { 
                            tokenInfo = JSON.parse(payload);
                            console.log("解析到token信息:", tokenInfo);
                        } catch (e) {
                            console.warn("解析meta信息失败:", e);
                        }
                    } else if (eventName === "ack") {
                        // ack 事件：用户消息已落库确认（自动命名功能暂时禁用）
                        console.log("收到ack确认");
                    } else {
                        // message 正文
                        if (payload === "[DONE]") {
                            console.log("收到完成标记");
                            
                            // DONE：把最后残留的 pending 强制刷到 DOM
                            if (streamUiState.pending) {
                                scheduleFlushStream(assistantEl, (appendText) => {
                                    fullText += appendText;
                                    assistantEl.dataset.rawContent = fullText;
                                    return fullText;
                                });
                                // 立即再触发一次（防止 flushTimer 还没到）
                                // 直接调用一次"到期"flush：通过把 lastFlushAt 往前挪来强制 dueByTime
                                streamUiState.lastFlushAt = 0;
                                scheduleFlushStream(assistantEl, (appendText) => {
                                    fullText += appendText;
                                    assistantEl.dataset.rawContent = fullText;
                                    return fullText;
                                });
                            }
                            
                            break;
                        }
                        if (payload.startsWith("[错误]")) {
                            const contentEl = assistantEl?.querySelector(".message-content");
                            if (contentEl) contentEl.textContent += payload;
                            console.error("收到错误消息:", payload);
                            break;
                        }
                        
                        // 兜底：疑似 token JSON 不进入正文（防止后端异常/分包错乱）
                        if (/\"(input_tokens|output_tokens|total_tokens)\"\s*:/.test(payload)) {
                            try { 
                                tokenInfo = JSON.parse(payload); 
                            } catch (e) {}
                        } else {
                            // 调试：检查payload中的换行符（只打印前3次）
                            if (!window.__dbgPrinted) window.__dbgPrinted = 0;
                            if (window.__dbgPrinted < 3) {
                                window.__dbgPrinted++;
                                console.log("DBG payload raw:", JSON.stringify(payload));
                            }
                            
                            // 把高频 token 先放进队列
                            enqueueStreamText(payload);
                            // 由 flush 机制批量合并并渲染
                            scheduleFlushStream(assistantEl, (appendText) => {
                                // 这里真正把 pending 合并到 fullText
                                fullText += appendText;
                                // 同时把 rawContent 持续写入（方便切换/重渲染）
                                assistantEl.dataset.rawContent = fullText;
                                return fullText;
                            });
                        }
                    }
                    eventName = "message";
                }
            }
        }
        
        console.log("流式输出完成，总文本长度:", fullText.length);
        
        // 流式输出完成后，添加底部按钮和token信息
        if (assistantEl && !currentStreamController.signal.aborted) {
            // 存储原始markdown内容，供复制按钮使用
            assistantEl.dataset.rawContent = fullText;
            
            // 流式输出完成后，进行最终的markdown渲染
            const contentEl = assistantEl.querySelector(".message-content");
            if (contentEl && fullText) {
                // 使用统一的渲染函数进行最终渲染
                renderMarkdownToEl(contentEl, fullText);
            }
            
            // 为代码块添加复制按钮（只在输出完成后添加一次）
            if (contentEl) {
                addCopyButtonsToCodeBlocks(contentEl);
            }
            
            // 使用从SSE获取的token信息，如果没有则使用默认值
            const finalTokenInfo = tokenInfo || {
                model: modelSelectEl ? modelSelectEl.value || "default" : "default",
                input_tokens: 0,
                output_tokens: 0,
                total_tokens: 0
            };
            
            // 添加底部信息
            addMessageFooter(assistantEl, fullText, finalTokenInfo, false);
            scrollToBottom();
        }
    } catch (e) {
        if (e.name !== 'AbortError') {
            const contentEl = assistantEl ? assistantEl.querySelector(".message-content") : null;
            if (contentEl) {
                contentEl.textContent += "\n[请求异常] " + e.message;
            }
            // 即使出错也添加footer
            if (assistantEl) {
                addMessageFooter(assistantEl, fullText, null, false);
            }
        }
    } finally {
        isStreaming = false;
        currentStreamController = null;
        currentStreamingMessageEl = null;
        renderingScheduled = false; // 重置渲染调度标志
        updateSendButton();
    }
}
// 对话管理函数
let isSelectingConversation = false; // 防止重复点击

async function selectConversation(id) {
    if (isSelectingConversation) {
        console.log("正在切换对话，请稍候...");
        return;
    }

    isSelectingConversation = true;

    try {
        // 1) 切换前：停止流式 + 取消旧消息渲染计划（防止新对话渲染被旧timer回写）
        if (isStreaming) {
            console.log("检测到正在进行流式输出，先停止当前输出...");
            stopStreaming();
            await new Promise(resolve => setTimeout(resolve, 80));
        }

        if (currentStreamingMessageEl) {
            const oldContentEl = currentStreamingMessageEl.querySelector(".message-content");
            if (oldContentEl) cancelScheduledRender(oldContentEl);
        }

        // 重置运行态引用（避免后续误用旧 DOM）
        isStreaming = false;
        currentStreamController = null;
        currentStreamingMessageEl = null;

        // 2) 正常切换逻辑
        currentConversationId = id;
        const conv = conversations.find(c => c.id === id);
        if (!conv) return;

        if (chatTitleEl) chatTitleEl.textContent = conv.title;

        await loadMessages(id);

        if (conv.model && modelSelectEl) modelSelectEl.value = conv.model;

        if (conv.provider_id && providerSelectEl) {
            providerSelectEl.value = String(conv.provider_id);
        } else if (providerSelectEl) {
            providerSelectEl.value = "";
        }

        if (toggleKnowledgeEl) toggleKnowledgeEl.checked = !!conv.enable_knowledge_base;
        if (toggleMcpEl) toggleMcpEl.checked = !!conv.enable_mcp;
        if (toggleWebEl) toggleWebEl.checked = !!conv.enable_web_search;

        renderConversationList();
    } catch (error) {
        console.error("切换对话失败:", error);
        alert("切换对话失败，请重试");
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
        const msgs = await res.json();
        if (chatMessagesEl) chatMessagesEl.innerHTML = "";
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

            appendMessage(msg.role, msg.content, tokenInfo, true); // 显示底部信息
        });

        scrollToBottom();
    } catch(e) { 
        console.error("加载消息失败:", e);
        if (chatMessagesEl) {
            chatMessagesEl.innerHTML = "<div style='color: #e74c3c; padding: 20px; text-align: center;'>加载消息失败，请重试</div>";
        }
    }
}

// 自动命名对话功能 - 暂时禁用，等待后续实现
// async function autoTitleConversation(id) { ... }

// 事件监听器设置
function setupEventListeners() {
    // Modal关闭按钮
    document.querySelectorAll(".modal-close").forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.getAttribute("data-target");
            if (target) closeModal(target);
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
            try {
                console.log("新对话按钮被点击");
                const formData = new FormData();
                formData.append("title", "新对话");
                const res = await fetch(`${apiBase}/conversations`, {method: "POST", body: formData});
                if (!res.ok) throw new Error("创建失败");
                const conv = await res.json();
                await loadConversations();
                selectConversation(conv.id);
            } catch(e) {
                console.error("创建对话失败:", e);
                alert("创建对话失败: " + e.message);
            }
        });
    }

    // 设置按钮
    const settingsBtn = document.getElementById("settings-btn");
    if (settingsBtn) {
        settingsBtn.addEventListener("click", async () => {
            try {
                console.log("设置按钮被点击");
                await loadSettings();
                openModal("settings-modal");
            } catch(e) {
                console.error("打开设置失败:", e);
                alert("打开设置失败: " + e.message);
            }
        });
    }

    // 发送按钮
    const sendBtn = document.getElementById("send-btn");
    if (sendBtn) {
        sendBtn.addEventListener("click", () => {
            console.log("发送按钮被点击");
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
            openModal("provider-modal");
        });
    }

    const manageKnowledgeBtn = document.getElementById("manage-knowledge-btn");
    if (manageKnowledgeBtn) {
        manageKnowledgeBtn.addEventListener("click", async () => {
            closeModal("settings-modal");
            await loadKnowledgeBases();
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

    // 重新渲染消息按钮
    const rerenderMessagesBtn = document.getElementById("rerender-messages-btn");
    if (rerenderMessagesBtn) {
        rerenderMessagesBtn.addEventListener("click", () => {
            console.log("重新渲染所有消息");
            rerenderAllMessages();
            // 显示成功提示
            const originalText = rerenderMessagesBtn.textContent;
            rerenderMessagesBtn.textContent = "✅ 已重新渲染";
            rerenderMessagesBtn.disabled = true;
            setTimeout(() => {
                rerenderMessagesBtn.textContent = originalText;
                rerenderMessagesBtn.disabled = false;
            }, 2000);
        });
    }

    const manageSearchKeysBtn = document.getElementById("manage-search-keys-btn");
    if (manageSearchKeysBtn) {
        manageSearchKeysBtn.addEventListener("click", async () => {
            closeModal("settings-modal");
            openModal("search-config-modal");
        });
    }

    // Provider form submission
    if (providerFormEl) {
        providerFormEl.addEventListener("submit", async (e) => {
            e.preventDefault();
            const id = document.getElementById("provider-id").value;
            const name = document.getElementById("provider-name").value;
            const apiBase = document.getElementById("provider-api-base").value;
            const apiKey = document.getElementById("provider-api-key").value;
            const defaultModel = document.getElementById("provider-default-model").value;
            const isDefault = document.getElementById("provider-is-default").checked;
            
            const modelsData = getModelInputValues();
            
            const formData = new FormData();
            formData.append("name", name);
            formData.append("api_base", apiBase);
            if (apiKey) formData.append("api_key", apiKey);
            formData.append("default_model", defaultModel);
            formData.append("is_default", isDefault ? "true" : "false");
            formData.append("models", JSON.stringify(modelsData));
            
            try {
                const url = id ? `${apiBase}/providers/${id}` : `${apiBase}/providers`;
                const method = id ? "PUT" : "POST";
                const res = await fetch(url, { method, body: formData });
                if (!res.ok) throw new Error(await res.text());
                
                await loadProviders();
                providerFormEl.reset();
                document.getElementById("provider-id").value = "";
                alert(id ? "Provider更新成功" : "Provider创建成功");
            } catch (e) {
                alert("保存失败: " + e.message);
            }
        });
    }

    // Provider form reset
    const providerFormResetBtn = document.getElementById("provider-form-reset");
    if (providerFormResetBtn) {
        providerFormResetBtn.addEventListener("click", () => {
            if (providerFormEl) {
                providerFormEl.reset();
                document.getElementById("provider-id").value = "";
                // Reset model inputs to default state
                setModelInputValues([]);
            }
        });
    }
    
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
}

// 设置事件监听器
function setupSettingsEventListeners() {
    // 设置自动保存 - 添加null检查
    const fontSizeSelect = document.getElementById("font-size-select");
    if (fontSizeSelect) {
        fontSizeSelect.addEventListener("change", async (e) => {
            const fontSize = e.target.value;
            applySettings({font_size: fontSize});
            currentSettings.font_size = fontSize;
            await saveSettingItem("font_size", fontSize);
        });
    }
    
    // 间距风格选择器
    const densitySelect = document.getElementById("density-select");
    if (densitySelect) {
        densitySelect.addEventListener("change", async (e) => {
            const density = e.target.value;
            // 将间距风格应用到聊天消息容器
            const chatMessages = document.getElementById("chat-messages");
            if (chatMessages) {
                chatMessages.setAttribute('data-density', density);
            }
            applySettings({density: density});
            currentSettings.density = density;
            await saveSettingItem("density", density);
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
        console.log("0. 初始化DOM元素...");
        initDOMElements();
        
        console.log("1. 设置输入框自适应...");
        setupInputAutoResize();
        
        console.log("2. 开始加载设置...");
        await loadSettings();
        
        console.log("3. 开始加载模型...");
        await loadModels();
        
        console.log("4. 开始加载对话...");
        await loadConversations();
        
        console.log("5. 开始加载Providers...");
        await loadProviders();
        
        console.log("6. 开始加载知识库...");
        await loadKnowledgeBases();
        
        console.log("7. 开始加载向量模型...");
        await loadEmbeddingModels();
        
        console.log("8. 开始加载视觉模型...");
        await loadVisionModels();
        
        console.log("9. 开始加载重排模型...");
        await loadRerankModels();
        
        console.log("10. 开始加载MCP服务器...");
        await loadMCPServers();
        
        console.log("11. 初始化模型输入...");
        initModelInputs();
        
        console.log("12. 初始化MCP输入...");
        initMCPInputs();
        
        console.log("13. 加载工具设置...");
        loadToolSettings();
        
        console.log("14. 设置工具监听器...");
        setupToolSettingsListeners();
        
        console.log("15. 设置事件监听器...");
        setupEventListeners();
        
        console.log("16. 设置设置监听器...");
        setupSettingsEventListeners();
        
        console.log("AI助手初始化完成!");
    } catch (error) {
        console.error("初始化过程中出现错误:", error);
        // 即使出现错误，也要确保基本的事件监听器被设置
        try {
            console.log("尝试设置基本功能...");
            if (typeof initModelInputs === 'function') initModelInputs();
            if (typeof initMCPInputs === 'function') initMCPInputs();
            if (typeof setupToolSettingsListeners === 'function') setupToolSettingsListeners();
            if (typeof setupEventListeners === 'function') setupEventListeners();
            if (typeof setupSettingsEventListeners === 'function') setupSettingsEventListeners();
            console.log("基本功能设置完成");
        } catch (e) {
            console.error("设置基本功能失败:", e);
        }
        
        // 显示用户友好的错误信息
        const errorMsg = `前端初始化出现问题: ${error.message}\n\n基本功能可能仍然可用，但某些高级功能可能无法正常工作。\n\n请检查浏览器控制台获取详细错误信息。`;
        alert(errorMsg);
    }
}

// 确保DOM加载完成后再执行初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        init().then(() => {
            console.log("前端初始化完成");
        }).catch(error => {
            console.error("前端初始化失败:", error);
            alert("前端初始化失败: " + error.message);
        });
    });
} else {
    // DOM已经加载完成
    init().then(() => {
        console.log("前端初始化完成");
    }).catch(error => {
        console.error("前端初始化失败:", error);
        alert("前端初始化失败: " + error.message);
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
        </div>
        <button type="button" class="remove-model-btn">×</button>
    `;
    
    // 添加删除按钮事件
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
    
    const addBtn = container.querySelector(".add-model-btn");
    if (!addBtn) {
        console.warn("add-model-btn not found, skipping initModelInputs");
        return;
    }
    
    addBtn.addEventListener("click", () => {
        const newGroup = createModelInputGroup();
        container.insertBefore(newGroup, container.lastElementChild);
    });
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
        
        const modelValue = modelInput ? modelInput.value.trim() : "";
        if (modelValue) {
            values.push({
                model: modelValue,
                name: nameInput ? nameInput.value.trim() : "",
                capabilities: {
                    vision: visionCap ? visionCap.checked : false,
                    reasoning: reasoningCap ? reasoningCap.checked : false,
                    chat: chatCap ? chatCap.checked : false
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
            
            if (modelInput) modelInput.value = modelsData[0].model || "";
            if (nameInput) nameInput.value = modelsData[0].name || "";
            if (visionCap) visionCap.checked = modelsData[0].capabilities?.vision || false;
            if (reasoningCap) reasoningCap.checked = modelsData[0].capabilities?.reasoning || false;
            if (chatCap) chatCap.checked = modelsData[0].capabilities?.chat || false;
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
// 本地 AI 助手 - JavaScript 主文件

// API基础URL配置
const apiBase = "";

// 常量定义
const TOOL_SETTINGS_KEY = "tool_settings_v1";

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

let autoTitling = false;

function normalizeApiResponse(json) {
    if (json && typeof json === "object" && "data" in json) {
        return json.data;
    }
    return json;
}

// 流式传输控制变量
let isStreaming = false;
let currentStreamController = null;
let currentStreamingMessageEl = null; // 跟踪当前正在流式输出的消息元素

const autoTitleRequested = new Set();



// DOM元素变量 - 统一声明
let conversationListEl, chatMessagesEl, chatTitleEl, modelSelectEl, providerSelectEl;
let userInputEl, toggleKnowledgeEl, toggleMcpEl, toggleWebEl, toggleStreamEl, webSearchSourceEl;
let providerModalEl, providerListEl, providerFormEl;
let knowledgeModalEl, kbListEl, kbFormEl, kbSelectEl, kbUploadFormEl, kbUploadStatusEl, embeddingModelSelectEl;
let mcpModalEl, mcpListEl, mcpFormEl, settingsModalEl;

// 滚动到底部
function scrollToBottom() {
    if (chatMessagesEl) {
        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    }
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
            webSearchSource: webSearchSourceEl ? webSearchSourceEl.value : "duckduckgo"
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
        if (searchDefaultSource) searchDefaultSource.value = settings.default_search_source || "duckduckgo";
        
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
            webSearchSourceEl.value = settings.default_search_source || "duckduckgo";
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
        const raw = await res.json();
        const data = normalizeApiResponse(raw) || {};
        
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
        const raw = await res.json();
        knowledgeBases = normalizeApiResponse(raw) || [];
    } catch(e) { console.error(e); }
}

async function loadMCPServers() {
    try {
        const res = await fetch(`${apiBase}/mcp/servers`);
        if (!res.ok) return;
        const raw = await res.json();
        mcpServers = normalizeApiResponse(raw) || [];
    } catch(e) { console.error(e); }
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
        
        // 显示/隐藏本地 RAG 推荐
        const localRagInfo = document.getElementById("local-rag-info");
        
        if (!data.models || data.models.length === 0) {
            const opt = document.createElement("option");
            opt.value = "";
            opt.textContent = data.message || "无可用向量模型";
            opt.disabled = true;
            embeddingModelSelectEl.appendChild(opt);
            
            // 没有向量模型时显示本地 RAG 推荐
            if (localRagInfo) localRagInfo.style.display = "block";
            return;
        }
        
        // 有向量模型时隐藏推荐
        if (localRagInfo) localRagInfo.style.display = "none";
        
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
                        
                        const newTitle = prompt('请输入新的对话标题', conversation.title || '');
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
                        
                        const res = await fetch(`${apiBase}/conversations/${conversationId}/pin`, {
                            method: 'POST',
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

/**
 * 添加消息到聊天区域
 * @param {string} role - 'user' 或 'assistant'
 * @param {string} content - 消息内容（Markdown 格式）
 * @param {object} tokenInfo - token 统计信息
 * @param {boolean} showFooter - 是否显示底部操作栏
 * @returns {HTMLElement} 消息元素
 */
function appendMessage(role, content, tokenInfo = null, showFooter = true) {
    if (!chatMessagesEl) return null;
    
    const msgEl = document.createElement("div");
    msgEl.className = "message " + (role === "user" ? "message-user" : "message-assistant");
    
    if (role === "assistant") {
        // AI 消息：使用 Markdown 渲染
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
        // 用户消息：纯文本显示
        const textNode = document.createTextNode(content || "");
        msgEl.appendChild(textNode);
        
        // 添加编辑按钮
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

/**
 * 统一的 Markdown 渲染函数 - 唯一入口
 * @param {HTMLElement} el - 目标元素
 * @param {string} markdown - Markdown 内容
 * @param {boolean} isComplete - 是否为最终渲染
 */
function renderMarkdown(el, markdown, isComplete = true) {
    if (!el) return;
    
    if (window.MarkdownEngine && window.MarkdownEngine.renderToEl) {
        window.MarkdownEngine.renderToEl(el, markdown, isComplete);
        if (isComplete && window.MarkdownEngine.addCopyButtons) {
            window.MarkdownEngine.addCopyButtons(el);
        }
    } else {
        // 降级：使用 marked 直接渲染
        if (typeof marked !== 'undefined') {
            el.innerHTML = DOMPurify ? DOMPurify.sanitize(marked.parse(markdown)) : marked.parse(markdown);
        } else {
            el.textContent = markdown;
        }
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
    
    // 纯文本复制按钮
    const copyTxtBtn = document.createElement("button");
    copyTxtBtn.textContent = "📄 纯文本";
    copyTxtBtn.onclick = () => {
        // 获取当前最新的纯文本内容
        const contentEl = msgEl.querySelector(".message-content");
        const currentContent = contentEl ? contentEl.textContent : content;
        navigator.clipboard.writeText(currentContent).then(() => {
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
        formData.append("web_search_source", webSearchSourceEl.value || "duckduckgo");
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
                    // 流式处理：累积内容并实时渲染
                    fullText += parsedPayload;
                    assistantEl.dataset.rawContent = fullText;
                    
                    const contentEl = assistantEl.querySelector(".message-content");
                    if (contentEl) {
                        renderMarkdown(contentEl, fullText, false);
                        scrollToBottom();
                    }
                }

            }
        }

        // 流式输出完成后，进行最终渲染
        if (assistantEl) {
            assistantEl.dataset.rawContent = fullText;
            const contentEl = assistantEl.querySelector(".message-content");
            
            if (window.MarkdownEngine && window.MarkdownEngine.cancelRender) {
                window.MarkdownEngine.cancelRender(contentEl);
            }
            
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
            const contentEl = assistantEl ? assistantEl.querySelector(".message-content") : null;
            if (contentEl) {
                contentEl.innerHTML += "<br><span style='color:red;'>[请求异常] " + e.message + "</span>";
            }
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

// 工具函数 - 现在使用 MarkdownEngine 模块中的函数

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
    currentStreamingMessageEl = null;
    updateSendButton();
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
        alert("请先选择或创建一个对话");
        return;
    }
    
    if (!userInputEl) return;
    
    const text = userInputEl.value.trim();
    if (!text) return;
    
    userInputEl.value = "";
    resetInputHeight();
    appendMessage("user", text);
    maybeAutoTitleConversation(text);
    
    const formData = new FormData();

    formData.append("user_text", text);
    formData.append("model", modelSelectEl ? modelSelectEl.value || "" : "");
    formData.append("enable_knowledge_base", toggleKnowledgeEl && toggleKnowledgeEl.checked ? "true" : "false");
    formData.append("enable_mcp", toggleMcpEl && toggleMcpEl.checked ? "true" : "false");
    formData.append("enable_web_search", toggleWebEl && toggleWebEl.checked ? "true" : "false");
    if (toggleWebEl && toggleWebEl.checked && webSearchSourceEl) {
        formData.append("web_search_source", webSearchSourceEl.value || "duckduckgo");
    }
    const providerId = providerSelectEl && providerSelectEl.value ? parseInt(providerSelectEl.value) : null;
    if (providerId !== null && !isNaN(providerId)) {
        formData.append("provider_id", String(providerId));
    }
    const useStream = toggleStreamEl ? toggleStreamEl.checked : true;
    formData.append("stream", useStream ? "true" : "false");
    
    // 检查是否是第一次对话（用于自动命名） 功能暂时禁用，等待后续实现
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
            
            appendMessage("assistant", data.assistant_message.content, data.token_info);
            maybeAutoTitleConversation();
        } catch (e) {
            appendMessage("assistant", "[错误] " + e.message);
        }
        return;

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
                
                if (eventName === "meta") {
                    try { 
                        tokenInfo = JSON.parse(payload);
                    } catch (e) {}
                    continue;
                }
                
                if (eventName === "ack") {
                    continue;
                }
                
                // message 正文
                // 忽略 user_message_id / message_id 等元数据
                if (payload.includes("user_message_id") || payload.includes("message_id")) {
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
                    // 流式处理：累积内容并实时渲染
                    fullText += parsedPayload;
                    assistantEl.dataset.rawContent = fullText;
                    
                    const contentEl = assistantEl.querySelector(".message-content");
                    if (contentEl) {
                        renderMarkdown(contentEl, fullText, false);
                        scrollToBottom();
                    }
                }
            }
        }
        
        // 流式输出完成后，进行最终渲染
        if (assistantEl) {
            assistantEl.dataset.rawContent = fullText;
            const contentEl = assistantEl.querySelector(".message-content");
            
            // 取消待处理的渲染，执行最终渲染
            if (window.MarkdownEngine && window.MarkdownEngine.cancelRender) {
                window.MarkdownEngine.cancelRender(contentEl);
            }
            
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
        const raw = await res.json();
        const msgs = normalizeApiResponse(raw) || [];
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
                const formData = new FormData();
                formData.append("title", "新对话");
                const res = await fetch(`${apiBase}/conversations`, {method: "POST", body: formData});
                if (!res.ok) throw new Error("创建失败");
                const raw = await res.json();
                const convData = normalizeApiResponse(raw);
                const conv = (convData && convData.conversation) ? convData.conversation : raw.conversation || raw;
                await loadConversations();
                if (conv && conv.id) {
                    selectConversation(conv.id);
                }
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
            await loadKnowledgeGraphStats();  // 加载知识图谱统计
            openModal("knowledge-modal");
        });
    }
    
    // 本地 RAG MCP 链接点击事件
    const setupLocalRagLink = document.getElementById("setup-local-rag-link");
    if (setupLocalRagLink) {
        setupLocalRagLink.addEventListener("click", (e) => {
            e.preventDefault();
            const localRagInfo = document.getElementById("local-rag-info");
            if (localRagInfo) {
                localRagInfo.style.display = localRagInfo.style.display === "none" ? "block" : "none";
            }
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
                alert("导出日志失败: " + e.message);
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

    // Provider form submission
    if (providerFormEl) {
        providerFormEl.addEventListener("submit", async (e) => {
            e.preventDefault();
            const id = document.getElementById("provider-id").value;
            const name = document.getElementById("provider-name").value;
            const providerApiBase = document.getElementById("provider-api-base").value;
            const providerApiKey = document.getElementById("provider-api-key").value;
            const defaultModel = document.getElementById("provider-default-model").value;
            const isDefault = document.getElementById("provider-is-default").checked;
            
            const modelsData = getModelInputValues();
            
            const formData = new FormData();
            formData.append("name", name);
            formData.append("api_base", providerApiBase);
            if (providerApiKey) formData.append("api_key", providerApiKey);
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
        // 等待一小段时间确保 markdown.js 已加载
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 检查 MarkdownEngine 是否加载
        if (!window.MarkdownEngine) {
            console.error("[初始化] MarkdownEngine 未加载！");
        }
        
        initDOMElements();
        
        setupInputAutoResize();
        
        await loadSettings();
        await loadModels();
        await loadConversations();
        await loadProviders();
        await loadKnowledgeBases();
        await loadEmbeddingModels();
        await loadVisionModels();
        await loadRerankModels();
        await loadMCPServers();
        
        initModelInputs();
        initMCPInputs();
        loadToolSettings();
        setupToolSettingsListeners();
        setupEventListeners();
        setupSettingsEventListeners();
    } catch (error) {
        console.error("初始化过程中出现错误:", error);
        // 即使出现错误，也要确保基本的事件监听器被设置
        try {
            if (typeof initModelInputs === 'function') initModelInputs();
            if (typeof initMCPInputs === 'function') initMCPInputs();
            if (typeof setupToolSettingsListeners === 'function') setupToolSettingsListeners();
            if (typeof setupEventListeners === 'function') setupEventListeners();
            if (typeof setupSettingsEventListeners === 'function') setupSettingsEventListeners();
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
        init().catch(error => {
            console.error("前端初始化失败", error);
            alert("前端初始化失败: " + error.message);
        });
    });
} else {
    // DOM已经加载完成
    init().catch(error => {
        console.error("前端初始化失败", error);
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


// ========== 知识库管理功能 ==========

// 渲染知识库列表
function renderKnowledgeBaseList() {
    if (!kbListEl) return;
    
    kbListEl.innerHTML = "";
    
    if (knowledgeBases.length === 0) {
        kbListEl.innerHTML = '<div class="empty-list">暂无知识库</div>';
        return;
    }
    
    knowledgeBases.forEach(kb => {
        const item = document.createElement("div");
        item.className = "kb-item";
        item.innerHTML = `
            <div class="kb-info">
                <div class="kb-name">${kb.name}</div>
                <div class="kb-desc">${kb.description || '无描述'}</div>
            </div>
            <div class="kb-actions">
                <button class="delete-kb-btn" data-id="${kb.id}">🗑️ 删除</button>
            </div>
        `;
        kbListEl.appendChild(item);
    });
    
    // 添加删除按钮事件
    kbListEl.querySelectorAll(".delete-kb-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const kbId = btn.getAttribute("data-id");
            if (confirm("确定要删除这个知识库吗？")) {
                try {
                    const res = await fetch(`${apiBase}/knowledge/bases/${kbId}`, { method: "DELETE" });
                    if (!res.ok) throw new Error("删除失败");
                    await loadKnowledgeBases();
                    renderKnowledgeBaseList();
                    updateKnowledgeBaseSelect();
                } catch (e) {
                    alert("删除知识库失败: " + e.message);
                }
            }
        });
    });
}

// 更新知识库选择器
function updateKnowledgeBaseSelect() {
    if (!kbSelectEl) return;
    
    kbSelectEl.innerHTML = '<option value="">选择知识库</option>';
    knowledgeBases.forEach(kb => {
        const opt = document.createElement("option");
        opt.value = kb.id;
        opt.textContent = kb.name;
        kbSelectEl.appendChild(opt);
    });
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
                alert("请输入知识库名称");
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
                alert("知识库创建成功");
            } catch (e) {
                alert("创建知识库失败: " + e.message);
            }
        });
    }
    
    // 上传文档表单
    if (kbUploadFormEl) {
        kbUploadFormEl.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const kbId = kbSelectEl ? kbSelectEl.value : "";
            const embeddingModel = embeddingModelSelectEl ? embeddingModelSelectEl.value : "";
            const fileInput = document.getElementById("kb-file");
            const extractGraph = document.getElementById("kb-extract-graph")?.checked ?? true;
            
            if (!kbId) {
                alert("请选择目标知识库");
                return;
            }
            
            if (!fileInput || !fileInput.files[0]) {
                alert("请选择要上传的文件");
                return;
            }
            
            const formData = new FormData();
            formData.append("kb_id", kbId);
            formData.append("file", fileInput.files[0]);
            formData.append("extract_graph", extractGraph ? "true" : "false");
            if (embeddingModel) formData.append("embedding_model", embeddingModel);
            
            if (kbUploadStatusEl) {
                kbUploadStatusEl.textContent = "上传中...";
                kbUploadStatusEl.style.display = "block";
            }
            
            try {
                const res = await fetch(`${apiBase}/knowledge/upload`, {
                    method: "POST",
                    body: formData
                });
                
                if (!res.ok) throw new Error(await res.text());
                
                const result = await res.json();
                
                // 显示上传结果
                let statusMsg = "✅ 上传成功";
                if (result.chunks_count > 0) {
                    statusMsg += `，已创建 ${result.chunks_count} 个向量块`;
                }
                if (result.graph) {
                    if (result.graph.entities_created > 0 || result.graph.relations_created > 0) {
                        statusMsg += `，提取了 ${result.graph.entities_created} 个实体和 ${result.graph.relations_created} 个关系`;
                    }
                }
                
                if (kbUploadStatusEl) {
                    kbUploadStatusEl.textContent = statusMsg;
                }
                kbUploadFormEl.reset();
                
                // 刷新知识图谱统计
                loadKnowledgeGraphStats(kbId);
                
                setTimeout(() => {
                    if (kbUploadStatusEl) kbUploadStatusEl.style.display = "none";
                }, 5000);
            } catch (e) {
                if (kbUploadStatusEl) {
                    kbUploadStatusEl.textContent = "❌ 上传失败: " + e.message;
                }
            }
        });
    }
}

// 加载知识图谱统计
async function loadKnowledgeGraphStats(kbId) {
    try {
        const url = kbId ? `${apiBase}/knowledge/graph/stats?kb_id=${kbId}` : `${apiBase}/knowledge/graph/stats`;
        const res = await fetch(url);
        if (!res.ok) return;
        
        const stats = await res.json();
        const statsEl = document.getElementById("kb-graph-stats");
        const contentEl = document.getElementById("kb-graph-stats-content");
        
        if (statsEl && contentEl) {
            if (stats.entity_count > 0 || stats.relation_count > 0) {
                let html = `<div>实体数量: <strong>${stats.entity_count}</strong> | 关系数量: <strong>${stats.relation_count}</strong></div>`;
                
                if (stats.entity_types && Object.keys(stats.entity_types).length > 0) {
                    html += '<div style="margin-top: 6px;">实体类型: ';
                    const types = Object.entries(stats.entity_types)
                        .map(([type, count]) => `${type}(${count})`)
                        .join(', ');
                    html += types + '</div>';
                }
                
                contentEl.innerHTML = html;
                statsEl.style.display = "block";
            } else {
                statsEl.style.display = "none";
            }
        }
    } catch (e) {
        console.error("加载知识图谱统计失败:", e);
    }

// ========== MCP服务器管理功能 ==========

// 渲染MCP服务器列表
function renderMCPServerList() {
    if (!mcpListEl) return;
    
    mcpListEl.innerHTML = "";
    
    if (mcpServers.length === 0) {
        mcpListEl.innerHTML = '<div class="empty-list">暂无MCP服务器</div>';
        return;
    }
    
    mcpServers.forEach(server => {
        const item = document.createElement("div");
        item.className = "mcp-item";
        const statusIcon = server.is_enabled ? "🟢" : "🔴";
        item.innerHTML = `
            <div class="mcp-info">
                <div class="mcp-name">${statusIcon} ${server.name}</div>
                <div class="mcp-desc">${server.description || server.connection_type}</div>
            </div>
            <div class="mcp-actions">
                <button class="edit-mcp-btn" data-id="${server.id}">✏️ 编辑</button>
                <button class="test-mcp-btn" data-id="${server.id}">🔗 测试</button>
                <button class="delete-mcp-btn" data-id="${server.id}">🗑️ 删除</button>
            </div>
        `;
        mcpListEl.appendChild(item);
    });
    
    // 添加编辑按钮事件
    mcpListEl.querySelectorAll(".edit-mcp-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const serverId = btn.getAttribute("data-id");
            const server = mcpServers.find(s => s.id == serverId);
            if (server) {
                fillMCPForm(server);
            }
        });
    });
    
    // 添加测试按钮事件
    mcpListEl.querySelectorAll(".test-mcp-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const serverId = btn.getAttribute("data-id");
            btn.textContent = "测试中...";
            btn.disabled = true;
            
            try {
                const res = await fetch(`${apiBase}/mcp/servers/${serverId}/test`, { method: "POST" });
                const result = await res.json();
                
                if (result.success) {
                    btn.textContent = "✓ 连接成功";
                } else {
                    btn.textContent = "✗ 连接失败";
                    alert("连接失败: " + (result.error || "未知错误"));
                }
            } catch (e) {
                btn.textContent = "✗ 测试失败";
                alert("测试失败: " + e.message);
            }
            
            setTimeout(() => {
                btn.textContent = "🔗 测试";
                btn.disabled = false;
            }, 2000);
        });
    });
    
    // 添加删除按钮事件
    mcpListEl.querySelectorAll(".delete-mcp-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const serverId = btn.getAttribute("data-id");
            if (confirm("确定要删除这个MCP服务器吗？")) {
                try {
                    const res = await fetch(`${apiBase}/mcp/servers/${serverId}`, { method: "DELETE" });
                    if (!res.ok) throw new Error("删除失败");
                    await loadMCPServers();
                    renderMCPServerList();
                } catch (e) {
                    alert("删除MCP服务器失败: " + e.message);
                }
            }
        });
    });
}

// 填充MCP表单
function fillMCPForm(server) {
    document.getElementById("mcp-id").value = server.id;
    document.getElementById("mcp-name").value = server.name;
    document.getElementById("mcp-description").value = server.description || "";
    document.getElementById("mcp-connection-type").value = server.connection_type;
    document.getElementById("mcp-is-enabled").checked = server.is_enabled;
    
    // 触发连接类型变化
    const connectionTypeEl = document.getElementById("mcp-connection-type");
    const stdioConfigEl = document.getElementById("mcp-stdio-config");
    const httpConfigEl = document.getElementById("mcp-http-config");
    
    if (server.connection_type === "stdio") {
        stdioConfigEl.style.display = "block";
        httpConfigEl.style.display = "none";
        document.getElementById("mcp-command").value = server.command || "";
        
        // 填充参数
        const argsContainer = document.getElementById("mcp-args-container");
        argsContainer.innerHTML = "";
        const args = server.args || [];
        args.forEach(arg => {
            const group = createArgInputGroup(arg);
            argsContainer.appendChild(group);
        });
        // 添加一个空的输入组
        const emptyGroup = document.createElement("div");
        emptyGroup.className = "args-input-group";
        emptyGroup.innerHTML = `
            <input type="text" class="arg-input" placeholder="输入参数，如 -y">
            <button type="button" class="add-arg-btn">+</button>
        `;
        argsContainer.appendChild(emptyGroup);
        emptyGroup.querySelector(".add-arg-btn").addEventListener("click", () => {
            const newGroup = createArgInputGroup();
            argsContainer.insertBefore(newGroup, emptyGroup);
        });
    } else if (server.connection_type === "http") {
        stdioConfigEl.style.display = "none";
        httpConfigEl.style.display = "block";
        document.getElementById("mcp-url").value = server.url || "";
    }
    
    // 填充环境变量
    const envContainer = document.getElementById("mcp-env-container");
    envContainer.innerHTML = "";
    const env = server.env || {};
    Object.entries(env).forEach(([key, value]) => {
        const group = createEnvInputGroup(key, value);
        envContainer.appendChild(group);
    });
    // 添加一个空的输入组
    const emptyEnvGroup = document.createElement("div");
    emptyEnvGroup.className = "env-input-group";
    emptyEnvGroup.innerHTML = `
        <input type="text" class="env-key-input" placeholder="变量名">
        <input type="text" class="env-value-input" placeholder="变量值">
        <button type="button" class="add-env-btn">+</button>
    `;
    envContainer.appendChild(emptyEnvGroup);
    emptyEnvGroup.querySelector(".add-env-btn").addEventListener("click", () => {
        const newGroup = createEnvInputGroup();
        envContainer.insertBefore(newGroup, emptyEnvGroup);
    });
}

// 初始化MCP表单事件
function initMCPForms() {
    if (mcpFormEl) {
        mcpFormEl.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const id = document.getElementById("mcp-id").value;
            const name = document.getElementById("mcp-name").value.trim();
            const description = document.getElementById("mcp-description").value.trim();
            const connectionType = document.getElementById("mcp-connection-type").value;
            const isEnabled = document.getElementById("mcp-is-enabled").checked;
            
            if (!name) {
                alert("请输入服务器名称");
                return;
            }
            
            if (!connectionType) {
                alert("请选择连接类型");
                return;
            }
            
            const formData = new FormData();
            formData.append("name", name);
            if (description) formData.append("description", description);
            formData.append("connection_type", connectionType);
            formData.append("is_enabled", isEnabled ? "true" : "false");
            
            if (connectionType === "stdio") {
                const command = document.getElementById("mcp-command").value.trim();
                if (!command) {
                    alert("请输入命令");
                    return;
                }
                formData.append("command", command);
                
                // 收集参数
                const args = [];
                document.querySelectorAll("#mcp-args-container .arg-input").forEach(input => {
                    if (input.value.trim()) {
                        args.push(input.value.trim());
                    }
                });
                formData.append("args", JSON.stringify(args));
            } else if (connectionType === "http") {
                const url = document.getElementById("mcp-url").value.trim();
                if (!url) {
                    alert("请输入服务URL");
                    return;
                }
                formData.append("url", url);
            }
            
            // 收集环境变量
            const env = {};
            document.querySelectorAll("#mcp-env-container .env-input-group").forEach(group => {
                const keyInput = group.querySelector(".env-key-input");
                const valueInput = group.querySelector(".env-value-input");
                if (keyInput && valueInput && keyInput.value.trim()) {
                    env[keyInput.value.trim()] = valueInput.value;
                }
            });
            formData.append("env", JSON.stringify(env));
            
            try {
                const url = id ? `${apiBase}/mcp/servers/${id}` : `${apiBase}/mcp/servers`;
                const method = "POST";
                const res = await fetch(url, { method, body: formData });
                if (!res.ok) throw new Error(await res.text());
                
                await loadMCPServers();
                renderMCPServerList();
                mcpFormEl.reset();
                document.getElementById("mcp-id").value = "";
                document.getElementById("mcp-stdio-config").style.display = "none";
                document.getElementById("mcp-http-config").style.display = "none";
                alert(id ? "MCP服务器更新成功" : "MCP服务器创建成功");
            } catch (e) {
                alert("保存失败: " + e.message);
            }
        });
    }
    
    // MCP表单重置按钮
    const mcpFormResetBtn = document.getElementById("mcp-form-reset");
    if (mcpFormResetBtn) {
        mcpFormResetBtn.addEventListener("click", () => {
            if (mcpFormEl) {
                mcpFormEl.reset();
                document.getElementById("mcp-id").value = "";
                document.getElementById("mcp-stdio-config").style.display = "none";
                document.getElementById("mcp-http-config").style.display = "none";
            }
        });
    }
    
    // MCP测试连接按钮
    const mcpTestBtn = document.getElementById("mcp-test-connection");
    if (mcpTestBtn) {
        mcpTestBtn.addEventListener("click", async () => {
            const id = document.getElementById("mcp-id").value;
            if (!id) {
                alert("请先保存MCP服务器配置后再测试连接");
                return;
            }
            
            mcpTestBtn.textContent = "测试中...";
            mcpTestBtn.disabled = true;
            
            try {
                const res = await fetch(`${apiBase}/mcp/servers/${id}/test`, { method: "POST" });
                const result = await res.json();
                
                if (result.success) {
                    alert("✓ 连接测试成功！");
                } else {
                    alert("✗ 连接测试失败: " + (result.error || "未知错误"));
                }
            } catch (e) {
                alert("测试失败: " + e.message);
            }
            
            mcpTestBtn.textContent = "测试连接";
            mcpTestBtn.disabled = false;
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
                
                alert("搜索配置保存成功");
                closeModal("search-config-modal");
            } catch (e) {
                alert("保存失败: " + e.message);
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
            initMCPForms();
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
                            renderMCPServerList();
                        }
                    });
                });
                observer.observe(mcpModal, { attributes: true, attributeFilter: ["class"] });
            }
        }, 500);
    });
})();


// ========== Provider管理功能 ==========

// 渲染Provider列表
function renderProviderList() {
    if (!providerListEl) return;
    
    providerListEl.innerHTML = "";
    
    if (providers.length === 0) {
        providerListEl.innerHTML = '<div class="empty-list">暂无Provider配置</div>';
        return;
    }
    
    providers.forEach(provider => {
        const item = document.createElement("div");
        item.className = "provider-item";
        const defaultIcon = provider.is_default ? "⭐" : "";
        item.innerHTML = `
            <div class="provider-info">
                <div class="provider-name">${defaultIcon}${provider.name}</div>
                <div class="provider-desc">${provider.api_base}</div>
                <div class="provider-models">${provider.default_model}</div>
            </div>
            <div class="provider-actions">
                <button class="edit-provider-btn" data-id="${provider.id}">✏️ 编辑</button>
                <button class="delete-provider-btn" data-id="${provider.id}">🗑️ 删除</button>
            </div>
        `;
        providerListEl.appendChild(item);
    });
    
    // 添加编辑按钮事件
    providerListEl.querySelectorAll(".edit-provider-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const providerId = btn.getAttribute("data-id");
            const provider = providers.find(p => p.id == providerId);
            if (provider) {
                fillProviderForm(provider);
            }
        });
    });
    
    // 添加删除按钮事件
    providerListEl.querySelectorAll(".delete-provider-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const providerId = btn.getAttribute("data-id");
            if (confirm("确定要删除这个Provider吗？")) {
                try {
                    const res = await fetch(`${apiBase}/providers/${providerId}`, { method: "DELETE" });
                    if (!res.ok) throw new Error("删除失败");
                    await loadProviders();
                    renderProviderList();
                    renderProviderSelect();
                } catch (e) {
                    alert("删除Provider失败: " + e.message);
                }
            }
        });
    });
}

// 填充Provider表单
function fillProviderForm(provider) {
    document.getElementById("provider-id").value = provider.id;
    document.getElementById("provider-name").value = provider.name;
    document.getElementById("provider-api-base").value = provider.api_base;
    document.getElementById("provider-api-key").value = ""; // 不显示已保存的密钥
    document.getElementById("provider-default-model").value = provider.default_model;
    document.getElementById("provider-is-default").checked = provider.is_default;
    
    // 填充模型列表
    if (provider.models) {
        const modelsList = provider.models.split(",").map(m => m.trim()).filter(m => m);
        setModelInputValues(modelsList.map(m => ({ model: m, name: "", capabilities: {} })));
    }
}

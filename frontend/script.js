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
let selectedWebSource = "duckduckgo";  // 当前选中的搜索源
let currentSettings = {
    autoTitleModel: "current",
    theme: "original",
    layout_scale: "normal",  // 界面比例：xs / sm / normal / lg / xl
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
let userInputEl, toggleKnowledgeEl, toggleMcpEl, toggleWebEl, toggleStreamEl;
let providerModalEl, providerListEl, providerFormEl;
let knowledgeModalEl, kbListEl, kbFormEl, kbSelectEl, kbUploadFormEl, kbUploadStatusEl, embeddingModelSelectEl;
let mcpModalEl, mcpListEl, mcpFormEl, settingsModalEl;

// 滚动到底部
function scrollToBottom() {
    if (chatMessagesEl) {
        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
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
    // 主页面的provider下拉框（向上展开）
    const providerSelect = document.getElementById('provider-select');
    if (providerSelect) {
        convertToCustomSelect(providerSelect, { dropDirection: 'up' });
    }
    
    // 设置页面的下拉框ID列表
    const settingsSelectIds = [
        'layout-scale-select',
        'auto-title-model-select',
        'ocr-method-select',
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
    toggleStreamEl = document.getElementById("toggle-stream");
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
            // MCP 状态由选中的服务决定，不直接从 settings.mcp 恢复
            if (toggleWebEl) toggleWebEl.checked = settings.web || false;
            if (toggleStreamEl) toggleStreamEl.checked = settings.stream !== undefined ? settings.stream : true;
            
            // 恢复 MCP 服务器选中状态
            if (settings.selectedMcpServers && Array.isArray(settings.selectedMcpServers)) {
                mcpServers.forEach(server => {
                    server.selected = settings.selectedMcpServers.includes(server.id);
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

// 保存工具设置
function saveToolSettings() {
    try {
        // 收集选中的 MCP 服务器 ID
        const selectedMcpServers = mcpServers
            .filter(s => s.is_enabled && s.selected)
            .map(s => s.id);
        
        const settings = {
            knowledge: toggleKnowledgeEl ? toggleKnowledgeEl.checked : false,
            mcp: toggleMcpEl ? toggleMcpEl.checked : false,
            web: toggleWebEl ? toggleWebEl.checked : false,
            stream: toggleStreamEl ? toggleStreamEl.checked : true,
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
    if (toggleStreamEl) toggleStreamEl.addEventListener('change', saveToolSettings);
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
        
        // 更新自动命名模型选择器（按Provider分组）
        const autoTitleSelect = document.getElementById("auto-title-model-select");
        if (autoTitleSelect) {
            autoTitleSelect.innerHTML = "";
            
            // 添加默认选项
            const currentOpt = document.createElement("option");
            currentOpt.value = "current";
            currentOpt.textContent = "使用当前对话模型";
            autoTitleSelect.appendChild(currentOpt);
            
            // 按Provider分组添加模型
            const modelsData = await fetch(`${apiBase}/models/all`).then(r => r.json());
            const providers = modelsData.providers || [];
            const modelsNamesMap = modelsData.models_names || {};
            
            providers.forEach(provider => {
                if (provider.models && provider.models.length > 0) {
                    const optgroup = document.createElement("optgroup");
                    optgroup.label = provider.name;
                    
                    provider.models.forEach(model => {
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
        
        // 加载视觉模型后设置OCR方法
        await loadVisionModels();
        const ocrMethodSelect = document.getElementById("ocr-method-select");
        if (ocrMethodSelect && settings.ocr_method) {
            ocrMethodSelect.value = settings.ocr_method;
            refreshCustomSelect(ocrMethodSelect);
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
        if(data.default) modelSelectEl.value = data.default;
        
        // 更新自定义下拉组件（按Provider分组）
        updateCustomModelSelect(models, data.default);
        
        // 更新模型功能标识（显示在选择框外）
        updateModelCapsBadge();
        
        // 添加模型选择变化监听
        modelSelectEl.removeEventListener("change", updateModelCapsBadge);
        modelSelectEl.addEventListener("change", updateModelCapsBadge);
    } catch(e) { console.error(e); }
}

// 更新自定义模型下拉组件（按Provider分组）
function updateCustomModelSelect(models, defaultModel) {
    const dropdown = document.getElementById("model-select-dropdown");
    const trigger = document.getElementById("model-select-trigger");
    const valueEl = trigger?.querySelector(".custom-select-value");
    
    if (!dropdown || !trigger || !valueEl) return;
    
    dropdown.innerHTML = "";
    
    if (!models || models.length === 0) {
        valueEl.textContent = "未配置";
        return;
    }
    
    // 按Provider分组显示
    if (modelsProviders && modelsProviders.length > 0) {
        modelsProviders.forEach(provider => {
            if (!provider.models || provider.models.length === 0) return;
            
            // 创建分组标题
            const groupHeader = document.createElement("div");
            groupHeader.className = "custom-select-group-header";
            groupHeader.textContent = provider.name;
            dropdown.appendChild(groupHeader);
            
            // 添加该Provider下的模型
            provider.models.forEach(m => {
                const displayName = modelsNames[m] || m;
                const caps = modelsCaps[m] || {};
                
                const optionEl = document.createElement("div");
                optionEl.className = "custom-select-option";
                optionEl.dataset.value = m;
                
                // 模型名称（左对齐）
                const nameEl = document.createElement("span");
                nameEl.className = "option-name";
                nameEl.textContent = displayName + (m === defaultModel ? " (默认)" : "");
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
                
                dropdown.appendChild(optionEl);
            });
        });
    } else {
        // 没有Provider信息时，直接显示所有模型
        models.forEach(m => {
            const displayName = modelsNames[m] || m;
            const caps = modelsCaps[m] || {};
            
            const optionEl = document.createElement("div");
            optionEl.className = "custom-select-option";
            optionEl.dataset.value = m;
            
            // 模型名称（左对齐）
            const nameEl = document.createElement("span");
            nameEl.className = "option-name";
            nameEl.textContent = displayName + (m === defaultModel ? " (默认)" : "");
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
            
            dropdown.appendChild(optionEl);
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
    
    badge.innerHTML = html;
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
        const raw = await res.json();
        mcpServers = normalizeApiResponse(raw) || [];
        // 加载后更新 MCP 按钮状态
        updateMcpToggleState();
    } catch(e) { console.error(e); }
}

// 加载向量模型列表
async function loadEmbeddingModels() {
    try {
        // 先检测本地模型可用性
        let localAvailability = { tesseract: false, local_rag: false };
        try {
            const localRes = await fetch(`${apiBase}/models/local-availability`);
            if (localRes.ok) {
                localAvailability = await localRes.json();
            }
        } catch (e) {
            console.warn("检测本地模型可用性失败:", e);
        }
        
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
        
        // 如果本地 RAG 可用，添加本地选项
        if (localAvailability.local_rag) {
            const localOpt = document.createElement("option");
            localOpt.value = "local-rag";
            localOpt.textContent = "本地 RAG 模型 (mcp-local-rag)";
            embeddingModelSelectEl.appendChild(localOpt);
        }
        
        // 显示/隐藏本地 RAG 推荐
        const localRagInfo = document.getElementById("local-rag-info");
        
        if (!data.models || data.models.length === 0) {
            if (!localAvailability.local_rag) {
                // 没有任何可用模型
                const opt = document.createElement("option");
                opt.value = "";
                opt.textContent = data.message || "无可用向量模型";
                opt.disabled = true;
                embeddingModelSelectEl.appendChild(opt);
            }
            
            // 没有向量模型时显示本地 RAG 推荐
            if (localRagInfo) localRagInfo.style.display = "block";
            refreshCustomSelect(embeddingModelSelectEl);
            return;
        }
        
        // 有向量模型时隐藏推荐
        if (localRagInfo) localRagInfo.style.display = "none";
        
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
        // 先检测本地模型可用性
        let localAvailability = { tesseract: false, local_rag: false };
        try {
            const localRes = await fetch(`${apiBase}/models/local-availability`);
            if (localRes.ok) {
                localAvailability = await localRes.json();
            }
        } catch (e) {
            console.warn("检测本地模型可用性失败:", e);
        }
        
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
            
            // 只有本地 Tesseract 可用时才显示
            if (localAvailability.tesseract) {
                const opt = document.createElement("option");
                opt.value = "tesseract";
                opt.textContent = "Tesseract OCR (本地)";
                kbVisionModelSelect.appendChild(opt);
            }
            
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
        
        // 更新设置页面的OCR方法选择器
        const ocrMethodSelect = document.getElementById("ocr-method-select");
        if (ocrMethodSelect) {
            const currentValue = ocrMethodSelect.value;
            ocrMethodSelect.innerHTML = '<option value="">不启用</option>';
            
            // 只有本地 Tesseract 可用时才显示
            if (localAvailability.tesseract) {
                const opt = document.createElement("option");
                opt.value = "tesseract";
                opt.textContent = "Tesseract OCR (本地)";
                ocrMethodSelect.appendChild(opt);
            }
            
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
                ocrMethodSelect.appendChild(optgroup);
            }
            
            // 恢复之前的选择
            if (currentValue) {
                ocrMethodSelect.value = currentValue;
            }
            refreshCustomSelect(ocrMethodSelect);
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
    if (toggleWebEl && toggleWebEl.checked) {
        formData.append("web_search_source", selectedWebSource || "duckduckgo");
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
        alert("请先配置 Provider（API服务商）\n\n点击左下角 ⚙️ 设置 → 管理 Provider");
        openModal("settings-modal");
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
    
    optionsContainer.innerHTML = '';
    
    // 过滤启用的 MCP 服务器
    const enabledServers = mcpServers.filter(s => s.is_enabled);
    
    if (enabledServers.length === 0) {
        optionsContainer.innerHTML = '<div class="toggle-popup-empty">暂无可用的 MCP 服务</div>';
        // 没有可用服务时，关闭按钮
        if (toggleMcp) toggleMcp.checked = false;
        return;
    }
    
    enabledServers.forEach(server => {
        const option = document.createElement('label');
        option.className = 'toggle-popup-option';
        option.innerHTML = `
            <input type="checkbox" value="${server.id}" ${server.selected ? 'checked' : ''}>
            <span>${server.name}</span>
        `;
        
        const checkbox = option.querySelector('input');
        checkbox.addEventListener('change', () => {
            // 更新服务器选中状态
            server.selected = checkbox.checked;
            
            // 根据是否有任何选中项来更新主 toggle 状态
            updateMcpToggleState();
            
            // 保存工具设置
            saveToolSettings();
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
    
    const enabledServers = mcpServers.filter(s => s.is_enabled);
    const anySelected = enabledServers.some(s => s.selected);
    toggleMcp.checked = anySelected;
}

// ========== 生图功能 ==========

// 初始化生图弹出选择框
function initImageGenTogglePopup() {
    const wrapper = document.getElementById('image-gen-toggle-wrapper');
    const checkbox = document.getElementById('toggle-image-gen');
    const popup = document.getElementById('image-gen-popup');
    
    console.log('[ImageGen] 初始化弹窗:', { wrapper: !!wrapper, checkbox: !!checkbox, popup: !!popup });
    
    if (!wrapper || !checkbox || !popup) {
        console.warn('[ImageGen] 弹窗元素未找到');
        return;
    }
    
    const label = wrapper.querySelector('label');
    if (!label) {
        console.warn('[ImageGen] label 元素未找到');
        return;
    }
    
    // 点击 label 时弹出选择框
    label.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('[ImageGen] label 被点击');
        
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
            loadImageGenModels();
        }
    });
}

// 加载生图模型列表
async function loadImageGenModels() {
    const select = document.getElementById('image-gen-model-select');
    if (!select) return;
    
    try {
        const res = await fetch(`${apiBase}/models/image-gen`);
        if (!res.ok) return;
        const data = await res.json();
        
        select.innerHTML = '';
        
        if (!data.models || data.models.length === 0) {
            select.innerHTML = '<option value="">请先配置生图模型</option>';
            return;
        }
        
        data.models.forEach(m => {
            const opt = document.createElement('option');
            opt.value = JSON.stringify({ model: m.model, provider_id: m.provider_id });
            opt.textContent = m.custom_name || m.model;
            if (m.provider_name) {
                opt.textContent += ` (${m.provider_name})`;
            }
            select.appendChild(opt);
        });
    } catch (e) {
        console.error('加载生图模型失败:', e);
    }
}

// 发送生图请求
async function sendImageGenRequest(prompt) {
    const modelSelect = document.getElementById('image-gen-model-select');
    const sizeSelect = document.getElementById('image-gen-size-select');
    
    if (!modelSelect || !modelSelect.value) {
        alert('请先选择生图模型');
        return null;
    }
    
    let modelInfo;
    try {
        modelInfo = JSON.parse(modelSelect.value);
    } catch (e) {
        alert('生图模型配置错误');
        return null;
    }
    
    const size = sizeSelect?.value || '1024x1024';
    
    // 显示生成中的消息
    appendMessage('user', `[生图] ${prompt}`);
    const assistantEl = appendMessage('assistant', '🎨 正在生成图片，请稍候...', null, false);
    
    try {
        const formData = new FormData();
        formData.append('prompt', prompt);
        formData.append('model', modelInfo.model);
        formData.append('size', size);
        formData.append('n', '1');
        formData.append('provider_id', modelInfo.provider_id);
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
            let content = `**生成完成** (模型: ${modelInfo.model}, 尺寸: ${size})\n\n`;
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
    
    const autoTitleModelSelect = document.getElementById("auto-title-model-select");
    if (autoTitleModelSelect) {
        autoTitleModelSelect.addEventListener("change", async (e) => {
            const autoTitleModel = e.target.value;
            currentSettings.auto_title_model = autoTitleModel;
            await saveSettingItem("auto_title_model", autoTitleModel);
        });
    }
    
    // OCR方法选择器
    const ocrMethodSelect = document.getElementById("ocr-method-select");
    if (ocrMethodSelect) {
        ocrMethodSelect.addEventListener("change", async (e) => {
            const ocrMethod = e.target.value;
            currentSettings.ocr_method = ocrMethod;
            await saveSettingItem("ocr_method", ocrMethod);
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
        
        // 数据加载完成后再初始化自定义下拉框
        initSettingsCustomSelects();
        
        initModelInputs();
        initMCPInputs();
        loadToolSettings();
        setupToolSettingsListeners();
        setupEventListeners();
        setupSettingsEventListeners();
        
        // 自动选择或创建对话
        await autoSelectOrCreateConversation();
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
        const res = await fetch(`${apiBase}/conversations`, {method: "POST", body: formData});
        if (!res.ok) throw new Error("创建失败");
        const raw = await res.json();
        const convData = normalizeApiResponse(raw);
        const conv = (convData && convData.conversation) ? convData.conversation : raw.conversation || raw;
        await loadConversations();
        if (conv && conv.id) {
            await selectConversation(conv.id);
        }
    } catch(e) {
        console.error("创建对话失败:", e);
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
            try {
                const res = await fetch(`${apiBase}/knowledge/bases/${kbId}`, { method: "DELETE" });
                if (!res.ok) throw new Error("删除失败");
                await loadKnowledgeBases();
                renderKnowledgeBaseList();
                updateKnowledgeBaseSelect();
            } catch (e) {
                console.error("删除知识库失败:", e);
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
    refreshCustomSelect(kbSelectEl);
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
            
            if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
                alert("请选择要上传的文件");
                return;
            }
            
            const files = Array.from(fileInput.files);
            const totalFiles = files.length;
            let successCount = 0;
            let failCount = 0;
            let totalChunks = 0;
            let totalEntities = 0;
            let totalRelations = 0;
            
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
                formData.append("extract_graph", extractGraph ? "true" : "false");
                if (embeddingModel) formData.append("embedding_model", embeddingModel);
                
                if (kbUploadStatusEl) {
                    kbUploadStatusEl.textContent = `上传中... (${i + 1}/${totalFiles}) - ${file.name}`;
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
                    if (result.graph) {
                        totalEntities += result.graph.entities_created || 0;
                        totalRelations += result.graph.relations_created || 0;
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
            if (totalEntities > 0 || totalRelations > 0) {
                statusMsg += `，提取了 ${totalEntities} 个实体和 ${totalRelations} 个关系`;
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
            try {
                const res = await fetch(`${apiBase}/mcp/servers/${serverId}`, { method: "DELETE" });
                if (!res.ok) throw new Error("删除失败");
                await loadMCPServers();
                renderMCPServerList();
            } catch (e) {
                console.error("删除MCP服务器失败:", e);
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
        const keyStatus = provider.has_api_key ? "🔑" : "⚠️";
        const keyTitle = provider.has_api_key ? "API Key已配置" : "API Key未配置";
        item.innerHTML = `
            <div class="provider-info">
                <div class="provider-name">${defaultIcon}${provider.name} <span title="${keyTitle}">${keyStatus}</span></div>
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
            // 获取当前正在编辑的 provider id
            const currentEditingId = document.getElementById("provider-id")?.value;
            
            try {
                const res = await fetch(`${apiBase}/providers/${providerId}`, { method: "DELETE" });
                if (!res.ok) throw new Error("删除失败");
                await loadProviders();
                renderProviderList();
                renderProviderSelect();
                
                // 如果删除的是当前正在编辑的 provider，则清空表单
                if (currentEditingId && currentEditingId == providerId) {
                    resetProviderForm();
                }
            } catch (e) {
                console.error("删除Provider失败:", e);
            }
        });
    });
}

// 填充Provider表单
function fillProviderForm(provider) {
    const idEl = document.getElementById("provider-id");
    const nameEl = document.getElementById("provider-name");
    const apiBaseEl = document.getElementById("provider-api-base");
    const apiKeyEl = document.getElementById("provider-api-key");
    const defaultModelEl = document.getElementById("provider-default-model");
    const defaultModelNameEl = document.getElementById("provider-default-model-name");
    
    if (idEl) idEl.value = provider.id;
    if (nameEl) nameEl.value = provider.name;
    if (apiBaseEl) apiBaseEl.value = provider.api_base;
    if (apiKeyEl) apiKeyEl.value = "";
    if (defaultModelEl) defaultModelEl.value = provider.default_model;
    
    // 解析模型配置
    let modelsConfig = {};
    if (provider.models_config) {
        try {
            modelsConfig = JSON.parse(provider.models_config);
        } catch (e) {}
    }
    
    // 填充默认模型的功能和名称
    const defaultCaps = modelsConfig[provider.default_model] || {};
    if (defaultModelNameEl) defaultModelNameEl.value = defaultCaps.custom_name || "";
    
    const defaultVision = document.getElementById("default-cap-vision");
    const defaultReasoning = document.getElementById("default-cap-reasoning");
    const defaultChat = document.getElementById("default-cap-chat");
    const defaultImageGen = document.getElementById("default-cap-image-gen");
    if (defaultVision) defaultVision.checked = defaultCaps.vision || false;
    if (defaultReasoning) defaultReasoning.checked = defaultCaps.reasoning || false;
    if (defaultChat) defaultChat.checked = defaultCaps.chat !== false; // 默认勾选
    if (defaultImageGen) defaultImageGen.checked = defaultCaps.image_gen || false;
    
    // 根据是否已有API Key显示不同的提示
    const apiKeyHint = document.getElementById("api-key-hint");
    
    if (provider.has_api_key) {
        if (apiKeyEl) apiKeyEl.placeholder = "已配置，留空保持不变";
        if (apiKeyHint) apiKeyHint.style.display = "block";
    } else {
        if (apiKeyEl) apiKeyEl.placeholder = "输入 API Key（可选）";
        if (apiKeyHint) apiKeyHint.style.display = "none";
        if (apiKeyRequired) apiKeyRequired.style.display = "inline";
    }
    
    // 清空并填充模型列表
    const modelsContainer = document.getElementById("provider-models-container");
    if (modelsContainer) {
        modelsContainer.innerHTML = "";
        
        // 解析模型列表
        if (provider.models) {
            const modelsList = provider.models.split(",").map(m => m.trim()).filter(m => m);
            modelsList.forEach(modelName => {
                const caps = modelsConfig[modelName] || {};
                addModelCard(modelsContainer, modelName, caps.custom_name || "", caps);
            });
        }
    }
    
    // 更新表单标题
    const formTitle = document.getElementById("provider-form-title");
    if (formTitle) formTitle.textContent = "编辑 Provider";
}

// 添加模型卡片
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
    // 添加模型按钮
    const addModelBtn = document.getElementById("add-model-btn");
    if (addModelBtn) {
        addModelBtn.addEventListener("click", () => {
            const container = document.getElementById("provider-models-container");
            if (container) {
                addModelCard(container);
            }
        });
    }
    
    if (providerFormEl) {
        providerFormEl.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const id = document.getElementById("provider-id")?.value || "";
            const name = document.getElementById("provider-name")?.value.trim() || "";
            const providerApiBase = document.getElementById("provider-api-base")?.value.trim() || "";
            const providerApiKey = document.getElementById("provider-api-key")?.value || "";
            const defaultModel = document.getElementById("provider-default-model")?.value.trim() || "";
            const defaultModelName = document.getElementById("provider-default-model-name")?.value.trim() || "";
            
            if (!name || !providerApiBase || !defaultModel) {
                alert("请填写必填字段：名称、API Base URL、默认模型");
                return;
            }
            
            // 收集默认模型的功能信息
            const defaultModelCaps = {
                vision: document.getElementById("default-cap-vision")?.checked || false,
                reasoning: document.getElementById("default-cap-reasoning")?.checked || false,
                chat: document.getElementById("default-cap-chat")?.checked || false,
                image_gen: document.getElementById("default-cap-image-gen")?.checked || false,
                custom_name: defaultModelName
            };
            
            // 收集模型列表
            const { models, modelsConfig } = collectModelsData();
            
            // 将默认模型的配置也加入
            modelsConfig[defaultModel] = defaultModelCaps;
            
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
                
                await loadProviders();
                await loadModels();
                renderProviderList();
                renderProviderSelect();
                resetProviderForm();
                alert(id ? "Provider更新成功" : "Provider创建成功");
            } catch (e) {
                alert("保存失败: " + e.message);
            }
        });
    }
    
    // Provider表单重置按钮
    const providerFormResetBtn = document.getElementById("provider-form-reset");
    if (providerFormResetBtn) {
        providerFormResetBtn.addEventListener("click", resetProviderForm);
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
    const defaultModelEl = document.getElementById("provider-default-model");
    const defaultModelNameEl = document.getElementById("provider-default-model-name");
    
    if (nameEl) nameEl.value = "";
    if (apiBaseEl) apiBaseEl.value = "";
    if (defaultModelEl) defaultModelEl.value = "";
    if (defaultModelNameEl) defaultModelNameEl.value = "";
    
    // 重置API Key输入框的提示（新建状态）
    resetApiKeyInput();
    
    // 清空模型列表
    const modelsContainer = document.getElementById("provider-models-container");
    if (modelsContainer) {
        modelsContainer.innerHTML = "";
    }
    
    // 重置默认模型功能勾选
    const defaultVision = document.getElementById("default-cap-vision");
    const defaultReasoning = document.getElementById("default-cap-reasoning");
    const defaultChat = document.getElementById("default-cap-chat");
    const defaultImageGen = document.getElementById("default-cap-image-gen");
    if (defaultVision) defaultVision.checked = false;
    if (defaultReasoning) defaultReasoning.checked = false;
    if (defaultChat) defaultChat.checked = true; // 默认勾选对话
    if (defaultImageGen) defaultImageGen.checked = false;
    
    // 重置表单标题
    const formTitle = document.getElementById("provider-form-title");
    if (formTitle) formTitle.textContent = "新建 Provider";
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
        note: "向量模型用于将文本转换为数值向量，不同 Provider 支持的模型不同。请确保你的 Provider 支持所选模型。",
        localNote: "🏠 <strong>本地方案</strong>：安装 <code>mcp-local-rag</code> 后可使用本地向量模型，无需 API Key，完全离线运行。安装命令：<code>npx mcp-local-rag</code>"
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
        note: "视觉模型用于识别扫描件/图片 PDF 中的文字。如果你的 PDF 是文字版（可选中文字），则不需要此功能。",
        localNote: "🏠 <strong>本地方案</strong>：安装 Tesseract OCR 后可使用本地 OCR，无需 API Key，完全离线运行。<a href='https://github.com/UB-Mannheim/tesseract/wiki' target='_blank'>下载安装包</a>"
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
    
    // 如果有本地方案提示，添加到末尾
    if (data.localNote) {
        html += `<div class="help-note local-note">${data.localNote}</div>`;
    }
    
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

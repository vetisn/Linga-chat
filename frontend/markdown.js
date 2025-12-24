/**
 * Markdown 流式渲染引擎 v8.0
 * 精简版 - 移除调试日志
 */
(function() {
    'use strict';

    // ========== 初始化 Marked ==========
    function initMarked() {
        if (typeof marked === 'undefined') {
            console.error('[MD] marked.js 未加载');
            return false;
        }
        marked.setOptions({ gfm: true, breaks: true });
        return true;
    }

    // ========== 渲染器类 ==========
    class MarkdownRenderer {
        constructor() {
            this.ready = initMarked();
        }

        render(el, md, final = true) {
            if (!el || !this.ready) return false;
            this._doRender(el, final ? md : this._fixIncomplete(md || ''));
            return true;
        }

        _doRender(el, md) {
            try {
                let html = marked.parse(md || '');
                if (typeof DOMPurify !== 'undefined') {
                    html = DOMPurify.sanitize(html);
                }
                el.innerHTML = html;
                
                // 代码高亮
                if (typeof hljs !== 'undefined') {
                    el.querySelectorAll('pre code').forEach(block => {
                        hljs.highlightElement(block);
                    });
                }
                this._addStyles(el);
            } catch (e) {
                console.error('[MD] 渲染错误:', e);
                el.textContent = md;
            }
        }

        _addStyles(container) {
            container.querySelectorAll('pre').forEach(pre => {
                pre.classList.add('code-block');
                const code = pre.querySelector('code');
                if (code) {
                    let lang = 'text';
                    for (const cls of code.className.split(' ')) {
                        if (cls.startsWith('language-')) {
                            lang = cls.replace('language-', '');
                            break;
                        }
                    }
                    pre.dataset.lang = lang;
                }
            });

            container.querySelectorAll('code').forEach(code => {
                if (code.parentElement?.tagName !== 'PRE') {
                    code.classList.add('inline-code');
                }
            });

            container.querySelectorAll('a[href^="http"]').forEach(a => {
                a.setAttribute('target', '_blank');
                a.setAttribute('rel', 'noopener');
            });
        }

        _fixIncomplete(text) {
            if (!text) return '';
            const fenceCount = (text.match(/```/g) || []).length;
            if (fenceCount % 2 === 1) text += '\n```';
            const boldCount = (text.match(/\*\*/g) || []).length;
            if (boldCount % 2 === 1) text += '**';
            return text;
        }

        cancel(el) {}

        addCopyButtons(container) {
            if (!container) return;
            container.querySelectorAll('pre.code-block').forEach(pre => {
                if (pre.querySelector('.code-header')) return;
                const lang = pre.dataset.lang || 'text';
                const code = pre.querySelector('code');
                if (!code) return;

                const header = document.createElement('div');
                header.className = 'code-header';

                const langSpan = document.createElement('span');
                langSpan.className = 'code-lang';
                langSpan.textContent = lang;
                header.appendChild(langSpan);

                const btn = document.createElement('button');
                btn.className = 'code-copy-btn';
                btn.textContent = '复制';
                btn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigator.clipboard.writeText(code.textContent || '').then(() => {
                        btn.textContent = '已复制';
                        setTimeout(() => { btn.textContent = '复制'; }, 2000);
                    });
                };
                header.appendChild(btn);
                pre.insertBefore(header, pre.firstChild);
            });
        }

        parse(md) {
            if (!this.ready) return md;
            try {
                let html = marked.parse(md || '');
                if (typeof DOMPurify !== 'undefined') {
                    html = DOMPurify.sanitize(html);
                }
                return html;
            } catch (e) {
                return md;
            }
        }
    }

    // ========== 导出 ==========
    const renderer = new MarkdownRenderer();

    window.MarkdownEngine = {
        renderToEl: (el, markdown, isComplete = true) => renderer.render(el, markdown, isComplete),
        renderStreaming: (el, markdown) => renderer.render(el, markdown, false),
        renderFinal: (el, markdown) => renderer.render(el, markdown, true),
        cancelRender: (el) => renderer.cancel(el),
        addCopyButtons: (container) => renderer.addCopyButtons(container),
        parse: (markdown) => renderer.parse(markdown),
        isReady: () => renderer.ready
    };
})();

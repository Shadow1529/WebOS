export class WindowManager {
    constructor(processManager) {
        this.processManager = processManager;
        this.windowLayer = document.getElementById('window-layer');
        this.dockAppsContainer = document.getElementById('dock-apps');
        this.topZIndex = 100;
        this.windows = new Map();
    }

    createWindow(options) {
        const { title, iconSvg, width = 640, height = 420, appName, renderContent } = options;
        const windowId = 'win-' + Math.random().toString(36).substring(2, 9);
        const pid = this.processManager.createProcess(appName, windowId);

        const winEl = document.createElement('div');
        winEl.className = 'os-window';
        winEl.id = windowId;
        winEl.style.width = width + 'px';
        winEl.style.height = height + 'px';
        
        const offsetX = 60 + (this.windows.size * 35) % 250;
        const offsetY = 40 + (this.windows.size * 35) % 180;
        winEl.style.left = offsetX + 'px';
        winEl.style.top = offsetY + 'px';
        winEl.style.zIndex = ++this.topZIndex;

        winEl.innerHTML = `
            <div class="window-header" data-window-id="${windowId}">
                <div class="window-controls">
                    <button class="window-btn close" data-action="close" title="Close"></button>
                    <button class="window-btn minimize" data-action="minimize" title="Minimize"></button>
                    <button class="window-btn maximize" data-action="maximize" title="Maximize"></button>
                </div>
                <div class="window-title">${title}</div>
            </div>
            <div class="window-content" id="content-${windowId}"></div>
        `;

        this.windowLayer.appendChild(winEl);

        const contentContainer = winEl.querySelector(`#content-${windowId}`);
        if (typeof renderContent === 'function') {
            renderContent(contentContainer, windowId);
        }

        this.setupInteractions(winEl, windowId);
        this.addDockIcon(appName, iconSvg, windowId);
        this.windows.set(windowId, { el: winEl, pid, appName, title, iconSvg });
        this.focusWindow(windowId);

        return windowId;
    }

    focusWindow(windowId) {
        const win = this.windows.get(windowId);
        if (win) {
            this.topZIndex++;
            win.el.style.zIndex = this.topZIndex;
            win.el.style.display = 'flex';
            document.getElementById('active-app-title').innerText = win.title;
        }
    }

    closeWindow(windowId) {
        const win = this.windows.get(windowId);
        if (win) {
            this.processManager.terminateProcess(win.pid);
            win.el.remove();
            this.windows.delete(windowId);
            this.removeDockIcon(windowId);
            document.getElementById('active-app-title').innerText = 'Finder';
        }
    }

    minimizeWindow(windowId) {
        const win = this.windows.get(windowId);
        if (win) {
            win.el.style.display = 'none';
            document.getElementById('active-app-title').innerText = 'Finder';
        }
    }

    maximizeWindow(windowId) {
        const win = this.windows.get(windowId);
        if (win) win.el.classList.toggle('maximized');
    }

    setupInteractions(winEl, windowId) {
        const header = winEl.querySelector('.window-header');
        
        winEl.addEventListener('pointerdown', () => this.focusWindow(windowId));

        winEl.querySelectorAll('.window-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.getAttribute('data-action');
                if (action === 'close') this.closeWindow(windowId);
                else if (action === 'minimize') this.minimizeWindow(windowId);
                else if (action === 'maximize') this.maximizeWindow(windowId);
            });
        });

        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        const onDragStart = (clientX, clientY) => {
            isDragging = true;
            startX = clientX;
            startY = clientY;
            const rect = winEl.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;
            this.focusWindow(windowId);
        };

        const onDragMove = (clientX, clientY) => {
            if (!isDragging) return;
            winEl.style.left = Math.max(0, initialLeft + (clientX - startX)) + 'px';
            winEl.style.top = Math.max(28, initialTop + (clientY - startY)) + 'px';
        };

        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.window-controls')) return;
            onDragStart(e.clientX, e.clientY);
            const move = (ev) => onDragMove(ev.clientX, ev.clientY);
            const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); isDragging = false; };
            window.addEventListener('mousemove', move);
            window.addEventListener('mouseup', up);
        });

        header.addEventListener('touchstart', (e) => {
            if (e.target.closest('.window-controls')) return;
            const t = e.touches[0];
            onDragStart(t.clientX, t.clientY);
            const move = (ev) => { const touch = ev.touches[0]; onDragMove(touch.clientX, touch.clientY); };
            const end = () => { window.removeEventListener('touchmove', move); window.removeEventListener('touchend', end); isDragging = false; };
            window.addEventListener('touchmove', move);
            window.addEventListener('touchend', end);
        }, { passive: true });
    }

    addDockIcon(appName, iconSvg, windowId) {
        const dockItem = document.createElement('div');
        dockItem.className = 'dock-app-icon running';
        dockItem.id = `dock-${windowId}`;
        dockItem.title = appName;
        dockItem.innerHTML = iconSvg;
        
        dockItem.addEventListener('click', () => {
            const win = this.windows.get(windowId);
            if (win) {
                if (win.el.style.display === 'none' || win.el.style.zIndex != this.topZIndex) {
                    this.focusWindow(windowId);
                } else {
                    this.minimizeWindow(windowId);
                }
            }
        });
        this.dockAppsContainer.appendChild(dockItem);
    }

    removeDockIcon(windowId) {
        const icon = document.getElementById(`dock-${windowId}`);
        if (icon) icon.remove();
    }
}
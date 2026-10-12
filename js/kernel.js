import { Icons } from './icons.js';
import { VirtualFileSystem } from './vfs.js';
import { ProcessManager } from './processManager.js';
import { WindowManager } from './windowManager.js';
import { AppRegistry } from './apps.js';

class WebOSKernel {
    constructor() {
        // FIX: Explicitly bind Icons to the kernel instance so AppRegistry can access them
        this.Icons = Icons;
        
        this.vfs = new VirtualFileSystem();
        this.processManager = new ProcessManager();
        this.windowManager = new WindowManager(this.processManager);
        this.apps = new AppRegistry(this);
        this.initSystem();
    }

    initSystem() {
        this.renderDesktopIcons();
        this.renderLaunchpadApps();
        this.setupClock();
        this.setupLaunchpadToggle();
    }

    renderDesktopIcons() {
        const grid = document.getElementById('desktop-grid');
        if (!grid) return;
        grid.innerHTML = '';
        
        try {
            const desktopFiles = this.vfs.listDir('/home/desktop');
            for (const [filename, fileObj] of Object.entries(desktopFiles)) {
                const iconEl = document.createElement('div');
                iconEl.className = 'desktop-icon';
                const svgIcon = fileObj.type === 'dir' ? this.Icons.folder : this.Icons.file;
                
                iconEl.innerHTML = `
                    <div class="desktop-icon-svg">${svgIcon}</div>
                    <span class="desktop-icon-label">${filename}</span>
                `;

                const openAction = () => this.openFile(filename, `/home/desktop/${filename}`);
                iconEl.addEventListener('dblclick', openAction);

                let lastTouch = 0;
                iconEl.addEventListener('touchend', (e) => {
                    const now = new Date().getTime();
                    if (now - lastTouch < 300) {
                        e.preventDefault();
                        openAction();
                    }
                    lastTouch = now;
                });

                grid.appendChild(iconEl);
            }
        } catch (err) {
            console.error('Error rendering desktop icons:', err);
        }
    }

    renderLaunchpadApps() {
        const grid = document.getElementById('launchpad-grid');
        if (!grid) return;
        grid.innerHTML = '';
        
        const appList = [
            { name: 'Terminal', icon: this.Icons.terminal, id: 'terminal' },
            { name: 'Notepad', icon: this.Icons.notepad, id: 'notepad' },
            { name: 'File Explorer', icon: this.Icons.explorer, id: 'explorer' },
            { name: 'Calculator', icon: this.Icons.calculator, id: 'calculator' },
            { name: 'Browser', icon: this.Icons.browser, id: 'browser' },
            { name: 'Settings', icon: this.Icons.settings, id: 'settings' }
        ];

        appList.forEach(item => {
            const el = document.createElement('div');
            el.className = 'launchpad-app-item';
            el.innerHTML = `${item.icon}<span>${item.name}</span>`;
            el.addEventListener('click', () => {
                this.apps.launch(item.id);
                document.getElementById('launchpad').classList.add('hidden');
            });
            grid.appendChild(el);
        });
    }

    openFile(filename, path) {
        try {
            const content = this.vfs.readFile(path);
            this.windowManager.createWindow({
                title: filename,
                iconSvg: this.Icons.notepad,
                width: 520, height: 360, appName: 'Notepad',
                renderContent: (container, winId) => {
                    container.style.display = 'flex';
                    container.style.flexDirection = 'column';
                    container.innerHTML = `
                        <div style="padding: 10px; background: rgba(0,0,0,0.03); border-bottom: 1px solid rgba(0,0,0,0.08); display: flex; gap: 8px;">
                            <input type="text" id="notepad-path-${winId}" value="${path}" style="flex:1; padding: 6px 10px; border-radius: 6px; border: 1px solid #ccc; font-size: 13px;">
                            <button id="notepad-save-${winId}" style="padding: 6px 14px; background: #007aff; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">Save</button>
                        </div>
                        <textarea id="notepad-textarea-${winId}" style="flex:1; width:100\%; border:none; padding:14px; font-family:var(--system-font); font-size:14px; outline:none; resize:none; background:transparent;">${content}</textarea>
                    `;
                    container.querySelector(`#notepad-save-${winId}`).addEventListener('click', () => {
                        try {
                            this.vfs.writeFile(container.querySelector(`#notepad-path-${winId}`).value.trim(), container.querySelector(`#notepad-textarea-${winId}`).value);
                            alert('File updated successfully!');
                            this.renderDesktopIcons();
                        } catch (err) { alert('Error: ' + err.message); }
                    });
                }
            });
        } catch (err) { alert('Could not open file: ' + err.message); }
    }

    handleTerminalCommand(cmdLine, currentDir, callback) {
        const parts = cmdLine.trim().split(' ');
        const cmd = parts[0];
        const args = parts.slice(1);

        switch(cmd) {
            case 'help':
                callback('Available commands:\n  ls         List directory contents\n  cd <dir>   Change directory\n  mkdir <d>  Create directory\n  touch <f>  Create empty file\n  cat <file> Read file contents\n  clear      Clear terminal screen\n  neofetch   Display system information\n  help       Show help');
                break;
            case 'clear':
                callback('', currentDir);
                break;
            case 'ls':
                try {
                    const target = args[0] ? (args[0].startsWith('/') ? args[0] : currentDir + '/' + args[0]) : currentDir;
                    const children = this.vfs.listDir(target);
                    callback(Object.entries(children).map(([name, obj]) => `${obj.type === 'dir' ? '[DIR]  ' : '[FILE] '}${name}`).join('\n') || '(empty)');
                } catch (err) { callback(`ls: ${err.message}`); }
                break;
            case 'cd':
                if (!args[0]) callback('', '/home');
                else if (args[0] === '..') {
                    const p = currentDir.split('/').filter(Boolean); p.pop();
                    callback('', '/' + p.join('/'));
                } else {
                    const target = args[0].startsWith('/') ? args[0] : currentDir + '/' + args[0];
                    try {
                        const node = this.vfs.resolvePath(target);
                        if (node && node.type === 'dir') callback('', target);
                        else callback(`cd: not a directory: ${args[0]}`);
                    } catch (err) { callback(`cd: no such file or directory: ${args[0]}`); }
                }
                break;
            case 'mkdir':
                if (!args[0]) callback('mkdir: missing operand');
                else {
                    try { this.vfs.mkdir(args[0].startsWith('/') ? args[0] : currentDir + '/' + args[0]); callback(`Created directory: ${args[0]}`); this.renderDesktopIcons(); }
                    catch (err) { callback(`mkdir: ${err.message}`); }
                }
                break;
            case 'touch':
                if (!args[0]) callback('touch: missing operand');
                else {
                    try { this.vfs.writeFile(args[0].startsWith('/') ? args[0] : currentDir + '/' + args[0], ''); callback(`Created file: ${args[0]}`); this.renderDesktopIcons(); }
                    catch (err) { callback(`touch: ${err.message}`); }
                }
                break;
            case 'cat':
                if (!args[0]) callback('cat: missing operand');
                else {
                    try { callback(this.vfs.readFile(args[0].startsWith('/') ? args[0] : currentDir + '/' + args[0])); }
                    catch (err) { callback(`cat: ${err.message}`); }
                }
                break;
            case 'neofetch':
                callback('       .--.       WebOS v3.0 (Modular Edition)\n      |o_o |      ---------------------------\n      |:_/ |      OS: WebOS Browser Edition\n     //   \\ \\     Kernel: ES6 Modules\n    (|     | )    Shell: Bash-compatible CLI\n   /'\\_   _/`\\    UI: macOS / iPadOS Hybrid');
                break;
            case '':
                callback('');
                break;
            default:
                callback(`Command not found: ${cmd}. Type 'help'.`);
                break;
        }
    }

    setupClock() {
        const update = () => {
            const now = new Date();
            const clockEl = document.getElementById('top-clock');
            if (clockEl) {
                clockEl.innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
        };
        update();
        setInterval(update, 1000);
    }

    setupLaunchpadToggle() {
        const btn = document.getElementById('launchpad-btn');
        const pad = document.getElementById('launchpad');
        if (btn && pad) {
            btn.addEventListener('click', (e) => { e.stopPropagation(); pad.classList.toggle('hidden'); });
            document.addEventListener('click', (e) => { if (!pad.contains(e.target) && !btn.contains(e.target)) pad.classList.add('hidden'); });
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.webos = new WebOSKernel();
});
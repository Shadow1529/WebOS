export class AppRegistry {
    constructor(kernel) {
        this.kernel = kernel;
        this.windowManager = kernel.windowManager;
        this.vfs = kernel.vfs;
    }

    launch(appId) {
        switch(appId) {
            case 'terminal':
                this.windowManager.createWindow({
                    title: 'Terminal',
                    iconSvg: this.kernel.Icons.terminal,
                    width: 680, height: 420, appName: 'Terminal',
                    renderContent: (container) => {
                        container.style.background = '#18181a';
                        container.style.color = '#34c759';
                        container.style.fontFamily = 'SF Mono, monospace';
                        container.style.padding = '14px';
                        container.style.overflowY = 'auto';
                        container.innerHTML = `
                            <div id="terminal-output">WebOS Shell [Version 3.0.0]<br>Type 'help' for available commands.<br><br></div>
                            <div style="display: flex;">
                                <span id="terminal-prompt" style="margin-right: 6px; color: #ff9500;">/home &gt;</span>
                                <input type="text" id="terminal-input" style="flex:1; background:transparent; border:none; color:#ffffff; outline:none; font-family:monospace;" autofocus>
                            </div>
                        `;
                        const input = container.querySelector('#terminal-input');
                        const output = container.querySelector('#terminal-output');
                        let currentDir = '/home';

                        input.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter') {
                                const cmdLine = input.value.trim();
                                output.innerHTML += `<div><span style="color:#ff9500;">${currentDir} &gt;</span>${cmdLine}</div>`;
                                this.kernel.handleTerminalCommand(cmdLine, currentDir, (res, newDir) => {
                                    if (res) output.innerHTML += `<div>${res.replace(/\n/g, '<br>')}</div>`;
                                    if (newDir) currentDir = newDir;
                                    container.querySelector('#terminal-prompt').innerText = `${currentDir} >`;
                                    output.scrollTop = output.scrollHeight;
                                });
                                input.value = '';
                            }
                        });
                    }
                });
                break;

            case 'notepad':
                this.windowManager.createWindow({
                    title: 'Notepad',
                    iconSvg: this.kernel.Icons.notepad,
                    width: 620, height: 460, appName: 'Notepad',
                    renderContent: (container, winId) => {
                        container.style.display = 'flex';
                        container.style.flexDirection = 'column';
                        container.innerHTML = `
                            <div style="padding: 10px; background: rgba(0,0,0,0.03); border-bottom: 1px solid rgba(0,0,0,0.08); display: flex; gap: 8px;">
                                <input type="text" id="notepad-path-${winId}" value="/home/documents/NewNote.txt" style="flex:1; padding: 6px 10px; border-radius: 6px; border: 1px solid #ccc; font-size: 13px;">
                                <button id="notepad-save-${winId}" style="padding: 6px 14px; background: #007aff; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">Save</button>
                            </div>
                            <textarea id="notepad-textarea-${winId}" style="flex:1; width:100%; border:none; padding:14px; font-family:var(--system-font); font-size:14px; outline:none; resize:none; background:transparent;"></textarea>
                        `;
                        const pathInput = container.querySelector(`#notepad-path-${winId}`);
                        const textarea = container.querySelector(`#notepad-textarea-${winId}`);
                        container.querySelector(`#notepad-save-${winId}`).addEventListener('click', () => {
                            try {
                                this.vfs.writeFile(pathInput.value.trim(), textarea.value);
                                alert('File saved successfully!');
                                this.kernel.renderDesktopIcons();
                            } catch (err) { alert('Error: ' + err.message); }
                        });
                    }
                });
                break;

            case 'explorer':
                this.windowManager.createWindow({
                    title: 'File Explorer',
                    iconSvg: this.kernel.Icons.explorer,
                    width: 680, height: 420, appName: 'File Explorer',
                    renderContent: (container, winId) => {
                        container.style.display = 'flex';
                        container.style.flexDirection = 'column';
                        container.innerHTML = `
                            <div style="padding: 10px; background: rgba(0,0,0,0.03); border-bottom: 1px solid rgba(0,0,0,0.08); display: flex; gap: 8px; align-items: center;">
                                <input type="text" id="exp-path-${winId}" value="/home" style="flex:1; padding: 6px 10px; border-radius: 6px; border: 1px solid #ccc; font-size: 13px;">
                            </div>
                            <div id="exp-list-${winId}" style="flex:1; padding: 14px; overflow-y:auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 14px; align-content: start;"></div>
                        `;
                        const pathInput = container.querySelector(`#exp-path-${winId}`);
                        const listContainer = container.querySelector(`#exp-list-${winId}`);
                        
                        const loadDir = (path) => {
                            pathInput.value = path;
                            listContainer.innerHTML = '';
                            try {
                                const children = this.vfs.listDir(path);
                                for (const [name, obj] of Object.entries(children)) {
                                    const item = document.createElement('div');
                                    item.style.cssText = 'display: flex; flex-direction: column; align-items: center; padding: 10px; border-radius: 10px; cursor: pointer; text-align: center;';
                                    item.innerHTML = `<div style="width:42px; height:42px; margin-bottom:6px;">${obj.type === 'dir' ? this.kernel.Icons.folder : this.kernel.Icons.file}</div><span style="font-size:12px; font-weight:500;">${name}</span>`;
                                    
                                    item.addEventListener('dblclick', () => {
                                        const targetPath = (path === '/' ? '' : path) + '/' + name;
                                        if (obj.type === 'dir') loadDir(targetPath);
                                        else this.kernel.openFile(name, targetPath);
                                    });
                                    listContainer.appendChild(item);
                                }
                            } catch (err) { listContainer.innerHTML = `<div style="color:red;">Error: ${err.message}</div>`; }
                        };
                        loadDir('/home');
                    }
                });
                break;

            case 'calculator':
                this.windowManager.createWindow({
                    title: 'Calculator',
                    iconSvg: this.kernel.Icons.calculator,
                    width: 320, height: 420, appName: 'Calculator',
                    renderContent: (container) => {
                        container.style.display = 'flex';
                        container.style.flexDirection = 'column';
                        container.style.background = '#1c1c1e';
                        container.innerHTML = `
                            <div id="calc-display" style="height: 90px; background: #1c1c1e; color: white; font-size: 36px; display: flex; align-items: flex-end; justify-content: flex-end; padding: 16px; font-family: monospace;">0</div>
                            <div style="flex:1; display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: #3a3a3c;">
                                ${['C', '±', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '='].map(btn => 
                                    `<button class="calc-btn" style="background:${['÷','×','-','+','='].includes(btn)?'#ff9500':(btn==='C'||btn==='±'||btn==='%'?'#a6a6af':'#2c2c2e')}; color:white; border:none; font-size:18px; font-weight:600; ${btn==='0'?'grid-column: span 2;':''}">${btn}</button>`
                                ).join('')}
                            </div>
                        `;
                        const display = container.querySelector('#calc-display');
                        let currentVal = '0', pendingVal = null, operator = null, clearOnNext = false;

                        container.querySelectorAll('.calc-btn').forEach(btn => {
                            btn.addEventListener('click', () => {
                                const text = btn.innerText;
                                if (!isNaN(text) || text === '.') {
                                    if (clearOnNext) { currentVal = text === '.' ? '0.' : text; clearOnNext = false; }
                                    else { if (text === '.' && currentVal.includes('.')) return; currentVal = currentVal === '0' && text !== '.' ? text : currentVal + text; }
                                    display.innerText = currentVal;
                                } else if (text === 'C') {
                                    currentVal = '0'; pendingVal = null; operator = null; display.innerText = currentVal;
                                } else if (['+', '-', '×', '÷'].includes(text)) {
                                    pendingVal = parseFloat(currentVal); operator = text; clearOnNext = true;
                                } else if (text === '=') {
                                    if (operator && pendingVal !== null) {
                                        const val = parseFloat(currentVal);
                                        if (operator === '+') pendingVal += val;
                                        if (operator === '-') pendingVal -= val;
                                        if (operator === '×') pendingVal *= val;
                                        if (operator === '÷') pendingVal = val === 0 ? 'Error' : pendingVal / val;
                                        currentVal = String(pendingVal);
                                        display.innerText = currentVal;
                                        operator = null; clearOnNext = true;
                                    }
                                }
                            });
                        });
                    }
                });
                break;

            case 'browser':
                this.windowManager.createWindow({
                    title: 'Browser',
                    iconSvg: this.kernel.Icons.browser,
                    width: 760, height: 500, appName: 'Browser',
                    renderContent: (container, winId) => {
                        container.style.display = 'flex';
                        container.style.flexDirection = 'column';
                        container.innerHTML = `
                            <div style="padding: 10px; background: rgba(0,0,0,0.03); border-bottom: 1px solid rgba(0,0,0,0.08); display: flex; gap: 8px; align-items: center;">
                                <input type="text" id="browser-url-${winId}" value="https://example.com" style="flex:1; padding: 6px 12px; border-radius: 8px; border: 1px solid #ccc; font-size: 13px;">
                                <button id="browser-go-${winId}" style="padding: 6px 14px; background: #34c759; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">Go</button>
                            </div>
                            <div style="flex:1; position:relative; background:white;">
                                <iframe id="browser-frame-${winId}" src="https://example.com" style="width:100%; height:100%; border:none;"></iframe>
                            </div>
                        `;
                        const urlInput = container.querySelector(`#browser-url-${winId}`);
                        const frame = container.querySelector(`#browser-frame-${winId}`);
                        container.querySelector(`#browser-go-${winId}`).addEventListener('click', () => {
                            let url = urlInput.value.trim();
                            if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
                            frame.src = url;
                        });
                    }
                });
                break;

            case 'settings':
                this.windowManager.createWindow({
                    title: 'Settings',
                    iconSvg: this.kernel.Icons.settings,
                    width: 540, height: 380, appName: 'Settings',
                    renderContent: (container) => {
                        container.style.padding = '24px';
                        container.innerHTML = `
                            <h2 style="margin-bottom: 16px; font-size: 22px; font-weight: 600; color: #1d1d1f;">System Preferences</h2>
                            <div style="margin-bottom: 20px;">
                                <label style="display: block; font-weight: 600; margin-bottom: 6px; font-size: 13px; color: #3a3a3c;">Wallpaper Image URL:</label>
                                <div style="display: flex; gap: 8px;">
                                    <input type="text" id="settings-bg-url" value="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2560&q=80" style="flex:1; padding: 8px 12px; border-radius: 8px; border: 1px solid #ccc; font-size: 13px;">
                                    <button id="settings-apply-bg" style="padding: 8px 16px; background: #007aff; color: white; border: none; border-radius: 8px; cursor:pointer; font-weight: 500;">Apply</button>
                                </div>
                            </div>
                            <div>
                                <h3 style="font-size: 15px; font-weight: 600; margin-bottom: 6px; color: #1d1d1f;">Storage Utility</h3>
                                <p id="storage-readout" style="font-size: 13px; color: #555;"></p>
                            </div>
                        `;
                        const vfsData = localStorage.getItem('webos_vfs_v3') || '';
                        container.querySelector('#storage-readout').innerText = `Virtual File System usage: ~${new Blob([vfsData]).size} bytes stored in browser localStorage.`;
                        container.querySelector('#settings-apply-bg').addEventListener('click', () => {
                            document.body.style.backgroundImage = `url('${container.querySelector('#settings-bg-url').value}')`;
                            alert('Wallpaper applied successfully!');
                        });
                    }
                });
                break;
        }
    }
}
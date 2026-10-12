export class VirtualFileSystem {
    constructor() {
        this.storageKey = 'webos_vfs_v3';
        this.initStorage();
    }

    initStorage() {
        if (!localStorage.getItem(this.storageKey)) {
            const defaultTree = {
                '/': {
                    type: 'dir',
                    children: {
                        'home': {
                            type: 'dir',
                            children: {
                                'desktop': {
                                    type: 'dir',
                                    children: {
                                        'Welcome.txt': {
                                            type: 'file',
                                            content: 'Welcome to WebOS modular edition!\nFully persistent Virtual File System.'
                                        },
                                        'Readme.md': {
                                            type: 'file',
                                            content: '# Architecture\nModular ES6 files running inside browser.'
                                        }
                                    }
                                },
                                'documents': {
                                    type: 'dir',
                                    children: {
                                        'Notes.txt': {
                                            type: 'file',
                                            content: 'Meeting notes:\n1. Test iPad touch events.\n2. Verify local storage.'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            };
            this.saveTree(defaultTree);
        }
    }

    getTree() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : null;
    }

    saveTree(tree) {
        localStorage.setItem(this.storageKey, JSON.stringify(tree));
    }

    resolvePath(path) {
        const parts = path.split('/').filter(Boolean);
        let curr = this.getTree()['/'];
        for (const part of parts) {
            if (curr.type === 'dir' && curr.children && curr.children[part]) {
                curr = curr.children[part];
            } else {
                return null;
            }
        }
        return curr;
    }

    readFile(path) {
        const node = this.resolvePath(path);
        if (node && node.type === 'file') return node.content;
        throw new Error(`File not found: ${path}`);
    }

    writeFile(path, content) {
        const tree = this.getTree();
        const parts = path.split('/').filter(Boolean);
        const name = parts.pop();
        let curr = tree['/'];
        for (const part of parts) {
            if (!curr.children[part]) {
                curr.children[part] = { type: 'dir', children: {} };
            }
            curr = curr.children[part];
        }
        curr.children[name] = { type: 'file', content };
        this.saveTree(tree);
    }

    mkdir(path) {
        const tree = this.getTree();
        const parts = path.split('/').filter(Boolean);
        const name = parts.pop();
        let curr = tree['/'];
        for (const part of parts) {
            if (!curr.children[part]) {
                curr.children[part] = { type: 'dir', children: {} };
            }
            curr = curr.children[part];
        }
        if (!curr.children[name]) {
            curr.children[name] = { type: 'dir', children: {} };
            this.saveTree(tree);
        }
    }

    remove(path) {
        const tree = this.getTree();
        const parts = path.split('/').filter(Boolean);
        const name = parts.pop();
        let curr = tree['/'];
        for (const part of parts) {
            if (curr.children[part]) curr = curr.children[part];
            else return;
        }
        if (curr.children && curr.children[name]) {
            delete curr.children[name];
            this.saveTree(tree);
        }
    }

    listDir(path) {
        const node = this.resolvePath(path);
        if (node && node.type === 'dir') return node.children;
        throw new Error(`Directory not found: ${path}`);
    }
}
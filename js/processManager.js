export class ProcessManager {
    constructor() {
        this.processes = new Map();
        this.nextPid = 3000;
    }

    createProcess(appName, windowId) {
        const pid = this.nextPid++;
        this.processes.set(pid, { pid, appName, windowId, startTime: new Date() });
        return pid;
    }

    terminateProcess(pid) {
        return this.processes.delete(pid);
    }
}
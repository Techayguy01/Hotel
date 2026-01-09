import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as path from 'path';

@Injectable()
export class BrainService implements OnModuleInit, OnModuleDestroy {
    private pythonProcess: ChildProcessWithoutNullStreams;

    onModuleInit() {
        this.spawnBrain();
    }

    onModuleDestroy() {
        if (this.pythonProcess) {
            this.pythonProcess.kill();
        }
    }

    private spawnBrain() {
        const scriptPath = path.resolve(__dirname, '../../../brain/main.py');
        // Use the virtual environment Python
        const venvPython = path.resolve(__dirname, '../../../../.venv/Scripts/python.exe');
        console.log(`[BrainService] Spawning Python Brain using: ${venvPython} at ${scriptPath}`);

        this.pythonProcess = spawn(venvPython, [scriptPath]);

        this.pythonProcess.stdout.on('data', (data) => {
            const lines = data.toString().split('\n');
            lines.forEach(line => {
                if (line.trim()) {
                    try {
                        const json = JSON.parse(line);
                        this.handleBrainMessage(json);
                    } catch (e) {
                        console.error(`[BrainService] Failed to parse brain output: ${line}`, e);
                    }
                }
            });
        });

        this.pythonProcess.stderr.on('data', (data) => {
            console.error(`[BrainProcess Log] ${data.toString().trim()}`);
        });

        this.pythonProcess.on('close', (code) => {
            console.log(`[BrainService] Brain process exited with code ${code}`);
        });
    }

    private pendingRequests = new Map<string, (response: any) => void>();

    async sendPayload(payload: any): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.pythonProcess) {
                return reject('Brain process not running');
            }

            const handler = (msg: any) => {
                if (msg.type === 'ASSISTANT_TEXT' || msg.type === 'TTS_AUDIO' || msg.type === 'ERROR') {
                    resolve(msg);
                    this.removeListener(handler);
                }
            };
            this.addListener(handler);

            this.pythonProcess.stdin.write(JSON.stringify(payload) + '\n');
        });
    }

    async processInput(text: string): Promise<any> {
        return this.sendPayload({ type: 'PROCESS_TEXT', text, timestamp: Date.now() });
    }

    // Simple event emitter replacement for dependency-free
    private listeners: ((msg: any) => void)[] = [];
    private addListener(fn: (msg: any) => void) {
        this.listeners.push(fn);
    }
    private removeListener(fn: (msg: any) => void) {
        this.listeners = this.listeners.filter(l => l !== fn);
    }
    private handleBrainMessage(msg: any) {
        // Broadcast to all waiting (FIFO in real app, but here simple)
        const listener = this.listeners.shift();
        if (listener) listener(msg);
    }
}

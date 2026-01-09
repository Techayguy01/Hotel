import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as path from 'path';

@Injectable()
export class BrainService implements OnModuleInit, OnModuleDestroy {
    private pythonProcess: ChildProcessWithoutNullStreams;
    private buffer = ''; // <--- NEW: Buffer to store incomplete data chunks

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
        const venvPython = path.resolve(__dirname, '../../../../.venv/Scripts/python.exe'); // Ensure path is correct for your OS
        console.log(`[BrainService] Spawning Python Brain using: ${venvPython}`);

        this.pythonProcess = spawn(venvPython, [scriptPath]);

        this.pythonProcess.stdout.on('data', (data) => {
            // 1. Append new data to the buffer
            this.buffer += data.toString();

            // 2. Process complete lines only
            if (this.buffer.includes('\n')) {
                const lines = this.buffer.split('\n');
                
                // Save the last piece (it might be incomplete) back to the buffer
                this.buffer = lines.pop() || ''; 

                lines.forEach(line => {
                    if (line.trim()) {
                        try {
                            const json = JSON.parse(line);
                            this.handleBrainMessage(json);
                        } catch (e) {
                            // Only log if it's not a tiny fragment
                            if (line.length < 1000) { 
                                console.error(`[BrainService] JSON Parse Error: ${line}`, e);
                            } else {
                                console.error(`[BrainService] JSON Parse Error (Large Payload)`);
                            }
                        }
                    }
                });
            }
        });

        this.pythonProcess.stderr.on('data', (data) => {
            console.error(`[BrainProcess Log] ${data.toString().trim()}`);
        });

        this.pythonProcess.on('close', (code) => {
            console.log(`[BrainService] Brain process exited with code ${code}`);
        });
    }

    // --- Message Handling (No Changes Needed Below) ---
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

    private listeners: ((msg: any) => void)[] = [];
    private addListener(fn: (msg: any) => void) {
        this.listeners.push(fn);
    }
    private removeListener(fn: (msg: any) => void) {
        this.listeners = this.listeners.filter(l => l !== fn);
    }
    private handleBrainMessage(msg: any) {
        const listener = this.listeners.shift();
        if (listener) listener(msg);
    }
}
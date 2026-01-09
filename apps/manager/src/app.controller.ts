import { Controller, Post, Body } from '@nestjs/common';
import { BrainService } from './brain/brain.service';

@Controller('api')
export class AppController {
    constructor(private readonly brainService: BrainService) { }

    @Post('chat')
    async chat(@Body() body: { text?: string; message?: string; audio?: string; type?: string }) {
        if (body.audio) {
            console.log('[API] Received Audio Chunk');
            return this.brainService.sendPayload({
                type: 'PROCESS_AUDIO',
                audio: body.audio,
                timestamp: Date.now()
            });
        }

        const input = body.message || body.text || '';
        console.log('[API] Received chat:', input);
        const response = await this.brainService.processInput(input);
        return response;
    }
}

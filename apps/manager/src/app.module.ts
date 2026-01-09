import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { BrainService } from './brain/brain.service';

@Module({
    imports: [],
    controllers: [AppController],
    providers: [BrainService],
})
export class AppModule { }

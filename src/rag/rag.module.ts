import { Module } from '@nestjs/common';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { LlmModule } from 'src/llm/llm.module';

@Module({
  imports: [LlmModule],
  controllers: [RagController],
  providers: [RagService],
})
export class RagModule {}

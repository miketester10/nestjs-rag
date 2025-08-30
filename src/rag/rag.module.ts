import { Module } from '@nestjs/common';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';

@Module({
  imports: [],
  controllers: [RagController],
  providers: [RagService],
  exports: [],
})
export class RagModule {}

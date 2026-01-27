import { Module } from '@nestjs/common';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { LlmModule } from 'src/llm/llm.module';
import { PdfIngestionService } from './services/pdf-ingestion.service';
import { VectorStoreService } from './services/vector-store.service';
import { DocumentRetrievalService } from './services/document-retrieval.service';

@Module({
  imports: [LlmModule],
  controllers: [RagController],
  providers: [
    RagService,
    PdfIngestionService,
    VectorStoreService,
    DocumentRetrievalService,
  ],
})
export class RagModule {}

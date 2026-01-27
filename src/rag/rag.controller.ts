import {
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
  Body,
  Logger,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { RagService } from './rag.service';
import { QuestionDto } from 'src/dto/question.dto';
import { IngestResponse } from 'src/interfaces/ingest-response.interface';
import { QueryResponse } from 'src/interfaces/query-response.interface';
import { GenerateResponse } from 'src/interfaces/generate-response.interface';
import { FileValidationPipe } from 'src/common/pipes/file-validation.pipe';

@Controller('rag')
export class RagController {
  private readonly logger = new Logger(RagController.name);

  constructor(private readonly ragService: RagService) {}

  // -----------------------------
  // Upload multiplo PDF tramite form-data
  // -----------------------------
  @Post('upload')
  @UseInterceptors(FilesInterceptor('files'))
  async uploadPdfs(
    @UploadedFiles(FileValidationPipe) files: Express.Multer.File[],
  ): Promise<IngestResponse> {
    return this.ragService.ingestMultiplePdfBuffers(files);
  }

  // -----------------------------
  // Query ai documenti (solo retrieval, senza LLM)
  // -----------------------------
  @Post('ask')
  async ask(@Body() body: QuestionDto): Promise<QueryResponse> {
    return this.ragService.query(body.question);
  }

  // -----------------------------
  // Genera risposta con LLM (RAG completo anti-allucinazione)
  // -----------------------------
  @Post('generate')
  async generate(@Body() body: QuestionDto): Promise<GenerateResponse> {
    return this.ragService.generate(body.question);
  }
}

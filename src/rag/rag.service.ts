import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueryResponse } from 'src/interfaces/query-response.interface';
import { IngestResponse } from 'src/interfaces/ingest-response.interface';
import { GenerateResponse } from 'src/interfaces/generate-response.interface';
import { LlmService } from 'src/llm/llm.service';
import {
  RAG_SYSTEM_PROMPT,
  NO_CONTEXT_RESPONSE,
  formatContextForPrompt,
} from './prompts/rag-prompt';
import { env } from 'src/config/env.schema';
import { PdfIngestionService } from './services/pdf-ingestion.service';
import { VectorStoreService } from './services/vector-store.service';
import { DocumentRetrievalService } from './services/document-retrieval.service';

@Injectable()
export class RagService implements OnModuleInit {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private llmService: LlmService,
    private pdfIngestionService: PdfIngestionService,
    private vectorStoreService: VectorStoreService,
    private documentRetrievalService: DocumentRetrievalService,
  ) {}

  async onModuleInit() {
    const ollamaBaseUrl = env.OLLAMA_BASE_URL;
    const embeddingModel = env.EMBEDDING_MODEL;
    const similarityThreshold = env.SIMILARITY_THRESHOLD;

    // Inizializza vector store
    this.vectorStoreService.initialize(ollamaBaseUrl, embeddingModel);
    await this.vectorStoreService.loadIfExists();

    // Configura retrieval
    this.documentRetrievalService.setSimilarityThreshold(similarityThreshold);
  }

  async ingestMultiplePdfBuffers(
    files: Express.Multer.File[],
  ): Promise<IngestResponse> {
    // Parsa i file PDF
    const { documents, ignoredFiles } =
      await this.pdfIngestionService.parsePdfFiles(files);

    if (documents.length === 0) {
      return {
        message:
          'Nessun PDF indicizzato. Tutti i file erano vuoti o non leggibili',
        totalDocs: 0,
        ignoredFiles,
      };
    }

    // Divide i documenti in chunk
    const chunkedDocuments =
      await this.pdfIngestionService.chunkDocuments(documents);

    // Aggiunge i documenti al vector store
    await this.vectorStoreService.addDocuments(chunkedDocuments);

    // Salva su disco
    await this.vectorStoreService.save();

    return {
      message: 'PDF indicizzati con successo',
      totalDocs: documents.length,
      totalChunks: chunkedDocuments.length,
      ignoredFiles,
    };
  }

  async query(question: string): Promise<QueryResponse> {
    const contextDocs = await this.documentRetrievalService.retrieve(question);

    const context = contextDocs.map(({ doc, score }) => {
      const filename = doc.metadata.filename;
      return {
        pdf: filename,
        score: Number(score.toFixed(4)),
        content: doc.pageContent,
      };
    });

    return {
      domanda: question,
      documenti: context,
    };
  }

  async generate(question: string): Promise<GenerateResponse> {
    const filteredResults =
      await this.documentRetrievalService.retrieve(question);

    // Se nessun documento rilevante, rispondi senza LLM
    if (filteredResults.length === 0) {
      return {
        risposta: NO_CONTEXT_RESPONSE,
        citazioni: [],
        disclaimer: 'Nessun documento rilevante trovato per questa domanda.',
      };
    }

    // Prepara citazioni
    const citazioni = filteredResults.map(({ doc, score }) => ({
      filename: doc.metadata.filename,
      score: Number(score.toFixed(4)),
      snippet: doc.pageContent.substring(0, 150) + '...',
    }));

    // Formatta contesto per il prompt
    const contextDocs = filteredResults.map(({ doc, score }) => ({
      content: doc.pageContent,
      filename: doc.metadata.filename,
      score: score,
    }));

    const contextText = formatContextForPrompt(contextDocs);

    // Costruisci prompt finale
    const prompt = RAG_SYSTEM_PROMPT.replace('{context}', contextText).replace(
      '{question}',
      question,
    );

    // Genera risposta con LLM
    const risposta = await this.llmService.generateResponse(prompt);

    return {
      risposta,
      citazioni,
      disclaimer:
        'Risposta generata basandosi esclusivamente sui documenti indicizzati.',
    };
  }
}

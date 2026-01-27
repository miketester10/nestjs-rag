import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { OllamaEmbeddings } from '@langchain/ollama';
import { Document } from 'langchain/document';
import * as pdfParse from 'pdf-parse';
import * as fs from 'fs';
import * as path from 'path';
import { Metadata } from 'src/interfaces/metadata.interface';
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

@Injectable()
export class RagService implements OnModuleInit {
  private readonly logger = new Logger(RagService.name);

  private vectorStore: FaissStore | null = null;
  private embeddings: OllamaEmbeddings;
  private dataDir = path.resolve('data');
  private storePath = path.join(this.dataDir, 'faiss_store');
  private similarityThreshold: number;

  constructor(private llmService: LlmService) {}

  async onModuleInit() {
    // Configura embeddings Ollama
    const ollamaBaseUrl = env.OLLAMA_BASE_URL;
    const embeddingModel = env.EMBEDDING_MODEL;

    this.embeddings = new OllamaEmbeddings({
      baseUrl: ollamaBaseUrl,
      model: embeddingModel,
    });

    this.similarityThreshold = env.SIMILARITY_THRESHOLD;

    this.logger.log(
      `Embeddings configurato: ${embeddingModel} @ ${ollamaBaseUrl}`,
    );
    this.logger.log(`Threshold similarità: ${this.similarityThreshold}`);

    // Crea la cartella 'data' se non esiste
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    // Carica vector store esistente se presente
    if (fs.existsSync(this.storePath)) {
      try {
        await this.loadVectorStore();
      } catch (err) {
        this.logger.warn(
          `Vector store esistente non compatibile, verrà ricreato: ${(err as Error).message}`,
        );
        // Rimuovi il vecchio store incompatibile
        fs.rmSync(this.storePath, { recursive: true, force: true });
      }
    }
  }

  // -----------------------------
  // Carica e indicizza più PDF da buffer
  // -----------------------------
  async ingestMultiplePdfBuffers(
    files: Express.Multer.File[],
  ): Promise<IngestResponse> {
    const documents: Document[] = [];
    const ignoredFiles: string[] = [];

    // Parse dei file PDF
    for (const file of files) {
      try {
        const data = await pdfParse(file.buffer);
        const text = data.text;

        if (!text || text.trim().length === 0) {
          ignoredFiles.push(file.originalname);
          continue;
        }

        // Metadata arricchiti per citazioni
        documents.push(
          new Document<Metadata>({
            pageContent: text,
            metadata: {
              filename: file.originalname,
              totalPages: data.numpages,
              uploadedAt: new Date().toISOString(),
            },
          }),
        );
      } catch (err) {
        ignoredFiles.push(file.originalname);
        this.logger.warn(
          `PDF non leggibile e ignorato: ${file.originalname}. Errore: ${(err as Error).message}`,
        );
        continue;
      }
    }

    if (documents.length === 0) {
      return {
        message:
          'Nessun PDF indicizzato. Tutti i file erano vuoti o non leggibili',
        totalDocs: 0,
        ignoredFiles,
      };
    }

    // Chunking ottimizzato per modelli con grande contesto (Gemini Flash)
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 4000,
      chunkOverlap: 500,
      separators: ['\n\n', '\n', '. ', '? ', '! ', ' '],
    });

    // Crea array di testi e metadati separati da passare allo splitter
    const texts = documents.map((document) => document.pageContent);
    const metadatas = documents.map((document) => document.metadata);

    // Crea i chunk
    const chunkedDocuments = await splitter.createDocuments(texts, metadatas);

    // Aggiorna o crea vector store
    try {
      if (this.vectorStore) {
        await this.vectorStore.addDocuments(chunkedDocuments);
      } else {
        this.vectorStore = await FaissStore.fromDocuments(
          chunkedDocuments,
          this.embeddings,
        );
      }
    } catch (err) {
      this.logger.error(`Errore Vector store: ${(err as Error).message}`);
      throw new InternalServerErrorException(`Errore Vector store`);
    }

    // Salva su disco
    await this.saveVectorStore();

    return {
      message: 'PDF indicizzati con successo',
      totalDocs: documents.length,
      totalChunks: chunkedDocuments.length,
      ignoredFiles,
    };
  }

  // -----------------------------
  // HELPER: Recupera documenti rilevanti con scoring
  // -----------------------------
  private async retrieve(
    question: string,
    topK: number = 8,
  ): Promise<{ doc: Document; score: number }[]> {
    if (!this.vectorStore) {
      throw new BadRequestException(
        `⚠️ Nessun documento indicizzato. Carica prima dei PDF`,
      );
    }

    // Converti la domanda in embedding
    const queryEmbedding = await this.embeddings.embedQuery(question);

    // Cerca nel vector store (recupera più risultati per filtrare meglio). Ritorna un array di tuple [Document, distance]
    const results = (await this.vectorStore.similaritySearchVectorWithScore(
      queryEmbedding,
      topK,
    )) as Array<[Document, number]>;

    // Calcola score di similarità del coseno e filtra
    return results
      .map(([doc, distance]) => ({
        doc,
        score: 1 / (1 + distance), // più piccolo = più simile → score vicino a 1
      }))
      .filter(({ score }) => score >= this.similarityThreshold); // filtra i meno rilevanti
  }

  // -----------------------------
  // Query ai documenti (solo retrieval)
  // -----------------------------
  async query(question: string): Promise<QueryResponse> {
    const contextDocs = await this.retrieve(question);

    const context = contextDocs.map(({ doc, score }) => {
      const filename = (doc.metadata as Metadata).filename;
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

  // -----------------------------
  // Genera risposta con LLM (RAG completo)
  // -----------------------------
  async generate(question: string): Promise<GenerateResponse> {
    const filteredResults = await this.retrieve(question);

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
      filename: (doc.metadata as Metadata).filename,
      score: Number(score.toFixed(4)),
      snippet: doc.pageContent.substring(0, 150) + '...',
    }));

    // Formatta contesto per il prompt
    const contextDocs = filteredResults.map(({ doc, score }) => ({
      content: doc.pageContent,
      filename: (doc.metadata as Metadata).filename,
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

  // -----------------------------
  // Carica il vector store da disco
  // -----------------------------
  private async loadVectorStore(): Promise<void> {
    this.vectorStore = await FaissStore.load(this.storePath, this.embeddings);
    this.logger.log('Vector store FAISS caricato da disco');
  }

  // -----------------------------
  // Salva il vector store su disco
  // -----------------------------
  private async saveVectorStore(): Promise<void> {
    if (!this.vectorStore) return;
    await this.vectorStore.save(this.storePath);
    this.logger.log(
      `Vector store FAISS salvato su disco in: ${this.storePath}`,
    );
  }
}

import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from 'langchain/document';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class VectorStoreService {
  private readonly logger = new Logger(VectorStoreService.name);

  private vectorStore: FaissStore | null = null;
  private embeddings: OpenAIEmbeddings;
  private dataDir = path.resolve('data');
  private storePath = path.join(this.dataDir, 'faiss_store');

  /**
   * Inizializza gli embeddings di OpenAI e prepara la cartella per il vector store
   */
  initialize(ollamaBaseUrl: string, embeddingModel: string): void {
    this.embeddings = new OpenAIEmbeddings({
      configuration: {
        baseURL: ollamaBaseUrl,
        apiKey: 'My API Key', // API Key non è necessaria per llama.cpp, ma è richiesta dall'interfaccia
      },
    });

    // Crea la cartella 'data' se non esiste
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    this.logger.log(
      `Embeddings configurato: ${embeddingModel} @ ${ollamaBaseUrl}`,
    );
  }

  /**
   * Carica il vector store dal disco se esiste
   */
  async loadIfExists(): Promise<void> {
    if (fs.existsSync(this.storePath)) {
      try {
        await this.load();
      } catch (err) {
        this.logger.warn(
          `Vector store esistente non compatibile, verrà ricreato: ${(err as Error).message}`,
        );
        fs.rmSync(this.storePath, { recursive: true, force: true });
      }
    }
  }

  /**
   * Aggiunge documenti al vector store se esiste, altrimenti lo crea
   */
  async addDocuments(documents: Document[]): Promise<void> {
    try {
      if (this.vectorStore) {
        await this.vectorStore.addDocuments(documents);
      } else {
        this.vectorStore = await FaissStore.fromDocuments(
          documents,
          this.embeddings,
        );
      }
    } catch (err) {
      this.logger.error(`Errore Vector store: ${(err as Error).message}`);
      throw new InternalServerErrorException(`Errore Vector store`);
    }
  }

  /**
   * Salva il vector store su disco
   */
  async save(): Promise<void> {
    if (!this.vectorStore) return;
    await this.vectorStore.save(this.storePath);
    this.logger.log(
      `Vector store FAISS salvato su disco in: ${this.storePath}`,
    );
  }

  /**
   * Carica il vector store da disco
   */
  private async load(): Promise<void> {
    this.vectorStore = await FaissStore.load(this.storePath, this.embeddings);
    this.logger.log('Vector store FAISS caricato da disco');
  }

  /**
   * Ottiene il vector store attuale
   */
  getVectorStore(): FaissStore | null {
    return this.vectorStore;
  }

  /**
   * Ottiene gli embeddings attuali
   */
  getEmbeddings(): OpenAIEmbeddings {
    return this.embeddings;
  }
}

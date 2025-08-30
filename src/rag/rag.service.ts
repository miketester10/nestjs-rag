import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/huggingface_transformers';
import { Document } from 'langchain/document';
import * as pdfParse from 'pdf-parse';
import * as fs from 'fs';
import * as path from 'path';
import { Metadata } from 'src/interfaces/metadata.interface';
import { QueryResponse } from 'src/interfaces/query-response.interface';
import { IngestResponse } from 'src/interfaces/ingest-response.interface';

@Injectable()
export class RagService implements OnModuleInit {
  private readonly logger = new Logger(RagService.name);

  private vectorStore: FaissStore | null = null;
  private embeddings: HuggingFaceTransformersEmbeddings;
  private dataDir = path.resolve('data');
  private storePath = path.join(this.dataDir, 'faiss_store');

  constructor() {}

  onModuleInit() {
    // Usa il modello di embedding locale
    const modelPath = path.resolve('models', 'BAAI', 'bge-m3');
    this.embeddings = new HuggingFaceTransformersEmbeddings({
      model: modelPath,
    });

    // Creo la cartella 'data' se non esiste
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    // Se esiste un FAISS già salvato, lo carico
    if (fs.existsSync(this.storePath)) {
      this.loadVectorStore().catch((err) =>
        this.logger.error(
          `Errore nel caricamento del Vector store FAISS: ${(err as Error).message}`,
        ),
      );
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

        documents.push(
          new Document({
            pageContent: text,
            metadata: { filename: file.originalname } as Metadata,
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

    // Chunking intelligente
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1400,
      chunkOverlap: 200,
      separators: ['\n\n', '. ', '? ', '! ', '\n'],
    });
    const texts = documents.map((document) => document.pageContent);
    const metadatas = documents.map((document) => document.metadata);
    const chunkedDocuments = await splitter.createDocuments(texts, metadatas);

    // Se il Vector store esiste già
    if (this.vectorStore) {
      // Aggiungo i chunked Documents a quelli già presenti nello store
      await this.vectorStore.addDocuments(chunkedDocuments);
    } else {
      // Altrimenti creo lo store
      try {
        this.vectorStore = await FaissStore.fromDocuments(
          chunkedDocuments,
          this.embeddings,
        );
      } catch (err) {
        this.logger.error(
          `Errore durante la creazione del Vector store: ${(err as Error).message}`,
        );
        throw new InternalServerErrorException(
          `Errore durante la creazione del Vector store`,
        );
      }
    }

    // Salvo su disco
    await this.saveVectorStore();

    return {
      message: 'PDF indicizzati con successo',
      totalDocs: documents.length,
      totalChunks: chunkedDocuments.length,
      ignoredFiles,
    };
  }

  // -----------------------------
  // Query ai documenti
  // -----------------------------
  async query(question: string): Promise<QueryResponse> {
    if (!this.vectorStore) {
      // Nessun documento indicizzato
      throw new BadRequestException(
        `⚠️ Nessun documento indicizzato. Carica prima dei PDF`,
      );
    }

    // results: array di tuple [Document, score]
    const results = await this.vectorStore.similaritySearchWithScore(
      question,
      4,
    );

    // Ordina lo score in modo descrescente
    results.sort((a, b) => b[1] - a[1]);

    // Costruisce il contesto da inviare al modello (o restituire all'utente)
    const context = results.map(([doc, score]) => {
      const filename = (doc.metadata as Metadata).filename || 'Sconosciuto';
      return {
        pdf: filename,
        score: Number(score.toFixed(4)),
        content: doc.pageContent,
      };
    });

    // Risposta finale in formato JSON
    return {
      domanda: question,
      documenti: context,
    };
  }

  // -----------------------------
  // Carica il vector store da disco
  // -----------------------------
  private async loadVectorStore(): Promise<void> {
    this.vectorStore = await FaissStore.load(this.storePath, this.embeddings);
    this.logger.debug('Vector store FAISS caricato da disco');
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

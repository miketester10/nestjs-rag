import { Injectable, Logger } from '@nestjs/common';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from 'langchain/document';
import * as pdfParse from 'pdf-parse';
import { Metadata } from 'src/interfaces/metadata.interface';

@Injectable()
export class PdfIngestionService {
  private readonly logger = new Logger(PdfIngestionService.name);

  /**
   * Parsa un array di file PDF e estrae il testo
   */
  async parsePdfFiles(files: Express.Multer.File[]): Promise<{
    documents: Document[];
    ignoredFiles: string[];
  }> {
    const documents: Document[] = [];
    const ignoredFiles: string[] = [];

    for (const file of files) {
      try {
        const data = await pdfParse(file.buffer);
        const text = data.text;

        if (!text || text.trim().length === 0) {
          ignoredFiles.push(file.originalname);
          continue;
        }

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

    return { documents, ignoredFiles };
  }

  /**
   * Divide i documenti in chunk ottimizzati per LLM con grande contesto
   */
  async chunkDocuments(documents: Document[]): Promise<Document[]> {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 4000,
      chunkOverlap: 500,
      separators: ['\n\n', '\n', '. ', '? ', '! ', ' '],
    });

    const texts = documents.map((doc) => doc.pageContent);
    const metadatas = documents.map((doc) => doc.metadata);

    return await splitter.createDocuments(texts, metadatas);
  }
}

export interface IngestResponse {
  message: string;
  totalDocs: number;
  ignoredFiles: string[];
  totalChunks?: number;
}

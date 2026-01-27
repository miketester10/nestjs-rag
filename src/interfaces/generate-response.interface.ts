export interface GenerateResponse {
  risposta: string;
  citazioni: Array<{
    filename: string;
    score: number;
    snippet: string;
  }>;
  disclaimer: string;
}

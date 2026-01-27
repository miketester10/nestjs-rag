export interface GenerateResponse {
  risposta: string;
  citazioni: Citazione[];
  disclaimer: string;
}

interface Citazione {
  filename: string;
  score: number;
  snippet: string;
}

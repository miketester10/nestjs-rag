# NestJS RAG (Retrieval-Augmented Generation)

Un progetto NestJS che implementa un sistema di **Retrieval-Augmented Generation (RAG)** per generare risposte intelligenti basate su documenti indicizzati.

> [!NOTE]
> Per l'accelerazione hardware su GPU AMD, visita il branch [`vulkan-gpu`](https://github.com/miketester10/nestjs-rag/tree/vulkan-gpu). Quella versione utilizza **llama.cpp** con backend **Vulkan** invece di Ollama standard.

## Installazione

```bash
npm install
```

## Variabili d'Ambiente

Configura le seguenti variabili nel file `.env`:

```
OLLAMA_BASE_URL=http://localhost:11434
EMBEDDING_MODEL=embeddinggemma:latest
SIMILARITY_THRESHOLD=0.45
LLM_MODEL=gemini-3-flash-preview
GEMINI_API_KEY=your_api_key
```

## Avvio del Progetto

```bash
# Sviluppo
npm run start

# Modalità watch
npm run start:dev

# Produzione
npm run start:prod
```

## Architettura RAG

Il progetto è organizzato in servizi specializzati per mantenere il codice pulito e manutenibile:

- **PdfIngestionService**: Parsing e chunking dei file PDF
- **VectorStoreService**: Gestione dell'indice FAISS e embeddings
- **DocumentRetrievalService**: Ricerca semantica e filtraggio dei documenti
- **RagService**: Orchestrazione del flusso RAG completo

## Endpoint API

### Ingestione PDF

```
POST /rag/ingest
Content-Type: multipart/form-data
Body: files[] (array di file PDF)
```

### Query (solo retrieval)

```
POST /rag/query
Content-Type: application/json
Body: { "question": "Tua domanda..." }
```

### Generazione (RAG completo)

```
POST /rag/generate
Content-Type: application/json
Body: { "question": "Tua domanda..." }
```

## Deployment

Check out the [NestJS deployment documentation](https://docs.nestjs.com/deployment) per più informazioni.

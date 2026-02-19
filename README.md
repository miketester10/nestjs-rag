# NestJS RAG (Retrieval-Augmented Generation)

Un progetto NestJS che implementa un sistema di **Retrieval-Augmented Generation (RAG)** per generare risposte intelligenti basate su documenti indicizzati.  
***N.B. Questa versione usa [llama.cpp](https://github.com/ggml-org/llama.cpp) per sfruttare GPU AMD con Vulkan***


## Installazione

```bash
npm install
```

## Variabili d'Ambiente

Configura le seguenti variabili nel file `.env`:

```
LLM_API_KEY=
LLM_MODEL=gemini-3-flash-preview

# llama.cpp settings per sfruttare GPU AMD con Vulkan
# Avviare il server con:
# llama-server -hf Qwen/Qwen3-Embedding-4B-GGUF:Q8_0 --embeddings --pooling mean -c 8192 -b 8192 -ngl 999 --no-mmap -fa on --no-webui --port 8080
OLLAMA_BASE_URL=http://localhost:8080/v1
EMBEDDING_MODEL=Qwen/Qwen3-Embedding-4B-GGUF:Q8_0

SIMILARITY_THRESHOLD=0.45

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

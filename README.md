<div align="center">

# 🚀 GitGPT — AI Code Intelligence & Repository RAG Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Qdrant](https://img.shields.io/badge/Qdrant-Cloud-red.svg)](https://qdrant.tech/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-API-4285F4.svg)](https://ai.google.dev/)

**GitGPT** is a production-ready, full-stack **Retrieval-Augmented Generation (RAG)** platform engineered to ingest, index, and query public GitHub repositories in natural language. Powered by **Google Gemini**, **Qdrant Vector Database**, **BullMQ**, and **Next.js 15**, GitGPT allows developers to chat with any codebase, trace architectural flows, and receive grounded answers with exact source file citations.

[Features](#-features) • [Tech Stack](#%EF%B8%8F-tech-stack) • [Architecture](#-system-architecture--data-flow) • [API Docs](#-api-reference) • [Getting Started](#-getting-started)

</div>

---

## ✨ Key Features & Technical Highlights

* **⚡ Asynchronous Ingestion Pipeline**: Ingests public GitHub repositories asynchronously off the HTTP thread using **BullMQ** job queues and **Upstash Redis**. Handles large repositories without blocking user interactions.
* **🧠 Context-Aware Code Chunking**: Recursively parses codebase structures while filtering binary assets, lockfiles, and `node_modules`. Generates semantic text chunks preserving scope, function context, and file paths.
* **🔍 High-Dimensional Vector Search**: Generates dense code embeddings via **Google Gemini (`text-embedding-004`)** and indexes them into **Qdrant Cloud** collections for sub-second semantic retrieval.
* **🤖 Grounded RAG Chat Engine**: Synthesizes responses using **Google Gemini 1.5 Pro/Flash**, augmenting prompts with top-$K$ vector matches to eliminate hallucinations and provide line-by-line source file citations.
* **📡 Real-Time Progress Streaming**: Emits live WebSocket events via **Socket.io** during repository cloning, file scanning, AST chunking, vector embedding, and database sync.
* **🔐 OAuth & JWT Authentication**: Features full user session management supporting GitHub and Google OAuth providers powered by **Supabase Auth** / **JWT middleware**.
* **🎨 Modern UI/UX Architecture**: Crafted with Next.js 15 App Router, React 19, TypeScript, and Tailwind CSS. Includes dynamic live terminal progress, code syntax highlighting, copy-to-clipboard blocks, and an interactive repo file tree explorer.

---

## 🛠️ Tech Stack

### **Frontend**
* **Framework**: Next.js 15 (App Router), React 19, TypeScript
* **Styling**: Tailwind CSS v4, Lucide React
* **State Management**: Zustand
* **Live Updates**: Socket.io Client
* **Markdown**: `react-markdown`, `remark-gfm`

### **Backend**
* **Runtime & API**: Node.js, Express, TypeScript
* **Database & ORM**: PostgreSQL (Neon Serverless), Prisma ORM
* **Vector Database**: Qdrant Cloud
* **Task Queue & Cache**: BullMQ, Upstash Redis
* **AI Model**: Google Gemini API (`@google/genai`)

---

## 🏗️ System Architecture & Data Flow

### 1. Ingestion Pipeline & Background Processing
```mermaid
graph TD
    A[User Submits Repository URL] --> B[Express API Gateway]
    B --> C[Push Job to BullMQ Queue]
    C --> D[Upstash Redis Task Store]
    D --> E[Background Ingestion Worker]
    E --> F[Socket.io Real-Time Progress Events]
    E --> G[Git Clone & Directory Filter]
    G --> H[Recursive Code AST Chunker]
    H --> I[Gemini Embedding API text-embedding-004]
    I --> J[Qdrant Cloud Vector Database]
    E --> K[Persist Repo Metadata to PostgreSQL]
```

### 2. RAG Query & Code Intelligence Workflow
```mermaid
graph LR
    User[Developer Prompt] --> API[Express Chat Controller]
    API --> Embed[Generate Query Vector via Gemini]
    Embed --> Qdrant[Qdrant Similarity Search top-k]
    Qdrant --> Context[Assemble Relevant Code Snippets & Metadata]
    Context --> LLM[Google Gemini 1.5 LLM]
    LLM --> Response[Grounded Response + File Citations]
    Response --> UI[Next.js Interactive Chat Interface]
```

---

## 📁 Repository Architecture

```text
github-rag/
├── backend/
│   ├── prisma/              # Prisma schema & database migrations
│   └── src/
│       ├── config/          # Qdrant, Gemini, and DB configuration
│       ├── controllers/     # Auth, Repo, and Chat API controllers
│       ├── middleware/      # JWT Authentication middleware
│       ├── routes/          # Express route definitions
│       ├── services/        # Code processor, chunker, & vector service
│       ├── store/           # Active socket/state memory store
│       └── workers/         # BullMQ background repository worker
├── frontend/
│   └── src/
│       ├── app/             # Next.js App Router pages & layouts
│       ├── components/      # Dashboard, Import, Stepper, & Chat UI components
│       ├── store/           # Zustand global state slices (auth & app)
│       └── utils/           # Axios API client interceptor
└── docker-compose.yml       # Docker environment configuration
```

---

## 📡 API Reference & WebSockets

### REST API Endpoints

#### 🔐 Authentication Routes
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/register` | Register new user account | ❌ |
| `POST` | `/api/auth/login` | Authenticate user and receive JWT session token | ❌ |
| `GET` | `/api/auth/me` | Retrieve active user profile details | 🔒 |

#### 📦 Repository Management
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/repositories/ingest` | Trigger async ingestion of GitHub repository | 🔒 |
| `GET` | `/api/repositories` | List all indexed repositories for current user | 🔒 |
| `GET` | `/api/repositories/:id` | Fetch detailed repository status & file structure | 🔒 |
| `DELETE` | `/api/repositories/:id` | Purge repository vectors from Qdrant & database | 🔒 |

#### 💬 AI Code Chat & Q&A
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/chat/query` | Submit prompt & retrieve grounded AI answer + citations | 🔒 |
| `GET` | `/api/chat/history/:repoId` | Retrieve chat message history for repository | 🔒 |

### ⚡ WebSocket Real-Time Event Protocol (`Socket.io`)

| Event Name | Direction | Payload Schema | Description |
| :--- | :--- | :--- | :--- |
| `join:repo` | Client ➔ Server | `{ repoId: string }` | Subscribe to live ingestion updates |
| `ingestion:progress` | Server ➔ Client | `{ step: string, progress: number, details: string }` | Live progress bar and terminal status update |
| `ingestion:error` | Server ➔ Client | `{ error: string }` | Emitted when repo cloning, chunking, or indexing fails |
| `ingestion:complete` | Server ➔ Client | `{ repoId: string, totalChunks: number }` | Processing pipeline finished successfully |

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: v18+ 
* **PostgreSQL**: Neon PostgreSQL or local instance
* **Redis**: Upstash Redis or local Redis server
* **Qdrant**: Qdrant Cloud instance
* **Gemini API**: Google Gemini API Key

---

### 1. Environment Configuration Dictionary

| Variable Key | Required | Description | Sample / Default Value |
| :--- | :---: | :--- | :--- |
| `PORT` | Yes | Backend API server port | `5000` |
| `DATABASE_URL` | Yes | PostgreSQL connection string (Neon or Local) | `postgresql://user:pass@host/db` |
| `JWT_SECRET` | Yes | Secret key for signing session JWT tokens | `super_secret_jwt_key` |
| `GEMINI_API_KEY` | Yes | Google AI Studio Gemini API Key | `AIzaSy...` |
| `QDRANT_URL` | Yes | Qdrant vector database URL | `https://cluster.qdrant.io` or `http://localhost:6333` |
| `QDRANT_API_KEY` | Optional | Qdrant Cloud API key (omit for local Docker) | `your_qdrant_api_key` |
| `REDIS_URL` | Yes | Upstash or Local Redis connection URI | `redis://localhost:6379` |
| `FRONTEND_URL` | Yes | Client origin for CORS authorization | `http://localhost:3000` |
| `NEXT_PUBLIC_API_URL` | Yes | Frontend REST API base endpoint | `http://localhost:5000/api` |
| `NEXT_PUBLIC_BACKEND_URL` | Yes | Frontend Socket.io server connection endpoint | `http://localhost:5000` |

#### Environment Files

##### Backend (`backend/.env`)
```env
PORT=5000
DATABASE_URL="postgresql://user:password@ep-host.region.aws.neon.tech/neondb?sslmode=require"
JWT_SECRET="your_jwt_secret_key"
GEMINI_API_KEY="your_google_gemini_api_key"
QDRANT_URL="https://your-cluster-id.cloud.qdrant.io"
QDRANT_API_KEY="your_qdrant_api_key"
REDIS_URL="rediss://default:password@your-redis-host.upstash.io:6379"
FRONTEND_URL="http://localhost:3000"
```

##### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL="http://localhost:5000/api"
NEXT_PUBLIC_BACKEND_URL="http://localhost:5000"
```

---

### 2. Local Infrastructure with Docker Compose

Spin up local Qdrant Vector Database and Redis queue instances instantly:

```bash
# Start Qdrant (6333) and Redis (6379) in detached mode
docker-compose up -d
```

---

### 3. Backend & Database Setup

```bash
cd backend

# Install dependencies
npm install

# Run Prisma migrations & push schema to PostgreSQL
npx prisma db push

# Launch Express backend & BullMQ worker in dev mode
npm run dev
```

---

### 4. Frontend Application Setup

```bash
cd frontend

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```

Open `http://localhost:3000` in your browser to start querying codebases with **GitGPT**.

---

## 🔧 Troubleshooting & Operational Guide

| Issue / Symptom | Possible Cause | Resolution |
| :--- | :--- | :--- |
| `QdrantConnectionError` | Qdrant container offline or invalid Cloud API Key | Verify `QDRANT_URL` in `backend/.env` or run `docker-compose up -d` for local setup. |
| `Redis ECONNREFUSED` | BullMQ worker cannot connect to Redis instance | Verify `REDIS_URL`. Ensure Upstash URI starts with `rediss://` or local container is active. |
| `PrismaClientInitializationError` | Database connection failure | Verify Neon PostgreSQL URL in `DATABASE_URL` and ensure IP allows inbound traffic. |
| `429 Rate Limit Exceeded` | Gemini API quota exhausted during chunk embedding | Implement batching or verify API key plan in Google AI Studio dashboard. |
| WebSocket connection timeout | CORS mismatch between client and server | Ensure `FRONTEND_URL` in `backend/.env` matches `http://localhost:3000`. |

---

## 🛡️ License

Distributed under the MIT License. See `LICENSE` for more information.

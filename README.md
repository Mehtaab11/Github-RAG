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

## 🚀 Getting Started

### Prerequisites
* **Node.js**: v18+ 
* **PostgreSQL**: Neon PostgreSQL or local instance
* **Redis**: Upstash Redis or local Redis server
* **Qdrant**: Qdrant Cloud instance
* **Gemini API**: Google Gemini API Key

---

### 1. Environment Configuration

#### Backend (`backend/.env`)
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

#### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL="http://localhost:5000/api"
NEXT_PUBLIC_BACKEND_URL="http://localhost:5000"
```

---

### 2. Backend Setup

```bash
cd backend
npm install
npx prisma db push
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` in your browser to start using **GitGPT**.

---

## 🛡️ License

Distributed under the MIT License. See `LICENSE` for more information.

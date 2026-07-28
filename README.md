# 🚀 GitGPT — AI Code Intelligence & Repository RAG Platform

**GitGPT** is a production-ready, full-stack **Retrieval-Augmented Generation (RAG)** platform engineered to ingest, index, and query public GitHub repositories in natural language. Powered by **Google Gemini**, **Qdrant Vector Database**, **BullMQ**, and **Next.js 15**, GitGPT allows developers to chat with any codebase, trace architectural flows, and receive grounded answers with exact source file citations.

---

## ✨ Features

* **⚡ Asynchronous Ingestion Pipeline**: Ingests public GitHub repositories asynchronously off the main web thread using **BullMQ** and **Redis**.
* **🧠 Context-Aware Code Chunking**: Recursively parses codebase AST structures, filtering binaries, lockfiles, and non-essential directories to construct high-quality text chunks.
* **🔍 High-Dimensional Vector Retrieval**: Stores code embeddings in **Qdrant Cloud** for sub-second semantic code search.
* **🤖 Grounded AI Conversations**: Queries **Google Gemini API** with top-$K$ vector matches to provide precise answers accompanied by clickable source file references.
* **📡 Real-Time WebSockets**: Live progress tracking of repository cloning, file scanning, chunking, and embedding stages via Socket.io.
* **🎨 Modern UI/UX**: Designed with Next.js 15, TypeScript, and Tailwind CSS, featuring an interactive dark mode layout, live processing terminal, code syntax highlighting, copy-to-clipboard actions, and a built-in file tree explorer.

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

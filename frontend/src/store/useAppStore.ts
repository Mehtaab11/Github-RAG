import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  sources?: string[];
}

interface Repository {
  id: string;
  name: string;
  githubUrl: string;
  status: 'PENDING' | 'CLONING' | 'PROCESSING' | 'READY' | 'FAILED';
}

interface AppState {
  // Socket Connection
  socket: Socket | null;
  initSocket: () => void;

  // Repository & Ingestion States
  repositories: Repository[];
  activeRepoId: string | null;
  ingestionProgress: { status: string; progress: number; error?: string } | null;
  setRepositories: (repos: Repository[]) => void;
  setActiveRepoId: (id: string | null) => void;
  setIngestionProgress: (progress: AppState['ingestionProgress']) => void;

  // Chat/RAG States
  activeConversationId: string | null;
  messages: Message[];
  isChatLoading: boolean;
  setActiveConversationId: (id: string | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setChatLoading: (loading: boolean) => void;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ||
  (process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api$/, '') : 'http://localhost:5000');

export const useAppStore = create<AppState>((set, get) => ({
  socket: null,
  repositories: [],
  activeRepoId: null,
  ingestionProgress: null,
  activeConversationId: null,
  messages: [],
  isChatLoading: false,

  // Initialize Socket.io client and wire up listening channels
  initSocket: () => {
    if (get().socket) return; // Prevent duplicate initializations

    const socketInstance = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('🔌 Connected to live backend WebSocket wrapper.');
      const activeRepoId = get().activeRepoId;
      if (activeRepoId) {
        socketInstance.emit('join-repo-room', activeRepoId);
      }
    });

    // Listen for live ingestion progress updates pushed by the BullMQ background worker
    socketInstance.on('ingestion-progress', (data) => {
      set({ ingestionProgress: data });
      
      // Automatically update the repository status in our local state list if it changes
      if (data.status) {
        set((state) => ({
          repositories: state.repositories.map((repo) =>
            repo.id === get().activeRepoId ? { ...repo, status: data.status } : repo
          ),
        }));
      }
    });

    set({ socket: socketInstance });
  },

  setRepositories: (repos) => set({ repositories: repos }),
  
  setActiveRepoId: (id) => {
    set({ activeRepoId: id, ingestionProgress: null });
    // Tell the backend socket server to put us in a specific channel room for this repo
    const { socket } = get();
    if (socket && id) {
      socket.emit('join-repo-room', id);
    }
  },

  setIngestionProgress: (progress) => set({ ingestionProgress: progress }),
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setChatLoading: (loading) => set({ isChatLoading: loading }),
}));
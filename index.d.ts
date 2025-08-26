import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  status?: 'online' | 'away' | 'busy' | 'offline';
  connectedAt: number;
  lastSeen: number;
}

export interface Message {
  id: string;
  user: User;
  text: string;
  meta?: any;
  replyTo?: string;
  room?: string;
  ts: number;
  readBy: string[];
}

export interface PrivateMessage {
  id: string;
  from: User;
  to: string;
  text: string;
  meta?: any;
  ts: number;
  type: 'private';
}

export interface Room {
  name: string;
  id: string;
  createdBy: string;
  isPrivate: boolean;
  createdAt: number;
  members: string[];
}

export interface TypingData {
  userId: string;
  userName: string;
  room?: string;
  ts?: number;
}

export interface ReadReceipt {
  messageId: string;
  userId: string;
  userName: string;
  room?: string;
  ts: number;
}

export interface ChatServerOptions {
  redisUrl?: string;
  cors?: object;
  namespace?: string;
  onAuth?: (socket: Socket, next: (err?: Error) => void) => void;
  onConnect?: (socket: Socket, io: SocketIOServer) => void;
  onDisconnect?: (socket: Socket, io: SocketIOServer) => void;
  enableTyping?: boolean;
  enableReadReceipts?: boolean;
  typingTimeout?: number;
  enableRestApi?: boolean;
  restApiPrefix?: string;
  restApiAuth?: boolean;
  restApiCors?: {
    origin?: string;
    methods?: string[];
    headers?: string[];
  };
  expressApp?: any; // Express app instance
}

export interface ChatServerUtils {
  getActiveUsers: () => User[];
  getUser: (socketId: string) => User | undefined;
  sendToRoom: (room: string, event: string, data: any) => void;
  sendToUser: (userId: string, event: string, data: any) => void;
  broadcast: (event: string, data: any) => void;
  getRooms: () => Map<string, Set<string>>;
  getUsersInRoom: (room: string) => string[];
}

export interface RestApiRoutes {
  prefix: string;
  enabled: boolean;
}

export interface ChatServerResult {
  io: SocketIOServer;
  pubClient: any;
  subClient: any;
  utils: ChatServerUtils;
  restApiRoutes: RestApiRoutes | null;
}

export declare function createChatServer(
  httpServer: HttpServer,
  opts?: ChatServerOptions
): Promise<ChatServerResult>;

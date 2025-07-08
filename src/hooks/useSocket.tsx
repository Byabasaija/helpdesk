import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import type { JSX, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

// TypeScript interfaces for room-based chat
interface Message {
  message_id: string;
  room_id: string;
  content: string;
  content_type: string;
  sender_user_id: string;
  sender_display_name: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_mime_type?: string;
  reply_to_id?: string;
  is_edited: boolean;
  is_deleted?: boolean;
  created_at: string;
  edited_at?: string;
}

interface Room {
  room_id: string;
  name: string;
  description?: string;
  room_type: string;
  member_count: number;
  last_message_at?: string;
}

interface OnlineUser {
  user_id: string;
  display_name?: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  messages: Message[];
  rooms: Room[];
  onlineUsers: OnlineUser[];
  currentRoom: string | null;
  sendMessage: (data: {
    room_id: string;
    content: string;
    content_type?: string;
    file_url?: string;
    file_name?: string;
    file_size?: number;
    file_mime_type?: string;
    reply_to_id?: string;
  }) => void;
  joinRoom: (room_id: string) => void;
  leaveRoom: (room_id: string) => void;
  getMessages: (room_id: string, limit?: number, offset?: number) => void;
  getRooms: () => void;
  getOnlineUsers: () => void;
  authenticate: (userId: string, displayName: string) => Promise<string>;
  connect: (apiKey: string, userId: string, displayName?: string) => void;
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

const restUrl = import.meta.env.VITE_REST_API_URL || 'http://localhost:8000/api/v1';
const wsUrl = import.meta.env.VITE_WS_API_URL || 'ws://localhost:8000';

export function SocketProvider({ children }: SocketProviderProps): JSX.Element {

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Authentication function to get API key
  const authenticate = useCallback(async (userId: string, displayName: string): Promise<string> => {
    const masterKey = import.meta.env.VITE_MASTER_API_KEY;
    if (!masterKey) {
      throw new Error('Master API key not found in environment variables');
    }

    const response = await fetch(`${restUrl}/auth/user-login`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${masterKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        display_name: displayName,
        permissions: ['read_messages', 'send_messages'],
      }),
    });

    if (!response.ok) {
      throw new Error('Authentication failed');
    }

    const data = await response.json();
    localStorage.setItem('userApiKey', data.api_key);
    return data.api_key;
  }, []);

  const connect = (apiKey: string, userId: string, displayName?: string): void => {
    if (socket?.connected || isConnecting) {
      return;
    }

    setIsConnecting(true);

    const newSocket = io(`${wsUrl}`, {
      auth: {
        user_id: userId,
        api_key: apiKey,
        display_name: displayName || userId,
      },
      path: '/sockets',
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setIsConnected(true);
      setIsConnecting(false);
      toast.success('Connected to chat server');
      
      // Clear any existing reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    });

    newSocket.on('connected', (data: { user_id: string; client_id: string; display_name: string }) => {
      console.log('Connection confirmed:', data);
      // Auto-join user's rooms and get initial data
      setTimeout(() => {
        newSocket.emit('get_rooms');
      }, 100);
    });

    newSocket.on('disconnect', (reason: string) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      toast.error('Disconnected from chat server');
      
      // Auto-reconnect after a delay
      if (reason !== 'io client disconnect') {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          toast.info('Attempting to reconnect...');
          newSocket.connect();
        }, 3000);
      }
    });

    newSocket.on('connect_error', (error: Error) => {
      console.error('Connection error:', error);
      setIsConnecting(false);
      setIsConnected(false);
      toast.error('Failed to connect to chat server');
    });

    // Room events
    newSocket.on('rooms', (data: { rooms: Room[] }) => {
      console.log('Rooms received:', data);
      setRooms(data.rooms || []);
    });

    newSocket.on('room_joined', (data: { room_id: string }) => {
      console.log('Joined room:', data);
      setCurrentRoom(data.room_id);
      // Get messages for the joined room
      newSocket.emit('get_messages', { room_id: data.room_id, limit: 50, offset: 0 });
    });

    // Message events
    newSocket.on('messages', (data: { room_id: string; messages: Message[]; limit: number; offset: number }) => {
      console.log('Messages received for room:', data.room_id, data);
      setMessages(data.messages || []);
    });

    // Real-time individual message listener
    newSocket.on('message', (data: Message) => {
      console.log('Individual message received:', data);
      setMessages(prev => {
        const updatedMessages = [...prev, data].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        return updatedMessages;
      });
    });

    // User presence events
    newSocket.on('online_users', (data: { users: string[] }) => {
      console.log('Online users:', data);
      const users = data.users?.map(userId => ({ user_id: userId })) || [];
      setOnlineUsers(users);
    });

    newSocket.on('user_online', (data: { user_id: string; client_id: string }) => {
      console.log('User came online:', data);
      setOnlineUsers(prev => {
        const exists = prev.find(u => u.user_id === data.user_id);
        if (!exists) {
          return [...prev, { user_id: data.user_id }];
        }
        return prev;
      });
    });

    newSocket.on('user_offline', (data: { user_id: string; client_id: string }) => {
      console.log('User went offline:', data);
      setOnlineUsers(prev => prev.filter(u => u.user_id !== data.user_id));
    });

    // Error handling
    newSocket.on('error', (error: { message: string }) => {
      console.error('Socket error:', error);
      toast.error(error.message || 'Socket error occurred');
    });

    // Ping/Pong for keepalive
    newSocket.on('pong', () => {
      console.log('Pong received');
    });

    setSocket(newSocket);
  };

  const disconnect = (): void => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setIsConnecting(false);
      setMessages([]);
      setRooms([]);
      setOnlineUsers([]);
    }
  };

  const sendMessage = useCallback((data: {
    room_id: string;
    content: string;
    content_type?: string;
    file_url?: string;
    file_name?: string;
    file_size?: number;
    file_mime_type?: string;
    reply_to_id?: string;
  }): void => {
    if (!socket?.connected) {
      toast.error('Not connected to chat server');
      return;
    }

    socket.emit('send_message', data);
  }, [socket]);

  const joinRoom = useCallback((room_id: string): void => {
    if (!socket?.connected) {
      toast.error('Not connected to chat server');
      return;
    }

    socket.emit('join_room', { room_id });
  }, [socket]);

  const leaveRoom = useCallback((room_id: string): void => {
    if (!socket?.connected) {
      toast.error('Not connected to chat server');
      return;
    }

    socket.emit('leave_room', { room_id });
  }, [socket]);

  const getMessages = useCallback((room_id: string, limit: number = 50, offset: number = 0): void => {
    if (!socket?.connected) {
      toast.error('Not connected to chat server');
      return;
    }

    socket.emit('get_messages', { room_id, limit, offset });
  }, [socket]);

  const getRooms = useCallback((): void => {
    if (!socket?.connected) {
      toast.error('Not connected to chat server');
      return;
    }

    socket.emit('get_rooms');
  }, [socket]);

  const getOnlineUsers = useCallback((): void => {
    if (!socket?.connected) {
      toast.error('Not connected to chat server');
      return;
    }

    socket.emit('online_users');
  }, [socket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [socket]);

  // Ping interval for keepalive
  useEffect(() => {
    if (!socket?.connected) return;

    const pingInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('ping');
      }
    }, 30000); // Ping every 30 seconds

    return () => clearInterval(pingInterval);
  }, [socket]);

  const value: SocketContextType = {
    socket,
    isConnected,
    isConnecting,
    messages,
    rooms,
    onlineUsers,
    currentRoom,
    sendMessage,
    joinRoom,
    leaveRoom,
    getMessages,
    getRooms,
    getOnlineUsers,
    authenticate,
    connect,
    disconnect,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextType {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
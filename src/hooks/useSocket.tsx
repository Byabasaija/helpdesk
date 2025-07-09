import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import type { JSX, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

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
    reply_to_id?: string;
  }) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  getMessages: (roomId: string) => void;
  getRooms: () => void;
  disconnect: () => void;
}

interface SocketProviderProps {
  children: ReactNode;
}

const restUrl = import.meta.env.VITE_REST_API_URL || 'http://localhost:8000/api/v1';
const wsUrl = import.meta.env.VITE_WS_API_URL || 'ws://localhost:8000';

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: SocketProviderProps): JSX.Element {
  const { user } = useAuth(); // Get user from auth context

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [hasAttemptedAuth, setHasAttemptedAuth] = useState<boolean>(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connectWithApiKey = useCallback((apiKey: string, userId: string, displayName?: string): void => {
    if (socket?.connected || !apiKey) {
      return;
    }

    console.log('Connecting to socket with user:', userId);

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

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      setIsConnecting(false);
      toast.error('Disconnected from chat server');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnecting(false);
      toast.error('Failed to connect to chat server');
    });

    // Chat events
    newSocket.on('rooms', (data) => {
      console.log('Received rooms:', data);
      setRooms(data.rooms || []);
    });

    newSocket.on('room_joined', (data) => {
      console.log('Joined room:', data);
      setCurrentRoom(data.room_id);
      toast.success(`Joined room: ${data.room_id}`);
    });

    newSocket.on('messages', (data) => {
      console.log('Received messages:', data);
      setMessages(data.messages || []);
    });

    newSocket.on('message', (data) => {
      console.log('Received new message:', data);
      setMessages(prev => [...prev, data]);
    });

    newSocket.on('user_online', (data) => {
      console.log('User came online:', data);
      setOnlineUsers(prev => {
        const exists = prev.find(u => u.user_id === data.user_id);
        if (!exists) {
          return [...prev, data];
        }
        return prev;
      });
    });

    newSocket.on('user_offline', (data) => {
      console.log('User went offline:', data);
      setOnlineUsers(prev => prev.filter(u => u.user_id !== data.user_id));
    });

    newSocket.on('online_users', (data) => {
      console.log('Received online users:', data);
      setOnlineUsers(data.users || []);
    });

    setSocket(newSocket);
  }, [socket]);

  // Centralized auto-authentication when user is available
  useEffect(() => {
    const autoAuthenticate = async () => {
      if (!user || hasAttemptedAuth || isConnecting || isConnected) return;

      setHasAttemptedAuth(true);
      setIsConnecting(true);

      try {
        // Check if we have a stored API key first
        let apiKey = localStorage.getItem('userApiKey');
        
        if (!apiKey) {
          // Get new API key using master key
          const masterKey = import.meta.env.VITE_MASTER_API_KEY;
          if (!masterKey) {
            throw new Error('Master API key not found in environment variables');
          }

          console.log('Authenticating user:', user.id || user.email);
          const response = await fetch(`${restUrl}/auth/user-login`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${masterKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: user.id || user.email,
              display_name: user.email || user.id,
              permissions: ['read_messages', 'send_messages'],
            }),
          });

          if (!response.ok) {
            throw new Error('Authentication failed');
          }

          const data = await response.json();
          apiKey = data.api_key;
          if (apiKey) {
            localStorage.setItem('userApiKey', apiKey);
            console.log('Authentication successful, got scoped API key');
          } else {
            throw new Error('No API key received');
          }
        } else {
          console.log('Using stored API key');
        }

        // Auto-connect after authentication
        if (apiKey && (user.id || user.email)) {
          connectWithApiKey(apiKey, user.id || user.email || '', user.email || user.id || '');
        }
        
      } catch (error) {
        console.error('Auto-authentication failed:', error);
        setIsConnecting(false);
        setHasAttemptedAuth(false); // Allow retry
        toast.error('Failed to authenticate');
      }
    };

    autoAuthenticate();
  }, [user, hasAttemptedAuth, isConnecting, isConnected, connectWithApiKey]);

  const disconnect = useCallback((): void => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setIsConnecting(false);
      setHasAttemptedAuth(false); // Allow re-authentication
      // Clear stored API key to force re-authentication
      localStorage.removeItem('userApiKey');
    }
  }, [socket]);

  const sendMessage = useCallback((data: {
    room_id: string;
    content: string;
    content_type?: string;
    reply_to_id?: string;
  }): void => {
    if (!socket || !socket.connected) {
      toast.error('Not connected to chat server');
      return;
    }

    socket.emit('send_message', {
      room_id: data.room_id,
      content: data.content,
      content_type: data.content_type || 'text',
      reply_to_id: data.reply_to_id,
    });
  }, [socket]);

  const joinRoom = useCallback((roomId: string): void => {
    if (!socket || !socket.connected) {
      toast.error('Not connected to chat server');
      return;
    }

    socket.emit('join_room', { room_id: roomId });
  }, [socket]);

  const leaveRoom = useCallback((roomId: string): void => {
    if (!socket || !socket.connected) {
      toast.error('Not connected to chat server');
      return;
    }

    socket.emit('leave_room', { room_id: roomId });
  }, [socket]);

  const getMessages = useCallback((roomId: string): void => {
    if (!socket || !socket.connected) {
      toast.error('Not connected to chat server');
      return;
    }

    socket.emit('get_messages', { room_id: roomId });
  }, [socket]);

  const getRooms = useCallback((): void => {
    if (!socket || !socket.connected) {
      toast.error('Not connected to chat server');
      return;
    }

    socket.emit('get_rooms');
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

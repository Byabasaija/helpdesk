import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import type { JSX, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

// TypeScript interfaces
interface Message {
  message_id: string;
  content: string;
  encrypted_payload?: string;
  content_type: string;
  sender_id: string;
  recipient_id: string;
  sender_name: string;
  recipient_name: string;
  timestamp: string;
  delivered: boolean;
}

interface Conversation {
  id: string;
  user_id: string;
  user_name: string;
  last_message?: string;
  last_message_timestamp?: string;
  unread_count?: number;
}

interface OnlineUser {
  user_id: string;
  user_name?: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  messages: Message[];
  conversations: Conversation[];
  onlineUsers: OnlineUser[];
  sendMessage: (data: {
    recipient_id: string;
    recipient_name: string;
    sender_name: string;
    content: string;
    content_type?: string;
    encrypted_payload?: string;
  }) => void;
  getMessages: (recipient_id: string, limit?: number, showError?: boolean) => void;
  getConversations: (showError?: boolean) => void;
  getOnlineUsers: (showError?: boolean) => void;
  checkUserStatus: (user_id: string) => void;
  connect: (apiKey: string) => void;
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps): JSX.Element {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = (apiKey: string): void => {
    if (socket?.connected || isConnecting || !user) {
      return;
    }

    setIsConnecting(true);

    const newSocket = io('ws://localhost:8000', {
      auth: {
        user_id: user.id,
        api_key: apiKey,
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

    newSocket.on('connected', (data: { user_id: string; client_id: string }) => {
      console.log('Connection confirmed:', data);
    });

    newSocket.on('disconnect', (reason: string) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      toast.error('Disconnected from chat server');
    });

    newSocket.on('connect_error', (error: Error) => {
      console.error('Connection error:', error);
      setIsConnecting(false);
      setIsConnected(false);
      toast.error('Failed to connect to chat server');
    });

    // Message events
    newSocket.on('message_sent', (message: Message) => {
      console.log('Message sent:', message);
      setMessages(prev => [message, ...prev]);
    });

    newSocket.on('new_message', (message: Message) => {
      console.log('New message received:', message);
      setMessages(prev => [message, ...prev]);
      toast.success(`New message from ${message.sender_name}`);
    });

    newSocket.on('messages', (data: { user_id: string; recipient_id: string; messages: Message[] }) => {
      console.log('Messages received:', data);
      setMessages(data.messages || []);
    });

    // Conversation events
    newSocket.on('conversations', (data: { conversations: Conversation[] }) => {
      console.log('Conversations received:', data);
      setConversations(data.conversations || []);
    });

    // User presence events
    newSocket.on('online_users', (data: { users: OnlineUser[] }) => {
      console.log('Online users:', data);
      setOnlineUsers(data.users || []);
    });

    newSocket.on('user_status', (data: { user_id: string; online: boolean }) => {
      console.log('User status:', data);
    });

    newSocket.on('user_online', (data: { user_id: string; user_name?: string }) => {
      console.log('User came online:', data);
      setOnlineUsers(prev => {
        const exists = prev.find(u => u.user_id === data.user_id);
        if (!exists) {
          return [...prev, data];
        }
        return prev;
      });
    });

    newSocket.on('user_offline', (data: { user_id: string }) => {
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
      setConversations([]);
      setOnlineUsers([]);
    }
  };

  const sendMessage = useCallback((data: {
    recipient_id: string;
    recipient_name: string;
    sender_name: string;
    content: string;
    content_type?: string;
    encrypted_payload?: string;
  }): void => {
    if (!socket?.connected) {
      toast.error('Not connected to chat server');
      return;
    }

    socket.emit('send_message', {
      ...data,
      content_type: data.content_type || 'text',
    });
  }, [socket]);

  const getMessages = useCallback((recipient_id: string, limit: number = 50, showError: boolean = true): void => {
    if (!socket?.connected) {
      if (showError) {
        toast.error('Not connected to chat server');
      }
      return;
    }

    socket.emit('get_messages', { recipient_id, limit });
  }, [socket]);

  const getConversations = useCallback((showError: boolean = false): void => {
    if (!socket?.connected) {
      if (showError) {
        toast.error('Not connected to chat server');
      }
      return;
    }

    socket.emit('get_conversations');
  }, [socket]);

  const getOnlineUsers = useCallback((showError: boolean = false): void => {
    if (!socket?.connected) {
      if (showError) {
        toast.error('Not connected to chat server');
      }
      return;
    }

    socket.emit('get_online_users');
  }, [socket]);

  const checkUserStatus = useCallback((user_id: string): void => {
    if (!socket?.connected) {
      toast.error('Not connected to chat server');
      return;
    }

    socket.emit('check_user_status', { user_id });
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
    conversations,
    onlineUsers,
    sendMessage,
    getMessages,
    getConversations,
    getOnlineUsers,
    checkUserStatus,
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
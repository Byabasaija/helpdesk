import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useSocket } from "@/hooks/useSocket";
import { useAuth } from "@/hooks/useAuth";
import { MessageCircle, Send, Clock, User, Users } from "lucide-react";

interface Message {
  message_id: string;
  room_id: string;
  content: string;
  content_type: string;
  sender_user_id: string;
  sender_display_name: string;
  created_at: string;
  is_edited: boolean;
  is_deleted?: boolean;
}

interface Room {
  room_id: string;
  name: string;
  description?: string;
  room_type: string;
  member_count: number;
  last_message_at?: string;
}

export function ConversationsPage() {
  const { user } = useAuth();
  const {
    isConnected,
    messages,
    rooms,
    onlineUsers,
    currentRoom,
    sendMessage,
    joinRoom,
    getMessages,
    getRooms,
    authenticate,
    connect,
  } = useSocket();

  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [roomMessages, setRoomMessages] = useState<Message[]>([]);
  const hasInitiallyFetched = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [roomMessages]);

  // Authentication and connection
  useEffect(() => {
    const handleAuth = async () => {
      if (!user || isConnected) return;
      
      try {
        const apiKey = await authenticate(user.id, user.email || user.id);
        connect(apiKey, user.id, user.email || user.id);
      } catch (error) {
        console.error('Authentication failed:', error);
      }
    };

    handleAuth();
  }, [user, isConnected, authenticate, connect]);

  // Get rooms when connected
  useEffect(() => {
    if (isConnected && !hasInitiallyFetched.current) {
      hasInitiallyFetched.current = true;
      
      setTimeout(() => {
        getRooms();
      }, 100);
    }
  }, [isConnected, getRooms]);

  // Get messages when room is selected
  useEffect(() => {
    if (selectedRoom) {
      joinRoom(selectedRoom);
      getMessages(selectedRoom, 50, 0);
    }
  }, [selectedRoom, joinRoom, getMessages]);

  // Filter messages for selected room
  useEffect(() => {
    if (selectedRoom) {
      const filteredMessages = messages
        .filter((msg) => msg.room_id === selectedRoom)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      setRoomMessages(filteredMessages);
    }
  }, [messages, selectedRoom]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedRoom) return;

    sendMessage({
      room_id: selectedRoom,
      content: messageInput,
      content_type: 'text',
    });

    setMessageInput("");
  };

  const formatTime = (createdAt: string) => {
    return new Date(createdAt).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (createdAt: string) => {
    const date = new Date(createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString();
    }
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Connecting to Chat Service
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Please wait while we connect to the chat service...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4">
      {/* Rooms List */}
      <Card className="w-80 flex flex-col h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Rooms
            <Badge variant="secondary" className="ml-auto">
              {rooms.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            {rooms.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No rooms available</p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {rooms
                  .sort((a, b) => {
                    // Sort by last message time, most recent first
                    const aTime = a.last_message_at || '0';
                    const bTime = b.last_message_at || '0';
                    return new Date(bTime).getTime() - new Date(aTime).getTime();
                  })
                  .map((room) => (
                  <div
                    key={room.room_id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                      selectedRoom === room.room_id
                        ? "bg-accent border border-border"
                        : ""
                    }`}
                    onClick={() => setSelectedRoom(room.room_id)}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <h3 className="font-medium text-sm truncate">{room.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {room.member_count}
                          </Badge>
                        </div>
                      </div>
                      {room.last_message_at && (
                        <span className="text-xs text-muted-foreground">
                          {formatTime(room.last_message_at)}
                        </span>
                      )}
                    </div>
                    {room.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {room.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col h-full">
        {selectedRoom ? (
          <>
            {/* Chat Header */}
            <CardHeader className="pb-3 flex-shrink-0">
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                {rooms.find(r => r.room_id === selectedRoom)?.name || "Unknown Room"}
                <Badge variant="outline" className="ml-auto">
                  {roomMessages.length} messages
                </Badge>
              </CardTitle>
            </CardHeader>

            {/* Messages Area - Scrollable */}
            <div className="flex-1 overflow-hidden relative">
              <ScrollArea className="h-full">
                <CardContent className="space-y-4">
                  {roomMessages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    roomMessages.map((message, index) => {
                      const isFromCurrentUser = message.sender_user_id === user?.id;
                      const showDate = index === 0 || 
                        formatDate(message.created_at) !== formatDate(roomMessages[index - 1].created_at);

                      return (
                        <div key={message.message_id} className="space-y-2">
                          {showDate && (
                            <div className="text-center">
                              <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded">
                                {formatDate(message.created_at)}
                              </span>
                            </div>
                          )}
                          <div className={`flex ${isFromCurrentUser ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[80%] ${isFromCurrentUser ? "order-2" : "order-1"}`}>
                              <div className={`rounded-lg p-3 ${
                                isFromCurrentUser
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}>
                                {!isFromCurrentUser && (
                                  <div className="flex items-center gap-2 mb-1">
                                    <User className="h-3 w-3" />
                                    <span className="text-xs font-medium">
                                      {message.sender_display_name}
                                    </span>
                                  </div>
                                )}
                                <p className="text-sm">{message.content}</p>
                                <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${
                                  isFromCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"
                                }`}>
                                  <span>{formatTime(message.created_at)}</span>
                                  {!isFromCurrentUser && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  {/* Invisible element to scroll to */}
                  <div ref={messagesEndRef} />
                </CardContent>
              </ScrollArea>
            </div>

            {/* Message Input - Fixed at bottom */}
            <Separator className="flex-shrink-0" />
            <CardContent className="p-4 flex-shrink-0">
              <div className="flex gap-2">
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type your message..."
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} disabled={!messageInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Select a room</h3>
              <p>Choose a room from the list to start chatting</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

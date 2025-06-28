import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useSocket } from "@/hooks/useSocket";
import { useAuth } from "@/hooks/useAuth";
import { MessageCircle, Send, Clock, User } from "lucide-react";

interface Message {
  message_id: string;
  content: string;
  sender_id: string;
  recipient_id: string;
  sender_name: string;
  recipient_name: string;
  group_id?: string;
  encrypted_payload?: string;
  content_type: string;
  created_at: string;
  delivered: boolean;
  delivered_at?: string;
}



export function ConversationsPage() {
  const { user } = useAuth();
  const {
    isConnected,
    messages,
    conversations,
    onlineUsers,
    sendMessage,
    getMessages,
    getConversations,
    connect,
  } = useSocket();

  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);
  const hasInitiallyFetched = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversationMessages]);

  useEffect(() => {
    // Auto-connect with API key from environment
    const apiKey = import.meta.env.VITE_API_KEY;
    if (apiKey && !isConnected) {
      connect(apiKey);
    }
  }, [isConnected, connect]);

  useEffect(() => {
    if (isConnected && !hasInitiallyFetched.current) {
      hasInitiallyFetched.current = true;
      
      // Add a small delay to ensure connection is fully established
      setTimeout(() => {
        getConversations(false); // false = don't show error toast for automatic calls
      }, 100);
    }
  }, [isConnected, getConversations]);

  // Auto-refresh conversations periodically and when messages change
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      getConversations(false); // false = don't show error toast for automatic calls
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [isConnected, getConversations]);

  // Refresh conversations when messages array changes (new messages arrived)
  useEffect(() => {
    if (isConnected && messages.length > 0) {
      // Debounce conversation updates to avoid too many calls
      const timeout = setTimeout(() => {
        getConversations(false);
      }, 500);
      
      return () => clearTimeout(timeout);
    }
  }, [messages.length, isConnected, getConversations]);

  useEffect(() => {
    if (selectedConversation) {
      getMessages(selectedConversation, 50, false); // false = don't show error toast for automatic calls
    }
  }, [selectedConversation, getMessages]);

  useEffect(() => {
    // Filter and sort messages for the selected conversation
    if (selectedConversation) {
      const filteredMessages = messages
        .filter((msg) =>
          (msg.sender_id === selectedConversation && msg.recipient_id === user?.id) || 
          (msg.recipient_id === selectedConversation && msg.sender_id === user?.id)
        )
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); // Oldest to newest
      setConversationMessages(filteredMessages);
    }
  }, [messages, selectedConversation, user?.id]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation) return;

    const selectedConv = conversations.find(c => c.partner_id === selectedConversation);
    if (!selectedConv) return;

    sendMessage({
      recipient_id: selectedConversation,
      recipient_name: selectedConv.partner_name,
      sender_name: user?.email || "Pascal",
      content: messageInput,
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
      {/* Conversations List */}
      <Card className="w-80 flex flex-col h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Conversations
            <Badge variant="secondary" className="ml-auto">
              {conversations.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No conversations yet</p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {conversations
                  .sort((a, b) => {
                    // Sort by last message created_at, most recent first
                    const aTime = a.last_message?.created_at || '0';
                    const bTime = b.last_message?.created_at || '0';
                    return new Date(bTime).getTime() - new Date(aTime).getTime();
                  })
                  .map((conversation) => (
                  <div
                    key={conversation.partner_id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                      selectedConversation === conversation.partner_id
                        ? "bg-accent border border-border"
                        : ""
                    }`}
                    onClick={() => setSelectedConversation(conversation.partner_id)}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          onlineUsers.some(user => user.user_id === conversation.partner_id)
                            ? 'bg-green-500'
                            : 'bg-gray-300'
                        }`} />
                        <span className="font-medium text-sm">
                          {conversation.partner_name}
                        </span>
                      </div>
                      {conversation.unread_count && conversation.unread_count > 0 && (
                        <Badge variant="default" className="text-xs">
                          {conversation.unread_count}
                        </Badge>
                      )}
                    </div>
                    {conversation.last_message && (
                      <p className="text-xs text-muted-foreground truncate">
                        {conversation.last_message.content}
                      </p>
                    )}
                    {conversation.last_message && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTime(conversation.last_message.created_at)}
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
        {selectedConversation ? (
          <>
            <CardHeader className="pb-3 flex-shrink-0">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {conversations.find(c => c.partner_id === selectedConversation)?.partner_name || "Unknown User"}
              </CardTitle>
            </CardHeader>
            <Separator className="flex-shrink-0" />
            
            {/* Messages - Independent Scrolling */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full p-4" id="messages-scroll-area">
                {conversationMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No messages in this conversation</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {conversationMessages.map((message, index) => {
                      const isFromCustomer = message.sender_id === selectedConversation;
                      const showDate = index === 0 || 
                        formatDate(message.created_at) !== formatDate(conversationMessages[index - 1].created_at);
                      
                      return (
                        <div key={message.message_id}>
                          {showDate && (
                            <div className="flex items-center gap-2 my-6">
                              <Separator className="flex-1" />
                              <span className="text-xs text-muted-foreground px-3 py-1 bg-background rounded-full border">
                                {formatDate(message.created_at)}
                              </span>
                              <Separator className="flex-1" />
                            </div>
                          )}
                          <div className={`flex ${isFromCustomer ? "justify-start" : "justify-end"} mb-1`}>
                            <div
                              className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${
                                isFromCustomer
                                  ? "bg-muted rounded-bl-md"
                                  : "bg-primary text-primary-foreground rounded-br-md"
                              }`}
                            >
                              <p className="text-sm break-words">{message.content}</p>
                              <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${
                                isFromCustomer ? "text-muted-foreground" : "text-primary-foreground/70"
                              }`}>
                                <span>{formatTime(message.created_at)}</span>
                                {!isFromCustomer && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {message.delivered && (
                                      <span className="text-xs">✓</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {/* Invisible element to scroll to */}
                    <div ref={messagesEndRef} />
                  </div>
                )}
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
          <CardContent className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
              <p>Choose a conversation from the list to start chatting</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

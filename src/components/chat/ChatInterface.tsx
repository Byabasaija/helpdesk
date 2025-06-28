import { useState, type JSX } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';

export function ChatInterface(): JSX.Element {
  const { user } = useAuth();
  const { 
    isConnected, 
    isConnecting, 
    connect, 
    disconnect, 
    messages, 
    conversations,
    onlineUsers,
    sendMessage,
    getMessages,
    getConversations,
    getOnlineUsers
  } = useSocket();
  
  const [apiKey, setApiKey] = useState<string>('');
  const [recipientId, setRecipientId] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  const [messageContent, setMessageContent] = useState<string>('');

  const handleConnect = (): void => {
    if (!apiKey.trim()) {
      return;
    }
    connect(apiKey);
  };

  const handleSendMessage = (): void => {
    if (!messageContent.trim() || !recipientId.trim() || !recipientName.trim()) {
      return;
    }

    sendMessage({
      recipient_id: recipientId,
      recipient_name: recipientName,
      sender_name: user?.email || 'Unknown',
      content: messageContent,
    });

    setMessageContent('');
  };

  const handleGetMessages = (): void => {
    if (!recipientId.trim()) {
      return;
    }
    getMessages(recipientId);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Connection Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Socket.IO Connection</CardTitle>
          <CardDescription>
            Connect to the chat API server
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? "Connected" : isConnecting ? "Connecting..." : "Disconnected"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              User: {user?.email}
            </span>
          </div>

          {!isConnected && (
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
                disabled={isConnecting}
              />
              <Button 
                onClick={handleConnect} 
                disabled={isConnecting || !apiKey.trim()}
                className="w-full"
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </Button>
            </div>
          )}

          {isConnected && (
            <div className="space-y-2">
              <Button onClick={disconnect} variant="outline" className="w-full">
                Disconnect
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => getConversations(true)} variant="secondary" size="sm">
                  Get Conversations
                </Button>
                <Button onClick={() => getOnlineUsers(true)} variant="secondary" size="sm">
                  Get Online Users
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chat Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Send Message</CardTitle>
          <CardDescription>
            Send a message to another user
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipientId">Recipient ID</Label>
            <Input
              id="recipientId"
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              placeholder="Enter recipient user ID"
              disabled={!isConnected}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipientName">Recipient Name</Label>
            <Input
              id="recipientName"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Enter recipient name"
              disabled={!isConnected}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="messageContent">Message</Label>
            <Input
              id="messageContent"
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="Type your message..."
              disabled={!isConnected}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button 
              onClick={handleSendMessage}
              disabled={!isConnected || !messageContent.trim() || !recipientId.trim()}
            >
              Send Message
            </Button>
            <Button 
              onClick={handleGetMessages}
              variant="outline"
              disabled={!isConnected || !recipientId.trim()}
            >
              Get Messages
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Messages Display */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Messages ({messages.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No messages yet</p>
            ) : (
              messages
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                .map((message) => (
                <div
                  key={message.message_id}
                  className="p-3 rounded-lg border bg-muted/50"
                >
                  <div className="flex justify-between items-start text-sm">
                    <span className="font-medium">{message.sender_name}</span>
                    <span className="text-muted-foreground">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="mt-1">{message.content}</p>
                  <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                    <span>To: {message.recipient_name}</span>
                    <Badge variant={message.delivered ? "default" : "secondary"} className="text-xs">
                      {message.delivered ? "Delivered" : "Pending"}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Online Users */}
      <Card>
        <CardHeader>
          <CardTitle>Online Users ({onlineUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {onlineUsers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No online users</p>
            ) : (
              onlineUsers.map((user) => (
                <div key={user.user_id} className="flex items-center gap-2 p-2 rounded border">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>{user.user_name || user.user_id}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Conversations */}
      <Card>
        <CardHeader>
          <CardTitle>Conversations ({conversations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {conversations.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No conversations yet</p>
            ) : (
              conversations.map((conv) => (
                <div 
                  key={conv.partner_id} 
                  className="p-2 rounded border cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    setRecipientId(conv.partner_id);
                    setRecipientName(conv.partner_name);
                  }}
                >
                  <div className="font-medium">{conv.partner_name}</div>
                  {conv.last_message && (
                    <div className="text-sm text-muted-foreground truncate">
                      {conv.last_message.content}
                    </div>
                  )}
                  {conv.unread_count && conv.unread_count > 0 && (
                    <Badge variant="default" className="text-xs">
                      {conv.unread_count}
                    </Badge>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
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
    disconnect, 
    messages, 
    rooms,
    onlineUsers,
    sendMessage,
    getMessages,
    getRooms,
    joinRoom
  } = useSocket();
  
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [messageContent, setMessageContent] = useState<string>('');

  const handleSendMessage = (): void => {
    if (!messageContent.trim() || !selectedRoom.trim()) {
      return;
    }

    sendMessage({
      room_id: selectedRoom,
      content: messageContent,
    });

    setMessageContent('');
  };

  const handleGetMessages = (): void => {
    if (!selectedRoom.trim()) {
      return;
    }
    getMessages(selectedRoom);
  };

  const handleJoinRoom = (): void => {
    if (!selectedRoom.trim()) {
      return;
    }
    joinRoom(selectedRoom);
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

          {isConnected && (
            <div className="space-y-2">
              <Button onClick={disconnect} variant="outline" className="w-full">
                Disconnect
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => getRooms()} variant="secondary" size="sm">
                  Get Rooms
                </Button>
                <Button onClick={() => handleJoinRoom()} variant="secondary" size="sm" disabled={!selectedRoom}>
                  Join Room
                </Button>
              </div>
            </div>
          )}

          {!isConnected && !isConnecting && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                Authentication in progress...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chat Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Send Message</CardTitle>
          <CardDescription>
            Send a message to a room
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="selectedRoom">Room ID</Label>
            <Input
              id="selectedRoom"
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              placeholder="Enter room ID (e.g., 'general', 'support')"
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
              disabled={!isConnected || !messageContent.trim() || !selectedRoom.trim()}
            >
              Send Message
            </Button>
            <Button 
              onClick={handleGetMessages}
              variant="outline"
              disabled={!isConnected || !selectedRoom.trim()}
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
                    <span className="font-medium">{message.sender_display_name}</span>
                    <span className="text-muted-foreground">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="mt-1">{message.content}</p>
                  <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                    <span>Room: {message.room_id}</span>
                    {message.is_edited && (
                      <Badge variant="secondary" className="text-xs">
                        Edited
                      </Badge>
                    )}
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
                  <span>{user.display_name || user.user_id}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rooms */}
      <Card>
        <CardHeader>
          <CardTitle>Rooms ({rooms.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {rooms.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No rooms yet</p>
            ) : (
              rooms.map((room) => (
                <div 
                  key={room.room_id} 
                  className="p-2 rounded border cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    setSelectedRoom(room.room_id);
                  }}
                >
                  <div className="font-medium">{room.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {room.member_count} members • {room.room_type}
                  </div>
                  {room.description && (
                    <div className="text-xs text-muted-foreground truncate">
                      {room.description}
                    </div>
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
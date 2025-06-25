import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  MessageSquare,
  Settings,
  BarChart3,
  Code,
  Headphones,
  UserCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

const navigationItems = [
  {
    title: "Conversations",
    icon: MessageSquare,
    id: "conversations",
    description: "Manage customer conversations",
  },
  {
    title: "Online Users",
    icon: UserCheck,
    id: "online-users",
    description: "View currently online users",
  },
  {
    title: "Widget Generator",
    icon: Code,
    id: "widget-generator",
    description: "Generate chat widgets",
  },
  {
    title: "Analytics",
    icon: BarChart3,
    id: "analytics",
    description: "View chat analytics",
  },
  {
    title: "Settings",
    icon: Settings,
    id: "settings",
    description: "Application settings",
  },
];

export function DashboardLayout({ children, currentPage, onPageChange }: DashboardLayoutProps) {
  const { user, signOut } = useAuth();

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarHeader className="border-b border-sidebar-border">
            <div className="flex items-center gap-2 px-4 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Headphones className="h-4 w-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Customer Support</span>
                <span className="truncate text-xs text-muted-foreground">Dashboard</span>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => onPageChange(item.id)}
                        isActive={currentPage === item.id}
                        tooltip={item.description}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-auto">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {user?.email?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-xs font-medium truncate">
                          {user?.email}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Support Agent
                        </span>
                      </div>
                    </div>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <Button
                      onClick={signOut}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8"
                    >
                      Sign Out
                    </Button>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="flex h-14 items-center gap-4 border-b bg-background px-6">
            <SidebarTrigger />
            <div className="flex-1">
              <h1 className="text-lg font-semibold">
                {navigationItems.find(item => item.id === currentPage)?.title || "Dashboard"}
              </h1>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

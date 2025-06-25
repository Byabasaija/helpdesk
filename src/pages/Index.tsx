import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ConversationsPage } from "./ConversationsPage";
import { OnlineUsersPage } from "./OnlineUsersPage";
import { WidgetGeneratorPage } from "./WidgetGeneratorPage";
import { AnalyticsPage } from "./AnalyticsPage";

const Index = () => {
  const [currentPage, setCurrentPage] = useState("conversations");

  const renderPage = () => {
    switch (currentPage) {
      case "conversations":
        return <ConversationsPage />;
      case "online-users":
        return <OnlineUsersPage />;
      case "widget-generator":
        return <WidgetGeneratorPage />;
      case "analytics":
        return <AnalyticsPage />;
      case "settings":
        return (
          <div className="text-center text-muted-foreground py-12">
            Settings page coming soon...
          </div>
        );
      default:
        return <ConversationsPage />;
    }
  };

  return (
    <DashboardLayout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </DashboardLayout>
  );
};

export default Index;

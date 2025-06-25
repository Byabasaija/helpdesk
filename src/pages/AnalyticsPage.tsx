import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export function AnalyticsPage() {
  // Placeholder for future analytics
  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics
          </CardTitle>
          <CardDescription>
            View chat and support analytics. (Coming soon)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-12">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Analytics Coming Soon</h3>
            <p>You'll be able to see chat volume, response times, and more.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

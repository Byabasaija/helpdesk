import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, Code2 } from "lucide-react";
import { toast } from "sonner";

export function WidgetGeneratorPage() {
  const [widgetKey] = useState(import.meta.env.VITE_API_KEY || "");
  const [copied, setCopied] = useState(false);

  // Example widget code (to be improved later)
  const widgetCode = `<script src="https://yourdomain.com/widget.js" data-api-key="${widgetKey}"></script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(widgetCode);
    setCopied(true);
    toast.success("Widget code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Widget Generator
          </CardTitle>
          <CardDescription>
            Generate a chat widget to embed in your website or app. Copy and paste the code below into your site. All messages will appear in your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1">Widget Code</label>
            <div className="flex items-center gap-2">
              <Input
                value={widgetCode}
                readOnly
                className="font-mono text-xs bg-muted"
              />
              <Button onClick={handleCopy} size="sm" variant="outline">
                <Copy className="h-4 w-4" />
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            <strong>Note:</strong> The widget will connect to your helpdesk using the API key from your environment. You can customize the widget later.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

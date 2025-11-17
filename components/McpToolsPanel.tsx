'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import BuildIcon from '@mui/icons-material/Build';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

interface McpTool {
  name: string;
  description?: string;
  inputSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}

interface ServerInfo {
  name: string;
  version: string;
}

interface McpToolsResponse {
  success: boolean;
  server?: ServerInfo;
  tools?: McpTool[];
  error?: string;
  message?: string;
}

export function McpToolsPanel() {
  const [mounted, setMounted] = useState(false);
  const [tools, setTools] = useState<McpTool[]>([]);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchTools = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mcp/tools');
      const data: McpToolsResponse = await response.json();

      if (data.success && data.tools) {
        setTools(data.tools);
        setServerInfo(data.server || null);
      } else {
        setError(data.message || 'Failed to fetch tools');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const callTool = async (toolName: string) => {
    // For demo, just show alert
    // In real app, you'd show a form to input parameters
    alert(`Tool "${toolName}" selected. In production, this would show a form to input parameters.`);
  };

  if (!mounted) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BuildIcon className="text-blue-500" />
            <div>
              <h3 className="text-lg font-semibold">MCP Tools</h3>
              {serverInfo && (
                <p className="text-xs text-muted-foreground">
                  {serverInfo.name} v{serverInfo.version}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTools}
              disabled={loading}
            >
              {loading ? 'Loading...' : tools.length > 0 ? 'Refresh' : 'Load Tools'}
            </Button>
            {tools.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {expanded && tools.length > 0 && (
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {tools.map((tool) => (
              <div
                key={tool.name}
                className="rounded-lg border border-border bg-card p-4 hover:border-blue-500/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-mono font-semibold text-sm mb-1">
                      {tool.name}
                    </h4>
                    {tool.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {tool.description}
                      </p>
                    )}

                    {tool.inputSchema.properties && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-1">
                          Parameters:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(tool.inputSchema.properties).map(
                            ([param, schema]: [string, any]) => {
                              const isRequired =
                                tool.inputSchema.required?.includes(param);
                              return (
                                <span
                                  key={param}
                                  className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-mono ${
                                    isRequired
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                                  }`}
                                >
                                  {param}
                                  {isRequired && (
                                    <span className="ml-1 text-red-500">*</span>
                                  )}
                                </span>
                              );
                            }
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => callTool(tool.name)}
                    className="shrink-0"
                  >
                    <PlayArrowIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-md bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
            💡 <strong>Tip:</strong> These tools can be called from your AI agents
            to interact with Figma files. Click the play button to test a tool.
          </div>
        </CardContent>
      )}

      {!expanded && tools.length > 0 && (
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {tools.length} tool{tools.length !== 1 ? 's' : ''} available. Click to
            expand.
          </p>
        </CardContent>
      )}

      {!loading && tools.length === 0 && !error && (
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Click "Load Tools" to connect to Figma MCP server
          </p>
        </CardContent>
      )}

      {error && !expanded && (
        <CardContent>
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

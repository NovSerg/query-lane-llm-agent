'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import CloudIcon from '@mui/icons-material/Cloud';
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

interface WeatherCallResponse {
  success: boolean;
  tool: string;
  result: {
    content: Array<{
      type: string;
      text: string;
    }>;
  };
  error?: string;
  message?: string;
}

export function WeatherToolsPanel() {
  const [mounted, setMounted] = useState(false);
  const [tools, setTools] = useState<McpTool[]>([]);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchTools = async () => {
    setLoading(true);
    setError(null);
    setTestResult(null);

    try {
      const response = await fetch('/api/mcp/weather/tools');
      const data: McpToolsResponse = await response.json();

      if (data.success && data.tools) {
        setTools(data.tools);
        setServerInfo(data.server || null);
        setExpanded(true); // Auto-expand when tools loaded
      } else {
        setError(data.message || 'Failed to fetch weather tools');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testWeatherTool = async () => {
    setTestResult(null);
    setError(null);

    try {
      const response = await fetch('/api/mcp/weather/call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'get_current_weather',
          arguments: {
            city: 'Moscow',
            units: 'metric',
            lang: 'ru',
          },
        }),
      });

      const data: WeatherCallResponse = await response.json();

      if (data.success && data.result.content?.[0]) {
        setTestResult(data.result.content[0].text);
      } else {
        setError(data.message || 'Failed to get weather data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudIcon className="text-blue-500" />
            <div>
              <h3 className="text-lg font-semibold">Weather Tools</h3>
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
                    onClick={testWeatherTool}
                    className="shrink-0"
                    title="Test with Moscow weather"
                  >
                    <PlayArrowIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {testResult && (
            <div className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400">
              <p className="font-semibold mb-2">Test Result (Moscow):</p>
              <pre className="text-xs overflow-auto">{testResult}</pre>
            </div>
          )}

          <div className="mt-4 rounded-md bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
            💡 <strong>Tip:</strong> These tools can be called from your AI agents
            to get real-time weather information. Click the play button to test with Moscow.
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
            Click "Load Tools" to connect to Weather MCP server
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

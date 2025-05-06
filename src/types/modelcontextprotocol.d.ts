declare module '@modelcontextprotocol/sdk' {
  export class McpServer {
    constructor(config: {
      name: string;
      version: string;
      description: string;
    });
    
    tool(
      name: string,
      params: Record<string, any>,
      handler: (params: any) => Promise<{
        content: Array<{
          type: string;
          text: string;
        }>;
      }>
    ): void;
    
    connect(transport: any): Promise<void>;
  }
}

declare module '@modelcontextprotocol/sdk/transports' {
  export class StdioServerTransport {
    constructor();
  }
} 
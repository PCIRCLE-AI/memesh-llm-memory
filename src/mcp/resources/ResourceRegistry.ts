// src/mcp/resources/ResourceRegistry.ts
import { URITemplateHandler, URITemplateParams } from './URITemplateHandler.js';
import { NotFoundError } from '../../errors/index.js';

export interface ResourceContent {
  uri: string;
  mimeType: string;
  text: string;
}

export type ResourceHandler = (params: URITemplateParams) => Promise<ResourceContent>;

export interface ResourceTemplate {
  uriTemplate: string;
  name: string;
  description: string;
  mimeType: string;
}

export class ResourceRegistry {
  private handlers = new Map<string, ResourceHandler>();
  private templates: ResourceTemplate[] = [];
  private templateHandler = new URITemplateHandler();

  /**
   * Register a resource handler
   *
   * @param uriTemplate - URI template (e.g., 'ccb://agent/{agentType}/status')
   * @param handler - Handler function that returns resource content
   */
  register(uriTemplate: string, handler: ResourceHandler): void {
    this.handlers.set(uriTemplate, handler);
  }

  /**
   * Register a resource template for listing
   *
   * @param template - Resource template metadata
   */
  registerTemplate(template: ResourceTemplate): void {
    this.templates.push(template);
  }

  /**
   * Get all registered templates
   *
   * @returns Array of resource templates
   */
  getTemplates(): ResourceTemplate[] {
    return [...this.templates];
  }

  /**
   * Handle resource read request
   *
   * @param uri - Resource URI
   * @returns Resource content
   * @throws NotFoundError if no handler found
   */
  async handle(uri: string): Promise<ResourceContent> {
    // Find matching template
    for (const [template, handler] of this.handlers.entries()) {
      const params = this.templateHandler.parseTemplate(template, uri);
      if (params) {
        return await handler(params);
      }
    }

    throw new NotFoundError(
      `No handler found for URI: ${uri}`,
      'resource',
      uri,
      { availableTemplates: Array.from(this.handlers.keys()) }
    );
  }
}

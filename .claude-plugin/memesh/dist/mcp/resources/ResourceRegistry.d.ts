import { URITemplateParams } from './URITemplateHandler.js';
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
export declare class ResourceRegistry {
    private handlers;
    private templates;
    private templateHandler;
    register(uriTemplate: string, handler: ResourceHandler): void;
    registerTemplate(template: ResourceTemplate): void;
    getTemplates(): ResourceTemplate[];
    handle(uri: string): Promise<ResourceContent>;
}
//# sourceMappingURL=ResourceRegistry.d.ts.map
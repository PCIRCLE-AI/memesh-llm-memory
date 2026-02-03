import { URITemplateHandler } from './URITemplateHandler.js';
import { NotFoundError } from '../../errors/index.js';
export class ResourceRegistry {
    handlers = new Map();
    templates = [];
    templateHandler = new URITemplateHandler();
    register(uriTemplate, handler) {
        this.handlers.set(uriTemplate, handler);
    }
    registerTemplate(template) {
        this.templates.push(template);
    }
    getTemplates() {
        return [...this.templates];
    }
    async handle(uri) {
        for (const [template, handler] of this.handlers.entries()) {
            const params = this.templateHandler.parseTemplate(template, uri);
            if (params) {
                return await handler(params);
            }
        }
        throw new NotFoundError(`No handler found for URI: ${uri}`, 'resource', uri, { availableTemplates: Array.from(this.handlers.keys()) });
    }
}
//# sourceMappingURL=ResourceRegistry.js.map
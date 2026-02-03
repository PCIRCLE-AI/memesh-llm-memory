export class URITemplateHandler {
    parseTemplate(template, uri) {
        if (!template || !uri || typeof template !== 'string' || typeof uri !== 'string') {
            return null;
        }
        try {
            const escapedTemplate = template
                .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                .replace(/\\{([^}]+)\\}/g, '{$1}');
            const pattern = escapedTemplate
                .replace(/\{([^}]+)\}/g, '(?<$1>[^/]+)')
                .replace(/\\\//g, '/')
                .replace(/\//g, '\\/');
            const regex = new RegExp(`^${pattern}$`);
            const match = uri.match(regex);
            if (!match) {
                return null;
            }
            return match.groups || {};
        }
        catch (error) {
            return null;
        }
    }
    matches(template, uri) {
        return this.parseTemplate(template, uri) !== null;
    }
}
//# sourceMappingURL=URITemplateHandler.js.map
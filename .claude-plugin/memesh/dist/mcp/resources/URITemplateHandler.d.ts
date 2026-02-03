export interface URITemplateParams {
    [key: string]: string;
}
export declare class URITemplateHandler {
    parseTemplate(template: string, uri: string): URITemplateParams | null;
    matches(template: string, uri: string): boolean;
}
//# sourceMappingURL=URITemplateHandler.d.ts.map
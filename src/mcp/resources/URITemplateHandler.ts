/**
 * URI Template Handler
 *
 * Parses MCP URI templates and extracts parameters.
 * Supports RFC 6570 style URI templates (simplified implementation).
 */

export interface URITemplateParams {
  [key: string]: string;
}

export class URITemplateHandler {
  /**
   * Parse URI template and extract parameters
   *
   * @param template - URI template (e.g., 'ccb://agent/{agentType}/status')
   * @param uri - Actual URI (e.g., 'ccb://agent/code-reviewer/status')
   * @returns Parsed parameters or null if no match or invalid input
   */
  parseTemplate(template: string, uri: string): URITemplateParams | null {
    // Input validation
    if (!template || !uri || typeof template !== 'string' || typeof uri !== 'string') {
      return null;
    }

    try {
      // Escape special regex characters in template before processing
      const escapedTemplate = template
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\\{([^}]+)\\}/g, '{$1}'); // Restore parameter placeholders

      // Convert template to regex pattern
      const pattern = escapedTemplate
        .replace(/\{([^}]+)\}/g, '(?<$1>[^/]+)')
        .replace(/\\\//g, '/') // Unescape forward slashes
        .replace(/\//g, '\\/'); // Re-escape forward slashes for regex

      const regex = new RegExp(`^${pattern}$`);
      const match = uri.match(regex);

      if (!match) {
        return null;
      }

      // Return empty object for static URIs (no parameters)
      return match.groups || {};
    } catch (error) {
      // Return null for any regex creation errors
      return null;
    }
  }

  /**
   * Check if URI matches template
   *
   * @param template - URI template
   * @param uri - Actual URI
   * @returns True if URI matches template
   */
  matches(template: string, uri: string): boolean {
    return this.parseTemplate(template, uri) !== null;
  }
}

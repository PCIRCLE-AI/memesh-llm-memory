import { logger } from '../utils/logger.js';
export class OpalAutomationAgent {
    mcp;
    OPAL_URL = 'https://opal.withgoogle.com/';
    constructor(mcp) {
        this.mcp = mcp;
    }
    async createWorkflow(request) {
        try {
            const { description, timeout = 60000 } = request;
            await this.mcp.playwright.navigate(this.OPAL_URL);
            await this.wait(2000);
            const snapshot = await this.mcp.playwright.snapshot();
            logger.info('Opal page loaded:', snapshot);
            try {
                await this.mcp.playwright.click({
                    element: 'Create new button',
                    ref: '[role="button"]:has-text("Create")'
                });
            }
            catch (error) {
                logger.info('Already in editor or button not found');
            }
            await this.wait(1000);
            await this.mcp.playwright.type({
                element: 'Natural language input',
                ref: '[contenteditable="true"], textarea',
                text: description,
                submit: true
            });
            await this.wait(3000);
            await this.mcp.playwright.waitFor({
                text: 'Generate',
                time: timeout / 1000
            });
            const pageUrl = await this.getCurrentUrl();
            const screenshotPath = `/tmp/opal-workflow-${Date.now()}.png`;
            await this.mcp.playwright.takeScreenshot({
                filename: screenshotPath,
                fullPage: true
            });
            await this.mcp.memory.createEntities({
                entities: [{
                        name: `Opal Workflow ${new Date().toISOString()}`,
                        entityType: 'opal_workflow',
                        observations: [
                            `Description: ${description}`,
                            `URL: ${pageUrl}`,
                            `Screenshot: ${screenshotPath}`,
                            `Created: ${new Date().toISOString()}`
                        ]
                    }]
            });
            return {
                success: true,
                workflowUrl: pageUrl,
                screenshot: screenshotPath
            };
        }
        catch (error) {
            logger.error('Opal workflow creation failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    async exportWorkflow(workflowUrl) {
        try {
            await this.mcp.playwright.navigate(workflowUrl);
            await this.wait(3000);
            const screenshotPath = `/tmp/opal-export-${Date.now()}.png`;
            await this.mcp.playwright.takeScreenshot({
                filename: screenshotPath,
                fullPage: true
            });
            try {
                const shareSnapshot = await this.mcp.playwright.snapshot();
                logger.info('Snapshot:', shareSnapshot);
            }
            catch (error) {
                logger.info('Share/Export button not found');
            }
            return {
                success: true,
                workflowUrl,
                screenshot: screenshotPath
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    async remixFromGallery(searchTerm) {
        try {
            await this.mcp.playwright.navigate(`${this.OPAL_URL}/gallery`);
            await this.wait(2000);
            await this.mcp.playwright.type({
                element: 'Search box',
                ref: 'input[type="search"], input[placeholder*="Search"]',
                text: searchTerm,
                submit: true
            });
            await this.wait(2000);
            await this.mcp.playwright.click({
                element: 'First gallery item',
                ref: '[data-testid="gallery-item"]:first-child, .gallery-item:first-child'
            });
            await this.wait(2000);
            await this.mcp.playwright.click({
                element: 'Remix button',
                ref: '[role="button"]:has-text("Remix"), button:has-text("Remix")'
            });
            await this.wait(3000);
            const workflowUrl = await this.getCurrentUrl();
            return {
                success: true,
                workflowUrl
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    async getCurrentUrl() {
        const result = await this.mcp.playwright.evaluate({
            function: '() => window.location.href'
        });
        if (typeof result === 'string') {
            return result;
        }
        return String(result);
    }
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async close() {
        await this.mcp.playwright.close();
    }
}
//# sourceMappingURL=OpalAutomationAgent.js.map
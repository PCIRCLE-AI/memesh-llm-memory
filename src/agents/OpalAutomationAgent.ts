/**
 * OpalAutomationAgent - Google Opal 瀏覽器自動化
 *
 * 使用 Playwright MCP 自動化 Google Opal 工作流創建
 * https://opal.withgoogle.com/
 */

import { MCPToolInterface } from '../core/MCPToolInterface.js';
import { logger } from '../utils/logger.js';

export interface OpalWorkflowRequest {
  description: string;  // 工作流描述（自然語言）
  timeout?: number;     // 超時時間（毫秒）
}

export interface OpalWorkflowResult {
  success: boolean;
  workflowUrl?: string;     // 生成的 Opal URL
  screenshot?: string;      // 截圖路徑
  error?: string;
}

export class OpalAutomationAgent {
  private readonly OPAL_URL = 'https://opal.withgoogle.com/';

  constructor(private mcp: MCPToolInterface) {}

  /**
   * 使用自然語言創建 Opal 工作流
   */
  async createWorkflow(request: OpalWorkflowRequest): Promise<OpalWorkflowResult> {
    try {
      const { description, timeout = 60000 } = request;

      // 1. 導航到 Opal
      await this.mcp.playwright.navigate(this.OPAL_URL);
      await this.wait(2000);

      // 2. 等待頁面載入
      const snapshot = await this.mcp.playwright.snapshot();
      logger.info('Opal page loaded:', snapshot);

      // 3. 尋找並點擊「Create new」或類似按鈕
      // 注意：實際的選擇器需要根據 Opal UI 調整
      try {
        await this.mcp.playwright.click({
          element: 'Create new button',
          ref: '[role="button"]:has-text("Create")'
        });
      } catch (error) {
        // 如果找不到按鈕，可能已經在編輯器中
        logger.info('Already in editor or button not found');
      }

      await this.wait(1000);

      // 4. 在自然語言編輯器中輸入描述
      await this.mcp.playwright.type({
        element: 'Natural language input',
        ref: '[contenteditable="true"], textarea',
        text: description,
        submit: true
      });

      await this.wait(3000); // 等待 AI 生成工作流

      // 5. 等待工作流生成完成
      await this.mcp.playwright.waitFor({
        text: 'Generate',
        time: timeout / 1000
      });

      // 6. 獲取當前 URL（Opal 工作流 URL）
      const pageUrl = await this.getCurrentUrl();

      // 7. 截圖保存
      const screenshotPath = `/tmp/opal-workflow-${Date.now()}.png`;
      await this.mcp.playwright.takeScreenshot({
        filename: screenshotPath,
        fullPage: true
      });

      // 8. 記錄到 Knowledge Graph
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

    } catch (error) {
      logger.error('Opal workflow creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 導出 Opal 工作流（截圖方式）
   */
  async exportWorkflow(workflowUrl: string): Promise<OpalWorkflowResult> {
    try {
      // 1. 導航到工作流
      await this.mcp.playwright.navigate(workflowUrl);
      await this.wait(3000);

      // 2. 全頁截圖
      const screenshotPath = `/tmp/opal-export-${Date.now()}.png`;
      await this.mcp.playwright.takeScreenshot({
        filename: screenshotPath,
        fullPage: true
      });

      // 3. 嘗試點擊「Share」或「Export」按鈕
      try {
        const shareSnapshot = await this.mcp.playwright.snapshot();
        // 根據快照查找分享/導出選項
        logger.info('Snapshot:', shareSnapshot);
      } catch (error) {
        logger.info('Share/Export button not found');
      }

      return {
        success: true,
        workflowUrl,
        screenshot: screenshotPath
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 從 Opal Gallery 複製範例
   */
  async remixFromGallery(searchTerm: string): Promise<OpalWorkflowResult> {
    try {
      // 1. 導航到 Gallery
      await this.mcp.playwright.navigate(`${this.OPAL_URL}/gallery`);
      await this.wait(2000);

      // 2. 搜尋範例
      await this.mcp.playwright.type({
        element: 'Search box',
        ref: 'input[type="search"], input[placeholder*="Search"]',
        text: searchTerm,
        submit: true
      });

      await this.wait(2000);

      // 3. 點擊第一個結果
      await this.mcp.playwright.click({
        element: 'First gallery item',
        ref: '[data-testid="gallery-item"]:first-child, .gallery-item:first-child'
      });

      await this.wait(2000);

      // 4. 點擊「Remix」按鈕
      await this.mcp.playwright.click({
        element: 'Remix button',
        ref: '[role="button"]:has-text("Remix"), button:has-text("Remix")'
      });

      await this.wait(3000);

      // 5. 獲取 remixed workflow URL
      const workflowUrl = await this.getCurrentUrl();

      return {
        success: true,
        workflowUrl
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 獲取當前頁面 URL
   */
  private async getCurrentUrl(): Promise<string> {
    const result = await this.mcp.playwright.evaluate({
      function: '() => window.location.href'
    });
    // Type guard: result should be a string from window.location.href
    if (typeof result === 'string') {
      return result;
    }
    // Fallback: convert to string if result is not string
    return String(result);
  }

  /**
   * 等待指定時間
   */
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 關閉瀏覽器
   */
  async close(): Promise<void> {
    await this.mcp.playwright.close();
  }
}

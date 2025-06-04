import * as https from 'https';
import * as path from 'path';
import pRetry from 'p-retry';
import { ComprehensiveConversation, Config } from './types';

export interface UploadResponse {
  message: string;
  filename: string;
  url: string;
}

export interface UploadResult {
  success: boolean;
  filename?: string;
  viewerUrl?: string;
  error?: string;
}

export class UploadService {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Test connection to upload API
   */
  async testConnection(): Promise<boolean> {
    try {
      const url = new URL(this.config.UPLOAD_API_URL);
      
      return new Promise((resolve) => {
        const options = {
          hostname: url.hostname,
          port: url.port || 443,
          path: url.pathname,
          method: 'OPTIONS', // Use OPTIONS to test without sending data
          timeout: 10000
        };

        const req = https.request(options, (res) => {
          // Any response (even 405 Method Not Allowed) means the endpoint is reachable
          resolve(res.statusCode < 500);
        });

        req.on('error', () => resolve(false));
        req.on('timeout', () => {
          req.destroy();
          resolve(false);
        });

        req.end();
      });
    } catch (error) {
      return false;
    }
  }

  /**
   * Upload conversation to visualizer platform
   */
  async uploadConversation(conversation: ComprehensiveConversation, filename?: string): Promise<UploadResult> {
    if (!this.config.UPLOAD_ENABLED || this.config.UPLOAD_ENABLED !== 'true') {
      return {
        success: false,
        error: 'Upload is disabled in configuration'
      };
    }

    try {
      const result = await pRetry(
        () => this._performUpload(conversation, filename),
        {
          retries: parseInt(this.config.UPLOAD_MAX_RETRIES || '3'),
          factor: 2,
          minTimeout: parseInt(this.config.UPLOAD_RETRY_DELAY || '1000'),
          onFailedAttempt: (error) => {
            console.log(`Upload attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
          }
        }
      );

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Upload failed after retries: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Upload conversation file by path
   */
  async uploadFile(filePath: string): Promise<UploadResult> {
    try {
      const fs = await import('fs');
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const conversation: ComprehensiveConversation = JSON.parse(fileContent);
      
      if (!this._validateConversation(conversation)) {
        return {
          success: false,
          error: 'Invalid conversation file structure'
        };
      }

      const filename = path.basename(filePath, '.json');
      return await this.uploadConversation(conversation, filename);
    } catch (error) {
      return {
        success: false,
        error: `Failed to read or parse file: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Generate viewer URL from filename
   */
  generateViewerUrl(filename: string): string {
    const cleanFilename = path.basename(filename);
    return `https://modelstogether.com/conversation/${cleanFilename}`;
  }

  /**
   * Perform the actual upload request
   */
  private async _performUpload(conversation: ComprehensiveConversation, filename?: string): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      try {
        const url = new URL(this.config.UPLOAD_API_URL);
        const data = JSON.stringify(conversation);
        
        const options = {
          hostname: url.hostname,
          port: url.port || 443,
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
          },
          timeout: 30000
        };

        const req = https.request(options, (res) => {
          let responseData = '';

          res.on('data', (chunk) => {
            responseData += chunk;
          });

          res.on('end', () => {
            try {
              if (res.statusCode === 200) {
                const response: UploadResponse = JSON.parse(responseData);
                const viewerUrl = this.generateViewerUrl(response.filename);
                
                resolve({
                  success: true,
                  filename: response.filename,
                  viewerUrl
                });
              } else {
                reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
              }
            } catch (parseError) {
              reject(new Error(`Failed to parse response: ${parseError}`));
            }
          });
        });

        req.on('error', (error) => {
          reject(new Error(`Request failed: ${error.message}`));
        });

        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });

        req.write(data);
        req.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Validate conversation structure
   */
  private _validateConversation(conversation: any): conversation is ComprehensiveConversation {
    return (
      conversation &&
      typeof conversation === 'object' &&
      conversation.metadata &&
      conversation.conversation &&
      conversation.models &&
      conversation.statistics &&
      Array.isArray(conversation.turns)
    );
  }
}

/**
 * Create upload service instance from config
 */
export function createUploadService(config: Config): UploadService {
  return new UploadService(config);
}

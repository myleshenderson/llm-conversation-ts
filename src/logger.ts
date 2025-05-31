import * as fs from 'fs';
import * as path from 'path';
import { LogLevel } from './types';

export class Logger {
  private logFile: string;
  private turnNumber: number;
  
  constructor(logFile: string, turnNumber: number = 0) {
    this.logFile = logFile;
    this.turnNumber = turnNumber;
    
    // Ensure log directory exists
    const logDir = path.dirname(logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }
  
  log(level: LogLevel, message: string, withTimestamps: boolean = true): void {
    let logEntry: string;
    
    if (withTimestamps) {
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
      if (this.turnNumber > 0) {
        logEntry = `[${timestamp}] [${level}] [TURN ${this.turnNumber}] ${message}\n`;
      } else {
        logEntry = `[${timestamp}] [${level}] ${message}\n`;
      }
    } else {
      if (this.turnNumber > 0) {
        logEntry = `[${level}] [TURN ${this.turnNumber}] ${message}\n`;
      } else {
        logEntry = `[${level}] ${message}\n`;
      }
    }
    
    fs.appendFileSync(this.logFile, logEntry);
    
    // Also print to console with timestamp
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const consoleMessage = this.turnNumber > 0 
      ? `[${timestamp}] [${level}] [TURN ${this.turnNumber}] ${message}`
      : `[${timestamp}] [${level}] ${message}`;
    console.log(consoleMessage);
  }
  
  setTurnNumber(turnNumber: number): void {
    this.turnNumber = turnNumber;
  }
}

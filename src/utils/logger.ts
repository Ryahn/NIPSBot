import fs from 'fs';
import path from 'path';

// Define log levels
enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log('Created logs directory at:', logsDir);
  }
} catch (error) {
  console.error('Failed to create logs directory:', error);
}

class Logger {
  private static getTimestamp(): string {
    return new Date().toISOString();
  }

  private static formatMessage(level: LogLevel, message: string, metadata?: any): string {
    const timestamp = this.getTimestamp();
    let formattedMessage = `${timestamp} [${level}]: ${message}`;
    
    if (metadata) {
      try {
        formattedMessage += ` ${JSON.stringify(metadata)}`;
      } catch (error) {
        formattedMessage += ` [Failed to stringify metadata: ${error}]`;
      }
    }
    
    return formattedMessage;
  }

  private static writeToFile(level: LogLevel, message: string, metadata?: any): void {
    try {
      const formattedMessage = this.formatMessage(level, message, metadata);
      
      // Write to combined log
      const combinedLogPath = path.join(logsDir, 'combined.log');
      fs.appendFileSync(combinedLogPath, formattedMessage + '\n');
      
      // Write to error log if level is ERROR
      if (level === LogLevel.ERROR) {
        const errorLogPath = path.join(logsDir, 'error.log');
        fs.appendFileSync(errorLogPath, formattedMessage + '\n');
      }
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  static debug(message: string, metadata?: any): void {
    try {
      const formattedMessage = this.formatMessage(LogLevel.DEBUG, message, metadata);
      console.debug(formattedMessage);
      this.writeToFile(LogLevel.DEBUG, message, metadata);
    } catch (error) {
      console.error('Logger debug error:', error);
    }
  }

  static info(message: string, metadata?: any): void {
    try {
      const formattedMessage = this.formatMessage(LogLevel.INFO, message, metadata);
      console.info(formattedMessage);
      this.writeToFile(LogLevel.INFO, message, metadata);
    } catch (error) {
      console.error('Logger info error:', error);
    }
  }

  static warn(message: string, metadata?: any): void {
    try {
      const formattedMessage = this.formatMessage(LogLevel.WARN, message, metadata);
      console.warn(formattedMessage);
      this.writeToFile(LogLevel.WARN, message, metadata);
    } catch (error) {
      console.error('Logger warn error:', error);
    }
  }

  static error(message: string, metadata?: any): void {
    try {
      const formattedMessage = this.formatMessage(LogLevel.ERROR, message, metadata);
      console.error(formattedMessage);
      this.writeToFile(LogLevel.ERROR, message, metadata);
    } catch (error) {
      console.error('Logger error:', error);
    }
  }
}

export default Logger; 
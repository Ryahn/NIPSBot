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
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

class Logger {
  private static getTimestamp(): string {
    return new Date().toISOString();
  }

  private static formatMessage(level: LogLevel, message: string, metadata?: any): string {
    const timestamp = this.getTimestamp();
    let formattedMessage = `${timestamp} [${level}]: ${message}`;
    
    if (metadata) {
      formattedMessage += ` ${JSON.stringify(metadata)}`;
    }
    
    return formattedMessage;
  }

  private static writeToFile(level: LogLevel, message: string, metadata?: any): void {
    const formattedMessage = this.formatMessage(level, message, metadata);
    
    // Write to combined log
    fs.appendFileSync(
      path.join('logs', 'combined.log'),
      formattedMessage + '\n'
    );
    
    // Write to error log if level is ERROR
    if (level === LogLevel.ERROR) {
      fs.appendFileSync(
        path.join('logs', 'error.log'),
        formattedMessage + '\n'
      );
    }
  }

  static debug(message: string, metadata?: any): void {
    const formattedMessage = this.formatMessage(LogLevel.DEBUG, message, metadata);
    console.debug(formattedMessage);
    this.writeToFile(LogLevel.DEBUG, message, metadata);
  }

  static info(message: string, metadata?: any): void {
    const formattedMessage = this.formatMessage(LogLevel.INFO, message, metadata);
    console.info(formattedMessage);
    this.writeToFile(LogLevel.INFO, message, metadata);
  }

  static warn(message: string, metadata?: any): void {
    const formattedMessage = this.formatMessage(LogLevel.WARN, message, metadata);
    console.warn(formattedMessage);
    this.writeToFile(LogLevel.WARN, message, metadata);
  }

  static error(message: string, metadata?: any): void {
    const formattedMessage = this.formatMessage(LogLevel.ERROR, message, metadata);
    console.error(formattedMessage);
    this.writeToFile(LogLevel.ERROR, message, metadata);
  }
}

export default Logger; 
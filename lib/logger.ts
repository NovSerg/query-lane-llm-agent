/**
 * Утилита для логирования ответов LLM и запросов пользователя
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

class Logger {
  private static isDevelopment = process.env.NODE_ENV === 'development';

  /**
   * Логирование отладочной информации
   */
  static debug(message: string, data?: any): void {
    if (!Logger.isDevelopment) return;
    
    Logger.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Логирование информационных сообщений
   */
  static info(message: string, data?: any): void {
    if (!Logger.isDevelopment) return;
    
    Logger.log(LogLevel.INFO, message, data);
  }

  /**
   * Логирование предупреждений
   */
  static warn(message: string, data?: any): void {
    if (!Logger.isDevelopment) return;
    
    Logger.log(LogLevel.WARN, message, data);
  }

  /**
   * Логирование ошибок
   */
  static error(message: string, data?: any): void {
    if (!Logger.isDevelopment) return;
    
    Logger.log(LogLevel.ERROR, message, data);
  }

  /**
   * Логирование ответа от LLM
   */
  static logLLMResponse(message: string, data?: any): void {
    if (!Logger.isDevelopment) return;

    Logger.log(LogLevel.INFO, '[LLM Response]', data);
  }

  /**
   * Логирование запроса пользователя
   */
  static logUserRequest(message: string, data?: any): void {
    if (!Logger.isDevelopment) return;

    Logger.log(LogLevel.INFO, '[User Request]', data);
  }

  /**
   * Логирование токена от LLM
   */
  static logLLMToken(token: string): void {
    if (!Logger.isDevelopment) return;

    Logger.log(LogLevel.DEBUG, '[LLM Token]', { token });
  }

  /**
   * Логирование ошибки от LLM
   */
  static logLLMError(error: string | Error, data?: any): void {
    if (!Logger.isDevelopment) return;

    const errorMessage = error instanceof Error ? error.message : error;
    Logger.log(LogLevel.ERROR, '[LLM Error]', { error: errorMessage, ...data });
  }

  /**
   * Логирование завершенного ответа от LLM
   */
  static logLLMComplete(content: string, format?: string): void {
    if (!Logger.isDevelopment) return;

    Logger.log(LogLevel.INFO, '[LLM Complete]', { content, format });
  }

  /**
   * Внутренний метод для логирования
   */
  private static log(level: LogLevel, message: string, data?: any): void {
    // Logging disabled
  }
}

export default Logger;
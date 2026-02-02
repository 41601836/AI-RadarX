export const logger = {
  info: (msg: string, ...args: any[]) => console.log(`[INFO] ${msg}`, ...args),
  error: (msg: string, ...args: any[]) => console.error(`[ERROR] ${msg}`, ...args),
  warn: (msg: string, ...args: any[]) => console.warn(`[WARN] ${msg}`, ...args),
  debug: (msg: string, ...args: any[]) => console.debug(`[DEBUG] ${msg}`, ...args),
  withCategory: (category: string) => ({
    info: (msg: string, ...args: any[]) => console.log(`[INFO][${category}] ${msg}`, ...args),
    error: (msg: string, ...args: any[]) => console.error(`[ERROR][${category}] ${msg}`, ...args),
    warn: (msg: string, ...args: any[]) => console.warn(`[WARN][${category}] ${msg}`, ...args),
    debug: (msg: string, ...args: any[]) => console.debug(`[DEBUG][${category}] ${msg}`, ...args),
  })
};

export type Logger = typeof logger;
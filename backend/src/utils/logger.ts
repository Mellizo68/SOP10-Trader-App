import winston from 'winston'

/**
 * Winston Logger Configuration
 * Provides structured logging for backend services
 */

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'sop10-trader-app-backend',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    // Console transport (always visible)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
          return `${timestamp} [${level}] ${message} ${metaStr}`
        })
      ),
    }),
    // Error file transport
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.json(),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined file transport
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.json(),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
})

// Add extra console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  )
}

export default logger

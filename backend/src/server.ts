import app from './app.js';
import dotenv from 'dotenv';
import logger from './utils/logger.js';
import { initSentry } from './utils/sentry.js';
import { testConnection, closePool } from './db/connection.js';

dotenv.config({ path: '.env.local' });

// Initialize Sentry for error tracking
initSentry();

const PORT = parseInt(process.env.PORT || '5000', 10);

/**
 * Startup sequence with database validation
 */
async function startServer() {
  try {
    // Test database connection before starting server
    const dbConnected = await testConnection();

    if (!dbConnected) {
      logger.warn('Database connection failed, but server will continue to start', {
        note: 'Database must be available for API endpoints to work',
      });
    }

    const server = app.listen(PORT, () => {
      logger.info('Backend server started', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        apiUrl: `http://localhost:${PORT}/api`,
        marketDataUrl: `http://localhost:${PORT}/api/market/data/:symbol`,
        databaseStatus: dbConnected ? 'connected' : 'disconnected',
      });
    });

    /**
     * Graceful shutdown with connection pool cleanup
     */
    const handleShutdown = (signal: string) => {
      logger.info(`${signal} received, starting graceful shutdown`, {
        timestamp: new Date().toISOString(),
      });

      server.close(async () => {
        // Close database connections
        await closePool();

        logger.info('Server and database connections closed', {
          timestamp: new Date().toISOString(),
        });
        process.exit(0);
      });

      // Force shutdown after 10 seconds if graceful shutdown fails
      setTimeout(() => {
        logger.error('Forced shutdown after graceful shutdown timeout', {
          timeout: '10s',
        });
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server', {
      error: (error as Error).message,
    });
    process.exit(1);
  }
}

// Start the server
startServer();

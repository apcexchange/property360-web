import { createServer } from 'http';
import app from './app';
import config from './config';
import { connectDatabase } from './config/database';
import cron from 'node-cron';
import LeaseExpirationService from './services/LeaseExpirationService';
import { initializeSocket } from './socket/socketServer';

const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDatabase();

    // Run lease expiration check on startup to catch any missed expirations
    console.log('[Startup] Checking for expired leases...');
    const startupResult = await LeaseExpirationService.checkAndExpireLeases();
    if (startupResult.expiredCount > 0) {
      console.log(`[Startup] Expired ${startupResult.expiredCount} lease(s)`);
    } else {
      console.log('[Startup] No expired leases found');
    }

    // Schedule daily lease expiration check at 1:00 AM
    cron.schedule('0 1 * * *', async () => {
      console.log('[Cron] Running daily lease expiration check...');
      const result = await LeaseExpirationService.checkAndExpireLeases();
      console.log(`[Cron] Expired ${result.expiredCount} lease(s)`);
    });

    // Create HTTP server and initialize Socket.IO
    const httpServer = createServer(app);
    initializeSocket(httpServer);

    // Start server - bind to 0.0.0.0 to accept connections from emulators/devices
    const host = '0.0.0.0';
    httpServer.listen(config.port, host, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    Property360 API                        ║
╠═══════════════════════════════════════════════════════════╣
║  Environment: ${config.nodeEnv.padEnd(42)}║
║  Port: ${config.port.toString().padEnd(50)}║
║  API: ${config.api.prefix}/${config.api.version.padEnd(43)}║
║  Socket.IO: Enabled                                      ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('Unhandled Rejection:', err.message);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  console.error('Uncaught Exception:', err.message);
  process.exit(1);
});

startServer();

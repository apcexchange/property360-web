import app from './app';
import config from './config';
import { connectDatabase } from './config/database';

const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDatabase();

    // Start server
    app.listen(config.port, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    Property360 API                        ║
╠═══════════════════════════════════════════════════════════╣
║  Environment: ${config.nodeEnv.padEnd(42)}║
║  Port: ${config.port.toString().padEnd(50)}║
║  API: ${config.api.prefix}/${config.api.version.padEnd(43)}║
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

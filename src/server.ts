import { Server } from 'http';
import mongoose from 'mongoose';
import app from './app';
import config from './app/config';
import { connectSocket } from './socket/connectSocket';
import BloodRequestServices from './module/blood_request/blood_request.services';
import DonorRegisterServices from './module/donor_register/donor_register.services';



let server: Server;
let isShuttingDown = false; 

const SHUTDOWN_TIMEOUT_MS = 10_000; 

async function gracefulShutdown(reason: string, exitCode: number) {
  
  if (isShuttingDown) {
    console.log(`⚠️ Shutdown already in progress, ignoring: ${reason}`);
    return;
  }
  isShuttingDown = true;

 

  const forceExitTimer = setTimeout(() => {
    console.error('❌ Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExitTimer.unref(); 
  try {
    
    BloodRequestServices.destroyCacheTimer();
    console.log('✅ Blood request cache timer stopped');

    DonorRegisterServices.destroyDonorCacheTimer();
    console.log('✅ Donor cache timer stopped');


    await new Promise<void>((resolve) => {
      if (!server) return resolve();
      server.close(() => resolve());

     
      server.closeAllConnections?.(); 
    });
    console.log('✅ HTTP server closed');

    
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');

   
    clearTimeout(forceExitTimer);
    console.log(`🛑 Shutdown complete (${reason})`);
    process.exit(exitCode);

  } catch (err) {
    console.error('❌ Error during shutdown:', err);
    process.exit(1);
  }
}

async function main() {
  try {
    await mongoose.connect(config.database_url as string);
    console.log('✅ Database connected successfully');

    server = app.listen(config.port, () => {
      console.log(`🚀 Server running on http://localhost:${config.port}`);
    });
    connectSocket(server);

    // ── Signal handlers ───────────────────────────────────────────────
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM', 0));
    process.on('SIGINT',  () => gracefulShutdown('SIGINT', 0));

    // ── Unexpected error handlers ─────────────────────────────────────
    process.on('unhandledRejection', (error) => {
      console.error('❌ Unhandled Rejection:', error);
      gracefulShutdown('unhandledRejection', 1);
    });

    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      gracefulShutdown('uncaughtException', 1);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

main();
console.log('🔥 Rakto Daan Server is starting...');
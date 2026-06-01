import { Server } from 'http';
import mongoose from 'mongoose';
import app from './app';
import config from './app/config';
import { connectSocket } from './socket/connectSocket';

let server: Server;

async function main() {
  try {
    
    await mongoose.connect(config.database_url as string);

    console.log('✅ Database connected successfully');

    server = app.listen(config.port, () => {
      console.log(`🚀 Server running on http://localhost:${config.port}`);
    });
     connectSocket(server);


    process.on('unhandledRejection', (error) => {
      console.log('❌ Unhandled Rejection detected:', error);

      if (server) {
        server.close(() => {
          process.exit(1);
        });
      } else {
        process.exit(1);
      }
    });

    // Uncaught Exception
    process.on('uncaughtException', (error) => {
      console.log('❌ Uncaught Exception detected:', error);

      if (server) {
        server.close(() => {
          process.exit(1);
        });
      } else {
        process.exit(1);
      }
    });

    // SIGTERM
    process.on('SIGTERM', () => {
      console.log('⚠️ SIGTERM received');

      if (server) {
        server.close(() => {
          console.log('🛑 Server closed due to SIGTERM');
          process.exit(0);
        });
      }
    });


    process.on('SIGINT', () => {
      console.log('⚠️ SIGINT received');

      if (server) {
        server.close(() => {
          console.log('🛑 Server closed due to SIGINT');
          process.exit(0);
        });
      }
    });

  } catch (error) {
    console.log('❌ Failed to start server:', error);
    process.exit(1);
  }
}

main();

console.log('🔥 Rakto Daan Server is starting...');
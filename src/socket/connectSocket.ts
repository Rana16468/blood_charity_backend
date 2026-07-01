import { Server as HTTPServer } from 'http';
import { Server as ChatServer, Socket } from 'socket.io';
import mongoose from 'mongoose';
import users from '../module/user/user.model';
import { jwtHelpers } from '../app/helper/jwtHelpers';
import config from '../app/config';
import handleEvents from './handleEvents';

let io: ChatServer;

// socketId → userId mapping
const onlineUsers = new Map<string, string>();

const connectSocket = (server: HTTPServer) => {
  if (!io) {
    io = new ChatServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true, 
      },
      pingInterval: 25000,
      pingTimeout: 20000,
      allowEIO3: true, // ওল্ড ক্লায়েন্ট সাপোর্ট বা স্ট্যাবিলিটির জন্য
    });
  }

  io.on('connection', async (socket: Socket) => {
    console.log('🔌 Socket connected:', socket.id);

    let currentUserId: string | null = null;

    try {
      const token = String(socket.handshake.query.token || '').trim();

      if (token) {
        const decoded = await jwtHelpers.verifyToken(
          token,
          config.jwt_access_secret as string
        );

        const userId = decoded?.id;

        // 💡 ফিক্স ১: প্রথমে userId ভ্যালিড কিনা চেক করুন, তারপর join করান
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
          socket.emit('error', { message: 'Invalid token userId' });
          setTimeout(() => socket.disconnect(), 1000); // একটু সময় দিয়ে ডিসকানেক্ট করুন যাতে ফ্রন্টএন্ড এররটি পায়
          return;
        }

        const currentUser = await users.findByIdAndUpdate(
          userId,
          {
            isOnline: true,
            updatedAt: new Date(),
          },
          { new: true }
        );

        if (!currentUser) {
          socket.emit('error', { message: 'User not found' });
          setTimeout(() => socket.disconnect(), 1000);
          return;
        }

        currentUserId = String(currentUser._id);

        onlineUsers.set(currentUserId, socket.id);
        
        // 💡 একবারে জয়েন করান
        socket.join(currentUserId);

        socket.emit('connected', {
          success: true,
          type: 'authenticated',
          message: 'User connected successfully',
          userId: currentUserId,
          socketId: socket.id,
        });

        socket.broadcast.emit('user-online', {
          userId: currentUserId,
        });

        handleEvents(io, socket, currentUserId, currentUser.generate_secret_key, currentUser.role);

        console.log('✅ Authenticated user connected:', currentUserId);
      } else {
        socket.emit('connected', {
          success: true,
          type: 'guest',
          message: 'Guest connected (no authentication)',
          socketId: socket.id,
          userId: null,
        });

        console.log('👤 Guest connected:', socket.id);
      }
    } catch (error) {
      console.error('❌ Socket auth error:', error);

      socket.emit('error', {
        message: 'Authentication failed',
      });

      setTimeout(() => socket.disconnect(), 1000);
      return;
    }

    // =========================
    // DISCONNECT HANDLER
    // =========================
    socket.on('disconnect', async (reason) => {
      console.log('❌ Disconnected:', socket.id, reason);

      if (!currentUserId) return;

      onlineUsers.delete(currentUserId);

      try {
        await users.findByIdAndUpdate(currentUserId, {
          isOnline: false,
          updatedAt: new Date(),
        });

        socket.broadcast.emit('user-offline', {
          userId: currentUserId,
        });
      } catch (err) {
        console.error('❌ Error updating offline status:', err);
      }
    });
  });

  return io;
};

const getSocketIO = () => {
  if (!io) throw new Error('socket.io is not initialized');
  return io;
};

export { connectSocket, getSocketIO, onlineUsers };
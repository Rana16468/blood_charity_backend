import { Server as HTTPServer } from 'http';
import { Server as ChatServer, Socket } from 'socket.io';
import mongoose from 'mongoose';
import users from '../module/user/user.model';
import { jwtHelpers } from '../app/helper/jwtHelpers';
import config from '../app/config';
import  handleEvents from './handleEvents'
let io: ChatServer;

// socketId → userId mapping
const onlineUsers = new Map<string, string>();

const connectSocket = (server: HTTPServer) => {
  if (!io) {
    io = new ChatServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      pingInterval: 25000,
      pingTimeout: 20000,
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
      
          socket.join(userId);
  

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
          socket.emit('error', { message: 'Invalid token userId' });
          socket.disconnect();
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
          socket.disconnect();
          return;
        }

        currentUserId = String(currentUser._id);

        onlineUsers.set(currentUserId, socket.id);
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
         handleEvents(io, socket, currentUserId);

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

      socket.disconnect();
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
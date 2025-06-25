import express, { Request, Response} from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { setupRoomHandlers } from './rooms'; 
import { User } from './types';
import 'dotenv/config';
import jwt from 'jsonwebtoken';



const app = express();
const httpServer = createServer(app);

export const users: Record<string, User> = {};
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const JWT_SECRET = process.env.JWT_SECRET || 'secret-key';

app.use(
    cors({
        origin: FRONTEND_URL,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        credentials: true,
    })
);


app.use(express.json());

// WebSocket server
const io = new Server(httpServer, {
    cors: {
        origin: FRONTEND_URL,
        credentials: true
    }
});

// WebSocket auth middleware
io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
        return next(new Error('No token provided'));
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as {
            userId: string;
            username: string;
        };

        const user = users[decoded.userId];

        if (!user) {
            return next(new Error('User not found'));
        }

        socket.data.user = user;
        socket.data.userId = decoded.userId; 
        return next();
    } catch (err) {
        return next(new Error('Invalid token'));
    }
});

// WebSocket connection handler
io.on("connection", (socket) => {
    console.log("New client:", socket.id, "User:", socket.data.user?.username);
    setupRoomHandlers(io, socket);
});

// Health check endpoint
app.get('/', (_req: Request, res: Response) => {
    res.send('Quiz AI Server is up!');
});

// Register user and issue JWT token
app.post('/api/user', (req: Request, res: Response): void => {
    const { username } = req.body;

    if (!username || typeof username !== 'string') {
        res.status(400).json({ error: 'Username is required' });
        return;
    }

    const userId = `user-${Date.now()}`;
    users[userId] = { username, userId, score: 0 };

    // Generate token
    const token = jwt.sign({ userId, username }, JWT_SECRET, {
        expiresIn: '1d',
    });

    res.json({ token, userId, username });
});



// Start server
const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

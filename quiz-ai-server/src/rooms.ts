import { Server, Socket } from 'socket.io';
import type { Room, User, Question } from './types';
import { generateQuestions } from './ai';
import { users } from './index';

export const rooms = new Map<string, Room>();

export function setupRoomHandlers(io: Server, socket: Socket) {
  socket.on('create-room', ({ topic }, callback) => {

    console.log('Creating room with topic:', topic);
    const roomId = Array.from({ length: 6 }, () =>
      String.fromCharCode(65 + Math.floor(Math.random() * 26))
    ).join('');
    
    const userId = socket.data.userId;

    const respond = (result: { success: boolean; message: string; roomId?: string }) => {
      if (typeof callback === 'function') {
        callback(result);
      }
    };

    // Ensure userId is not null
    if (!userId) {
      socket.emit('error', { message: 'User ID not found in cookies.' });
      respond({ success: false, message: 'User ID not found in cookies.' });
      return;
    }
    // If this user (userId) already created a room, remove that room before creating a new one
    for (const [id, room] of rooms.entries()) {
      if (room.creator === userId) {
      rooms.delete(id);
      break;
      }
    }

    // Block if roomId already exists
    if (rooms.has(roomId)) {
      socket.emit('error', { message: 'Room ID already exists.' });
      respond({ success: false, message: 'Room ID already exists.' });
      return;
    }

    // Get username from users record
    const userInfo = users[userId];
    if (!userInfo) {
      socket.emit('error', { message: 'User not found.' });
      respond({ success: false, message: 'User not found.' });
      return;
    }

    const room: Room = {
      topic,
      roomId,
      creator: userId,
      users: new Map(),
      questions: [],
      currentQuestionIndex: 0,
      lastActive: Date.now(),
      submittedUsers: new Set<string>(),
    };

    const user: User = {
      username: userInfo.username,
      userId,
      socket,
      score: 0,
    };

    room.users.set(userId, user);
    rooms.set(roomId, room);

    socket.join(roomId);
    io.to(roomId).emit('room-updated', getRoomUsers(room));
    respond({ success: true, message: 'Room created successfully', roomId });
  });

  socket.on('join-room', ({ roomId }, callback) => {
    const respond = (result: { success: boolean; message: string; roomId?: string }) => {
      if (typeof callback === 'function') {
        callback(result);
      }
    };

    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('error', { message: 'Room not found.' });
      respond({ success: false, message: 'Room not found.' });
      return;
    }

    const userId = socket.data.userId;

    if (!userId) {
      socket.emit('error', { message: 'User ID not found in cookies.' });
      respond({ success: false, message: 'User ID not found in cookies.' });
      return;
    }

    const userInfo = users[userId];
    if (!userInfo) {
      socket.emit('error', { message: 'User not found.' });
      respond({ success: false, message: 'User not found.' });
      return;
    }

    const user: User = {
      username: userInfo.username,
      userId,
      socket,
      score: 0,
    };

    room.users.set(userId, user);
    room.lastActive = Date.now();
    socket.join(roomId);
    const members = Array.from(room.users.values()).map((user) => ({
      userId: user.userId,
      username: user.username,
    }));
    io.to(roomId).emit('room-updated', {roomId, users: members});
    respond({ success: true, message: 'Room joined successfully', roomId });
  });

  socket.on('members', ({ roomId }, callback) => {
    const room = rooms.get(roomId);
    if (!room) {
      if (typeof callback === 'function') {
        callback({ success: false, message: 'Room not found.' });
      }
      return;
    } 
    const members = Array.from(room.users.values()).map((user) => ({
      userId: user.userId,
      username: user.username,
    }));
    if (typeof callback === 'function') {
      callback({ success: true, users: members });
    }
    socket.emit('members', { roomId, users: members });
  });

  socket.on('start-quiz', async ({ roomId }, callback) => {
    const room = rooms.get(roomId);
    const userId = socket.data.userId;

    if (!room) {
      if (typeof callback === 'function') {
        callback({ success: false, message: 'Room not found.' });
      }
      return;
    }

    if (room.creator !== userId) {
      if (typeof callback === 'function') {
      callback({ success: false, message: 'Only the room creator can start the quiz.' });
      }
      return;
    }



    await sendQuizStarted(io, roomId);
    runQuiz(io, roomId, 10);

    if (typeof callback === 'function') {
      callback({ success: true, message: 'Quiz started successfully.', questionCount: 10 });
    }

  });

  socket.on('submit-answer', ({ roomId, answer }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const user = room.users.get(socket.data.userId || '');
    if (!user) return;

    if (answer === room.questions[room.currentQuestionIndex]?.answer) {
      user.score += 1;
    }
  });

  socket.on('disconnect', () => {
    const userId = socket.data.userId;
    if (!userId) return;
    for (const [roomId, room] of rooms.entries()) {
      if (room.users.has(userId)) {
        room.users.delete(userId);
        room.lastActive = Date.now();

        if (room.users.size === 0) {
          // Cleanup handled by interval
        } else {
          io.to(roomId).emit('room-updated', getRoomUsers(room));
        }
        break;
      }
    }
  });

}

// Cleanup empty rooms every 30 seconds
setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    if (room.users.size === 0 && now - room.lastActive > 15 * 60_000) {
      rooms.delete(roomId);
      console.log(`Cleaned up empty room: ${roomId}`);
    }
  }
}, 30_000);

function getRoomUsers(room: Room, roomId?: string) {
  return {
    type: 'room-users',
    roomId,
    creator: room.creator,
    topic: room.topic,
    users: Array.from(room.users.values()).map((u) => ({ userId: u.userId, username: u.username, score: u.score }))
  };
}

// Utility function to create a delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function timer(io: Server, roomId: string, seconds: number) {
  const room = rooms.get(roomId);
  if (!room) return;
  for (let i = 0; i < seconds; i++) {
    io.to(room.roomId).emit('timer', {
      type: 'question',
      index: room.currentQuestionIndex,
      remaining: seconds - i,
    });
    await delay(1000);
  }
}



async function sendQuestion(io: Server, roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;
  const question = room.questions[room.currentQuestionIndex];
  room.submittedUsers = new Set<string>(); // Reset submissions for new question
  console.log(`Sending question to room ${roomId}:`, question.question);
  io.to(roomId).emit('new-question', {
    type: 'new-question',
    index: room.currentQuestionIndex,
    question: room.questions[room.currentQuestionIndex]?.question ?? '',
    options: room.questions[room.currentQuestionIndex]?.options ?? [],
  });
}



async function sendAnswer(io: Server, roomId: string) {
   const room = rooms.get(roomId);
   if (!room) return;

   io.to(roomId).emit('new-answer', {
      type: 'new-answer',
      index: room.currentQuestionIndex,
      answer: room.questions[room.currentQuestionIndex]?.answer ?? null,
    });
    room.currentQuestionIndex += 1;
}

async function switchToWaiting(io: Server, roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  io.to(roomId).emit('quiz-waiting', {
    type: 'quiz-waiting',
    message: 'Waiting for all users to submit their answers...',
  });
}

async function sendResult(io: Server, roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  io.to(roomId).emit('quiz-finished', {
    type: 'quiz-finished',
    users: Array.from(room.users.values()).map((u: User) => ({
      userId: u.userId,
      username: u.username,
      score: u.score,
    })),
  });
}

async function sendQuizStarted(io: Server, roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  io.to(roomId).emit('quiz-starting', {
    type: 'quiz-starting',
    roomId,
    questionCount: 10
  });
  await delay(100);
}

async function runQuiz(io: Server, roomId: string, totalQuestions: number) {
  const room = rooms.get(roomId);
  if (!room) {
    console.error(`Room ${roomId} not found.`);
    return;
  }
  const questions = await generateQuestions(room.topic); // Generate questions for the quiz
  room.questions = questions; // Store questions in the room object
  for (let i = 1; i <= totalQuestions; i++) {
    await sendQuestion(io, roomId);

    await timer(io, roomId, 8); // 8-second timer, updated every second

    await sendAnswer(io, roomId);
    await delay(3000);
    await switchToWaiting(io, roomId);
  }
  console.log("Quiz complete!");
  await sendResult(io, roomId);
  console.log("Results sent to room:", roomId);
  rooms.delete(roomId); // Optionally remove the room after quiz completion
  console.log(`Room ${roomId} removed after quiz completion.`);
}
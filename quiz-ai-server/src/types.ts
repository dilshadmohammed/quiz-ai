import { Socket } from 'socket.io';

export type Question = {
  question: string;
  options: string[];
  answer: number;
};

export type User = {
  username: string;
  userId: string;
  socket?: Socket;
  score: number;
};


export type Room = {
  topic: string;
  roomId: string;
  creator: string;
  users: Map<string, User>;
  questions: Question[];
  currentQuestionIndex: number;
  lastActive: number;
  submittedUsers: Set<string>;
};
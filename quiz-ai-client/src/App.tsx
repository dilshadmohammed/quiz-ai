import { useEffect, useState } from 'react';
import CreateOrJoin from './components/CreateOrJoin';
import axios from 'axios';
import io, { Socket } from 'socket.io-client';
import QuizWindow from './components/QuizWindow';
import Room from './components/Room';
import { useToken } from './hooks/useToken';

function App() {
  const [verified, setVerified] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [socket, setSocket] = useState< Socket | null>(null);
  const [roomCode, setRoomCode] = useState<string>('');
  const [quizStarted, setQuizStarted] = useState<boolean>(false);
  const { token, saveToken } = useToken();

  useEffect(() => {

    // Initialize socket connection with reconnection options
    const newSocket = io(import.meta.env.VITE_SERVER_API_URL, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      withCredentials: true,
      auth: {
      token: token,
      },
    });

    // Socket event handlers
    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, [verified]);

  const handleSubmitUsername = () => {
    axios.post(`${import.meta.env.VITE_SERVER_API_URL}/api/user`, 
      { username }, 
      { 
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
      })
      .then((res: { data: { token: string; userId: string; username: string } }) => {
      console.log('User verification response:', res.data);
      saveToken(res.data.token);
      setUserId(res.data.userId);
      setVerified(true);
      })
      .catch((err: unknown) => {
        console.error('User verification failed:', err);
        setVerified(false);
      });
  }

     
  if (!verified) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-blue-200">
        <div className="bg-white/80 backdrop-blur-md p-10 rounded-3xl shadow-2xl min-w-[340px] max-w-xs w-full text-center border border-blue-100">
          <h2 className="mb-6 text-3xl font-bold text-blue-700 tracking-tight">Welcome!</h2>
          <p className="mb-6 text-gray-500 text-base">Please enter your username to continue</p>
          <input
        type="text"
        placeholder="Username"
        className="w-full p-3 mb-5 rounded-lg border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50 placeholder-gray-400 transition"
        value={username}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') {
              handleSubmitUsername();
              }
            }}
          />
            <button
            className="w-full p-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-base shadow-md hover:from-blue-700 hover:to-blue-600 transition"
            onClick={handleSubmitUsername}
            >
            Continue
            </button>
        </div>
      </div>
    );
  }

  if (verified && !roomCode) {
    return (
      <>
        <CreateOrJoin socket={socket} setRoomCode={setRoomCode} />
      </>
    );
  }

  if (!quizStarted) {
    return <Room socket={socket} roomCode={roomCode} setQuizStarted={setQuizStarted} />;
  }

  return <QuizWindow socket={socket} roomCode={roomCode} userId={userId}/>;
}


export default App;
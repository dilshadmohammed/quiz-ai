import { useEffect, useState } from "react";
import { Socket } from 'socket.io-client';

type RoomProps = {
    socket: Socket | null;
    roomCode: string;
    setQuizStarted: (value: boolean) => void;
};

function Room({socket,roomCode,setQuizStarted}: RoomProps) {
    const [users, setUsers] = useState<{ userId: string; username: string }[]>([]);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!roomCode || !socket) return;

        socket.emit('members', { roomId: roomCode }, (response: { success: boolean, users: { userId: string; username: string }[] }) => {
            if (response?.success) {
                setUsers(response.users);
            } else {
                console.error('Failed to fetch members:', response);
            }
        });

    }, [roomCode, socket]);

    useEffect(() => {
        if (!socket) return;

        const handleRoomUpdated = (updatedUsers: { roomId: string; users: { userId: string; username: string }[] }) => {
            console.log('Room updated:', JSON.stringify(updatedUsers));
            setUsers(updatedUsers.users);
        };

        const handleQuizStarted = () => {
            setQuizStarted(true);
        };

        socket.on('room-updated', handleRoomUpdated);
        socket.on('quiz-starting', handleQuizStarted);

        return () => {
            socket.off('room-updated', handleRoomUpdated);
            socket.off('quiz-starting', handleQuizStarted);
        };
    }, [socket, setQuizStarted]);


    const handleStartQuiz = () => {
        if (!socket || !roomCode) return;
        
        socket.emit('start-quiz', {roomId:roomCode}, (response: { success: boolean ,message: string}) => {
            if (response?.success) {
                console.log(response.message)
                setQuizStarted(true);
            }
            else{
                console.error(response.message)
            }
        });
    };

    return (
        <div className="w-full h-screen bg-gradient-to-br from-primary-50 via-slate-50 to-slate-100 flex flex-col relative overflow-hidden">
            <div className="flex-1 overflow-hidden p-6">
                <div className="text-center mb-10 text-gray-500 cursor-pointer">
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <span className="text-base font-medium text-gray-500">Room Code:</span>
                        <span
                            className={`bg-gray-100 font-mono font-bold px-4 py-1 rounded-lg text-lg tracking-widest shadow-inner border border-gray-200 select-all transition-colors duration-300 ${
                                copied ? "bg-gray-800 text-white" : "text-gray-700"
                            }`}
                        >
                            {roomCode}
                        </span>
                        <button
                            className="py-1 rounded hover:bg-gray-200 transition-colors text-gray-600 text-sm font-semibold relative"
                            onClick={async () => {
                                await navigator.clipboard.writeText(roomCode);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 400);
                            }}
                            title="Copy Room Code"
                        >
                            <span className="material-symbols-outlined align-middle text-base text-gray-500">content_copy</span>
                        </button>
                    </div>
                    <p className="text-lg max-w-lg mx-auto text-gray-500">
                        Waiting for players to join...
                    </p>
                </div>

                <div className="h-full max-w-2xl mx-auto overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-primary-300 scrollbar-track-transparent p-4">
                    <div className="flex flex-wrap justify-center gap-6 pb-32">
                        {users.map((user, index) => {
                            const colors = [
                                'from-blue-400 to-blue-600 group-hover:shadow-blue-300/50',
                                'from-pink-400 to-pink-600 group-hover:shadow-pink-300/50',
                                'from-green-400 to-green-600 group-hover:shadow-green-300/50',
                                'from-purple-400 to-purple-600 group-hover:shadow-purple-300/50',
                                'from-orange-400 to-orange-600 group-hover:shadow-orange-300/50',
                                'from-teal-400 to-teal-600 group-hover:shadow-teal-300/50',
                                'from-indigo-400 to-indigo-600 group-hover:shadow-indigo-300/50',
                                'from-rose-400 to-rose-600 group-hover:shadow-rose-300/50',
                                'from-amber-400 to-amber-600 group-hover:shadow-amber-300/50',
                                'from-cyan-400 to-cyan-600 group-hover:shadow-cyan-300/50',
                                'from-emerald-400 to-emerald-600 group-hover:shadow-emerald-300/50',
                                'from-violet-400 to-violet-600 group-hover:shadow-violet-300/50'
                            ];
                            const colorClass = colors[index % colors.length];

                            return (
                                <div key={user.userId} className="flex flex-col items-center group cursor-pointer transform transition-all duration-300 hover:-translate-y-2">
                                    <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-white text-2xl font-bold mb-3 transition-all duration-500 group-hover:scale-110 shadow-lg overflow-hidden border-2 border-white`}>
                                        <span className="text-lg font-bold">
                                            {user.username.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <span className="text-sm font-medium text-slate-700 text-center">{user.username}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            <div className="bg-white border-t border-slate-200 p-6 shadow-2xl">
                <div className="max-w-md mx-auto">
                    <button
                        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-5 px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300 relative overflow-hidden disabled:opacity-60"
                        onClick={handleStartQuiz}
                        // disabled={ users.length === 0}
                    >
                        <div className="flex items-center justify-center space-x-3">
                            <span className="material-symbols-outlined text-2xl">play_arrow</span>
                            <span className="text-xl tracking-wider">
                                Quiz Started
                            </span>
                        </div>
                    </button>
                    <p className="text-center text-sm text-slate-600 mt-4 font-medium">
                        {users.length} player{users.length !== 1 ? "s" : ""} ready to play
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Room;

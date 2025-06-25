import { useEffect, useState } from 'react';
import { Socket } from "socket.io-client";

type CreateOrJoinProps = {
    socket: Socket | null;
    setRoomCode: (code: string) => void;
};

function CreateOrJoin({ socket, setRoomCode }: CreateOrJoinProps) {
    const [selectedTopic, setSelectedTopic] = useState<string>('Science');
    const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
    const [roomCode, setRoomCodeState] = useState<string>('');


    useEffect(() => {
        if (socket) {
            socket.on('connect', () => {
                console.log('Connected to server');
            });
        }
    }, [socket]);

    const topics = [
        { id: 'science', name: 'Science', icon: 'science', color: 'blue' },
        { id: 'history', name: 'History', icon: 'history_edu', color: 'purple' },
        { id: 'sports', name: 'Sports', icon: 'sports_soccer', color: 'orange' },
        { id: 'movies', name: 'Movies', icon: 'movie', color: 'pink' },
        { id: 'geography', name: 'Geography', icon: 'public', color: 'teal' },
        { id: 'music', name: 'Music', icon: 'library_music', color: 'indigo' }
    ];

    const handleTopicSelect = (topic: { id: string; name: string }) => {
        setSelectedTopic(topic.name);
        setIsDropdownOpen(false);
    };

    const handleCreateRoom = () => {

        if (!selectedTopic) {
            console.log('Please select a quiz topic first!');
            return;
        }

        if (!socket) {
            console.log('Socket connection not established. Please try again later.');
            return;
        }

        if (!socket.connected) {
            console.log('Socket not connected. Attempting to reconnect...');

            socket.on('connect', () => {
                console.log('✅ Connected to socket:', socket.id);
            });

            socket.on('connect_error', (err) => {
                console.error('❌ Connection error:', err.message);
            });
            // Wait a moment for connection to establish
            setTimeout(() => {
                if (!socket.connected) {
                    alert('Failed to connect to server. Please try again.');
                    return;
                }
            }, 1000);
        }

        socket.emit('create-room', { topic: selectedTopic }, (response: { success: boolean, message: string, roomId: string }) => {
            console.log('Create room response:', response);
            if (response.success && response.roomId) {
                console.log('Room created with ID:', response.roomId);
                setRoomCode(response.roomId);
            } else {
                alert('Failed to create room. Please try again.');
            }
        });

    };

    const handleJoinRoom = () => {
        if (!roomCode.trim()) {
            alert('Please enter a room code!');
            return;
        }
        if (!socket) {
            alert('Socket connection not established. Please try again later.');
            return;
        }

        socket.emit('join-room', { roomId: roomCode }, (response: { success: boolean; message?: string }) => {
            if (response.success) {
                setRoomCode(roomCode);
            } else {
                alert(`Failed to join room: ${response.message || 'Unknown error'}`);
            }
        });
    };

    const handleCategoryClick = (topicName: string) => {
        setSelectedTopic(topicName);
        console.log('Selected category:', topicName);
    };

    return (
        <div className="w-full h-screen bg-gradient-to-br from-purple-100 via-white to-indigo-100 p-4 md:p-18 relative overflow-hidden">
            <div className="absolute inset-0 z-0">
                <div
                    className="absolute top-0 left-0 w-full h-full bg-repeat opacity-5"
                    style={{
                        backgroundImage:
                            "url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3MzkyNDZ8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdHxlbnwwfHx8fDE3NTA2MzU1NjR8MA&ixlib=rb-4.1.0&q=80&w=1080')"
                    }}
                ></div>
                <div className="absolute top-1/4 right-1/3 w-64 h-64 rounded-full bg-purple-300 filter blur-3xl opacity-20 animate-pulse"></div>
                <div
                    className="absolute bottom-1/3 left-1/4 w-72 h-72 rounded-full bg-indigo-300 filter blur-3xl opacity-20 animate-pulse"
                    style={{ animationDelay: "2s" }}
                ></div>
                <div
                    className="absolute top-2/3 right-1/4 w-56 h-56 rounded-full bg-purple-300 filter blur-3xl opacity-20 animate-pulse"
                    style={{ animationDelay: "3.5s" }}
                ></div>
            </div>
            <div className="max-w-6xl mx-auto relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 mb-16">
                    <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 transform hover:scale-105 hover:shadow-2xl transition-all duration-300 border border-gray-100 backdrop-blur-sm bg-opacity-80">
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full mb-6 transform hover:rotate-12 transition-transform duration-300">
                                <span className="material-symbols-outlined text-white text-2xl md:text-3xl">
                                    add_circle
                                </span>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">Create Room</h2>

                            <div className="space-y-4 mb-8">
                                <div className="mb-8">
                                    <div className="w-full relative">
                                        <button
                                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                            className="w-full bg-white border-2 border-gray-200 rounded-2xl px-6 py-4 text-gray-700 font-medium cursor-pointer flex justify-between items-center hover:border-purple-400 transition-colors duration-300"
                                        >
                                            <span>{selectedTopic || 'Select Quiz Topic'}</span>
                                            <span className={`material-symbols-outlined transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}>
                                                expand_more
                                            </span>
                                        </button>
                                        {isDropdownOpen && (
                                            <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-lg border border-gray-100 z-10 overflow-hidden">
                                                <div className="max-h-48 overflow-y-auto py-2">
                                                    {topics.map((topic) => (
                                                        <button
                                                            key={topic.id}
                                                            onClick={() => handleTopicSelect(topic)}
                                                            className="w-full text-left px-6 py-3 hover:bg-purple-50 transition-colors duration-200 flex items-center"
                                                        >
                                                            <span className={`material-symbols-outlined mr-3 text-${topic.color}-500`}>
                                                                {topic.icon}
                                                            </span>
                                                            {topic.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={handleCreateRoom}
                                    className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold py-4 px-8 rounded-2xl transform hover:scale-105 hover:shadow-lg transition-all duration-300 text-lg"
                                >
                                    Create New Room
                                    <span className="material-symbols-outlined ml-2 inline-block">arrow_forward</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 transform hover:scale-105 hover:shadow-2xl transition-all duration-300 border border-gray-100 backdrop-blur-sm bg-opacity-80">
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-gradient-to-r from-green-500 to-green-600 rounded-full mb-6 transform hover:rotate-12 transition-transform duration-300">
                                <span className="material-symbols-outlined text-white text-2xl md:text-3xl">
                                    login
                                </span>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">Join Room</h2>
                            <div className="space-y-4 mb-8">
                                <input
                                    type="text"
                                    placeholder="Enter Room Code"
                                    value={roomCode}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRoomCodeState(e.target.value.toUpperCase())}
                                    className="w-full px-6 py-4 border-2 border-gray-200 rounded-2xl focus:border-green-500 focus:outline-none transition-colors duration-300 text-center text-lg font-medium tracking-wider"
                                    maxLength={6}
                                />
                                <button
                                    onClick={handleJoinRoom}
                                    className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-4 px-8 rounded-2xl transform hover:scale-105 hover:shadow-lg transition-all duration-300 text-lg"
                                >
                                    Join Room
                                    <span className="material-symbols-outlined ml-2 inline-block">
                                        arrow_forward
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 mb-12 backdrop-blur-sm bg-opacity-80">
                    <div className="text-center mb-8">
                        <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
                            Popular Quiz Categories
                        </h3>
                        <p className="text-gray-600">
                            Explore different topics and challenge yourself across various subjects
                        </p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {topics.map((topic) => (
                            <div
                                key={topic.id}
                                onClick={() => handleCategoryClick(topic.name)}
                                className={`bg-gradient-to-br from-${topic.color}-500 to-${topic.color}-600 rounded-2xl p-6 text-center text-white transform hover:scale-105 hover:shadow-lg transition-all duration-300 cursor-pointer ${selectedTopic === topic.name ? 'ring-4 ring-white ring-opacity-50' : ''}`}
                            >
                                <span className="material-symbols-outlined text-3xl mb-2 block">{topic.icon}</span>
                                <p className="font-semibold">{topic.name}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CreateOrJoin

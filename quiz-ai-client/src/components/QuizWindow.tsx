import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';

interface Question {
    index: number;
    question: string;
    options: string[];
}

function QuizWindow({socket, roomCode, userId}: {socket: Socket|null, roomCode: string, userId: string}) {
        const [currentQuestion, setCurrentQuestion] = useState<Question |null >(null);
        const [correctAnswer, setCorrectAnswer] = useState<number>(0);
        const [quizState,setQuizState] = useState<'waiting'| 'question' | 'answer' | 'finished' >('waiting');
        const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
        const [questionCount, setQuestionCount] = useState(0);
        const [showResult, setShowResult] = useState(false);
        const [timer,setTimer] = useState<number>(0);
        const [results, setResults] = useState<{ username: string; score: number }[]>([]);


        useEffect(() => {
            if (!socket) return;

            // Handler functions to avoid duplicate listeners
            const handleQuizStarted = (data: {questionCount: number}) => {
                setQuizState('question');
                setQuestionCount(data.questionCount);
                console.log(`Quiz started: ${JSON.stringify(data)}`);
            };

            const handleWaitingState = () => {
                //Change to waiting state for next question
                setQuizState('waiting');
                setCurrentQuestion(null);
                setSelectedAnswer(null);
                setCorrectAnswer(0);
                setTimer(0);
                setShowResult(false);
                console.log('Quiz is waiting for next question');
            };

            const handleTimer = (data: {remaining: number, type: 'question' | 'answer', questionIndex: number}) => {
                setTimer(data.remaining);
                console.log(`Timer update: ${JSON.stringify(data)}`);
            };

            const handleNewQuestion = (data: {index: number, question: string, options: string[]}) => {
                const newQuestion: Question = {
                    index: data.index,
                    question: data.question,
                    options: data.options
                };
                setCurrentQuestion(newQuestion);
                setQuizState('question');
                setSelectedAnswer(null);
                console.log(`New question: ${JSON.stringify(data)}`);
            };

            const handleNewAnswer = (data: {index: number, answer: number}) => {
                setCorrectAnswer(data.answer);
                setQuizState('answer');
                console.log(`New answer for question ${data.index}: ${JSON.stringify(data)}`);
            };

            const handleQuizFinished = (data: { users: { username: string, score: number }[] }) => {
                setResults(data.users);
                setQuizState('finished');
                setShowResult(true);
                console.log(`Quiz finished: ${JSON.stringify(data)}`);
            };

            socket.on('quiz-starting', handleQuizStarted);
            socket.on('quiz-waiting', handleWaitingState);
            socket.on('timer', handleTimer);
            socket.on('new-question', handleNewQuestion);
            socket.on('new-answer', handleNewAnswer);
            socket.on('quiz-finished', handleQuizFinished);

            // Clean up listeners on unmount or socket change
            return () => {
                socket.off('quiz-started', handleQuizStarted);
                socket.off('timer', handleTimer);
                socket.off('new-question', handleNewQuestion);
                socket.off('new-answer', handleNewAnswer);
                socket.off('quiz-finished', handleQuizFinished);
            };
        }, [socket]);

        const handleAnswerSelect = (answerIndex: number) => {
            if (selectedAnswer !== null) return;
            setSelectedAnswer(answerIndex); // Immediately set to prevent double click
            socket?.emit('submit-answer', { roomId: roomCode, answer: answerIndex });
        };

        if (showResult) {
            return (
            <div className="w-full h-screen max-w-full mx-auto bg-gradient-to-br from-blue-100 via-white to-blue-200 flex flex-col items-center justify-center">
                <div className="text-center">
                <h2 className="text-4xl font-extrabold text-blue-800 mb-6 drop-shadow-lg">🏆 Quiz Complete!</h2>
                <div className="bg-white/90 rounded-2xl shadow-2xl p-8 max-w-lg mx-auto border-4 border-blue-200">
                    <h3 className="text-2xl font-bold text-blue-700 mb-6 tracking-wide flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-yellow-400 text-3xl">leaderboard</span>
                    Leaderboard
                    </h3>
                    <table className="w-full text-left border-separate border-spacing-y-2">
                    <thead>
                        <tr>
                        <th className="px-4 py-2 text-gray-500 text-sm font-semibold">#</th>
                        <th className="px-4 py-2 text-gray-500 text-sm font-semibold">Username</th>
                        <th className="px-4 py-2 text-gray-500 text-sm font-semibold">Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.map((user, idx) => {
                        const isCurrentUser = user.username === userId;
                        return (
                            <tr
                            key={user.username}
                            className={`rounded-xl transition-all ${
                                isCurrentUser
                                ? 'bg-gradient-to-r from-blue-200 via-blue-100 to-blue-50 shadow-lg scale-105'
                                : idx === 0
                                ? 'bg-yellow-100'
                                : 'bg-white'
                            }`}
                            >
                            <td className="px-4 py-3 font-bold text-lg text-blue-700">
                                {idx === 0 ? (
                                <span className="material-symbols-outlined text-yellow-500 align-middle">emoji_events</span>
                                ) : (
                                idx + 1
                                )}
                            </td>
                            <td className={`px-4 py-3 font-semibold ${isCurrentUser ? 'text-blue-900' : 'text-gray-700'}`}>
                                {user.username}
                                {isCurrentUser && (
                                <span className="ml-2 inline-block bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">
                                    You
                                </span>
                                )}
                            </td>
                            <td className={`px-4 py-3 font-bold text-right ${isCurrentUser ? 'text-blue-900' : 'text-blue-700'}`}>
                                {user.score}
                            </td>
                            </tr>
                        );
                        })}
                    </tbody>
                    </table>
                </div>
                </div>
            </div>
            );
        }

        // Handle different quiz states
        if (quizState === 'waiting') {
            return (
            <div className="w-full h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                <span className="material-symbols-outlined text-5xl text-blue-400 mb-4 animate-spin">hourglass_top</span>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Waiting for quiz to start...</h2>
                <p className="text-gray-600">Share the room code: <span className="font-mono bg-gray-200 px-2 py-1 rounded">{roomCode}</span></p>
                </div>
            </div>
            );
        }

        if (quizState === 'question' && currentQuestion) {
            return (
            <div className="w-full h-screen max-w-full mx-auto bg-gray-50 overflow-hidden flex flex-col">
                <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 h-2">
                    <div
                        className="absolute top-0 left-0 h-full bg-blue-300 rounded-r-full transition-all duration-100 ease-linear"
                        style={{width: `${timer * 10}%`}}
                    ></div>
                </div>

                <div className="relative p-6 flex-1 flex items-center justify-center">
                    {/* Timer display at top left */}
                    <div className="absolute top-6 left-6 flex items-center space-x-2 bg-white bg-opacity-80 px-3 py-1 rounded-full shadow text-blue-700 font-semibold text-lg z-10">
                        <span className="material-symbols-outlined text-blue-500 text-xl">timer</span>
                        <span>{timer}s</span>
                    </div>
                    <button className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200 group z-10">
                        <span className="material-symbols-outlined text-gray-600 group-hover:text-gray-800 text-lg">
                            close
                        </span>
                    </button>

                    <div className="pr-12 w-full max-w-2xl mx-auto">
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-2">
                                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                                    {currentQuestion.index + 1} of {questionCount}
                                    </span>
                                    <span className="material-symbols-outlined text-blue-500">quiz</span>
                                </div>
                            </div>

                            <h2 className="text-2xl font-bold text-gray-800 leading-relaxed">
                                {currentQuestion.question}
                            </h2>
                        </div>

                        <div className="space-y-4">
                            {currentQuestion.options.map((option, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        setSelectedAnswer(index);
                                        handleAnswerSelect(index);
                                    }}
                                    disabled={selectedAnswer !== null}
                                    className={`w-full p-4 text-left border-2 rounded-xl transition-all duration-200 group ${
                                        selectedAnswer === index
                                            ? 'bg-blue-100 border-blue-400'
                                            : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                    }`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold transition-colors duration-200 ${
                                            selectedAnswer === index
                                                ? 'bg-blue-200 text-blue-700'
                                                : 'bg-gray-100 group-hover:bg-blue-200 text-gray-600 group-hover:text-blue-700'
                                        }`}>
                                            {String.fromCharCode(65 + index)}
                                        </div>
                                        <span className="text-gray-700 group-hover:text-gray-900 font-medium">
                                            {option}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            );
        }

        if (quizState === 'answer' && currentQuestion && correctAnswer !== null) {
            return (
            <div className="w-full h-screen max-w-full mx-auto bg-gray-50 overflow-hidden flex flex-col">
                <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 h-2">
                    <div
                        className="absolute top-0 left-0 h-full bg-blue-300 rounded-r-full transition-all duration-1000 ease-linear"
                        style={{width: `${timer*10}%`}}
                    ></div>
                </div>

                <div className="relative p-6 flex-1 flex items-center justify-center">
                    <button className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200 group z-10">
                        <span className="material-symbols-outlined text-gray-600 group-hover:text-gray-800 text-lg">
                            close
                        </span>
                    </button>

                    <div className="pr-12 w-full max-w-2xl mx-auto">
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-2">
                                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                                        {currentQuestion.index + 1} of {questionCount}
                                    </span>
                                    <span className="material-symbols-outlined text-blue-500">quiz</span>
                                </div>
                            </div>

                            <h2 className="text-2xl font-bold text-gray-800 leading-relaxed">
                                {currentQuestion.question}
                            </h2>
                        </div>

                        <div className="space-y-4">
                            {currentQuestion.options.map((option, index) => (
                                <button
                                    key={index}
                                    disabled
                                    className={`w-full p-4 text-left border-2 rounded-xl transition-all duration-200 group ${
                                        selectedAnswer === index
                                            ? index === correctAnswer
                                                ? 'bg-green-100 border-green-400'
                                                : 'bg-red-100 border-red-400'
                                            : selectedAnswer !== null && index === correctAnswer
                                            ? 'bg-green-100 border-green-400'
                                            : 'bg-white border-gray-200'
                                    }`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold transition-colors duration-200 ${
                                            selectedAnswer === index
                                                ? index === correctAnswer
                                                    ? 'bg-green-200 text-green-700'
                                                    : 'bg-red-200 text-red-700'
                                                : selectedAnswer !== null && index === correctAnswer
                                                ? 'bg-green-200 text-green-700'
                                                : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {String.fromCharCode(65 + index)}
                                        </div>
                                        <span className="text-gray-700 font-medium">
                                            {option}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            );
        }

        // fallback
        return null;
}

export default QuizWindow;
'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User } from 'lucide-react';

interface Message {
    id: string;
    role: 'user' | 'brain';
    text: string;
    timestamp: number;
}

export default function Home() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'brain',
            text: 'Welcome to the Autonomous Hotel. How may I assist you today?',
            timestamp: Date.now(),
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64Audio = (reader.result as string).split(',')[1];
                    await sendAudio(base64Audio);
                };
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Mic Access Error:", err);
            alert("Microphone access denied.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const sendAudio = async (base64Audio: string) => {
        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: '🎤 Audio Message',
            timestamp: Date.now(),
        };
        setMessages(prev => [...prev, userMsg]);
        setLoading(true);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audio: base64Audio }),
            });
            const data = await res.json();

            // Handle Text
            const brainMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'brain',
                text: data.text || "I didn't quite catch that.",
                timestamp: Date.now(),
            };
            setMessages(prev => [...prev, brainMsg]);

            // Handle Audio
            if (data.audio) {
                const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
                audio.play().catch(e => console.error("Playback failed", e));
            }

        } catch (err) {
            console.error(err);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'brain',
                text: "System Offline.",
                timestamp: Date.now(),
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    // Helper for Text Submit reuse
    const handleTextSubmit = async () => {
        if (!input.trim() || loading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: input,
            timestamp: Date.now(),
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: userMsg.text }),
            });
            const data = await res.json();

            const brainMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'brain',
                text: data.text || "I didn't quite catch that.",
                timestamp: Date.now(),
            };
            setMessages(prev => [...prev, brainMsg]);

            // Should not expect audio from text request current flow, but if we updated main.py correctly:
            // Text request -> PROCESS_TEXT -> ASSISTANT_TEXT (No Audio). 
            // Audio request -> PROCESS_AUDIO -> TTS_AUDIO (With Audio).
            // So logic holds.

        } catch (err) {
            console.error(err);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'brain',
                text: "System Offline.",
                timestamp: Date.now(),
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleTextSubmit();
    };

    return (
        <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-4">
            {/* Header */}
            <header className="mb-6 p-4 border-b border-slate-700 flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <Bot className="text-white w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                        Grand Budapest Hotel
                    </h1>
                    <p className="text-xs text-slate-400 tracking-wider uppercase">Autonomous Concierge</p>
                </div>
            </header>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-4 px-2 custom-scrollbar">
                <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.3 }}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] p-4 rounded-2xl shadow-md backdrop-blur-sm ${msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-tr-none'
                                    : 'bg-slate-800 border border-slate-700 text-slate-100 rounded-tl-none'
                                    }`}
                            >
                                <p className="text-sm md:text-base leading-relaxed">{msg.text}</p>
                                <span className="text-[10px] opacity-50 mt-1 block text-right">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                    {loading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex justify-start"
                        >
                            <div className="bg-slate-800/50 p-3 rounded-2xl rounded-tl-none flex gap-1 items-center">
                                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="relative mt-auto">
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-xl blur opacity-30 group-hover:opacity-75 transition duration-500"></div>
                    <div className="relative flex bg-slate-900 rounded-xl p-1 items-center gap-2">
                        <button
                            type="button"
                            onMouseDown={startRecording}
                            onMouseUp={stopRecording}
                            onMouseLeave={stopRecording}
                            onTouchStart={startRecording}
                            onTouchEnd={stopRecording}
                            disabled={loading}
                            className={`p-3 rounded-lg transition-colors text-white ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-700 hover:bg-slate-600'}`}
                        >
                            <span className="text-xl">🎤</span>
                        </button>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask me anything..."
                            className="flex-1 bg-transparent px-4 py-3 text-slate-100 focus:outline-none placeholder:text-slate-500"
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || loading}
                            className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 rounded-lg transition-colors text-white"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <p className="text-center text-xs text-slate-500 mt-2">
                    Hold Mic to speak • AI checks rooms & bookings
                </p>
            </form>
        </main>
    );
}

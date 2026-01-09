"use client";

import { useState, useRef, useEffect } from "react";
import { Mascot, MascotStatus } from "../components/Mascot";
import { ChatBubble } from "../components/ChatBubble";
import { Send, Mic, MicOff, Volume2 } from "lucide-react";

interface Message {
    id: string;
    text: string;
    isUser: boolean;
    isNew?: boolean;
}

export default function HotelKiosk() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            text: "Welcome to the Grand Hotel! 🏨 I'm your AI Concierge. How can I help you?",
            isUser: false,
        },
    ]);
    const [input, setInput] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isThinking, setIsThinking] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isThinking]);

    // Mascot Status Logic
    const getMascotStatus = (): MascotStatus => {
        if (isPlaying) return "talking";
        if (isListening || isThinking) return "listening";
        return "idle";
    };

    // --- AUDIO LOGIC ---
    const playAudio = (base64Audio: string) => {
        if (audioRef.current) {
            audioRef.current.pause(); // Stop previous
        }
        const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
        audioRef.current = audio;

        audio.onplay = () => setIsPlaying(true);
        audio.onended = () => setIsPlaying(false);
        audio.play().catch(e => console.error("Playback error:", e));
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: Blob[] = [];

            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'audio/wav' });
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = () => {
                    const base64 = (reader.result as string).split(',')[1];
                    handleSend(base64, true); // Send as Audio
                };
            };

            recorder.start();
            mediaRecorderRef.current = recorder;
            setIsListening(true);
        } catch (err) {
            console.error("Mic error:", err);
            alert("Microphone access denied!");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isListening) {
            mediaRecorderRef.current.stop();
            setIsListening(false);
        }
    };

    // --- SEND LOGIC ---
    const handleSend = async (content: string, isAudio = false) => {
        if (!content.trim()) return;

        if (!isAudio) {
            const userMsg: Message = { id: Date.now().toString(), text: content, isUser: true, isNew: true };
            setMessages(prev => [...prev, userMsg]);
            setInput("");
        }

        setIsThinking(true);

        try {
            const payload = isAudio ? { audio: content } : { text: content };

            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            // Handle AI Response
            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: data.text || "I'm not sure what you mean.",
                isUser: false,
                isNew: true
            };
            setMessages(prev => [...prev, aiMsg]);

            // If Voice Response, Play it!
            if (data.type === 'TTS_AUDIO' && data.audio) {
                playAudio(data.audio);
            }

        } catch (error) {
            console.error("API Error:", error);
            setMessages(prev => [...prev, { id: "error", text: "Connection Error 🔌", isUser: false }]);
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div className="min-h-screen bg-pokedex-red flex items-center justify-center p-4 font-sans">

            {/* Pokedex Case */}
            <div className="w-full max-w-md bg-pokedex-red-dark rounded-3xl p-4 shadow-2xl border-b-8 border-r-8 border-black/20">

                {/* Top LEDs */}
                <div className="flex gap-2 mb-4">
                    <div className="w-12 h-12 rounded-full bg-blue-400 border-4 border-white shadow-lg animate-pulse" />
                    <div className="w-4 h-4 rounded-full bg-red-400 border-2 border-white" />
                    <div className="w-4 h-4 rounded-full bg-yellow-400 border-2 border-white" />
                    <div className="w-4 h-4 rounded-full bg-green-400 border-2 border-white" />
                </div>

                {/* Screen Bezel */}
                <div className="bg-gray-200 rounded-b-xl rounded-tl-none rounded-tr-3xl p-6 pt-8 pb-4 relative clip-path-custom">

                    {/* The Green Screen */}
                    <div className="bg-screen-green rounded-xl border-4 border-gray-400 shadow-inner overflow-hidden flex flex-col h-[500px]">

                        {/* Mascot Area */}
                        <div className="bg-screen-green-dark/20 p-4 border-b-2 border-screen-green-dark/30 flex justify-center">
                            <Mascot status={getMascotStatus()} />
                        </div>

                        {/* Chat History */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 pokedex-scroll">
                            {messages.map((m) => (
                                <ChatBubble key={m.id} message={m.text} isUser={m.isUser} />
                            ))}
                            {isThinking && <div className="text-xs text-center text-screen-green-dark font-pixel animate-pulse">THINKING...</div>}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="mt-4 flex gap-2">
                        <button
                            onMouseDown={startRecording}
                            onMouseUp={stopRecording}
                            onTouchStart={startRecording}
                            onTouchEnd={stopRecording}
                            className={`p-4 rounded-full border-4 border-black transition-all ${isListening ? "bg-red-500 scale-95" : "bg-gray-800 hover:bg-gray-700"}`}
                        >
                            {isListening ? <MicOff className="text-white w-6 h-6" /> : <Mic className="text-white w-6 h-6" />}
                        </button>

                        <div className="flex-1 bg-gray-800 rounded-full border-4 border-black flex items-center px-4">
                            <input
                                className="bg-transparent text-white w-full focus:outline-none font-friendly"
                                placeholder="Ask anything..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
                            />
                        </div>

                        <button
                            onClick={() => handleSend(input)}
                            className="p-4 bg-yellow-400 rounded-full border-4 border-black hover:bg-yellow-300"
                        >
                            <Send className="text-black w-6 h-6" />
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}

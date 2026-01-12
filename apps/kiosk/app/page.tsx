"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Webcam from "react-webcam"; // <--- NEW LIBRARY
import { Mascot, MascotStatus } from "../components/Mascot";
import { ChatBubble } from "../components/ChatBubble";
import { Send, Mic, MicOff, Camera, X } from "lucide-react"; // Added Camera icons

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
            text: "Welcome to the Grand Hotel! 🏨 I'm your AI Concierge.",
            isUser: false,
        },
    ]);
    const [input, setInput] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isThinking, setIsThinking] = useState(false);

    // Camera State
    const [showCamera, setShowCamera] = useState(false);
    const webcamRef = useRef<Webcam>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isThinking]);

    const getMascotStatus = (): MascotStatus => {
        if (isPlaying) return "talking";
        if (isListening || isThinking) return "listening";
        return "idle";
    };

    // --- CAMERA LOGIC ---
    const captureAndSend = useCallback(() => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            setShowCamera(false);
            // Send image to backend
            handleSend(imageSrc, false, true); // isAudio=false, isImage=true
        }
    }, [webcamRef]);

    // --- AUDIO LOGIC (Existing) ---
    const playAudio = (base64Audio: string) => {
        if (audioRef.current) { audioRef.current.pause(); }
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
                    handleSend(base64, true);
                };
            };
            recorder.start();
            mediaRecorderRef.current = recorder;
            setIsListening(true);
        } catch (err) {
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
    const handleSend = async (content: string, isAudio = false, isImage = false) => {
        if (!content.trim()) return;

        if (!isAudio && !isImage) {
            setMessages(prev => [...prev, { id: Date.now().toString(), text: content, isUser: true }]);
            setInput("");
        }
        if (isImage) {
            setMessages(prev => [...prev, { id: Date.now().toString(), text: "📸 Scanning ID...", isUser: true }]);
        }

        setIsThinking(true);

        try {
            let payload: any = { text: content };
            if (isAudio) payload = { audio: content };
            if (isImage) payload = { image: content, type: "PROCESS_IMAGE" }; // Special flag

            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: data.text || "Processed.",
                isUser: false,
                isNew: true
            };
            setMessages(prev => [...prev, aiMsg]);

            if (data.type === 'TTS_AUDIO' && data.audio) {
                playAudio(data.audio);
            }

        } catch (error) {
            setMessages(prev => [...prev, { id: "error", text: "Connection Error 🔌", isUser: false }]);
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div className="min-h-screen bg-pokedex-red flex items-center justify-center p-4 font-sans">
            <div className="w-full max-w-md bg-pokedex-red-dark rounded-3xl p-4 shadow-2xl border-b-8 border-r-8 border-black/20">

                {/* Top LEDs */}
                <div className="flex gap-2 mb-4">
                    <div className="w-12 h-12 rounded-full bg-blue-400 border-4 border-white shadow-lg animate-pulse" />
                    <div className="w-4 h-4 rounded-full bg-red-400 border-2 border-white" />
                    <div className="w-4 h-4 rounded-full bg-yellow-400 border-2 border-white" />
                </div>

                <div className="bg-gray-200 rounded-b-xl rounded-tl-none rounded-tr-3xl p-6 pt-8 pb-4 relative">
                    <div className="bg-screen-green rounded-xl border-4 border-gray-400 shadow-inner overflow-hidden flex flex-col h-[500px] relative">

                        {/* --- CAMERA OVERLAY --- */}
                        {showCamera ? (
                            <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center">
                                <Webcam
                                    audio={false}
                                    ref={webcamRef}
                                    screenshotFormat="image/jpeg"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute bottom-4 flex gap-4">
                                    <button onClick={() => setShowCamera(false)} className="bg-red-500 p-3 rounded-full border-2 border-white">
                                        <X className="text-white" />
                                    </button>
                                    <button onClick={captureAndSend} className="bg-green-500 p-3 rounded-full border-2 border-white animate-pulse">
                                        <Camera className="text-white" />
                                    </button>
                                </div>
                                <div className="absolute top-4 bg-black/50 text-white px-3 py-1 rounded text-xs font-pixel">
                                    HOLD ID STEADY
                                </div>
                            </div>
                        ) : (
                            /* NORMAL MASCOT VIEW */
                            <div className="bg-screen-green-dark/20 p-4 border-b-2 border-screen-green-dark/30 flex justify-center">
                                <Mascot status={getMascotStatus()} />
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto p-4 space-y-2 pokedex-scroll">
                            {messages.map((m) => (
                                <ChatBubble key={m.id} message={m.text} isUser={m.isUser} />
                            ))}
                            {isThinking && <div className="text-xs text-center text-screen-green-dark font-pixel animate-pulse">PROCESSING...</div>}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="mt-4 flex gap-2">
                        <button
                            onMouseDown={startRecording}
                            onMouseUp={stopRecording}
                            className={`p-4 rounded-full border-4 border-black transition-all ${isListening ? "bg-red-500" : "bg-gray-800"}`}
                        >
                            {isListening ? <MicOff className="text-white" /> : <Mic className="text-white" />}
                        </button>

                        {/* CAMERA BUTTON */}
                        <button
                            onClick={() => setShowCamera(true)}
                            className="p-4 bg-blue-500 rounded-full border-4 border-black hover:bg-blue-400"
                        >
                            <Camera className="text-white w-6 h-6" />
                        </button>

                        <div className="flex-1 bg-gray-800 rounded-full border-4 border-black flex items-center px-4">
                            <input
                                className="bg-transparent text-white w-full focus:outline-none font-friendly"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
                            />
                        </div>

                        <button onClick={() => handleSend(input)} className="p-4 bg-yellow-400 rounded-full border-4 border-black">
                            <Send className="text-black w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

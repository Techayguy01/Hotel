import { cn } from "../lib/utils";

export type MascotStatus = 'idle' | 'talking' | 'listening';

interface MascotProps {
    status: MascotStatus;
    className?: string;
}

export const Mascot = ({ status, className }: MascotProps) => {
    return (
        <div className={cn("relative flex flex-col items-center", className)}>
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-10 w-full text-center">
                {status === 'listening' && (
                    <div className="inline-block bg-white text-black px-3 py-1 rounded-full text-xs font-bold border-2 border-black animate-pulse">
                        🎤 LISTENING...
                    </div>
                )}
                {status === 'talking' && (
                    <div className="inline-block bg-white text-black px-3 py-1 rounded-full text-xs font-bold border-2 border-black">
                        💬 SPEAKING
                    </div>
                )}
            </div>

            <div className={cn(
                "relative w-32 h-32 rounded-full bg-yellow-400 flex items-center justify-center transition-all duration-300 border-4 border-black shadow-xl",
                status === 'idle' && "animate-float",
                status === 'talking' && "animate-bounce-talk",
                status === 'listening' && "ring-4 ring-blue-400"
            )}>
                {/* Simple Face for now */}
                <div className="w-8 h-8 bg-black rounded-full absolute top-10 left-6">
                    <div className="w-2 h-2 bg-white rounded-full absolute top-1 left-1" />
                </div>
                <div className="w-8 h-8 bg-black rounded-full absolute top-10 right-6">
                    <div className="w-2 h-2 bg-white rounded-full absolute top-1 left-1" />
                </div>
                <div className="w-4 h-3 bg-pink-400 rounded-full absolute top-14 left-4 opacity-50" />
                <div className="w-4 h-3 bg-pink-400 rounded-full absolute top-14 right-4 opacity-50" />

                {/* Mouth */}
                <div className="absolute bottom-8">
                    {status === 'talking' ? (
                        <div className="w-6 h-4 bg-red-500 rounded-full animate-pulse border-2 border-black" />
                    ) : (
                        <div className="w-4 h-2 bg-black rounded-b-full" />
                    )}
                </div>
            </div>
        </div>
    );
};

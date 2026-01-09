import { cn } from "../lib/utils";

interface ChatBubbleProps {
    message: string;
    isUser: boolean;
    isNew?: boolean;
}

export const ChatBubble = ({ message, isUser, isNew = false }: ChatBubbleProps) => {
    return (
        <div className={cn("flex w-full mb-4", isUser ? "justify-end" : "justify-start")}>
            <div className={cn(
                "max-w-[80%] px-4 py-3 rounded-2xl relative shadow-md text-sm font-friendly border-2",
                isUser ? "bg-blue-500 text-white border-blue-700 rounded-br-none" : "bg-white text-black border-gray-300 rounded-bl-none"
            )}>
                <p>{message}</p>
            </div>
        </div>
    );
};

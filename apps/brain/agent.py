import os
from typing import List, Optional
from langchain_groq import ChatGroq
from langchain_core.tools import tool
from langchain_core.messages import SystemMessage, HumanMessage, ToolMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv
from apps.brain.database import Database

# Load environment variables
load_dotenv()

# Initialize Database
db = Database()

# Define Tools
@tool
def check_room_availability() -> List[dict]:
    """Check which rooms are available for booking."""
    return db.check_availability()

@tool
def book_room(room_number: str, guest_name: str) -> str:
    """Book a room for a guest. Returns success or failure message."""
    success, msg = db.book_room(room_number, guest_name)
    return msg

tools = [check_room_availability, book_room]

# Initialize LLM
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0,
    max_tokens=None,
    timeout=None,
    max_retries=2,
).bind_tools(tools)

# System Prompt
SYSTEM_PROMPT = """You are the 'Brain' of the Autonomous Hotel OS.
Your goal is to assist guests via a text-based kiosk.

You have access to a database of rooms.
1. Use 'check_room_availability' to see what is free.
2. Use 'book_room' to make a reservation.

Always be polite, concise, and professional.
If you need more information to call a tool, ask the user.
"""

class Agent:
    def __init__(self):
        self.messages = [SystemMessage(content=SYSTEM_PROMPT)]
        self.tool_map = {t.name: t for t in tools}

    def process_message(self, text: str) -> str:
        """Process user text and return assistant response."""
        
        # Add user message
        self.messages.append(HumanMessage(content=text))
        
        # Invoke LLM
        response = llm.invoke(self.messages)
        self.messages.append(response)

        # Handle Tool Calls
        if response.tool_calls:
            for tool_call in response.tool_calls:
                tool_name = tool_call["name"]
                tool_args = tool_call["args"]
                tool_func = self.tool_map[tool_name]
                
                # Execute Tool
                try:
                    tool_result = tool_func.invoke(tool_args)
                    tool_output = str(tool_result)
                except Exception as e:
                    tool_output = f"Error: {e}"

                # Append Tool result
                self.messages.append(ToolMessage(tool_call_id=tool_call["id"], content=tool_output))

            # Re-invoke LLM to generate final answer
            final_response = llm.invoke(self.messages)
            self.messages.append(final_response)
            return final_response.content
        
        return response.content

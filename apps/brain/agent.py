import os
from typing import List, Optional
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage, ToolMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv

# Import Tools
from apps.brain.tools import tools

# Load environment variables
load_dotenv()

# Initialize LLM
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0,
    max_tokens=None,
    timeout=None,
    max_retries=2,
).bind_tools(tools)

# System Prompt (Persona)
SYSTEM_PROMPT = """You are the Hotel Receptionist. You are helpful, warm, and professional. 
Do NOT mention function names like 'book_room' or 'check_availability' to the guest. 
Instead of saying 'I will use the book_room function', say 'I will book that for you now'. 
Keep responses concise."""

class Agent:
    def __init__(self):
        self.messages = [SystemMessage(content=SYSTEM_PROMPT)]
        self.tool_map = {t.name: t for t in tools}
        self.model = llm

    def process_message(self, text: str):
        """
        Processes a user message and returns a stream of tokens/updates.
        """
        # Force string to avoid Pydantic validation errors
        safe_text = str(text)
        self.messages.append(HumanMessage(content=safe_text))
        
        # 1. Get initial response from LLM
        response = self.model.invoke(self.messages)
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

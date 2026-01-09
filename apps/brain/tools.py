from typing import List
from langchain_core.tools import tool
from apps.brain.database import Database

# Initialize Database shared instance
db = Database()

@tool
def check_room_availability() -> List[dict]:
    """Check which rooms are available for booking."""
    return db.check_availability()

@tool
def book_room(room_number: str, guest_name: str) -> str:
    """Book a room for a guest. Returns success or failure message."""
    success, msg = db.book_room(room_number, guest_name)
    return msg

# Export tools list
tools = [check_room_availability, book_room]

from typing import List, Dict, Union
from langchain_core.tools import tool
from apps.brain.database import Database
from apps.brain.knowledge_base import search_manual

# Initialize Database
db = Database()

@tool
def check_room_availability() -> List[dict]:
    """
    Check which rooms are available for booking. 
    Returns a list of room numbers and prices.
    """
    return db.check_availability()

@tool
def describe_specific_room(room_number: str) -> str:
    """
    Get the detailed description, view, and decor of a specific room.
    Use this when a user asks about a specific room number or wants to know what a room looks like.
    """
    details = db.get_room_details(room_number)
    if details:
        return f"Room {details['number']} (${details['price']}/night): {details['description']}"
    return "Room not found."

@tool
def get_hotel_amenities() -> str:
    """
    Get a list of hotel facilities like the Pool, Spa, Bar, and Restaurant details.
    """
    return """
    - The Grand Pool: Open 6 AM - 10 PM. Heated. Swim caps required.
    - Mendl's Patisserie: Open 24/7 in the lobby. Famous for 'Courtesan au Chocolat'.
    - The Zero Bar: Serves the finest aged whiskey. Live piano music every evening at 8 PM.
    - The Observatory: Rooftop access for star-gazing (Key available at reception).
    """

@tool
def book_room(room_number: str, guest_name: str) -> str:
    """Book a room for a guest. Returns success or failure message."""
    success, msg = db.book_room(room_number, guest_name)
    return msg

@tool
def lookup_hotel_policy(query: str) -> str:
    """
    Useful for answering questions about check-in, Wi-Fi, pool hours, and amenities.
    Input should be a specific question like 'when is the pool open?' or 'wifi password'.
    """
    results = search_manual(query)
    if not results:
        return "I couldn't find that information in the guest manual."
    return "\n\n".join(results)

# Export all tools
tools = [check_room_availability, describe_specific_room, get_hotel_amenities, book_room, lookup_hotel_policy]

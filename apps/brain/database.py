import sqlite3
import os
import logging

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data', 'hotel.db')

class Database:
    def __init__(self, db_path=DB_PATH):
        self.db_path = db_path
        self._initialize()

    def _get_conn(self):
        return sqlite3.connect(self.db_path)

    def _initialize(self):
        """Initialize database schema and seed data if empty."""
        conn = self._get_conn()
        cursor = conn.cursor()

        # Create Tables
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS hotels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS rooms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                number TEXT NOT NULL UNIQUE,
                type TEXT DEFAULT 'STANDARD',
                status TEXT DEFAULT 'AVAILABLE',
                price REAL DEFAULT 100.0
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guest_name TEXT NOT NULL,
                room_id INTEGER,
                FOREIGN KEY(room_id) REFERENCES rooms(id)
            )
        ''')
        conn.commit()

        # Seed Data if hotels table is empty
        cursor.execute('SELECT count(*) FROM hotels')
        if cursor.fetchone()[0] == 0:
            logging.info("Seeding database...")
            cursor.execute("INSERT INTO hotels (name) VALUES ('Grand Budapest')")
            
            # Rooms 101-105
            rooms = [
                ('101', 'AVAILABLE'),
                ('102', 'AVAILABLE'),
                ('103', 'OCCUPIED'),
                ('104', 'AVAILABLE'),
                ('105', 'AVAILABLE')
            ]
            for num, status in rooms:
                cursor.execute("INSERT INTO rooms (number, status) VALUES (?, ?)", (num, status))
            
            conn.commit()
            logging.info("Database seeded.")
        
        conn.close()

    def check_availability(self):
        """Return list of available room numbers."""
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT number, type, price FROM rooms WHERE status = 'AVAILABLE'")
        rooms = [{'number': r[0], 'type': r[1], 'price': r[2]} for r in cursor.fetchall()]
        conn.close()
        return rooms

    def book_room(self, room_number, guest_name):
        """Book a room for a guest."""
        conn = self._get_conn()
        cursor = conn.cursor()
        
        try:
            # Check availability first
            cursor.execute("SELECT id FROM rooms WHERE number = ? AND status = 'AVAILABLE'", (room_number,))
            row = cursor.fetchone()
            if not row:
                return False, "Room not available or does not exist."
            
            room_id = row[0]
            
            # Create booking
            cursor.execute("INSERT INTO bookings (guest_name, room_id) VALUES (?, ?)", (guest_name, room_id))
            
            # Update room status
            cursor.execute("UPDATE rooms SET status = 'OCCUPIED' WHERE id = ?", (room_id,))
            
            conn.commit()
            return True, f"Room {room_number} booked for {guest_name}."
        except Exception as e:
            conn.rollback()
            return False, str(e)
        finally:
            conn.close()

if __name__ == "__main__":
    # Test script
    print(f"Initializing database at {DB_PATH}")
    db = Database()
    
    print("Checking availability:")
    available = db.check_availability()
    print(available)
    
    print("\nBooking Room 101 for Alice:")
    success, msg = db.book_room('101', 'Alice')
    print(f"{success}: {msg}")
    
    print("\nChecking availability again:")
    available = db.check_availability()
    print(available)

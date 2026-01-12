import sqlite3
import os
import logging

# Define path relative to this script
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data', 'hotel.db')

class Database:
    def __init__(self, db_path=DB_PATH):
        self.db_path = db_path
        self._initialize()

    def _get_conn(self):
        return sqlite3.connect(self.db_path)

    def _initialize(self):
        """Initialize database schema and seed data if empty."""
        # Ensure data directory exists
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        conn = self._get_conn()
        cursor = conn.cursor()

        # Create Tables
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS rooms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                number TEXT NOT NULL UNIQUE,
                type TEXT DEFAULT 'STANDARD',
                status TEXT DEFAULT 'AVAILABLE',
                price REAL DEFAULT 100.0,
                description TEXT
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

        # Seed Data if table is empty
        cursor.execute('SELECT count(*) FROM rooms')
        if cursor.fetchone()[0] == 0:
            logging.info("Seeding database with Rich Content...")
            
            # Room Data: (Number, Status, Price, Description)
            rooms = [
                ('101', 'AVAILABLE', 150.0, "The Alpine Suite: Features a balcony with a view of the snowy peaks, vintage oak furniture, and a complimentary bottle of sparkling water."),
                ('102', 'AVAILABLE', 120.0, "The Mendl's Room: Decorated in pastel pinks and creams. Comes with a box of fresh pastries delivered every morning."),
                ('103', 'OCCUPIED', 200.0, "The Society Room: Dark wood paneling, velvet armchairs, and a secret bookshelf that opens... well, we shouldn't say."),
                ('104', 'AVAILABLE', 100.0, "The Courtyard Standard: A quiet, cozy room facing the inner garden. Perfect for writers and poets."),
                ('105', 'AVAILABLE', 300.0, "The Grand Royal: Our finest suite. Four-poster bed, crystal chandelier, and a private bath with gold-plated fixtures.")
            ]
            
            for num, status, price, desc in rooms:
                cursor.execute(
                    "INSERT INTO rooms (number, status, price, description) VALUES (?, ?, ?, ?)", 
                    (num, status, price, desc)
                )
            
            conn.commit()
            logging.info("Database seeded.")
        
        conn.close()

    def check_availability(self):
        """Return list of available room numbers with basic info."""
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT number, type, price FROM rooms WHERE status = 'AVAILABLE'")
        rooms = [{'number': r[0], 'type': r[1], 'price': r[2]} for r in cursor.fetchall()]
        conn.close()
        return rooms

    def get_room_details(self, room_number):
        """Get the full description of a specific room."""
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT number, type, price, description, status FROM rooms WHERE number = ?", (room_number,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                "number": row[0],
                "type": row[1],
                "price": row[2],
                "description": row[3],
                "status": row[4]
            }
        return None

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

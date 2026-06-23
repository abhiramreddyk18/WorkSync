import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables from the server directory
load_dotenv(dotenv_path="../server/.env")

MONGO_URI = os.getenv("MONGOURI", "mongodb://localhost:27017/org")
client = MongoClient(MONGO_URI)
db = client.get_database()

# Collections matching mongoose models
employees_col = db["employees"]
attendance_col = db["attendances"]
leaves_col = db["leaves"]
admins_col = db["admins"]

import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables from the server directory
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../server/.env"))
load_dotenv(dotenv_path=env_path, override=True)

MONGO_URI = os.getenv("MONGOURI")
client = MongoClient(MONGO_URI)
db = client.get_database()

# Collections matching mongoose models
employees_col = db["employees"]
attendance_col = db["attendances"]
leaves_col = db["leaves"]
admins_col = db["admins"]

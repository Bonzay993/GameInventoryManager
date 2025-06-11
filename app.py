from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from pymongo import MongoClient
from bson.json_util import dumps
from bson.objectid import ObjectId

app = Flask(__name__, static_folder='static')
CORS(app)

# MongoDB setup - replace the connection string with your MongoDB URI
app.config["MONGO_DBNAME"] = os.environ.get("MONGO_DBNAME")
app.config["MONGO_URI"] = os.environ.get("MONGO_URI")
app.secret_key = os.environ.get("SECRET_KEY")
games_collection = db['games']

@app.route('/')
def serve_frontend():
    return send_from_directory('static', 'index.html')

@app.route('/games', methods=['GET'])
def get_games():
    games = list(games_collection.find())
    return dumps(games), 200, {'Content-Type': 'application/json'}

@app.route('/search', methods=['GET'])
def search_games():
    query = request.args.get('query', '').lower()
    results = list(games_collection.find({"name": {"$regex": query, "$options": "i"}}))
    return dumps(results), 200, {'Content-Type': 'application/json'}

@app.route('/add', methods=['POST'])
def add_game():
    data = request.get_json()
    name = data.get('name')
    platform = data.get('platform')
    if not name or not platform:
        return jsonify({"status": "error", "message": "Missing name or platform"}), 400

    # Check for duplicates (case-insensitive)
    existing = games_collection.find_one({
        "name": {"$regex": f"^{name}$", "$options": "i"},
        "platform": {"$regex": f"^{platform}$", "$options": "i"}
    })
    if existing:
        return jsonify({"status": "error", "message": "Game already exists"}), 400

    game_doc = {"name": name, "platform": platform}
    games_collection.insert_one(game_doc)
    return jsonify({"status": "success"}), 201

if __name__ == '__main__':
    app.run(debug=True)
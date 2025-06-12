import os
import requests
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from pymongo import MongoClient
from bson.json_util import dumps
from bson.objectid import ObjectId

if os.path.exists("env.py"):
    import env

app = Flask(__name__)

# MongoDB setup
app.config["MONGO_DBNAME"] = os.environ.get("MONGO_DBNAME")
app.config["MONGO_URI"] = os.environ.get("MONGO_URI")
app.secret_key = os.environ.get("SECRET_KEY")

client = MongoClient(app.config["MONGO_URI"])
db = client[app.config["MONGO_DBNAME"]]
games_collection = db['games']

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/games', methods=['GET'])
def get_games():
    games = list(games_collection.find())
    return dumps(games), 200, {'Content-Type': 'application/json'}

@app.route('/game-image', methods=['GET'])  # <-- fixed here
def get_game_image():
    name = request.args.get('name')
    if not name:
        return jsonify({"error": "Missing game name"}), 400

    api_key = os.environ.get("RAWG_API_KEY")
    url = f"https://api.rawg.io/api/games?key={api_key}&search={name}&page_size=1"

    try:
        res = requests.get(url)
        data = res.json()
        if data.get("results"):
            return jsonify({
                "image": data["results"][0].get("background_image")
            })
        else:
            return jsonify({"image": None})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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

    existing = games_collection.find_one({
        "name": {"$regex": f"^{name}$", "$options": "i"},
        "platform": {"$regex": f"^{platform}$", "$options": "i"}
    })
    if existing:
        return jsonify({"status": "error", "message": "Game already exists"}), 400

    game_doc = {"name": name, "platform": platform}
    games_collection.insert_one(game_doc)
    return jsonify({"status": "success"}), 201

@app.route('/delete/<game_id>', methods=['DELETE'])
def delete_game(game_id):
    result = games_collection.delete_one({"_id": ObjectId(game_id)})
    if result.deleted_count == 1:
        return jsonify({"status": "success"}), 200
    else:
        return jsonify({"status": "error", "message": "Game not found"}), 404

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)

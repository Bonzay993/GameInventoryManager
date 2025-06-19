import os
import requests
from flask import Flask, request, jsonify, render_template
from pymongo import MongoClient
from bson.json_util import dumps
from bson.objectid import ObjectId
from bson.errors import InvalidId

if os.path.exists("env.py"):
    import env

app = Flask(__name__)

app.config["MONGO_DBNAME"] = os.environ.get("MONGO_DBNAME")
app.config["MONGO_URI"] = os.environ.get("MONGO_URI")
app.secret_key = os.environ.get("SECRET_KEY")

client = MongoClient(app.config["MONGO_URI"])
db = client[app.config["MONGO_DBNAME"]]
games_collection = db['games']


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/game/<game_id>', methods=['GET', 'POST'])
def edit_game_page(game_id):
    try:
        object_id = ObjectId(game_id)
    except InvalidId:
        return jsonify({"message": "Invalid game ID"}), 400

    if request.method == 'POST':
        if request.is_json:
            data = request.get_json()
            name = data.get('name', '').strip()
            platform = data.get('platform', '').strip()
            image_url = data.get('image_url', '').strip() or None

            if not name or not platform:
                return jsonify({"message": "Name and platform are required."}), 400

            update_result = games_collection.update_one(
                {"_id": object_id},
                {"$set": {
                    "name": name,
                    "platform": platform,
                    "image_url": image_url
                }}
            )
            if update_result.matched_count == 0:
                return jsonify({"message": "Game not found."}), 404

            return jsonify({"message": "Changes saved successfully!"}), 200

        # Fallback normal form POST (optional)
        else:
            name = request.form.get('name', '').strip()
            platform = request.form.get('platform', '').strip()
            image_url = request.form.get('image_url', '').strip() or None

            if not name or not platform:
                return "Name and platform are required.", 400

            games_collection.update_one(
                {"_id": object_id},
                {"$set": {
                    "name": name,
                    "platform": platform,
                    "image_url": image_url
                }}
            )
            return render_template('edit_game.html', game=games_collection.find_one({"_id": object_id}))

    game = games_collection.find_one({"_id": object_id})
    if not game:
        return "Game not found", 404
    return render_template('edit_game.html', game=game)


@app.route('/delete/<game_id>', methods=['DELETE'])
def delete_game_api(game_id):
    data = request.get_json()
    code = data.get('deletion_code') if data else None

    if not code or code != os.environ.get('DELETION_CODE'):
        return jsonify({"status": "error", "message": "Invalid deletion code."}), 403

    try:
        object_id = ObjectId(game_id)
    except InvalidId:
        return jsonify({"message": "Invalid game ID"}), 400

    result = games_collection.delete_one({"_id": object_id})
    if result.deleted_count == 1:
        return jsonify({"status": "success"}), 200
    else:
        return jsonify({"status": "error", "message": "Game not found"}), 404


@app.route('/games', methods=['GET'])
def get_games():
    games = list(games_collection.find())
    return dumps(games), 200, {'Content-Type': 'application/json'}


@app.route('/game-image', methods=['GET'])
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
    query = request.args.get('query', '').strip()
    platform = request.args.get('platform', '').strip()

    mongo_query = {}
    if query:
        mongo_query["name"] = {"$regex": query, "$options": "i"}
    if platform:
        mongo_query["platform"] = platform

    games = list(games_collection.find(mongo_query))
    return dumps(games), 200, {'Content-Type': 'application/json'}


@app.route('/add', methods=['POST'])
def add_game():
    data = request.get_json()
    name = data.get('name', '').strip()
    platform = data.get('platform', '').strip()
    image_url = data.get('image_url', '').strip() or None

    if not name or not platform:
        return jsonify({"message": "Name and platform are required."}), 400

    result = games_collection.insert_one({
        "name": name,
        "platform": platform,
        "image_url": image_url
    })

    if result.inserted_id:
        return jsonify({"message": "Game added successfully!"}), 201
    else:
        return jsonify({"message": "Failed to add game."}), 500

if __name__ == "__main__":
    app.run(host=os.environ.get("IP"),
        port=int(os.environ.get("PORT")),
        debug=True)
import pytest
from unittest.mock import patch, MagicMock

import app

@pytest.fixture
def client():
    app.app.config["TESTING"] = True
    with app.app.test_client() as client:
        yield client

def test_add_success(client):
    with patch.object(app, "games_collection") as mock_col:
        mock_col.insert_one.return_value = MagicMock(inserted_id="1")
        response = client.post("/add", json={"name": "Game", "platform": "PC"})
        assert response.status_code == 201
        assert response.get_json()["message"] == "Game added successfully!"
        mock_col.insert_one.assert_called_once_with({"name": "Game", "platform": "PC", "image_url": None})

def test_add_missing_fields(client):
    response = client.post("/add", json={"name": "Game"})
    assert response.status_code == 400
    assert response.get_json()["message"] == "Name and platform are required."

from flask import Blueprint, jsonify
from services.graph_service import get_graph, get_recommendations

graph_bp = Blueprint("graph", __name__)


@graph_bp.route("/<user_id>")
def get_user_graph(user_id: str):
    data = get_graph(user_id)
    return jsonify(data)


@graph_bp.route("/<user_id>/recommendations")
def get_user_recommendations(user_id: str):
    recs = get_recommendations(user_id)
    return jsonify({"recommendations": recs})

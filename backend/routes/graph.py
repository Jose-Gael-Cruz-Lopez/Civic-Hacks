from fastapi import APIRouter

from services.graph_service import get_graph, get_recommendations

router = APIRouter()


@router.get("/{user_id}")
def get_user_graph(user_id: str):
    return get_graph(user_id)


@router.get("/{user_id}/recommendations")
def get_user_recommendations(user_id: str):
    return {"recommendations": get_recommendations(user_id)}

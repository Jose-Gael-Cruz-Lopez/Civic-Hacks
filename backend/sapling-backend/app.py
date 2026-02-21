from flask import Flask
from flask_cors import CORS
from config import FLASK_PORT, FRONTEND_URL

from routes.graph import graph_bp
from routes.learn import learn_bp
from routes.quiz import quiz_bp
from routes.calendar_routes import calendar_bp
from routes.social import social_bp

app = Flask(__name__)
CORS(app, origins=[FRONTEND_URL, "http://localhost:3000"])

app.register_blueprint(graph_bp, url_prefix="/api/graph")
app.register_blueprint(learn_bp, url_prefix="/api/learn")
app.register_blueprint(quiz_bp, url_prefix="/api/quiz")
app.register_blueprint(calendar_bp, url_prefix="/api/calendar")
app.register_blueprint(social_bp, url_prefix="/api/social")


@app.route("/api/health")
def health():
    return {"status": "ok", "service": "sapling-backend"}


if __name__ == "__main__":
    app.run(port=FLASK_PORT, debug=True)

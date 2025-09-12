import os
import mimetypes
import time
import json
from flask import Flask, request, send_file, jsonify, Response
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename
import google.generativeai as genai
from datetime import datetime, timedelta
from docx import Document
from reportlab.pdfgen import canvas
from dotenv import load_dotenv
from flask_cors import CORS
from collections import Counter

# ------------------------
# Load environment variables
# ------------------------
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# ------------------------
# Flask Configuration
# ------------------------
app = Flask(__name__)
CORS(app)

app.config['UPLOAD_FOLDER'] = "uploads"
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# ------------------------
# Database Model
# ------------------------
class Meeting(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(200))
    transcript = db.Column(db.Text)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

with app.app_context():
    db.create_all()

# ------------------------
# Gemini Model
# ------------------------
model = genai.GenerativeModel("gemini-2.0-flash")

# ------------------------
# Helper: Gemini Processing
# ------------------------
def process_audio_with_gemini(filepath):
    mime_type, _ = mimetypes.guess_type(filepath)
    if mime_type is None:
        mime_type = "audio/wav"

    with open(filepath, "rb") as f:
        audio_bytes = f.read()

    response = model.generate_content(
        [
            "Transcribe this meeting audio. If not in English, translate to English. "
            "Then format the output exactly like this:\n\n"
            "Abstract Summary\n"
            "<short abstract summary paragraph>\n\n"
            "Key Points\n"
            ". Point 1\n"
            ". Point 2\n"
            ". Point 3\n\n"
            "Action Items\n"
            "1. Action 1\n"
            "2. Action 2\n\n"
            "Sentiment\n"
            "<brief sentiment paragraph>",
            {"mime_type": mime_type, "data": audio_bytes},
        ]
    )
    return response.text

# ------------------------
# Helper: Progress Generator (SSE)
# ------------------------
def generate_progress(filepath, filename):
    steps = ["Transcription", "Translation", "Optimization", "Notes Generation"]

    # Fake progress for first 3 steps
    for step in steps[:-1]:
        for p in range(0, 101, 25):
            yield f"data: {json.dumps({'step': step, 'progress': p})}\n\n"
            time.sleep(0.5)

    # ------------------------
    # Notes Generation step
    # ------------------------
    step = "Notes Generation"

    # Start fake progress in parallel with Gemini call
    import threading
    result_holder = {"notes": None}

    def run_gemini():
        notes = process_audio_with_gemini(filepath)
        result_holder["notes"] = notes
        # Save DB safely inside app context
        with app.app_context():
            meeting = Meeting(filename=filename, transcript="(Transcript handled by Gemini)", notes=notes)
            db.session.add(meeting)
            db.session.commit()

    thread = threading.Thread(target=run_gemini)
    thread.start()

    # While Gemini is running, send incremental progress
    for p in range(0, 101, 10):
        yield f"data: {json.dumps({'step': step, 'progress': p})}\n\n"
        time.sleep(1)
        if result_holder["notes"]:  # Gemini finished early
            break

    # Ensure thread finished
    thread.join()

    # Final event with notes
    yield f"data: {json.dumps({'step': step, 'progress': 100, 'notes': result_holder['notes']})}\n\n"


# ------------------------
# Get history
# ------------------------
@app.route("/api/history", methods=["GET"])
def history():
    meetings = Meeting.query.order_by(Meeting.created_at.desc()).all()
    return jsonify([
        {
            "id": m.id,
            "filename": m.filename,
            "notes": m.notes,
            "created_at": m.created_at
        }
        for m in meetings
    ])


# ------------------------
# Stats for dashboard charts
# ------------------------
@app.route("/api/stats", methods=["GET"])
def stats():
    meetings = Meeting.query.all()

    # total uploads
    total_uploads = len(meetings)

    # total words
    total_words = sum(len(m.notes.split()) for m in meetings if m.notes)

    # last 7 days uploads
    today = datetime.utcnow().date()
    last_7_days = [(today - timedelta(days=i)).strftime("%a") for i in range(6, -1, -1)]

    uploads_by_day = Counter(m.created_at.date().strftime("%a") for m in meetings)
    uploads_data = [uploads_by_day.get(day, 0) for day in last_7_days]

    return jsonify({
        "total_uploads": total_uploads,
        "total_words": total_words,
        "labels": last_7_days,
        "uploads": uploads_data
    })


# ------------------------
# NEW: Upload with live progress (SSE)
# ------------------------
@app.route("/api/upload_with_progress", methods=["POST"])
def upload_with_progress():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    return Response(generate_progress(filepath, filename), mimetype="text/event-stream")

# ------------------------
# OLD Upload (simple response, no progress)
# ------------------------
@app.route("/api/upload", methods=["POST"])
def upload():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    notes = process_audio_with_gemini(filepath)

    meeting = Meeting(filename=filename, transcript="(Transcript handled by Gemini)", notes=notes)
    db.session.add(meeting)
    db.session.commit()

    return jsonify({
        "id": meeting.id,
        "filename": meeting.filename,
        "notes": meeting.notes,
        "created_at": meeting.created_at
    })

# ------------------------
# Run App
# ------------------------
if __name__ == "__main__":
    if not os.path.exists("uploads"):
        os.makedirs("uploads")
    if not os.path.exists("outputs"):
        os.makedirs("outputs")
    app.run(debug=True, host="0.0.0.0", port=5000)

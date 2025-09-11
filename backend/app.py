import os
import mimetypes
from flask import Flask, request, send_file, jsonify
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
CORS(app)  # allow React frontend to call API

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

# create tables safely inside app context
with app.app_context():
    db.create_all()

# ------------------------
# Gemini Processing
# ------------------------
model = genai.GenerativeModel("gemini-2.0-flash")

def process_audio_with_gemini(filepath):
    mime_type, _ = mimetypes.guess_type(filepath)
    if mime_type is None:
        mime_type = "audio/wav"  # fallback

    with open(filepath, "rb") as f:
        audio_bytes = f.read()

    # Better prompt for desired format
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
            {
                "mime_type": mime_type,
                "data": audio_bytes
            }
        ]
    )

    return response.text


# ------------------------
# API Routes
# ------------------------

# Upload + Process audio
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

    # Process with Gemini
    notes = process_audio_with_gemini(filepath)

    # Save to DB
    meeting = Meeting(filename=filename, transcript="(Transcript handled by Gemini)", notes=notes)
    db.session.add(meeting)
    db.session.commit()

    return jsonify({
        "id": meeting.id,
        "filename": meeting.filename,
        "notes": meeting.notes,
        "created_at": meeting.created_at
    })


# Get history
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


# Download Word/PDF
@app.route("/api/download/<int:id>/<string:format>")
def download(id, format):
    meeting = Meeting.query.get_or_404(id)

    if format == "word":
        filepath = f"outputs/notes_{id}.docx"
        doc = Document()
        doc.add_heading("Meeting Notes", 0)

        # Parse notes into sections
        if "Abstract Summary" in meeting.notes:
            doc.add_heading("Abstract Summary", level=1)
            section = meeting.notes.split("Key Points")[0]
            summary = section.replace("Abstract Summary", "").strip()
            doc.add_paragraph(summary)

        if "Key Points" in meeting.notes:
            doc.add_heading("Key Points", level=1)
            section = meeting.notes.split("Key Points")[1]
            if "Action Items" in section:
                section = section.split("Action Items")[0]
            points = [line.strip() for line in section.splitlines() if line.strip().startswith(".")]
            for p in points:
                doc.add_paragraph(p.replace(".", "").strip(), style="List Bullet")

        if "Action Items" in meeting.notes:
            doc.add_heading("Action Items", level=1)
            section = meeting.notes.split("Action Items")[1]
            if "Sentiment" in section:
                section = section.split("Sentiment")[0]
            actions = [line.strip() for line in section.splitlines() if line.strip() and line.strip()[0].isdigit()
]
            for a in actions:
                doc.add_paragraph(a, style="List Number")

        if "Sentiment" in meeting.notes:
            doc.add_heading("Sentiment", level=1)
            sentiment = meeting.notes.split("Sentiment")[1].strip()
            doc.add_paragraph(sentiment)

        doc.save(filepath)
        return send_file(filepath, as_attachment=True)

    elif format == "pdf":
        filepath = f"outputs/notes_{id}.pdf"
        c = canvas.Canvas(filepath)

        # Fonts
        heading_font_size = 16
        normal_font_size = 12

        y = 800
        c.setFont("Helvetica-Bold", 20)
        c.drawString(200, y, "Meeting Notes")
        y -= 40

        def draw_section(title, content_lines):
            nonlocal y
            c.setFont("Helvetica-Bold", heading_font_size)
            c.drawString(100, y, title)
            y -= 25
            c.setFont("Helvetica", normal_font_size)
            for line in content_lines:
                if not line.strip():
                    continue
                wrapped = [line[i:i+80] for i in range(0, len(line), 80)]
                for w in wrapped:
                    c.drawString(120, y, w.strip())
                    y -= 15
            y -= 20

        notes = meeting.notes.splitlines()
        sections = {"Abstract Summary": [], "Key Points": [], "Action Items": [], "Sentiment": []}
        current = None
        for line in notes:
            if line.startswith("Abstract Summary"):
                current = "Abstract Summary"
            elif line.startswith("Key Points"):
                current = "Key Points"
            elif line.startswith("Action Items"):
                current = "Action Items"
            elif line.startswith("Sentiment"):
                current = "Sentiment"
            elif current:
                sections[current].append(line)

        for title, content in sections.items():
            if content:
                draw_section(title, content)

        c.save()
        return send_file(filepath, as_attachment=True)

    return jsonify({"error": "Invalid format"}), 400


# Charts
@app.route("/api/stats", methods=["GET"])
def stats():
    meetings = Meeting.query.all()

    total_uploads = len(meetings)
    total_words = sum(len(m.notes.split()) for m in meetings if m.notes)

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
# Run the App
# ------------------------
if __name__ == "__main__":
    if not os.path.exists("uploads"):
        os.makedirs("uploads")
    if not os.path.exists("outputs"):
        os.makedirs("outputs")
    app.run(debug=True, host="0.0.0.0", port=5000)

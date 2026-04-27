"""
PolyScan - Flask backend bridging the React frontend to Roboflow's
wall-defect-detection workflow.

Endpoints
---------
POST /api/analyze           Upload an image -> returns defect predictions JSON.
POST /api/report            Generate a PDF inspection report.
POST /api/history           Save an analysis to history.
GET  /api/history           List all saved analyses.
GET  /api/history/<id>      Get a specific saved analysis.
DELETE /api/history/<id>    Delete a saved analysis.
GET  /api/health            Liveness check.
"""

import os
import io
import base64
import json
import sqlite3
import tempfile
from datetime import datetime

from flask import Flask, request, jsonify, send_file
from fpdf import FPDF
from flask_cors import CORS
from dotenv import load_dotenv
from inference_sdk import InferenceHTTPClient

load_dotenv()

app = Flask(__name__)
CORS(app)

# ── Roboflow client configuration ───────────────────────────────────────────
API_KEY      = os.getenv("ROBOFLOW_API_KEY", "")
WORKSPACE    = os.getenv("ROBOFLOW_WORKSPACE", "elaas-workspace")
WORKFLOW_ID  = os.getenv("ROBOFLOW_WORKFLOW_ID",
                         "wall-defect-detection-pipeline-1774861760190")
API_URL      = os.getenv("ROBOFLOW_API_URL",
                         "https://serverless.roboflow.com")

client = InferenceHTTPClient(api_url=API_URL, api_key=API_KEY)

# -- SQLite database for analysis history ------------------------------------
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "polyscan.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS history (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp   TEXT    NOT NULL,
            defect_count INTEGER NOT NULL DEFAULT 0,
            severity    TEXT    NOT NULL DEFAULT 'N/A',
            predictions TEXT    NOT NULL DEFAULT '[]',
            thumbnail   TEXT,
            filename    TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()


# ── /api/health ─────────────────────────────────────────────────────────────
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "roboflow_configured": bool(API_KEY),
    })


# ── /api/analyze ────────────────────────────────────────────────────────────
@app.route("/api/analyze", methods=["POST"])
def analyze():
    """Accept an uploaded image, run it through the Roboflow workflow,
    and return structured defect predictions."""

    if "image" not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    image_file = request.files["image"]
    if image_file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    # Save to a temp file so inference_sdk can read it
    suffix = os.path.splitext(image_file.filename)[1] or ".jpg"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        image_file.save(tmp.name)
        tmp.close()

        # Run the Roboflow workflow
        result = client.run_workflow(
            workspace_name=WORKSPACE,
            workflow_id=WORKFLOW_ID,
            images={"image": tmp.name},
        )

        # ── Normalise the response ──────────────────────────────────────
        predictions = []
        visualized_image = None
        defect_count = 0

        if isinstance(result, list) and len(result) > 0:
            workflow_output = result[0]

            # Try to extract predictions from common workflow output keys
            for key in ("predictions", "model_predictions",
                        "object_detection_predictions"):
                if key in workflow_output:
                    raw = workflow_output[key]
                    if isinstance(raw, dict) and "predictions" in raw:
                        raw = raw["predictions"]
                    if isinstance(raw, list):
                        for pred in raw:
                            predictions.append({
                                "class": pred.get("class", "unknown"),
                                "confidence": round(
                                    pred.get("confidence", 0) * 100, 1
                                ),
                                "x": pred.get("x", 0),
                                "y": pred.get("y", 0),
                                "width": pred.get("width", 0),
                                "height": pred.get("height", 0),
                            })
                    break

            # Try to grab a visualised image (base64 or URL)
            for key in ("visualization", "visualized_image",
                        "output_image"):
                if key in workflow_output:
                    visualized_image = workflow_output[key]
                    break

            defect_count = len(predictions)

        # If predictions list is still empty, pass the raw output for
        # debugging in the frontend console.
        return jsonify({
            "success": True,
            "defect_count": defect_count,
            "predictions": predictions,
            "visualized_image": visualized_image,
            "raw_output": result if not predictions else None,
            "timestamp": datetime.utcnow().isoformat(),
        })

    except Exception as exc:
        return jsonify({
            "error": str(exc),
            "hint": "Check your Roboflow API key and workflow ID.",
        }), 500

    finally:
        os.unlink(tmp.name)


# -- /api/history CRUD -------------------------------------------------------
@app.route("/api/history", methods=["POST"])
def save_history():
    """Save an analysis result to history."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    conn = get_db()
    conn.execute(
        "INSERT INTO history (timestamp, defect_count, severity, predictions, thumbnail, filename) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (
            data.get("timestamp", datetime.utcnow().isoformat()),
            data.get("defect_count", 0),
            data.get("severity", "N/A"),
            json.dumps(data.get("predictions", [])),
            data.get("thumbnail"),   # base64 small preview
            data.get("filename", "image.jpg"),
        ),
    )
    conn.commit()
    row_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    conn.close()

    return jsonify({"success": True, "id": row_id}), 201


@app.route("/api/history", methods=["GET"])
def list_history():
    """Return all saved analyses (most recent first), without full thumbnail."""
    conn = get_db()
    rows = conn.execute(
        "SELECT id, timestamp, defect_count, severity, filename "
        "FROM history ORDER BY id DESC"
    ).fetchall()
    conn.close()

    return jsonify([dict(r) for r in rows])


@app.route("/api/stats", methods=["GET"])
def dashboard_stats():
    """Aggregate history data for the dashboard."""
    conn = get_db()

    # Total analyses and defects
    totals = conn.execute(
        "SELECT COUNT(*) as total_analyses, "
        "COALESCE(SUM(defect_count), 0) as total_defects "
        "FROM history"
    ).fetchone()

    # Defect types breakdown from all predictions
    rows = conn.execute("SELECT predictions FROM history").fetchall()
    type_counts = {}
    for row in rows:
        preds = json.loads(row["predictions"])
        for p in preds:
            cls = p.get("class", "unknown").capitalize()
            type_counts[cls] = type_counts.get(cls, 0) + 1

    type_data = [{"name": k, "n": v} for k, v in
                 sorted(type_counts.items(), key=lambda x: -x[1])]

    # Timeline: defects per analysis (last 10)
    timeline_rows = conn.execute(
        "SELECT timestamp, defect_count FROM history "
        "ORDER BY id ASC LIMIT 10"
    ).fetchall()

    cumulative = 0
    timeline = []
    for r in timeline_rows:
        cumulative += r["defect_count"]
        try:
            t_label = datetime.fromisoformat(
                r["timestamp"].replace("Z", "+00:00")
            ).strftime("%H:%M")
        except Exception:
            t_label = "?"
        timeline.append({"t": t_label, "d": cumulative})

    # Recent analyses for the "Derniers defauts" section
    recent = conn.execute(
        "SELECT id, timestamp, defect_count, severity, predictions, filename "
        "FROM history ORDER BY id DESC LIMIT 5"
    ).fetchall()

    recent_list = []
    for r in recent:
        preds = json.loads(r["predictions"])
        try:
            t_label = datetime.fromisoformat(
                r["timestamp"].replace("Z", "+00:00")
            ).strftime("%H:%M")
        except Exception:
            t_label = "?"
        for p in preds:
            recent_list.append({
                "type": p.get("class", "unknown").capitalize(),
                "confidence": p.get("confidence", 0),
                "severity": r["severity"],
                "time": t_label,
                "filename": r["filename"],
            })

    conn.close()

    return jsonify({
        "total_analyses": totals["total_analyses"],
        "total_defects": totals["total_defects"],
        "type_data": type_data,
        "timeline": timeline,
        "recent_defects": recent_list[:8],
    })


@app.route("/api/history/<int:record_id>", methods=["GET"])
def get_history(record_id):
    """Return a single saved analysis with full data."""
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM history WHERE id = ?", (record_id,)
    ).fetchone()
    conn.close()

    if not row:
        return jsonify({"error": "Not found"}), 404

    result = dict(row)
    result["predictions"] = json.loads(result["predictions"])
    return jsonify(result)


@app.route("/api/history/<int:record_id>", methods=["DELETE"])
def delete_history(record_id):
    """Delete a saved analysis."""
    conn = get_db()
    conn.execute("DELETE FROM history WHERE id = ?", (record_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


# ── /api/report ─────────────────────────────────────────────────────────────
@app.route("/api/report", methods=["POST"])
def generate_report():
    """Generate a professional PDF inspection report from analysis results."""

    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        predictions  = data.get("predictions", [])
        defect_count = data.get("defect_count", 0)
        timestamp    = data.get("timestamp", datetime.utcnow().isoformat())
        image_b64    = data.get("image")  # base64-encoded image
        severity     = data.get("severity", "N/A")

        # ── Build PDF ───────────────────────────────────────────────────
        def safe(text):
            """Replace Unicode chars unsupported by Helvetica."""
            return (str(text)
                    .replace("\u2014", "-")   # em-dash
                    .replace("\u2013", "-")   # en-dash
                    .replace("\u2018", "'")   # left single quote
                    .replace("\u2019", "'")   # right single quote
                    .replace("\u201c", '"')   # left double quote
                    .replace("\u201d", '"')   # right double quote
                    .replace("\u2026", "...") # ellipsis
                    .replace("\u00e9", "e")   # é
                    .replace("\u00e8", "e")   # è
                    .replace("\u00ea", "e")   # ê
                    .replace("\u00e0", "a")   # à
                    .replace("\u00c9", "E")   # É
                    )

        pdf = FPDF()
        pdf.set_auto_page_break(auto=True, margin=20)
        pdf.add_page()

        # — Header bar —
        pdf.set_fill_color(6, 13, 28)  # dark navy
        pdf.rect(0, 0, 210, 38, "F")
        pdf.set_fill_color(34, 211, 238)  # accent cyan
        pdf.rect(0, 37, 210, 1.5, "F")

        pdf.set_text_color(34, 211, 238)
        pdf.set_font("Helvetica", "B", 22)
        pdf.set_xy(15, 10)
        pdf.cell(0, 10, "POLYSCAN", ln=False)

        pdf.set_text_color(200, 215, 235)
        pdf.set_font("Helvetica", "", 10)
        pdf.set_xy(15, 22)
        pdf.cell(0, 6, "Rapport d'inspection automatique", ln=True)

        pdf.ln(18)

        # — Report metadata —
        pdf.set_text_color(60, 60, 60)
        pdf.set_font("Helvetica", "B", 13)
        pdf.cell(0, 8, "Informations du rapport", ln=True)
        pdf.set_draw_color(34, 211, 238)
        pdf.line(15, pdf.get_y(), 195, pdf.get_y())
        pdf.ln(4)

        pdf.set_font("Helvetica", "", 10)
        report_date = datetime.fromisoformat(
            timestamp.replace("Z", "+00:00")
        ).strftime("%d/%m/%Y %H:%M:%S")

        meta_rows = [
            ("Date d'analyse", report_date),
            ("Nombre de defauts", str(defect_count)),
            ("Severite globale", severity),
            ("Modele IA", "Roboflow - wall-defect-detection-pipeline"),
        ]
        for label, value in meta_rows:
            pdf.set_font("Helvetica", "B", 10)
            pdf.cell(55, 7, f"  {safe(label)}:", ln=False)
            pdf.set_font("Helvetica", "", 10)
            pdf.cell(0, 7, safe(value), ln=True)

        pdf.ln(6)

        # — Image —
        if image_b64:
            pdf.set_font("Helvetica", "B", 13)
            pdf.cell(0, 8, "Image analysee", ln=True)
            pdf.set_draw_color(34, 211, 238)
            pdf.line(15, pdf.get_y(), 195, pdf.get_y())
            pdf.ln(4)

            try:
                # Strip data-URI prefix if present
                if "," in image_b64:
                    image_b64 = image_b64.split(",", 1)[1]
                img_bytes = base64.b64decode(image_b64)
                img_tmp = tempfile.NamedTemporaryFile(
                    delete=False, suffix=".jpg"
                )
                img_tmp.write(img_bytes)
                img_tmp.close()

                # Fit image to page width with margin
                pdf.image(img_tmp.name, x=15, w=180)
                os.unlink(img_tmp.name)
            except Exception:
                pdf.set_font("Helvetica", "I", 10)
                pdf.cell(0, 8, "  (Image non disponible)", ln=True)

            pdf.ln(6)

        # — Predictions table —
        if predictions:
            # Check if we need a new page
            if pdf.get_y() > 220:
                pdf.add_page()

            pdf.set_font("Helvetica", "B", 13)
            pdf.cell(0, 8, "Details des defauts detectes", ln=True)
            pdf.set_draw_color(34, 211, 238)
            pdf.line(15, pdf.get_y(), 195, pdf.get_y())
            pdf.ln(4)

            # Table header
            pdf.set_fill_color(6, 13, 28)
            pdf.set_text_color(200, 215, 235)
            pdf.set_font("Helvetica", "B", 9)
            col_w = [12, 40, 28, 28, 28, 24, 24]
            headers = ["#", "Type", "Confiance", "Pos. X", "Pos. Y",
                       "Largeur", "Hauteur"]
            for i, h in enumerate(headers):
                pdf.cell(col_w[i], 8, h, border=1, fill=True, align="C")
            pdf.ln()

            # Table rows
            pdf.set_text_color(40, 40, 40)
            pdf.set_font("Helvetica", "", 9)
            for idx, p in enumerate(predictions):
                if pdf.get_y() > 265:
                    pdf.add_page()
                bg = idx % 2 == 0
                if bg:
                    pdf.set_fill_color(240, 245, 250)
                else:
                    pdf.set_fill_color(255, 255, 255)

                row = [
                    f"#{idx + 1:03d}",
                    p.get("class", "?"),
                    f"{p.get('confidence', 0)}%",
                    str(round(p.get("x", 0))),
                    str(round(p.get("y", 0))),
                    str(round(p.get("width", 0))),
                    str(round(p.get("height", 0))),
                ]
                for i, val in enumerate(row):
                    pdf.cell(col_w[i], 7, val, border=1, fill=bg,
                             align="C")
                pdf.ln()

            pdf.ln(6)

        # — Recommendations —
        if pdf.get_y() > 240:
            pdf.add_page()

        pdf.set_text_color(60, 60, 60)
        pdf.set_font("Helvetica", "B", 13)
        pdf.cell(0, 8, "Recommandations", ln=True)
        pdf.set_draw_color(34, 211, 238)
        pdf.line(15, pdf.get_y(), 195, pdf.get_y())
        pdf.ln(4)

        pdf.set_font("Helvetica", "", 10)
        # Generate recommendations based on defect types
        defect_types = {p.get("class", "").lower() for p in predictions}

        recommendations = []
        if not predictions:
            recommendations.append(
                "Aucun defaut detecte. La surface inspectee est en "
                "bon etat. Planifier une reinspection dans 6 mois."
            )
        else:
            if any("crack" in t or "fissure" in t for t in defect_types):
                recommendations.append(
                    "FISSURES : Evaluer la profondeur et la progression. "
                    "Appliquer un mastic de reparation pour les fissures "
                    "superficielles. Consulter un ingenieur structure "
                    "pour les fissures profondes (> 2 mm)."
                )
            if any("humid" in t or "moisture" in t for t in defect_types):
                recommendations.append(
                    "HUMIDITE : Identifier la source d'infiltration. "
                    "Verifier l'etancheite et le drainage. "
                    "Traiter avec un produit anti-humidite."
                )
            if any("corros" in t for t in defect_types):
                recommendations.append(
                    "CORROSION : Nettoyer la zone affectee et appliquer "
                    "un traitement anti-corrosion. Verifier l'integrite "
                    "structurelle des armatures."
                )
            if any("ecaill" in t or "spall" in t for t in defect_types):
                recommendations.append(
                    "ECAILLAGE : Retirer les parties friables, "
                    "reparer avec un mortier adapte. "
                    "Verifier les causes (gel, humidite)."
                )
            if not recommendations:
                recommendations.append(
                    f"{defect_count} defaut(s) detecte(s). "
                    "Faire evaluer par un professionnel pour "
                    "determiner les reparations necessaires."
                )
            recommendations.append(
                "Planifier une reinspection dans 3 mois pour "
                "suivre l'evolution des defauts."
            )

        for i, rec in enumerate(recommendations, 1):
            pdf.multi_cell(0, 6, f"  {i}. {rec}")
            pdf.ln(2)

        # — Footer —
        pdf.ln(8)
        pdf.set_draw_color(180, 180, 180)
        pdf.line(15, pdf.get_y(), 195, pdf.get_y())
        pdf.ln(3)
        pdf.set_font("Helvetica", "I", 8)
        pdf.set_text_color(140, 140, 140)
        pdf.cell(
            0, 5,
            f"Rapport genere automatiquement par PolyScan | "
            f"{report_date} | Powered by Roboflow AI",
            align="C",
        )

        # ── Return PDF ──────────────────────────────────────────────────
        pdf_buffer = io.BytesIO()
        pdf.output(pdf_buffer)
        pdf_buffer.seek(0)

        filename = f"PolyScan_Rapport_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pdf"

        return send_file(
            pdf_buffer,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=filename,
        )

    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


if __name__ == "__main__":
    port = int(os.getenv("FLASK_PORT", 5000))
    print(f"\n  PolyScan backend running on http://localhost:{port}\n")
    app.run(host="0.0.0.0", port=port, debug=True)

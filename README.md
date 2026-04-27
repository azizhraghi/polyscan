# PolyScan — Robot d'Inspection + Détection de Défauts IA

Interface de contrôle et supervision d'un robot d'inspection de surfaces, avec détection automatique de défauts (fissures, humidité, corrosion…) grâce à l'IA **Roboflow**.

## 📦 Architecture

```
Frontend (React + Vite, port 3000)
    ↕ /api/analyze (proxy)
Backend (Flask, port 5000)
    ↕ inference_sdk
Roboflow API (serverless.roboflow.com)
```

## 🚀 Installation

### 1. Frontend (React)

```bash
npm install
```

### 2. Backend (Python)

```bash
pip install -r requirements.txt
```

### 3. Configuration

Le fichier `.env` doit contenir vos identifiants Roboflow :

```
ROBOFLOW_API_KEY=your_api_key
ROBOFLOW_WORKSPACE=your_workspace
ROBOFLOW_WORKFLOW_ID=your_workflow_id
```

## ▶️ Lancement

Ouvrez **deux terminaux** :

**Terminal 1 — Backend Flask :**
```bash
python server.py
```

**Terminal 2 — Frontend Vite :**
```bash
npm run dev
```

L'application sera disponible sur **http://localhost:3000**.

## 📄 Pages

| Page | Description |
|------|-------------|
| Dashboard | Vue d'ensemble (surface, défauts, batterie, uptime) |
| Flux Live | Flux caméra temps réel avec détections IA |
| Défauts | Table complète des défauts avec filtres par sévérité |
| Carte Zones | Carte interactive des zones inspectées |
| Alertes | Fil d'alertes système et détections |
| Rapports | Génération et historique des rapports PDF |
| Contrôle | Commandes manuelles/auto du robot |
| **Analyse IA** | Upload d'images → détection de défauts via Roboflow |

## 🤝 Crédits

- **Frontend Robot** : [MayJomni](https://github.com/MayJomni/-IA-agent-polyscan-ROBOT-)
- **Roboflow Workflow** : elaas-workspace (wall-defect-detection-pipeline)
- **Intégration** : Projet PolyScan

#!/bin/bash
# Lokal AI Security Governance - Başlatma skripti
# Bu skript backend və frontend-i birlikdə işə salır

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=================================================="
echo "  Lokal AI Security Governance - Başlatma"
echo "=================================================="
echo ""

# 1. Ollama-nın işlədiyini yoxla
echo "[1/4] Ollama yoxlanılır..."
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "  ✓ Ollama işləyir"
else
    echo "  ✗ Ollama işləmir!"
    echo "    Ollama-nı işə salın: ollama serve"
    echo "    və ya quraşdırın: https://ollama.com"
    exit 1
fi

# 2. Modelləri yoxla
echo ""
echo "[2/4] Modellər yoxlanılır..."
MODELS=$(curl -s http://localhost:11434/api/tags | python3 -c "import sys,json; [print(m['name']) for m in json.load(sys.stdin).get('models',[])]" 2>/dev/null || echo "")

if echo "$MODELS" | grep -q "llama\|qwen\|mistral\|phi3\|gemma\|tinyllama"; then
    echo "  ✓ LLM modeli yüklü"
else
    echo "  ✗ LLM modeli tapılmadı!"
    echo "    Endirin: ollama pull llama3.2:3b-instruct-q4_K_M"
    echo "    və ya: ./download_models.sh orta"
    exit 1
fi
echo "  ✓ Embedding daxili (avtomatik)"

# 3. Backend-i yoxla və işə sal
echo ""
echo "[3/4] Backend yoxlanılır..."
if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
    echo "  ✓ Backend artıq işləyir"
else
    echo "  Backend işə salınır..."
    cd "$PROJECT_DIR/backend"
    if [ ! -d "venv" ]; then
        echo "  Virtual mühit yaradılır..."
        python3 -m venv venv
    fi
    source venv/bin/activate
    pip install -q -r requirements.txt 2>/dev/null
    uvicorn app.main:app --host 0.0.0.0 --port 8000 &
    BACKEND_PID=$!
    echo "  Backend PID: $BACKEND_PID"
    echo "  Backend-in işə düşməsi gözlənilir..."
    sleep 5
    if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
        echo "  ✓ Backend işləyir"
    else
        echo "  ✗ Backend işə düşmədi!"
        exit 1
    fi
fi

# 4. Frontend-i yoxla və işə sal
echo ""
echo "[4/4] Frontend yoxlanılır..."
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "  ✓ Frontend artıq işləyir"
else
    echo "  Frontend işə salınır..."
    cd "$PROJECT_DIR"
    npm install --silent 2>/dev/null
    npm run dev &
    FRONTEND_PID=$!
    echo "  Frontend PID: $FRONTEND_PID"
    sleep 3
fi

echo ""
echo "=================================================="
echo "  Sistem hazırdır!"
echo "=================================================="
echo ""
echo "  Frontend:  http://localhost:5173"
echo "  Backend:   http://localhost:8000"
echo "  Ollama:    http://localhost:11434"
echo ""
echo "  Brauzerdə http://localhost:5173 açın"
echo ""
echo "  Dayandırmaq üçün: Ctrl+C"
echo "=================================================="

# Prosesləri gözlə
wait

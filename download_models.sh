#!/bin/bash
# Modelləri endirən köməkçi skript
# İstifadə: ./download_models.sh [kiçik|orta|böyük]
#
# Embedding modeli ayrıca endirilmir — sistem daxili embedding istifadə edir.
# Yalnız LLM modeli (Ollama) endirilir.

set -e

SIZE="${1:-orta}"

echo "=================================================="
echo "  Ollama LLM Modelini Endir"
echo "=================================================="
echo ""

# Əvvəlcə Ollama-nın işlədiyini yoxla
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "✗ Ollama işləmir!"
    echo "  Əvvəlcə işə salın: ollama serve"
    exit 1
fi

case "$SIZE" in
    kiçik|kicik|small)
        echo "Kiçik konfiqurasiya (zəif kompüterlər üçün, ~1.3 GB):"
        LLM="llama3.2:1b-instruct-q4_K_M"
        ;;
    orta|medium)
        echo "Orta konfiqurasiya (~2.0 GB) — tövsiyə olunur:"
        LLM="llama3.2:3b-instruct-q4_K_M"
        ;;
    büyük|boyuk|large)
        echo "Böyük konfiqurasiya (~4.7 GB) — ən yaxşı keyfiyyət:"
        LLM="llama3.1:8b-instruct-q4_K_M"
        ;;
    *)
        echo "İstifadə: ./download_models.sh [kiçik|orta|böyük]"
        echo "  kiçik  — 1B model (~1.3 GB), zəif kompüterlər üçün"
        echo "  orta   — 3B model (~2.0 GB), tövsiyə olunur"
        echo "  büyük  — 8B model (~4.7 GB), ən yaxşı keyfiyyət"
        echo ""
        echo "Embedding modeli ayrıca endirilmir (daxili avtomatik)."
        exit 0
        ;;
esac

echo ""
echo "LLM modeli: $LLM"
echo "Embedding:  daxili (avtomatik, ayrıca endirmək lazım deyil)"
echo ""
echo "Endirmə başlayır..."
echo ""

ollama pull "$LLM"

echo ""
echo "=================================================="
echo "  Model uğurla endirildi!"
echo "=================================================="
echo ""
echo "Yüklü modellər:"
ollama list
echo ""
echo "Embedding modeli backend işə düşəndə avtomatik hazırlanacaq."
echo "İndi start.sh-i çalışdıra bilərsiniz."

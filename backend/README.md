# Reports Tool — Security Governance & Gap-Analiz Aləti

Tam lokal işləyən AI təhlükəsizlik governance və gap-analiz aləti. Bütün məlumatlar lokal diskdə
saxlanır, heç bir xarici API çağırışı edilmir — yalnız localhost.

## Tələblər

| Komponent | Tələb |
|---|---|
| Python | 3.11 və ya daha yüksək |
| Ollama | LLM mühərriki (https://ollama.com) |
| Tesseract OCR | Şəkillərdən mətn çıxarmaq üçün (opsional) |
| Node.js | 18+ (frontend üçün) |
| RAM | Minimum 8GB (16GB tövsiyə olunur) |
| Disk | Minimum 10GB boş yer (modellər üçün) |

---

## Addım 1: Ollama quraşdırın

### Linux (Ubuntu/Debian)
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### macOS
```bash
brew install ollama
```
və ya https://ollama.com/download saytından endirin.

### Windows
https://ollama.com/download saytından `.exe` faylını endirib quraşdırın.

### Ollama-nı işə salın
```bash
ollama serve
```
Bu, `http://localhost:11434` ünvanında işə düşəcək. Terminalı açıq saxlayın.

---

## Addım 2: Modelləri endirin

Yeni terminal açın və aşağıdakı əmrləri çalışdırın:

### LLM modeli (birini seçin)

```bash
# Ən kiçik və ən sürətli (zəif kompüterlər üçün, ~1.3 GB)
ollama pull llama3.2:1b-instruct-q4_K_M

# Kiçik və balanslı (~2.0 GB) — tövsiyə olunur
ollama pull llama3.2:3b-instruct-q4_K_M

# Orta ölçü (~4.7 GB) — daha yaxşı keyfiyyət
ollama pull llama3.1:8b-instruct-q4_K_M

# Qwen alternativi (~4.7 GB)
ollama pull qwen2.5:7b-instruct-q4_K_M

# Mistral (~4.4 GB)
ollama pull mistral:7b-instruct-q4_K_M
```

### Embedding modeli (məcburi)

```bash
# Çoxdilli (Azərbaycan + İngilis) — tövsiyə olunur (~1.2 GB)
ollama pull bge-m3:567m

# Daha kiçik alternativ (~274 MB, əsasən İngiliscə)
ollama pull nomic-embed-text
```

### Modellərin yüklü olduğunu yoxlayın
```bash
ollama list
```

---

## Addım 3: Tesseract OCR quraşdırın (opsional)

Şəkillərdən (PNG, JPG) və skan edilmiş PDF-lərdən mətn çıxarmaq üçün:

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install tesseract-ocr tesseract-ocr-aze tesseract-ocr-eng
```

### macOS
```bash
brew install tesseract tesseract-lang
```

### Windows
1. https://github.com/UB-Mannheim/tesseract/wiki saytından endirin
2. Quraşdırın və PATH-ə əlavə edin
3. Azərbaycan və İngilis dil paketlərini quraşdırın

---

## Addım 4: Backend quraşdırın

```bash
cd backend

# Virtual mühit yaradın
python -m venv venv

# Virtual mühiti aktivləşdirin
# Linux/macOS:
source venv/bin/activate
# Windows:
# venv\Scripts\activate

# Asılılıqları quraşdırın
pip install -r requirements.txt
```

---

## Addım 5: Bilik bazasını indeksləyin (bir dəfəlik)

Bu addım korpusu (136 nəzarət maddəsi) ChromaDB vektor bazasına yazır.
Backend ilk işə düşəndə avtomatik icra olunur, lakin əvvəlcədən də çalışdıra bilərsiniz:

```bash
cd backend
source venv/bin/activate
python -m scripts.index_corpus
```

Nəticə:
```
============================================================
  Korpus indeksləmə skripti
============================================================
  Toplam nəzarət sayı: 136

  Mənbələr üzrə:
    AI Security Governance Framework: 20 nəzarət
    Architecture Committee Security: 20 nəzarət
    CBAR Informasiya Təhlükəsizliyi: 15 nəzarət
    Azərbaycan Qanunvericiliyi - Fərdi Məlumatların Qorunması: 15 nəzarət
    Data Platform Security: 20 nəzarət
    ISO/IEC 42001: 24 nəzarət
    NIST AI RMF: 22 nəzarət

  İndeksləmə başlayır...
  Korpus indeksləmə tamamlandı!
============================================================
```

> **Diqqət:** Bu addım üçün Ollama-nın işləməsi və embedding modelinin yüklü olması lazımdır.

---

## Addım 6: Backend-i işə salın

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend `http://localhost:8000` ünvanında işə düşəcək.

### Backend-in işlədiyini yoxlayın

Brauzerdə açın: http://localhost:8000/api/health

Nəticə:
```json
{
  "status": "ok",
  "ollama": true,
  "chroma": true
}
```

---

## Addım 7: Frontend-i işə salın

Yeni terminal açın:

```bash
npm install
npm run dev
```

Frontend `http://localhost:5173` ünvanında işləyəcək.

Brauzerdə açın və istifadə edin!

---

## İstifadə qaydası

### 1. Sənəd Yüklə
- "Sənəd Yüklə" səhifəsinə keçin
- PDF, DOCX, PPTX, XLSX, şəkil və ya TXT faylı sürükləyin və ya seçin
- Sistem mətni avtomatik oxuyacaq və dilini aşkarlayacaq
- "Mətn" düyməsi ilə oxunmuş mətni görə bilərsiniz

### 2. Analiz et
- "Analiz et" düyməsinə basın
- Sistem sənədi 136 nəzarət maddəsi ilə müqayisə edəcək
- Tərəqqi real-time göstərilir (parsing → embedding → analyzing → report)
- Tamamlandıqdan sonra nəticələri görə bilərsiniz

### 3. Hesabat
- "Hesabata bax" düyməsinə basın
- İcraçı xülasə, gap cədvəli (yaşıl/sarı/qırmızı), risk səviyyəsi, tövsiyələr
- DOCX və ya PDF formatında endirin

### 4. Soruş (opsional)
- Bilik bazasına sərbəst sual verin
- NIST, ISO 42001, CBAR, AI Security, Data Security və s. haqqında suallar

### 5. İdarəetmə Paneli
- Keçmiş analizlərin tarixçəsi
- Ümumi statistika (neçə analiz, neçə uyğun/qismən/yoxdur)
- Hər analizi açıb hesabatına baxın

---

## Ayarlar

"Ayarlar" səhifəsində:

- **Ollama URL** — default: `http://localhost:11434`
- **LLM modeli** — siyahıdan seçin və ya öz modelinizi daxil edin
- **Embedding modeli** — çoxdilli BGE-M3 tövsiyə olunur
- **Chunk ölçüsü** — default: 512 token
- **Top-K** — sorğu nəticəsi sayı, default: 8
- **Müvəqqəti faylları təmizlə** — analiz bitdikdən sonra

---

## Bilik Bazası (Korpus)

7 mənbə, 136 nəzarət maddəsi:

| Mənbə | Domen | Sayı |
|---|---|---|
| AI Security Governance Framework | AI | 20 |
| Data Platform Security | Data | 20 |
| Architecture Committee Security | Security | 20 |
| NIST AI RMF | AI + Security | 22 |
| ISO/IEC 42001 | AI Governance | 24 |
| CBAR Informasiya Təhlükəsizliyi | Security + Banking | 15 |
| Azərbaycan Qanunvericiliyi | Legal + Privacy | 15 |

Korpusu yenidən indeksləmək üçün:
```bash
cd backend
source venv/bin/activate
python -m scripts.index_corpus --force
```

Və ya `backend/db/.corpus_indexed` faylını silib backend-i yenidən işə salın.

---

## Təhlükəsizlik

- Bütün sənədlər yalnız lokal diskdə saxlanılır
- Heç bir xarici şəbəkə çağırışı yoxdur (yalnız localhost:11434 — Ollama)
- Analiz bitdikdən sonra müvəqqəti fayllar avtomatik təmizlənir (ayarlanabilir)
- ChromaDB embedded rejimdə işləyir (ayrıca server tələb olunmur)
- SQLite ilə analiz tarixçəsi lokal saxlanılır

---

## Problem həlli

### Ollama cavab vermir
```bash
# Ollama-nın işlədiyini yoxlayın
curl http://localhost:11434/api/tags

# Əgər işləmirsə, yenidən işə salın
ollama serve
```

### Modellər görsənmir
```bash
# Yüklü modelləri yoxlayın
ollama list

# Əgər boğdursa, model endirin
ollama pull llama3.2:3b-instruct-q4_K_M
ollama pull bge-m3:567m
```

### Backend xətası
```bash
# Asılılıqları yoxlayın
cd backend
source venv/bin/activate
pip install -r requirements.txt

# Backend-i debug rejimində işə salın
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --log-level debug
```

### Korpus indekslənmir
```bash
# Ollama-nın işlədiyinə əmin olun
# Embedding modelinin yüklü olduğuna əmin olun: ollama list

# Mövcud indeksi silib yenidən yaradın
cd backend
source venv/bin/activate
python -m scripts.index_corpus --force
```

### OCR işləmir (şəkillərdən mətn çıxarmır)
```bash
# Tesseract-ın quraşdırıldığını yoxlayın
tesseract --version

# Azərbaycan dil paketini yoxlayın
tesseract --list-langs | grep aze
```

### Frontend backend-ə qoşula bilmir
- Backend-in `http://localhost:8000` ünvanında işlədiyinə əmin olun
- `.env` faylında `VITE_API_URL=http://localhost:8000` olduğunu yoxlayın
- Brauzerin console-unda xəta mesajlarını yoxlayın

---

## Arxitektura

```
project/
├── src/                         → React frontend (TypeScript)
│   ├── components/layout/       → Sidebar
│   ├── pages/                   → 7 səhifə (Dashboard, Upload, Analysis, Report, Chat, Knowledge, Settings)
│   ├── services/api.ts          → API client
│   └── types/index.ts           → TypeScript tipləri
├── backend/
│   ├── app/
│   │   ├── main.py              → FastAPI giriş nöqtəsi
│   │   ├── config.py            → Sistem konfiqurasiyası
│   │   ├── models.py            → Pydantic modelləri
│   │   ├── routers/
│   │   │   ├── upload_router.py → Sənəd yükləmə
│   │   │   ├── analyze_router.py→ Gap analiz + tarixçə
│   │   │   ├── report_router.py → DOCX/PDF endirmə
│   │   │   ├── chat_router.py   → RAG sorğu-cavab
│   │   │   ├── corpus_router.py → Bilik bazası
│   │   │   └── settings_router.py → Ayarlar
│   │   └── services/
│   │       ├── chroma_service.py       → ChromaDB
│   │       ├── ollama_service.py       → Ollama LLM
│   │       ├── parsing_service.py      → Çoxformatlı parsing
│   │       ├── language_service.py     → Dil aşkarlama
│   │       ├── corpus_service.py       → Korpus idarəetməsi
│   │       ├── gap_analysis_service.py → Gap analiz məntiqi
│   │       ├── report_service.py       → Hesabat generasiyası
│   │       └── storage_service.py      → SQLite analiz tarixçəsi
│   ├── corpus/                  → 7 korpus faylı (136 nəzarət)
│   ├── db/                      → ChromaDB + SQLite
│   ├── uploads/                 → Müvəqqəti fayllar
│   ├── scripts/index_corpus.py → İndeksləmə skripti
│   └── requirements.txt         → Python asılılıqları
└── .env                         → Frontend konfiqurasiyası
```

---

## Model seçimi tövsiyələri

| Kompüter tipi | LLM Model | Embedding | Təxmini RAM |
|---|---|---|---|
| Zəif (GPU-suz, 8GB RAM) | `llama3.2:1b-instruct-q4_K_M` | `nomic-embed-text` | ~3 GB |
| Orta (16GB RAM) | `llama3.2:3b-instruct-q4_K_M` | `bge-m3:567m` | ~5 GB |
| Güclü (32GB+ RAM) | `llama3.1:8b-instruct-q4_K_M` | `bge-m3:567m` | ~8 GB |

> Analiz sürəti modelin ölçüsündən asılıdır. 1B model ~2 dəqiqə, 8B model ~10-15 dəqiqə çəkə bilər.

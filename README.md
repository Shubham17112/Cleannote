Demo Video 



https://github.com/user-attachments/assets/af3344d5-5e1d-4be0-af83-24f01be11261


# 🧹 CleanNote

**CleanNote** is an AI-powered tool that automatically generates clean, structured notes from YouTube video dubbing content. It combines the power of **Google ATS**, **Whisper**, and **Notion API** to create summarized, exportable notes — perfect for learners, content creators, and researchers.

## 🎯 What It Does

- 🎥 Takes YouTube video links or audio dubbing files
- 🧠 Generates transcripts using **Google ATS**
- 🎙️ Uses **OpenAI Whisper** for accurate audio transcription (fallback or improvement)
- ✍️ Cleans, summarizes, and segments content
- 📤 Exports final notes directly to **Notion**
- 🧼 Removes filler words, improves grammar, and extracts key points

---

## 🛠 Tech Stack

| Layer       | Tool/Service              |
|-------------|---------------------------|
| **Transcription** | Google ATS, OpenAI Whisper     |
| **Summarization** | OpenAI GPT (or custom LLM)     |
| **Frontend** | Next.js + Tailwind CSS          |
| **Backend**  | Node.js / Flask (specify yours) |
| **Export**   | Notion API                      |

---

## 🚀 Getting Started

### Prerequisites

- Node.js or Python (depending on your backend)
- OpenAI API Key (for Whisper or GPT)
- Google Cloud credentials (for ATS)
- Notion integration token and database ID

### Installation

```bash
# Clone the repo
git clone https://github.com/yourusername/cleannote.git
cd cleannote

# Install dependencies
npm install  # or pip install -r requirements.txt if Python backend

# Set up environment variables
touch .env
# Add your API keys and tokens here

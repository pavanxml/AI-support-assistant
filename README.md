# AI-Powered Support Assistant

A full-stack support chat interface powered by React.js, Node.js, Express, SQLite, and Google Gemini.

## Features

- Interactive, responsive UI built with **React** and **Tailwind CSS**.
- Message persistence in **SQLite** maintaining conversational context.
- Automatic **session handling** via UUIDs and `localStorage`.
- Support for **Markdown rendering** in assistant responses.
- Enforced single-source-of-truth answering utilizing `docs.json`.
- Rate limiting implemented to prevent abuse.

---

## Deliverables Checklist

- [x] Node.js + Express backend setup
- [x] React.js frontend setup
- [x] SQLite database schema (`sessions` & `messages`)
- [x] `docs.json` strictly used for answers
- [x] "Sorry, I don't have information about that." fallback implemented
- [x] Rate limiting per IP added
- [x] Context & Memory maintaining last 5 interactions via DB
- [x] `tokensUsed` reporting (Optional extra credit)
- [x] Markdown rendering in assistant replies (Optional extra credit)

---

## Assumptions

- Uses `@google/generative-ai` to power LLM features.
- A free-tier valid `GEMINI_API_KEY` is required in `.env` to operate the bot.
- Context relies strictly on the `docs.json` injection directly in the prompt for every call (suitable because of current docs scale; future systems would prefer VectorDB/Embeddings).

---

## Setup Steps

### 1. Database & Backend Configuration

1. Navigate into the backend folder:

   ```bash
   cd backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Add your LLM keys:
   - Copy `.env.example` to `.env`.
   - Add your Google Gemini Key to `GEMINI_API_KEY`.

4. Run the backend server:

   ```bash
   node index.js
   ```

   *Server boots up on [http://localhost:5000](http://localhost:5000).*

### 2. Frontend Configuration

1. Navigate into the frontend folder:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Run the frontend development server:

   ```bash
   npm run dev
   ```

   *UI boots up on [http://localhost:5173](http://localhost:5173).*

---

## API Documentation

### A. Chat Endpoint

- **URL**: `POST /api/chat`
- **Description**: Send a human prompt to the AI referencing the product docs.
- **Request Body**:

  ```json
  {
    "sessionId": "e8e12a... (string)",
    "message": "How can I update my email address?"
  }
  ```

- **Response**:

  ```json
  {
    "reply": "You can update your email address in the Profile section of your account dashboard.",
    "tokensUsed": 194
  }
  ```

### B. Fetch Conversation

- **URL**: `GET /api/conversations/:sessionId`
- **Description**: Returns all chronological messages for a specific session ID.
- **Response**:

  ```json
  {
    "sessionId": "e8e12a...",
    "messages": [
      {
         "id": 1,
         "role": "user",
         "content": "Hi",
         "created_at": "2024-06-01T12:00:00.000Z"
      }
    ]
  }
  ```

### C. List Sessions

- **URL**: `GET /api/sessions`
- **Description**: Find all sessions sorted by the latest interaction.
- **Response**:

  ```json
  {
    "sessions": [
      { "id": "e8e12a...", "updated_at": "2024-06-01T12:00:00.000Z" }
    ]
  }
  ```

---

## Screenshots

Run the project and load `localhost:5173` to view the modern Tailwind-based conversational AI dashboard.

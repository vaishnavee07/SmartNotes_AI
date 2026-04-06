# SmartNotes AI 🧠✨

SmartNotes AI is an intelligent study platform designed to transform traditional learning into an interactive, AI-powered experience. By leveraging advanced Natural Language Processing (NLP) and Large Language Models (LLMs), SmartNotes AI helps students automate note-taking, generate study materials, and track their academic progress through gamified elements.

## 🚀 Key Features

- **AI-Powered Note Transformation**: Automatically convert your raw notes or uploaded PDFs into structured summaries and key concepts.
- **Smart Study Tools**: 
  - **Flashcards**: Instantly generate digital flashcards from your study materials.
  - **Quizzes**: Test your knowledge with AI-generated quizzes based on your specific notes.
  - **Question Paper Generator**: Create custom practice papers to prepare for exams.
- **Intelligent Planner**: Organize your study schedule with an integrated planner and goal-setting system.
- **Gamified Learning**: Stay motivated with progress tracking, activity sessions, and gamification elements like experience points or streaks.
- **OCR Integration**: Extract text from images or handwritten notes using Optical Character Recognition (OCR).
- **Interactive Dashboard**: Get a bird's-eye view of your study habits, goals, and recent activity.

## 🛠️ Technology Stack

### Frontend
- **React**: Modern UI components and state management.
- **Vite**: Rapid development and building.
- **Tailwind CSS**: Utility-first styling for a clean, responsive design.
- **Framer Motion**: Smooth animations and transitions.
- **Lucide React**: Beautiful icons.
- **Axios**: API communication.

### Backend
- **Node.js & Express**: Robust and scalable server-side architecture.
- **MongoDB**: NoSQL database for flexible data storage.
- **Groq LLM**: High-performance AI processing for text analysis and generation.
- **JWT & Bcrypt**: Secure user authentication and password hashing.
- **Morgan & Helmet**: Logging and security middleware.

## 📁 Project Structure

```text
Smartnotes_AI/
├── backend/            # Express.js Server
│   ├── config/         # Database and app configuration
│   ├── controllers/    # Business logic for routes
│   ├── middleware/     # Auth and file upload guards
│   ├── models/         # Mongoose schemas (User, Note, Quiz, etc.)
│   ├── routes/         # API endpoint definitions
│   ├── services/       # AI (LLM, NLP), OCR, and Gamification logic
│   └── utils/          # Helper functions and AI service wrappers
└── frontend/           # Vite + React Client
    ├── public/         # Static assets
    └── src/
        ├── api/        # Axios instances and API calls
        ├── components/ # Reusable UI components
        ├── context/    # Auth and global state
        ├── hooks/      # Custom React hooks (e.g., activity tracking)
        └── pages/      # View components (Dashboard, StudyArea, etc.)
```

## ⚙️ Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16.x or later)
- [MongoDB](https://www.mongodb.com/) (Local or Atlas)
- [Groq API Key](https://wow.groq.com/) (for AI features)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/vaishnavee07/SmartNotes_AI.git
   cd SmartNotes_AI
   ```

2. **Backend Setup**:
   ```bash
   cd Smartnotes_AI/backend
   npm install
   ```
   Create a `.env` file in the `backend` directory:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_uri
   JWT_SECRET=your_jwt_secret
   GROQ_API_KEY=your_groq_api_key
   ```

3. **Frontend Setup**:
   ```bash
   cd ../frontend
   npm install
   ```

### Running the Project

1. **Start the Backend**:
   ```bash
   cd Smartnotes_AI/backend
   npm run dev
   ```

2. **Start the Frontend**:
   ```bash
   cd Smartnotes_AI/frontend
   npm run dev
   ```

3. **Access the App**:
   Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the ISC License. 

---
Developed with ❤️ by [vaishnavee07](https://github.com/vaishnavee07)

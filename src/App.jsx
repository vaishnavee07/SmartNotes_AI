import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthContext, AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import StudyArea from './pages/StudyArea';
import Flashcards from './pages/Flashcards';
import QuizView from './pages/QuizView';
import PlannerView from './pages/PlannerView';
import Dashboard from './pages/Dashboard';
import QuestionPaper from './pages/QuestionPaper';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return user ? children : <Navigate to="/login" />;
};

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/study" element={<PrivateRoute><StudyArea /></PrivateRoute>} />
        <Route path="/flashcards" element={<PrivateRoute><Flashcards /></PrivateRoute>} />
        <Route path="/quizzes" element={<PrivateRoute><QuizView /></PrivateRoute>} />
        <Route path="/planner" element={<PrivateRoute><PlannerView /></PrivateRoute>} />
        <Route path="/question-paper" element={<PrivateRoute><QuestionPaper /></PrivateRoute>} />
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AnimatedRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;

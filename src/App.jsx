import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { createContext, useContext } from 'react';
import { useStore } from './store/useStore.js';
import Home from './pages/Home.jsx';
import Paths from './pages/Paths.jsx';
import QuestDetail from './pages/QuestDetail.jsx';
import Quiz from './pages/Quiz.jsx';
import Results from './pages/Results.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import AvatarEditor from './pages/AvatarEditor.jsx';
import SolutionCenter from './pages/SolutionCenter.jsx';
import LearningPath from './pages/LearningPath.jsx';
import DevOpsHome from './pages/DevOpsHome.jsx';
import DevOpsLearningPath from './pages/DevOpsLearningPath.jsx';
import DevOpsPaths from './pages/DevOpsPaths.jsx';
import DevOpsQuestDetail from './pages/DevOpsQuestDetail.jsx';
import DevOpsQuiz from './pages/DevOpsQuiz.jsx';
import DevOpsResults from './pages/DevOpsResults.jsx';
import DevOpsSolutionCenter from './pages/DevOpsSolutionCenter.jsx';
import LoginPage, { getAuth } from './pages/LoginPage.jsx';
import LoginCallback from './pages/LoginCallback.jsx';
import CourseSelect from './pages/CourseSelect.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import LearnerTracker from './pages/LearnerTracker.jsx';
import CoursePage from './pages/CoursePage.jsx';
import CoursePathPage from './pages/CoursePathPage.jsx';
import CourseQuestsPage from './pages/CourseQuestsPage.jsx';
import CourseQuizPage from './pages/CourseQuizPage.jsx';
import CourseLearnPage from './pages/CourseLearnPage.jsx';
import CourseEditor from './pages/CourseEditor.jsx';
import LearningPathsPage from './pages/LearningPathsPage.jsx';
import PathEditorPage from './pages/PathEditorPage.jsx';
import StarField from './components/StarField.jsx';
import HelpButton from './components/HelpButton.jsx';
import QuestLaunchGate from './components/QuestLaunchGate.jsx';

const StoreContext = createContext(null);
export const useAppStore = () => useContext(StoreContext);

function AuthGuard({ children }) {
  const auth = getAuth();
  if (!auth?.isLoggedIn) return <Navigate to="/login" replace />;
  return children;
}

function AdminGuard({ children }) {
  const auth = getAuth();
  if (!auth?.isLoggedIn) return <Navigate to="/login" replace />;
  if (auth.role !== 'ADMIN') return <Navigate to="/courses" replace />;
  return children;
}

function ManagerAdminGuard({ children }) {
  const auth = getAuth();
  if (!auth?.isLoggedIn) return <Navigate to="/login" replace />;
  if (auth.role !== 'ADMIN' && auth.role !== 'MANAGER') return <Navigate to="/courses" replace />;
  return children;
}

export default function App() {
  const store = useStore();
  return (
    <StoreContext.Provider value={store}>
      <BrowserRouter>
        <QuestLaunchGate />
        <div className="relative min-h-screen bg-space-950 text-slate-200">
          <StarField />
          <HelpButton />
          <div className="relative z-10">
            <Routes>
              {/* ── Public ───────────────────────────────────── */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/login/callback" element={<LoginCallback />} />

              {/* ── Admin (ADMIN role only) ──────────────────── */}
              <Route path="/admin" element={<AdminGuard><AdminPanel /></AdminGuard>} />

              {/* ── Learner Tracker (MANAGER + ADMIN) ───────────── */}
              <Route path="/tracker" element={<ManagerAdminGuard><LearnerTracker /></ManagerAdminGuard>} />

              {/* ── Course Hub (root) ─────────────────────── */}
              <Route path="/" element={<AuthGuard><CourseSelect /></AuthGuard>} />
              <Route path="/courses" element={<AuthGuard><CourseSelect /></AuthGuard>} />

              {/* ── AI Quest module ───────────────────────── */}
              <Route path="/ai-quest"       element={<AuthGuard><Home /></AuthGuard>} />
              <Route path="/paths"          element={<AuthGuard><Paths /></AuthGuard>} />
              <Route path="/quest/:questId" element={<AuthGuard><QuestDetail /></AuthGuard>} />
              <Route path="/quiz/:questId"  element={<AuthGuard><Quiz /></AuthGuard>} />
              <Route path="/results/:questId" element={<AuthGuard><Results /></AuthGuard>} />
              <Route path="/leaderboard"    element={<AuthGuard><Leaderboard /></AuthGuard>} />
              <Route path="/avatar"         element={<AuthGuard><AvatarEditor /></AuthGuard>} />
              <Route path="/solution/:questId" element={<AuthGuard><SolutionCenter /></AuthGuard>} />
              <Route path="/learning-path"  element={<AuthGuard><LearningPath /></AuthGuard>} />

              {/* ── Dynamic DB courses ──────────────────── */}
              <Route path="/c/:slug"                    element={<AuthGuard><CoursePage /></AuthGuard>} />
              <Route path="/c/:slug/learning-path"      element={<AuthGuard><CoursePathPage /></AuthGuard>} />
              <Route path="/c/:slug/quests"             element={<AuthGuard><CourseQuestsPage /></AuthGuard>} />
              <Route path="/c/:slug/quiz/:questId"      element={<AuthGuard><CourseQuizPage /></AuthGuard>} />
              <Route path="/c/:slug/learn/:questId"     element={<AuthGuard><CourseLearnPage /></AuthGuard>} />
              <Route path="/admin/courses/:slug/edit"   element={<AdminGuard><CourseEditor /></AdminGuard>} />

              {/* ── Learning Paths (user-created) ────────── */}
              <Route path="/my-paths"            element={<AuthGuard><LearningPathsPage /></AuthGuard>} />
              <Route path="/my-paths/:id/edit"   element={<AuthGuard><PathEditorPage /></AuthGuard>} />

              {/* ── DevOps Loop module ────────────────────── */}
              <Route path="/devops-loop"                          element={<AuthGuard><DevOpsHome /></AuthGuard>} />
              <Route path="/devops-loop/learning-path"            element={<AuthGuard><DevOpsLearningPath /></AuthGuard>} />
              <Route path="/devops-loop/paths"                    element={<AuthGuard><DevOpsPaths /></AuthGuard>} />
              <Route path="/devops-loop/quest/:questId"           element={<AuthGuard><DevOpsQuestDetail /></AuthGuard>} />
              <Route path="/devops-loop/quiz/:questId"            element={<AuthGuard><DevOpsQuiz /></AuthGuard>} />
              <Route path="/devops-loop/results/:questId"         element={<AuthGuard><DevOpsResults /></AuthGuard>} />
              <Route path="/devops-loop/solution/:questId"        element={<AuthGuard><DevOpsSolutionCenter /></AuthGuard>} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </StoreContext.Provider>
  );
}

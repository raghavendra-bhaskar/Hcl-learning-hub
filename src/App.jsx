import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useStore } from './store/useStore.js';
import { api } from './lib/api.js';
import { QUESTS } from './data/index.js';
import { DEVOPS_QUESTS } from './data/devopsIndex.js';
import Home from './pages/Home.jsx';
import Paths from './pages/Paths.jsx';
import QuestDetail from './pages/QuestDetail.jsx';
import Quiz from './pages/Quiz.jsx';
import Results from './pages/Results.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import AvatarEditor from './pages/AvatarEditor.jsx';
import SolutionCenter from './pages/SolutionCenter.jsx';
import AIQuestCoursePathPage from './pages/AIQuestCoursePathPage.jsx';
import DevOpsHome from './pages/DevOpsHome.jsx';
import DevOpsCoursePathPage from './pages/DevOpsCoursePathPage.jsx';
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

function ProgressSync() {
  const store = useAppStore();
  const syncedRef = useRef(new Set());
  const auth = getAuth();

  const aiQuestTotals = useMemo(() => Object.fromEntries(QUESTS.map(quest => [quest.id, quest.questions?.length || 1])), []);
  const devopsTotals = useMemo(() => Object.fromEntries(DEVOPS_QUESTS.map(quest => [quest.id, quest.questions?.length || 1])), []);

  useEffect(() => {
    if (!auth?.isLoggedIn) return;
    const courseEntries = Object.entries(store.courseCompletedQuests || {}).flatMap(([courseSlug, quests]) =>
      Object.entries(quests || {}).map(([questId, progress]) => ({
        module: courseSlug,
        questId,
        score: Number(progress?.score || 1),
        totalQuestions: 1,
        xpEarned: Number(progress?.xpEarned || 0),
      }))
    );
    const entries = [
      ...Object.entries(store.completedQuests || {}).map(([questId, progress]) => ({
        module: 'ai-quest',
        questId,
        score: Number(progress?.score || 0),
        totalQuestions: aiQuestTotals[questId] || 1,
        xpEarned: Number(progress?.xpEarned || 0),
      })),
      ...Object.entries(store.devopsCompletedQuests || {}).map(([questId, progress]) => ({
        module: 'devops-loop',
        questId,
        score: Number(progress?.score || 0),
        totalQuestions: devopsTotals[questId] || 1,
        xpEarned: Number(progress?.xpEarned || 0),
      })),
      ...courseEntries,
    ].filter(entry => entry.module && entry.questId);

    let cancelled = false;
    (async () => {
      for (const entry of entries) {
        const syncKey = `${entry.module}::${entry.questId}::${entry.score}::${entry.xpEarned}`;
        if (syncedRef.current.has(syncKey)) continue;
        syncedRef.current.add(syncKey);
        try {
          await api.post('/me/progress', entry);
        } catch {
          syncedRef.current.delete(syncKey);
          if (cancelled) return;
        }
      }
    })();

    return () => { cancelled = true; };
  }, [auth?.isLoggedIn, aiQuestTotals, devopsTotals, store.completedQuests, store.courseCompletedQuests, store.devopsCompletedQuests]);

  return null;
}

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

function AppShell() {
  const store = useAppStore();
  const location = useLocation();
  const isLight = store.theme === 'light';
  const isLoginRoute = location.pathname === '/login' || location.pathname === '/login/callback';

  return (
    <div className={`relative min-h-screen ${isLoginRoute ? 'bg-space-950 text-slate-200' : isLight ? 'bg-slate-100 text-slate-900' : 'bg-space-950 text-slate-200'}`}>
      {(isLoginRoute || !isLight) && <StarField />}
      <button
        onClick={() => store.setTheme(isLight ? 'dark' : 'light')}
        className={`fixed right-3 top-3 z-[70] w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${isLight ? 'text-amber-600 hover:text-amber-700' : 'text-slate-300 hover:text-white'}`}
        style={{ border: isLight ? '1px solid rgba(100,116,139,0.3)' : '1px solid rgba(255,255,255,0.07)', background: isLight ? 'rgba(248,250,252,0.96)' : 'rgba(3,10,20,0.86)', boxShadow: isLight ? '0 4px 18px rgba(15,23,42,0.10)' : '0 8px 24px rgba(2,6,23,0.35)' }}
        title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      >
        {isLight ? <Moon size={16} /> : <Sun size={16} />}
      </button>
      <HelpButton />
      <div className="relative z-10">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/login/callback" element={<LoginCallback />} />
          <Route path="/admin" element={<AdminGuard><AdminPanel /></AdminGuard>} />
          <Route path="/tracker" element={<ManagerAdminGuard><LearnerTracker /></ManagerAdminGuard>} />
          <Route path="/" element={<AuthGuard><CourseSelect /></AuthGuard>} />
          <Route path="/courses" element={<AuthGuard><CourseSelect /></AuthGuard>} />
          <Route path="/ai-quest"       element={<AuthGuard><Home /></AuthGuard>} />
          <Route path="/paths"          element={<AuthGuard><Paths /></AuthGuard>} />
          <Route path="/quest/:questId" element={<AuthGuard><QuestDetail /></AuthGuard>} />
          <Route path="/quiz/:questId"  element={<AuthGuard><Quiz /></AuthGuard>} />
          <Route path="/results/:questId" element={<AuthGuard><Results /></AuthGuard>} />
          <Route path="/leaderboard"    element={<AuthGuard><Leaderboard /></AuthGuard>} />
          <Route path="/avatar"         element={<AuthGuard><AvatarEditor /></AuthGuard>} />
          <Route path="/solution/:questId" element={<AuthGuard><SolutionCenter /></AuthGuard>} />
          <Route path="/learning-path"  element={<AuthGuard><AIQuestCoursePathPage /></AuthGuard>} />
          <Route path="/c/:slug"                    element={<AuthGuard><CoursePage /></AuthGuard>} />
          <Route path="/c/:slug/learning-path"      element={<AuthGuard><CoursePathPage /></AuthGuard>} />
          <Route path="/c/:slug/quests"             element={<AuthGuard><CourseQuestsPage /></AuthGuard>} />
          <Route path="/c/:slug/quiz/:questId"      element={<AuthGuard><CourseQuizPage /></AuthGuard>} />
          <Route path="/c/:slug/learn/:questId"     element={<AuthGuard><CourseLearnPage /></AuthGuard>} />
          <Route path="/admin/courses/:slug/edit"   element={<AuthGuard><CourseEditor /></AuthGuard>} />
          <Route path="/my-paths"            element={<AuthGuard><LearningPathsPage /></AuthGuard>} />
          <Route path="/my-paths/:id/edit"   element={<AuthGuard><PathEditorPage /></AuthGuard>} />
          <Route path="/devops-loop"                          element={<AuthGuard><DevOpsHome /></AuthGuard>} />
          <Route path="/devops-loop/learning-path"            element={<AuthGuard><DevOpsCoursePathPage /></AuthGuard>} />
          <Route path="/devops-loop/paths"                    element={<AuthGuard><DevOpsPaths /></AuthGuard>} />
          <Route path="/devops-loop/quest/:questId"           element={<AuthGuard><DevOpsQuestDetail /></AuthGuard>} />
          <Route path="/devops-loop/quiz/:questId"            element={<AuthGuard><DevOpsQuiz /></AuthGuard>} />
          <Route path="/devops-loop/results/:questId"         element={<AuthGuard><DevOpsResults /></AuthGuard>} />
          <Route path="/devops-loop/solution/:questId"        element={<AuthGuard><DevOpsSolutionCenter /></AuthGuard>} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  const store = useStore();
  useEffect(() => {
    document.documentElement.dataset.theme = store.theme || 'dark';
  }, [store.theme]);
  return (
    <StoreContext.Provider value={store}>
      <BrowserRouter>
        <ProgressSync />
        <QuestLaunchGate />
        <AppShell />
      </BrowserRouter>
    </StoreContext.Provider>
  );
}

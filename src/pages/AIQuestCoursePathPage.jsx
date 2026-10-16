import CoursePathPage from './CoursePathPage.jsx';

// This wrapper keeps AI Quest on the shared `CoursePathPage` implementation
// while forcing AI-specific navigation defaults. It exists so the router can
// expose a dedicated AI Quest learning-path entry without duplicating the full
// shared learning-path UI and logic.
export default function AIQuestCoursePathPage() {
  return <CoursePathPage forcedSlug="ai-quest" backPath="/ai-quest" backLabel="AI Quest" />;
}

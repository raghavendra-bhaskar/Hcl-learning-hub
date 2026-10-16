import CoursePathPage from './CoursePathPage.jsx';

// This wrapper reuses the shared `CoursePathPage` for DevOps Loop while locking
// the slug and navigation targets to the DevOps experience. It gives the router
// a dedicated DevOps learning-path page without maintaining a second copy of the
// shared path renderer.
export default function DevOpsCoursePathPage() {
  return <CoursePathPage forcedSlug="devops-loop" backPath="/devops-loop" backLabel="DevOps Loop" />;
}

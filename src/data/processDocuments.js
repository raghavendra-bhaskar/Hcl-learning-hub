// Process documents for the HCL Learning Hub Process section.
// Add entries here to surface them in the Learning Hub and make them
// available to the AI tutor's knowledge base.

export const PROCESS_FOLDER_URL = 'https://drive.google.com/drive/folders/0APzJPw6PlX9RUk9PVA';

export const PROCESS_DOCUMENTS = [
  {
    id: 'proc-team-meeting-notes',
    title: 'Team Meeting Notes',
    desc: 'Decisions and policy updates from team meetings. Includes Severity 1 (Sev1) case response time changes and other process decisions.',
    icon: '📋',
    url: 'https://docs.google.com/document/d/1FH9Tmj05UW2u2ZcdvZwIu0WWYSFnxm23lCQqRnEru9I/edit?tab=t.6cg403oj7b0n',
    type: 'gdoc',
    tags: ['Sev1', 'Response Time', 'Policy'],
  },
];

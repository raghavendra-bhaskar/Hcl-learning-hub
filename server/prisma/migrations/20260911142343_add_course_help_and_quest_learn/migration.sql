-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "helpSpaceHint" TEXT,
ADD COLUMN     "helpSpaceName" TEXT,
ADD COLUMN     "helpSpaceUrl" TEXT,
ADD COLUMN     "instructorEmail" TEXT,
ADD COLUMN     "instructorName" TEXT;

-- AlterTable
ALTER TABLE "CourseQuest" ADD COLUMN     "learnResources" JSONB,
ADD COLUMN     "learnTopics" JSONB;

-- CreateTable
CREATE TABLE "CourseQuest" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "moduleId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "scenario" TEXT NOT NULL,
    "optionA" TEXT NOT NULL,
    "optionB" TEXT NOT NULL,
    "optionC" TEXT NOT NULL,
    "optionD" TEXT NOT NULL,
    "correct" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseQuest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourseQuest_courseId_idx" ON "CourseQuest"("courseId");

-- CreateIndex
CREATE INDEX "CourseQuest_moduleId_idx" ON "CourseQuest"("moduleId");

-- AddForeignKey
ALTER TABLE "CourseQuest" ADD CONSTRAINT "CourseQuest_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseQuest" ADD CONSTRAINT "CourseQuest_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CourseModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

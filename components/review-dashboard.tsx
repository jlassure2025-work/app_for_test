"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bookmark, TrendingUp, Target, Clock, CheckCircle, FileText, RefreshCw } from "lucide-react"
import type { StudyNote } from "./notes-manager"
import type { MCQQuestion } from "./mcq-parser"

interface TestHistory {
  id: string
  name: string
  score: number
  totalQuestions: number
  correctAnswers: number
  timeSpent: number
  completedAt: Date
  bookmarkedQuestions: string[]
  notes: string[]
}

interface ReviewDashboardProps {
  testHistory: TestHistory[]
  studyNotes: StudyNote[]
  onReviewBookmarked: (questions: MCQQuestion[]) => void
}

export function ReviewDashboard({ testHistory, studyNotes, onReviewBookmarked }: ReviewDashboardProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<"week" | "month" | "all">("week")

  // Calculate statistics
  const totalTests = testHistory.length
  const averageScore =
    totalTests > 0 ? Math.round(testHistory.reduce((sum, test) => sum + test.score, 0) / totalTests) : 0
  const totalQuestions = testHistory.reduce((sum, test) => sum + test.totalQuestions, 0)
  const totalCorrect = testHistory.reduce((sum, test) => sum + test.correctAnswers, 0)
  const totalBookmarked = testHistory.reduce((sum, test) => sum + test.bookmarkedQuestions.length, 0)
  const totalStudyTime = testHistory.reduce((sum, test) => sum + test.timeSpent, 0)

  // Filter by timeframe
  const now = new Date()
  const filteredHistory = testHistory.filter((test) => {
    const testDate = test.completedAt
    const daysDiff = Math.floor((now.getTime() - testDate.getTime()) / (1000 * 60 * 60 * 24))

    switch (selectedTimeframe) {
      case "week":
        return daysDiff <= 7
      case "month":
        return daysDiff <= 30
      default:
        return true
    }
  })

  // Recent performance trend
  const recentScores = filteredHistory.slice(-5).map((test) => test.score)
  const trend = recentScores.length >= 2 ? recentScores[recentScores.length - 1] - recentScores[0] : 0

  // Weak areas (topics with lower scores)
  const topicPerformance = testHistory.reduce(
    (acc, test) => {
      if (!acc[test.name]) {
        acc[test.name] = { total: 0, correct: 0, count: 0 }
      }
      acc[test.name].total += test.totalQuestions
      acc[test.name].correct += test.correctAnswers
      acc[test.name].count += 1
      return acc
    },
    {} as Record<string, { total: number; correct: number; count: number }>,
  )

  const weakAreas = Object.entries(topicPerformance)
    .map(([topic, stats]) => ({
      topic,
      accuracy: Math.round((stats.correct / stats.total) * 100),
      attempts: stats.count,
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Study Review</h2>
        <p className="text-muted-foreground">Track your progress and review difficult topics</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bookmarked">Bookmarked</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="notes">Notes Review</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Average Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{averageScore}%</div>
                <div className="flex items-center gap-1 text-xs">
                  {trend > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : trend < 0 ? (
                    <TrendingUp className="h-3 w-3 text-red-600 rotate-180" />
                  ) : null}
                  <span className={trend > 0 ? "text-green-600" : trend < 0 ? "text-red-600" : "text-muted-foreground"}>
                    {trend > 0 ? "+" : ""}
                    {trend}% trend
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Questions Answered
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{totalQuestions}</div>
                <p className="text-xs text-muted-foreground">{totalCorrect} correct</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Bookmark className="h-4 w-4" />
                  Bookmarked
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{totalBookmarked}</div>
                <p className="text-xs text-muted-foreground">For review</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Study Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{Math.round(totalStudyTime / 60000)}m</div>
                <p className="text-xs text-muted-foreground">Total time</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Test Performance</CardTitle>
              <CardDescription>Your latest test results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {testHistory
                  .slice(-5)
                  .reverse()
                  .map((test) => (
                    <div key={test.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{test.name}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>
                            {test.correctAnswers}/{test.totalQuestions} correct
                          </span>
                          <span>{Math.round(test.timeSpent / 60000)}m</span>
                          <span>{test.completedAt.toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-lg font-bold ${
                            test.score >= 80 ? "text-green-600" : test.score >= 60 ? "text-yellow-600" : "text-red-600"
                          }`}
                        >
                          {test.score}%
                        </div>
                        {test.bookmarkedQuestions.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Bookmark className="h-3 w-3" />
                            {test.bookmarkedQuestions.length}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Areas for Improvement */}
          {weakAreas.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Areas for Improvement</CardTitle>
                <CardDescription>Topics that need more attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {weakAreas.map((area, index) => (
                    <div key={area.topic} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{area.topic}</p>
                        <p className="text-sm text-muted-foreground">
                          {area.attempts} attempt{area.attempts !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={area.accuracy} className="w-20 h-2" />
                        <span className="text-sm font-medium w-12">{area.accuracy}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="bookmarked" className="space-y-6">
          <BookmarkedQuestions testHistory={testHistory} onReviewBookmarked={onReviewBookmarked} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <PerformanceAnalytics testHistory={testHistory} />
        </TabsContent>

        <TabsContent value="notes" className="space-y-6">
          <NotesReview studyNotes={studyNotes} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function BookmarkedQuestions({
  testHistory,
  onReviewBookmarked,
}: {
  testHistory: TestHistory[]
  onReviewBookmarked: (questions: MCQQuestion[]) => void
}) {
  const allBookmarked = testHistory.flatMap((test) =>
    test.bookmarkedQuestions.map((qId) => ({
      testName: test.name,
      questionId: qId,
      testDate: test.completedAt,
    })),
  )

  const groupedByTest = testHistory.filter((test) => test.bookmarkedQuestions.length > 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Bookmarked Questions</h3>
          <p className="text-sm text-muted-foreground">{allBookmarked.length} questions marked for review</p>
        </div>
        {allBookmarked.length > 0 && (
          <Button className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Review All Bookmarked
          </Button>
        )}
      </div>

      {groupedByTest.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">No bookmarked questions yet</p>
              <p className="text-sm text-muted-foreground">
                Bookmark difficult questions during tests to review them later
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupedByTest.map((test) => (
            <Card key={test.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{test.name}</CardTitle>
                    <CardDescription>
                      {test.bookmarkedQuestions.length} bookmarked • {test.completedAt.toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Button size="sm" variant="outline">
                    Review Questions
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function PerformanceAnalytics({ testHistory }: { testHistory: TestHistory[] }) {
  const last7Days = testHistory.filter((test) => {
    const daysDiff = Math.floor((Date.now() - test.completedAt.getTime()) / (1000 * 60 * 60 * 24))
    return daysDiff <= 7
  })

  const last30Days = testHistory.filter((test) => {
    const daysDiff = Math.floor((Date.now() - test.completedAt.getTime()) / (1000 * 60 * 60 * 24))
    return daysDiff <= 30
  })

  const weeklyAvg =
    last7Days.length > 0 ? Math.round(last7Days.reduce((sum, test) => sum + test.score, 0) / last7Days.length) : 0

  const monthlyAvg =
    last30Days.length > 0 ? Math.round(last30Days.reduce((sum, test) => sum + test.score, 0) / last30Days.length) : 0

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Performance Analytics</h3>
        <p className="text-sm text-muted-foreground">Detailed insights into your study progress</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Score Trends</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last 7 days</span>
              <span className="font-medium">{weeklyAvg}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last 30 days</span>
              <span className="font-medium">{monthlyAvg}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">All time</span>
              <span className="font-medium">
                {testHistory.length > 0
                  ? Math.round(testHistory.reduce((sum, test) => sum + test.score, 0) / testHistory.length)
                  : 0}
                %
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Study Habits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tests this week</span>
              <span className="font-medium">{last7Days.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Avg. time per test</span>
              <span className="font-medium">
                {testHistory.length > 0
                  ? Math.round(testHistory.reduce((sum, test) => sum + test.timeSpent, 0) / testHistory.length / 60000)
                  : 0}
                m
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total study time</span>
              <span className="font-medium">
                {Math.round(testHistory.reduce((sum, test) => sum + test.timeSpent, 0) / 60000)}m
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Score Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { range: "90-100%", color: "bg-green-500", count: testHistory.filter((t) => t.score >= 90).length },
              {
                range: "80-89%",
                color: "bg-blue-500",
                count: testHistory.filter((t) => t.score >= 80 && t.score < 90).length,
              },
              {
                range: "70-79%",
                color: "bg-yellow-500",
                count: testHistory.filter((t) => t.score >= 70 && t.score < 80).length,
              },
              {
                range: "60-69%",
                color: "bg-orange-500",
                count: testHistory.filter((t) => t.score >= 60 && t.score < 70).length,
              },
              { range: "Below 60%", color: "bg-red-500", count: testHistory.filter((t) => t.score < 60).length },
            ].map((item) => (
              <div key={item.range} className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded ${item.color}`} />
                <span className="text-sm flex-1">{item.range}</span>
                <span className="text-sm font-medium">{item.count} tests</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function NotesReview({ studyNotes }: { studyNotes: StudyNote[] }) {
  const recentNotes = studyNotes.slice(-10)
  const bookmarkedNotes = studyNotes.filter((note) => note.isBookmarked)
  const notesByTest = studyNotes.reduce(
    (acc, note) => {
      if (!acc[note.testName]) acc[note.testName] = []
      acc[note.testName].push(note)
      return acc
    },
    {} as Record<string, StudyNote[]>,
  )

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Notes Review</h3>
        <p className="text-sm text-muted-foreground">
          {studyNotes.length} notes across {Object.keys(notesByTest).length} topics
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bookmark className="h-4 w-4" />
              Important Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bookmarkedNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bookmarked notes yet</p>
            ) : (
              <div className="space-y-3">
                {bookmarkedNotes.slice(0, 5).map((note) => (
                  <div key={note.id} className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-medium text-sm">{note.title}</p>
                    <p className="text-xs text-muted-foreground">{note.testName}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Recent Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notes yet</p>
            ) : (
              <div className="space-y-3">
                {recentNotes
                  .reverse()
                  .slice(0, 5)
                  .map((note) => (
                    <div key={note.id} className="p-3 bg-muted/50 rounded-lg">
                      <p className="font-medium text-sm">{note.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {note.testName} • {note.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes by Topic</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(notesByTest).map(([testName, notes]) => (
              <div key={testName} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">{testName}</p>
                  <p className="text-sm text-muted-foreground">
                    {notes.length} note{notes.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <Button size="sm" variant="outline">
                  Review
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

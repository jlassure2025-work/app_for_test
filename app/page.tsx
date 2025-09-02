"use client"
import { useState, useEffect } from "react"
import type React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, FileText, BarChart3, Plus, TrendingUp, Download, Upload } from "lucide-react"
import { MCQParser, type MCQQuestion } from "@/components/mcq-parser"
import { TestInterface } from "@/components/test-interface"
import { NotesManager } from "@/components/notes-manager"
import { ReviewDashboard } from "@/components/review-dashboard"
import { useToast } from "@/hooks/use-toast"

interface Test {
  id: string
  name: string
  questions: MCQQuestion[]
  createdAt: Date
}

interface TestResult {
  questionId: string
  selectedAnswer: number | null
  isCorrect: boolean
  timeSpent: number
  isBookmarked: boolean
  note: string
}

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

interface StudyNote {
  id: string
  title: string
  content: string
  testName?: string
  questionText?: string
  tags: string[]
  isBookmarked: boolean
  createdAt: Date
  updatedAt: Date
}

const STORAGE_KEYS = {
  TESTS: "mcq-study-tests",
  NOTES: "mcq-study-notes",
  HISTORY: "mcq-study-history",
}

const saveToStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.error("Failed to save to localStorage:", error)
  }
}

const loadFromStorage = (key: string, defaultValue: any): any => {
  try {
    const stored = localStorage.getItem(key)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Convert date strings back to Date objects
      if (key === STORAGE_KEYS.TESTS) {
        return parsed.map((test: any) => ({
          ...test,
          createdAt: new Date(test.createdAt),
        }))
      }
      if (key === STORAGE_KEYS.HISTORY) {
        return parsed.map((history: any) => ({
          ...history,
          completedAt: new Date(history.completedAt),
        }))
      }
      if (key === STORAGE_KEYS.NOTES) {
        return parsed.map((note: any) => ({
          ...note,
          createdAt: new Date(note.createdAt),
          updatedAt: new Date(note.updatedAt),
        }))
      }
      return parsed
    }
  } catch (error) {
    console.error("Failed to load from localStorage:", error)
  }
  return defaultValue
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [activeTest, setActiveTest] = useState<Test | null>(null)
  const [studyNotes, setStudyNotes] = useState<StudyNote[]>(() => loadFromStorage(STORAGE_KEYS.NOTES, []))
  const [tests, setTests] = useState<Test[]>(() => loadFromStorage(STORAGE_KEYS.TESTS, []))
  const [testHistory, setTestHistory] = useState<TestHistory[]>(() => loadFromStorage(STORAGE_KEYS.HISTORY, []))
  const { toast } = useToast()

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.TESTS, tests)
  }, [tests])

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.NOTES, studyNotes)
  }, [studyNotes])

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.HISTORY, testHistory)
  }, [testHistory])

  const exportData = (dataType: "tests" | "notes" | "history" | "all") => {
    try {
      let data: any
      let filename: string

      switch (dataType) {
        case "tests":
          data = { tests, exportedAt: new Date(), type: "tests" }
          filename = `mcq-tests-${new Date().toISOString().split("T")[0]}.json`
          break
        case "notes":
          data = { studyNotes, exportedAt: new Date(), type: "notes" }
          filename = `mcq-notes-${new Date().toISOString().split("T")[0]}.json`
          break
        case "history":
          data = { testHistory, exportedAt: new Date(), type: "history" }
          filename = `mcq-history-${new Date().toISOString().split("T")[0]}.json`
          break
        case "all":
          data = { tests, studyNotes, testHistory, exportedAt: new Date(), type: "all" }
          filename = `mcq-complete-backup-${new Date().toISOString().split("T")[0]}.json`
          break
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Export Successful",
        description: `${dataType === "all" ? "Complete backup" : dataType} exported successfully`,
      })
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      })
    }
  }

  const exportSingleTest = (test: Test) => {
    try {
      const data = {
        test,
        exportedAt: new Date(),
        type: "single-test",
      }

      const filename = `${test.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}-${new Date().toISOString().split("T")[0]}.json`

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Export Successful",
        description: `Test "${test.name}" exported successfully`,
      })
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export test. Please try again.",
        variant: "destructive",
      })
    }
  }

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string)

        if (importedData.type === "single-test" && importedData.test) {
          const newTest = {
            ...importedData.test,
            createdAt: new Date(importedData.test.createdAt),
          }
          setTests((prev) => [...prev, newTest])
          toast({
            title: "Import Successful",
            description: `Test "${newTest.name}" imported successfully`,
          })
        } else if (importedData.type === "tests" && importedData.tests) {
          const newTests = importedData.tests.map((test: any) => ({
            ...test,
            createdAt: new Date(test.createdAt),
          }))
          setTests((prev) => [...prev, ...newTests])
          toast({
            title: "Import Successful",
            description: `${newTests.length} tests imported successfully`,
          })
        } else if (importedData.type === "notes" && importedData.studyNotes) {
          const newNotes = importedData.studyNotes.map((note: any) => ({
            ...note,
            createdAt: new Date(note.createdAt),
            updatedAt: new Date(note.updatedAt),
          }))
          setStudyNotes((prev) => [...prev, ...newNotes])
          toast({
            title: "Import Successful",
            description: `${newNotes.length} notes imported successfully`,
          })
        } else if (importedData.type === "history" && importedData.testHistory) {
          const newHistory = importedData.testHistory.map((history: any) => ({
            ...history,
            completedAt: new Date(history.completedAt),
          }))
          setTestHistory((prev) => [...prev, ...newHistory])
          toast({
            title: "Import Successful",
            description: `${newHistory.length} test results imported successfully`,
          })
        } else if (importedData.type === "all") {
          if (importedData.tests) {
            const newTests = importedData.tests.map((test: any) => ({
              ...test,
              createdAt: new Date(test.createdAt),
            }))
            setTests((prev) => [...prev, ...newTests])
          }
          if (importedData.studyNotes) {
            const newNotes = importedData.studyNotes.map((note: any) => ({
              ...note,
              createdAt: new Date(note.createdAt),
              updatedAt: new Date(note.updatedAt),
            }))
            setStudyNotes((prev) => [...prev, ...newNotes])
          }
          if (importedData.testHistory) {
            const newHistory = importedData.testHistory.map((history: any) => ({
              ...history,
              completedAt: new Date(history.completedAt),
            }))
            setTestHistory((prev) => [...prev, ...newHistory])
          }
          toast({
            title: "Import Successful",
            description: "Complete backup imported successfully",
          })
        } else {
          throw new Error("Invalid file format")
        }
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Invalid file format or corrupted data",
          variant: "destructive",
        })
      }
    }
    reader.readAsText(file)
    event.target.value = ""
  }

  const handleTestComplete = (results: TestResult[], testName: string) => {
    const correctAnswers = results.filter((r) => r.isCorrect).length
    const totalQuestions = results.length
    const score = Math.round((correctAnswers / totalQuestions) * 100)
    const totalTime = results.reduce((sum, r) => sum + r.timeSpent, 0)
    const bookmarkedQuestions = results.filter((r) => r.isBookmarked).map((r) => r.questionId)

    const historyEntry: TestHistory = {
      id: `history-${Date.now()}`,
      name: testName,
      score,
      totalQuestions,
      correctAnswers,
      timeSpent: totalTime,
      completedAt: new Date(),
      bookmarkedQuestions,
      notes: results.filter((r) => r.note.trim() !== "").map((r) => r.note),
    }
    setTestHistory((prev) => [...prev, historyEntry])

    const newNotes: StudyNote[] = results
      .filter((result) => result.note.trim() !== "")
      .map((result) => {
        const question = activeTest?.questions.find((q) => q.id === result.questionId)
        return {
          id: `note-${Date.now()}-${result.questionId}`,
          title: `Note from ${testName}`,
          content: result.note,
          testName: testName,
          questionText: question?.question || "Unknown question",
          tags: result.isBookmarked ? ["bookmarked", "review"] : [],
          isBookmarked: result.isBookmarked,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      })

    setStudyNotes((prev) => [...prev, ...newNotes])
    setActiveTest(null)
    setActiveTab("dashboard")
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">MCQ Study</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => exportData("all")} className="gap-2">
                  <Download className="h-4 w-4" />
                  Export All
                </Button>
                <input type="file" accept=".json" onChange={importData} className="hidden" id="import-file" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("import-file")?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Import
                </Button>
              </div>
              <Button size="sm" className="gap-2" onClick={() => setActiveTab("tests")}>
                <Plus className="h-4 w-4" />
                New Test
              </Button>
            </div>
          </div>
        </div>
      </header>

      {!activeTest && (
        <nav className="border-b bg-card">
          <div className="container mx-auto px-4">
            <div className="flex gap-1">
              {[
                { id: "dashboard", label: "Dashboard", icon: BarChart3 },
                { id: "tests", label: "Tests", icon: BookOpen },
                { id: "notes", label: "Notes", icon: FileText },
                { id: "review", label: "Review", icon: TrendingUp },
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? "border-b-2 border-primary text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>
        </nav>
      )}

      <main className="container mx-auto px-4 py-6">
        {activeTest ? (
          <TestInterface
            test={activeTest}
            onTestComplete={(results) => handleTestComplete(results, activeTest.name)}
            onExit={() => setActiveTest(null)}
          />
        ) : (
          <>
            {activeTab === "dashboard" && <DashboardView studyNotes={studyNotes} testHistory={testHistory} />}
            {activeTab === "tests" && (
              <TestsView
                tests={tests}
                setTests={setTests}
                onStartTest={setActiveTest}
                onExportTest={exportSingleTest}
              />
            )}
            {activeTab === "notes" && <NotesView studyNotes={studyNotes} setStudyNotes={setStudyNotes} />}
            {activeTab === "review" && (
              <ReviewDashboard
                testHistory={testHistory}
                studyNotes={studyNotes}
                onReviewBookmarked={(questions) => {
                  const reviewTest: Test = {
                    id: `review-${Date.now()}`,
                    name: "Bookmarked Questions Review",
                    questions,
                    createdAt: new Date(),
                  }
                  setActiveTest(reviewTest)
                }}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}

function DashboardView({ studyNotes, testHistory }: { studyNotes: StudyNote[]; testHistory: TestHistory[] }) {
  const averageScore =
    testHistory.length > 0
      ? Math.round(testHistory.reduce((sum, test) => sum + test.score, 0) / testHistory.length)
      : 85

  const recentTests =
    testHistory.length > 0
      ? testHistory
          .slice(-3)
          .reverse()
          .map((test) => ({
            name: test.name,
            score: test.score,
            date: test.completedAt.toLocaleDateString(),
          }))
      : [
          { name: "Biology Chapter 5", score: 92, date: "2 hours ago" },
          { name: "Chemistry Basics", score: 78, date: "1 day ago" },
          { name: "Physics Motion", score: 85, date: "3 days ago" },
        ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Welcome back!</h2>
        <p className="text-muted-foreground">Ready to continue your studies?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tests Taken</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{testHistory.length || 12}</div>
            <p className="text-xs text-muted-foreground">+2 this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{averageScore}%</div>
            <p className="text-xs text-muted-foreground">+5% improvement</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Study Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{studyNotes.length}</div>
            <p className="text-xs text-muted-foreground">Personal insights saved</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Tests</CardTitle>
          <CardDescription>Your latest test attempts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentTests.map((test, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium text-foreground">{test.name}</p>
                  <p className="text-sm text-muted-foreground">{test.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">{test.score}%</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function TestsView({
  tests,
  setTests,
  onStartTest,
  onExportTest,
}: {
  tests: Test[]
  setTests: (tests: Test[]) => void
  onStartTest: (test: Test) => void
  onExportTest: (test: Test) => void
}) {
  const [showParser, setShowParser] = useState(false)
  const [editingTest, setEditingTest] = useState<Test | null>(null)
  const { toast } = useToast()

  const handleTestCreated = (questions: MCQQuestion[], testName: string) => {
    const newTest: Test = {
      id: `test-${Date.now()}`,
      name: testName,
      questions,
      createdAt: new Date(),
    }
    setTests([...tests, newTest])
    setShowParser(false)
  }

  const handleTestEdited = (questions: MCQQuestion[], testName: string) => {
    if (!editingTest) return

    const updatedTest: Test = {
      ...editingTest,
      name: testName,
      questions,
    }

    setTests(tests.map((test) => (test.id === editingTest.id ? updatedTest : test)))
    setEditingTest(null)
    setShowParser(false)
  }

  const handleDeleteTest = (testId: string) => {
    setTests(tests.filter((test) => test.id !== testId))
  }

  if (showParser) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{editingTest ? "Edit Test" : "Create New Test"}</h2>
            <p className="text-muted-foreground">
              {editingTest ? "Add new questions or modify existing ones" : "Parse your MCQ questions and create a test"}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setShowParser(false)
              setEditingTest(null)
            }}
          >
            Back to Tests
          </Button>
        </div>
        <MCQParser onTestCreated={editingTest ? handleTestEdited : handleTestCreated} existingTest={editingTest} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Tests</h2>
          <p className="text-muted-foreground">Create and take multiple choice tests</p>
        </div>
        <Button className="gap-2" onClick={() => setShowParser(true)}>
          <Plus className="h-4 w-4" />
          Create Test
        </Button>
      </div>

      {tests.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Create New Test</CardTitle>
            <CardDescription>Paste your MCQ questions to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No tests created yet</p>
              <Button onClick={() => setShowParser(true)}>Create Your First Test</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tests.map((test) => (
            <Card key={test.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{test.name}</CardTitle>
                    <CardDescription>
                      {test.questions.length} questions • Created {test.createdAt.toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => onExportTest(test)} className="gap-2">
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingTest(test)
                        setShowParser(true)
                      }}
                    >
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDeleteTest(test.id)}>
                      Delete
                    </Button>
                    <Button onClick={() => onStartTest(test)}>Start Test</Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function NotesView({
  studyNotes,
  setStudyNotes,
}: {
  studyNotes: StudyNote[]
  setStudyNotes: (notes: StudyNote[]) => void
}) {
  return <NotesManager savedNotes={studyNotes} onUpdateNotes={setStudyNotes} />
}

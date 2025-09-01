"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  CheckCircle,
  XCircle,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  RotateCcw,
} from "lucide-react"
import type { MCQQuestion } from "./mcq-parser"
import { Alert } from "@/components/ui/alert"

interface TestResult {
  questionId: string
  selectedAnswer: number | null
  isCorrect: boolean
  timeSpent: number
  isBookmarked: boolean
  note: string
}

interface TestInterfaceProps {
  test: {
    id: string
    name: string
    questions: MCQQuestion[]
  }
  onTestComplete: (results: TestResult[]) => void
  onExit: () => void
}

export function TestInterface({ test, onTestComplete, onExit }: TestInterfaceProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [results, setResults] = useState<TestResult[]>(() =>
    test.questions.map((q) => ({
      questionId: q.id,
      selectedAnswer: null,
      isCorrect: false,
      timeSpent: 0,
      isBookmarked: false,
      note: "",
    })),
  )
  const [showFeedback, setShowFeedback] = useState(false)
  const [startTime, setStartTime] = useState(Date.now())
  const [questionStartTime, setQuestionStartTime] = useState(Date.now())
  const [isTestComplete, setIsTestComplete] = useState(false)

  const currentQuestion = test.questions[currentQuestionIndex]
  const currentResult = results[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / test.questions.length) * 100

  useEffect(() => {
    setQuestionStartTime(Date.now())
  }, [currentQuestionIndex])

  const handleAnswerSelect = (answerIndex: number) => {
    if (currentResult.selectedAnswer !== null) return // Already answered

    const timeSpent = Date.now() - questionStartTime
    const isCorrect = answerIndex === currentQuestion.correctAnswer

    setResults((prev) =>
      prev.map((result, index) =>
        index === currentQuestionIndex ? { ...result, selectedAnswer: answerIndex, isCorrect, timeSpent } : result,
      ),
    )

    setShowFeedback(true)
  }

  const toggleBookmark = () => {
    setResults((prev) =>
      prev.map((result, index) =>
        index === currentQuestionIndex ? { ...result, isBookmarked: !result.isBookmarked } : result,
      ),
    )
  }

  const updateNote = (note: string) => {
    setResults((prev) => prev.map((result, index) => (index === currentQuestionIndex ? { ...result, note } : result)))
  }

  const goToNextQuestion = () => {
    if (currentQuestionIndex < test.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
      setShowFeedback(false)
    } else {
      // Test complete
      setIsTestComplete(true)
    }
  }

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1)
      setShowFeedback(results[currentQuestionIndex - 1].selectedAnswer !== null)
    }
  }

  const jumpToQuestion = (index: number) => {
    setCurrentQuestionIndex(index)
    setShowFeedback(results[index].selectedAnswer !== null)
  }

  const finishTest = () => {
    onTestComplete(results)
  }

  const restartTest = () => {
    setCurrentQuestionIndex(0)
    setResults(
      test.questions.map((q) => ({
        questionId: q.id,
        selectedAnswer: null,
        isCorrect: false,
        timeSpent: 0,
        isBookmarked: false,
        note: "",
      })),
    )
    setShowFeedback(false)
    setStartTime(Date.now())
    setQuestionStartTime(Date.now())
    setIsTestComplete(false)
  }

  if (isTestComplete) {
    return <TestSummary test={test} results={results} onFinish={finishTest} onRestart={restartTest} />
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{test.name}</h2>
          <p className="text-muted-foreground">
            Question {currentQuestionIndex + 1} of {test.questions.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onExit}>
            Exit Test
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Navigation */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-2">
            {test.questions.map((_, index) => {
              const result = results[index]
              const isCurrent = index === currentQuestionIndex
              const isAnswered = result.selectedAnswer !== null

              return (
                <Button
                  key={index}
                  variant={isCurrent ? "default" : isAnswered ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => jumpToQuestion(index)}
                  className="relative"
                >
                  {index + 1}
                  {result.isBookmarked && <Bookmark className="h-3 w-3 absolute -top-1 -right-1 fill-current" />}
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Question */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg leading-relaxed">{currentQuestion.question}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleBookmark}
              className={currentResult.isBookmarked ? "text-primary" : ""}
            >
              {currentResult.isBookmarked ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Additional Sections Display */}
          {currentQuestion.additionalSections &&
            currentQuestion.additionalSections.map((section, index) => (
              <div key={index} className="mt-4 p-4 bg-muted/50 rounded-lg border-l-4 border-primary/20">
                <h4 className="font-semibold text-sm text-primary mb-2">{section.title}:</h4>
                <div className="text-sm whitespace-pre-line font-mono bg-background p-3 rounded border">
                  {section.content}
                </div>
              </div>
            ))}

          {/* Answer Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = currentResult.selectedAnswer === index
              const isCorrect = index === currentQuestion.correctAnswer
              const showCorrectAnswer = showFeedback && isCorrect
              const showIncorrectAnswer = showFeedback && isSelected && !isCorrect

              return (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={currentResult.selectedAnswer !== null}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                    showCorrectAnswer
                      ? "border-green-500 bg-green-50 text-green-900"
                      : showIncorrectAnswer
                        ? "border-red-500 bg-red-50 text-red-900"
                        : isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                  } ${currentResult.selectedAnswer !== null ? "cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        showCorrectAnswer
                          ? "default"
                          : showIncorrectAnswer
                            ? "destructive"
                            : isSelected
                              ? "default"
                              : "outline"
                      }
                      className="w-8 h-8 rounded-full flex items-center justify-center p-0"
                    >
                      {String.fromCharCode(65 + index)}
                    </Badge>
                    <span className="flex-1">{option}</span>
                    {showCorrectAnswer && <CheckCircle className="h-5 w-5 text-green-600" />}
                    {showIncorrectAnswer && <XCircle className="h-5 w-5 text-red-600" />}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Feedback */}
          {showFeedback && (
            <Alert className={currentResult.isCorrect ? "border-green-500" : "border-red-500"}>
              <div className="flex items-start gap-2">
                {currentResult.isCorrect ? (
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                )}
                <div className="space-y-1 flex-1">
                  <div>
                    <strong className="text-base">{currentResult.isCorrect ? "Correct!" : "Incorrect"}</strong>
                  </div>
                  {!currentResult.isCorrect && (
                    <div className="text-sm">
                      The correct answer is <strong>{String.fromCharCode(65 + currentQuestion.correctAnswer)}</strong>.
                    </div>
                  )}
                </div>
              </div>
              {currentQuestion.explanation && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="text-sm space-y-1">
                    <div className="font-medium">Explanation:</div>
                    <div className="whitespace-pre-line leading-relaxed">{currentQuestion.explanation}</div>
                  </div>
                </div>
              )}
            </Alert>
          )}

          {/* Notes Section */}
          <div className="space-y-2">
            <Label htmlFor="question-note" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Personal Notes
            </Label>
            <Textarea
              id="question-note"
              value={currentResult.note}
              onChange={(e) => updateNote(e.target.value)}
              placeholder="Add your personal notes about this question..."
              className="min-h-[80px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={goToPreviousQuestion}
          disabled={currentQuestionIndex === 0}
          className="gap-2 bg-transparent"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            {Math.floor((Date.now() - startTime) / 60000)}:
            {String(Math.floor(((Date.now() - startTime) % 60000) / 1000)).padStart(2, "0")}
          </span>
        </div>

        {currentQuestionIndex === test.questions.length - 1 ? (
          <Button onClick={goToNextQuestion} disabled={currentResult.selectedAnswer === null} className="gap-2">
            Finish Test
          </Button>
        ) : (
          <Button onClick={goToNextQuestion} disabled={currentResult.selectedAnswer === null} className="gap-2">
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

interface TestSummaryProps {
  test: { name: string; questions: MCQQuestion[] }
  results: TestResult[]
  onFinish: () => void
  onRestart: () => void
}

function TestSummary({ test, results, onFinish, onRestart }: TestSummaryProps) {
  const correctAnswers = results.filter((r) => r.isCorrect).length
  const totalQuestions = results.length
  const score = Math.round((correctAnswers / totalQuestions) * 100)
  const bookmarkedQuestions = results.filter((r) => r.isBookmarked).length
  const totalTime = results.reduce((sum, r) => sum + r.timeSpent, 0)
  const averageTime = Math.round(totalTime / totalQuestions / 1000)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Test Complete!</CardTitle>
          <div className="text-4xl font-bold text-primary mt-4">{score}%</div>
          <p className="text-muted-foreground">
            {correctAnswers} out of {totalQuestions} questions correct
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-foreground">{bookmarkedQuestions}</div>
              <p className="text-sm text-muted-foreground">Bookmarked</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{averageTime}s</div>
              <p className="text-sm text-muted-foreground">Avg. per question</p>
            </div>
          </div>

          <div className="flex gap-2 justify-center">
            <Button onClick={onRestart} variant="outline" className="gap-2 bg-transparent">
              <RotateCcw className="h-4 w-4" />
              Retake Test
            </Button>
            <Button onClick={onFinish} className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Finish
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Question Review */}
      <Card>
        <CardHeader>
          <CardTitle>Question Review</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {results.map((result, index) => {
              const question = test.questions[index]
              return (
                <div
                  key={result.questionId}
                  className={`p-3 rounded-lg border ${
                    result.isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Q{index + 1}</Badge>
                      {result.isCorrect ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm font-medium">{result.isCorrect ? "Correct" : "Incorrect"}</span>
                      {result.isBookmarked && <Bookmark className="h-4 w-4 text-primary fill-current" />}
                    </div>
                    <span className="text-xs text-muted-foreground">{Math.round(result.timeSpent / 1000)}s</span>
                  </div>
                  {result.note && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      <strong>Note:</strong> {result.note}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

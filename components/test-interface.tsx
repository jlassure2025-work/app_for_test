"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
  Shuffle,
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
  existingNotes?: { [questionId: string]: string } // Added prop for existing notes
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function createShuffledOptions(
  options: string[],
  correctAnswer: number,
): { options: string[]; newCorrectAnswer: number } {
  const optionsWithIndex = options.map((option, index) => ({ option, originalIndex: index }))
  const shuffled = shuffleArray(optionsWithIndex)

  return {
    options: shuffled.map((item) => item.option),
    newCorrectAnswer: shuffled.findIndex((item) => item.originalIndex === correctAnswer),
  }
}

export function TestInterface({ test, onTestComplete, onExit, existingNotes = {} }: TestInterfaceProps) {
  const [randomizeQuestions, setRandomizeQuestions] = useState(false)
  const [randomizeOptions, setRandomizeOptions] = useState(false)
  const [testStarted, setTestStarted] = useState(false)

  const [shuffledQuestions, setShuffledQuestions] = useState<MCQQuestion[]>([])
  const [questionMapping, setQuestionMapping] = useState<number[]>([])

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [results, setResults] = useState<TestResult[]>([])
  const [showFeedback, setShowFeedback] = useState(false)
  const [startTime, setStartTime] = useState(Date.now())
  const [questionStartTime, setQuestionStartTime] = useState(Date.now())
  const [isTestComplete, setIsTestComplete] = useState(false)

  const initializeTest = () => {
    let questionsToUse = [...test.questions]
    let mapping = test.questions.map((_, index) => index)

    if (randomizeQuestions) {
      const shuffledData = shuffleArray(test.questions.map((q, index) => ({ question: q, originalIndex: index })))
      questionsToUse = shuffledData.map((item) => item.question)
      mapping = shuffledData.map((item) => item.originalIndex)
    }

    if (randomizeOptions) {
      questionsToUse = questionsToUse.map((q) => {
        const { options, newCorrectAnswer } = createShuffledOptions(q.options, q.correctAnswer)
        return { ...q, options, correctAnswer: newCorrectAnswer }
      })
    }

    setShuffledQuestions(questionsToUse)
    setQuestionMapping(mapping)

    const initialResults = questionsToUse.map((q, index) => {
      const originalQuestionId = test.questions[mapping[index]]?.id || q.id
      return {
        questionId: originalQuestionId,
        selectedAnswer: null,
        isCorrect: false,
        timeSpent: 0,
        isBookmarked: false,
        note: existingNotes[originalQuestionId] || "",
      }
    })

    setResults(initialResults)
    setTestStarted(true)
    setStartTime(Date.now())
    setQuestionStartTime(Date.now())
  }

  const currentQuestion = shuffledQuestions[currentQuestionIndex]
  const currentResult = results[currentQuestionIndex]
  const progress = testStarted ? ((currentQuestionIndex + 1) / shuffledQuestions.length) * 100 : 0

  useEffect(() => {
    if (testStarted) {
      setQuestionStartTime(Date.now())
    }
  }, [currentQuestionIndex, testStarted])

  if (!testStarted) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shuffle className="h-5 w-5" />
              Test Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">{test.name}</h3>
              <p className="text-muted-foreground">{test.questions.length} questions</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="randomize-questions">Randomize Question Order</Label>
                  <p className="text-sm text-muted-foreground">Questions will appear in random order</p>
                </div>
                <Switch id="randomize-questions" checked={randomizeQuestions} onCheckedChange={setRandomizeQuestions} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="randomize-options">Randomize Answer Options</Label>
                  <p className="text-sm text-muted-foreground">Answer choices will appear in random order</p>
                </div>
                <Switch id="randomize-options" checked={randomizeOptions} onCheckedChange={setRandomizeOptions} />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={initializeTest} className="flex-1">
                Start Test
              </Button>
              <Button variant="outline" onClick={onExit}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

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
    if (currentQuestionIndex < shuffledQuestions.length - 1) {
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
    setTestStarted(false)
    setCurrentQuestionIndex(0)
    setResults([])
    setShuffledQuestions([])
    setQuestionMapping([])
    setShowFeedback(false)
    setIsTestComplete(false)
  }

  if (isTestComplete) {
    return (
      <TestSummary
        test={{ ...test, questions: shuffledQuestions }}
        results={results}
        onFinish={finishTest}
        onRestart={restartTest}
      />
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{test.name}</h2>
          <p className="text-muted-foreground">
            Question {currentQuestionIndex + 1} of {shuffledQuestions.length}
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
            {shuffledQuestions.map((_, index) => {
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
                <div className="flex-1">
                  <div className="mb-2">
                    <span className="font-semibold text-base">
                      {currentResult.isCorrect ? "Correct!" : "Incorrect"}
                    </span>
                    {!currentResult.isCorrect && (
                      <span className="ml-2 text-sm">
                        The correct answer is <strong>{String.fromCharCode(65 + currentQuestion.correctAnswer)}</strong>
                        .
                      </span>
                    )}
                  </div>

                  {currentQuestion.explanation && (
                    <div className="pt-2 border-t border-border/30">
                      <div className="text-sm">
                        <div className="font-medium mb-1">Explanation:</div>
                        <div className="whitespace-pre-line leading-relaxed text-muted-foreground">
                          {currentQuestion.explanation}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
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

        {currentQuestionIndex === shuffledQuestions.length - 1 ? (
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

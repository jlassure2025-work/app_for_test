"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle, Edit, Trash2, Plus, Upload, FileText, X } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export interface MCQQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation?: string
  additionalSections?: { title: string; content: string }[]
}

interface Test {
  id: string
  name: string
  questions: MCQQuestion[]
  createdAt: Date
}

interface MCQParserProps {
  onTestCreated: (questions: MCQQuestion[], testName: string) => void
  existingTest?: Test | null
}

export function MCQParser({ onTestCreated, existingTest }: MCQParserProps) {
  const [rawText, setRawText] = useState("")
  const [parsedQuestions, setParsedQuestions] = useState<MCQQuestion[]>([])
  const [testName, setTestName] = useState("")
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showAddQuestions, setShowAddQuestions] = useState(false)
  const [addQuestionsText, setAddQuestionsText] = useState("")
  const [uploadProgress, setUploadProgress] = useState<
    {
      fileName: string
      status: "processing" | "success" | "error"
      message: string
      questionsCount?: number
    }[]
  >([])
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (existingTest) {
      setParsedQuestions(existingTest.questions)
      setTestName(existingTest.name)
      setIsPreviewMode(true)
    }
  }, [existingTest])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setUploadError(null)
    setUploadProgress([])
    setIsUploading(true)

    const fileArray = Array.from(files)
    const progressArray: typeof uploadProgress = []

    // Initialize progress tracking for all files
    fileArray.forEach((file) => {
      progressArray.push({
        fileName: file.name,
        status: "processing",
        message: "Processing...",
      })
    })
    setUploadProgress([...progressArray])

    let totalQuestionsAdded = 0
    const allNewQuestions: MCQQuestion[] = []

    // Process each file
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i]

      try {
        // Validate file type
        if (file.type !== "application/json") {
          progressArray[i] = {
            ...progressArray[i],
            status: "error",
            message: "Invalid file type. Only JSON files are supported.",
          }
          setUploadProgress([...progressArray])
          continue
        }

        // Validate file size
        if (file.size > 5 * 1024 * 1024) {
          // 5MB limit
          progressArray[i] = {
            ...progressArray[i],
            status: "error",
            message: "File too large. Maximum size is 5MB.",
          }
          setUploadProgress([...progressArray])
          continue
        }

        // Read and parse file
        const content = await readFileContent(file)

        if (!content.trim()) {
          progressArray[i] = {
            ...progressArray[i],
            status: "error",
            message: "File is empty.",
          }
          setUploadProgress([...progressArray])
          continue
        }

        const jsonData = JSON.parse(content)
        const questions = parseJSONFormat(jsonData)

        if (questions.length === 0) {
          progressArray[i] = {
            ...progressArray[i],
            status: "error",
            message: "No valid questions found in file.",
          }
          setUploadProgress([...progressArray])
          continue
        }

        // Success
        allNewQuestions.push(...questions)
        totalQuestionsAdded += questions.length
        progressArray[i] = {
          ...progressArray[i],
          status: "success",
          message: `Successfully imported ${questions.length} question${questions.length !== 1 ? "s" : ""}`,
          questionsCount: questions.length,
        }
        setUploadProgress([...progressArray])
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error)
        let errorMessage = "Failed to process file."

        if (error instanceof SyntaxError) {
          errorMessage = "Invalid JSON format. Please check file syntax."
        } else if (error instanceof Error) {
          errorMessage = error.message
        }

        progressArray[i] = {
          ...progressArray[i],
          status: "error",
          message: errorMessage,
        }
        setUploadProgress([...progressArray])
      }
    }

    // Add all successfully parsed questions
    if (allNewQuestions.length > 0) {
      if (existingTest) {
        setParsedQuestions((prev) => [...prev, ...allNewQuestions])
      } else {
        setParsedQuestions(allNewQuestions)
        setIsPreviewMode(true)
      }
    }

    setIsUploading(false)

    // Show summary message
    const successCount = progressArray.filter((p) => p.status === "success").length
    const errorCount = progressArray.filter((p) => p.status === "error").length

    if (successCount > 0 && errorCount === 0) {
      setShowAddQuestions(false)
    } else if (successCount === 0 && errorCount > 0) {
      setUploadError(
        `Failed to process ${errorCount} file${errorCount !== 1 ? "s" : ""}. Please check the errors above.`,
      )
    }

    // Clear file input
    event.target.value = ""
  }

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsText(file)
    })
  }

  const clearUploadProgress = () => {
    setUploadProgress([])
    setUploadError(null)
  }

  const parseJSONFormat = (data: any): MCQQuestion[] => {
    const questions: MCQQuestion[] = []

    if (data.question && data.options) {
      const question = parseJSONQuestion(data, 0)
      if (question) questions.push(question)
    } else if (Array.isArray(data)) {
      data.forEach((item, index) => {
        const question = parseJSONQuestion(item, index)
        if (question) questions.push(question)
      })
    } else if (data.questions && Array.isArray(data.questions)) {
      data.questions.forEach((item: any, index: number) => {
        const question = parseJSONQuestion(item, index)
        if (question) questions.push(question)
      })
    }

    return questions
  }

  const parseJSONQuestion = (item: any, index: number): MCQQuestion | null => {
    if (!item.question || !item.options || !Array.isArray(item.options)) {
      return null
    }

    const additionalSections: { title: string; content: string }[] = []

    Object.keys(item).forEach((key) => {
      if (
        key !== "question" &&
        key !== "options" &&
        key !== "correct_answer" &&
        key !== "reasoning" &&
        key !== "title"
      ) {
        if (typeof item[key] === "string" && item[key].trim()) {
          const title = key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
          additionalSections.push({
            title,
            content: item[key],
          })
        }
      }
    })

    let correctAnswer = 0
    const cleanOptions: string[] = []

    item.options.forEach((option: string, optIndex: number) => {
      const cleanOption = option.replace(/✅/g, "").trim()
      cleanOptions.push(cleanOption)

      if (option.includes("✅")) {
        correctAnswer = optIndex
      }
    })

    if (!item.options.some((opt: string) => opt.includes("✅")) && item.correct_answer) {
      const correctAnswerText = item.correct_answer.toLowerCase().trim()
      const matchingIndex = cleanOptions.findIndex(
        (opt) => opt.toLowerCase().includes(correctAnswerText) || correctAnswerText.includes(opt.toLowerCase()),
      )
      if (matchingIndex !== -1) {
        correctAnswer = matchingIndex
      }
    }

    return {
      id: `q-${index}`,
      question: item.question,
      options: cleanOptions,
      correctAnswer,
      explanation: item.reasoning || item.explanation || undefined,
      additionalSections: additionalSections.length > 0 ? additionalSections : undefined,
    }
  }

  const parseText = () => {
    try {
      if (!addQuestionsText.trim()) {
        setUploadError("Please enter some text to parse.")
        return
      }

      let questions: MCQQuestion[] = []

      try {
        const jsonData = JSON.parse(addQuestionsText)
        questions = parseJSONFormat(jsonData)
      } catch {
        questions = parseMCQText(addQuestionsText)
      }

      if (questions.length === 0) {
        setUploadError("No valid questions could be parsed from the text. Please check the format and try again.")
        return
      }

      if (existingTest) {
        setParsedQuestions((prev) => [...prev, ...questions])
      } else {
        setParsedQuestions(questions)
        setIsPreviewMode(true)
      }

      setShowAddQuestions(false)
      setAddQuestionsText("")
      setUploadError(null)
    } catch (error) {
      console.error("Parsing error:", error)
      setUploadError("Failed to parse the questions. Please check your text format and try again.")
    }
  }

  const parseMCQText = (text: string): MCQQuestion[] => {
    const questions: MCQQuestion[] = []

    const structuredQuestions = parseStructuredFormat(text)
    if (structuredQuestions.length > 0) {
      return structuredQuestions
    }

    const lines = text.split("\n").filter((line) => line.trim())

    let currentQuestion: Partial<MCQQuestion> = {}
    let questionCounter = Date.now()

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      if (/^\d+\.?\s/.test(line) || /^Q\d*\.?\s/i.test(line)) {
        if (currentQuestion.question && currentQuestion.options) {
          questions.push({
            id: `q-${questionCounter}`,
            question: currentQuestion.question,
            options: currentQuestion.options,
            correctAnswer: currentQuestion.correctAnswer || 0,
            explanation: currentQuestion.explanation,
          })
          questionCounter++
        }

        currentQuestion = {
          question: line.replace(/^\d+\.?\s|^Q\d*\.?\s/i, "").trim(),
          options: [],
          correctAnswer: 0,
        }
      } else if (/^[A-Da-d][.)]\s/.test(line)) {
        if (!currentQuestion.options) currentQuestion.options = []
        const optionText = line.replace(/^[A-Da-d][.)]\s/, "").trim()
        currentQuestion.options.push(optionText)

        if (line.includes("*") || line.includes("✓")) {
          currentQuestion.correctAnswer = currentQuestion.options.length - 1
        }
      } else if (/^(Answer|Correct|Ans):\s*[A-Da-d]/i.test(line)) {
        const match = line.match(/[A-Da-d]/)
        if (match) {
          const answerLetter = match[0].toUpperCase()
          currentQuestion.correctAnswer = answerLetter.charCodeAt(0) - 65
        }
      } else if (/^(Explanation|Reason|Why):/i.test(line)) {
        currentQuestion.explanation = line.replace(/^(Explanation|Reason|Why):\s*/i, "").trim()
      }
    }

    if (currentQuestion.question && currentQuestion.options) {
      questions.push({
        id: `q-${questionCounter}`,
        question: currentQuestion.question,
        options: currentQuestion.options,
        correctAnswer: currentQuestion.correctAnswer || 0,
        explanation: currentQuestion.explanation,
      })
    }

    return questions
  }

  const parseStructuredFormat = (text: string): MCQQuestion[] => {
    const questions: MCQQuestion[] = []

    const questionBlocks = text.split(/(?=\*\*Question:\*\*|Question:\s*-+)/i).filter((block) => block.trim())

    questionBlocks.forEach((block, index) => {
      if (!block.match(/\*\*Question:\*\*|Question:\s*-+/i)) return

      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line)

      let question = ""
      const options: string[] = []
      let correctAnswer = 0
      let explanation = ""
      const additionalSections: { title: string; content: string }[] = []

      let currentSection = ""
      let currentSectionTitle = ""
      let currentSectionContent = ""

      for (const line of lines) {
        if (/\*\*Question:\*\*|Question:\s*-+/i.test(line)) {
          currentSection = "question"
          const questionMatch = line.match(/(?:\*\*Question:\*\*|Question:\s*-+)\s*(.+)/i)
          if (questionMatch) {
            question = questionMatch[1].replace(/\*\*/g, "").trim()
          }
        } else if (/\*\*Options:\*\*|Options:\s*-+/i.test(line)) {
          if (currentSection === "additional" && currentSectionTitle && currentSectionContent) {
            additionalSections.push({ title: currentSectionTitle, content: currentSectionContent.trim() })
          }
          currentSection = "options"
        } else if (
          /\*\*Correct Answer:\*\*|Correct Answer:\s*-+/i.test(line) ||
          /###\s*✅\s*\*\*Correct Answer:\*\*/i.test(line)
        ) {
          currentSection = "answer"
          const answerMatch = line.match(/(?:\*\*Correct Answer:\*\*|Correct Answer:\s*-+)\s*(.+)/i)
          if (answerMatch) {
            const answerText = answerMatch[1].replace(/\*\*/g, "").trim()
            const matchingIndex = options.findIndex(
              (opt) =>
                opt.toLowerCase().includes(answerText.toLowerCase()) ||
                answerText.toLowerCase().includes(opt.toLowerCase()),
            )
            if (matchingIndex !== -1) {
              correctAnswer = matchingIndex
            }
          }
        } else if (/\*\*Reasoning:\*\*|Reasoning:\s*-+/i.test(line)) {
          currentSection = "reasoning"
          const reasoningMatch = line.match(/(?:\*\*Reasoning:\*\*|Reasoning:\s*-+)\s*(.+)/i)
          if (reasoningMatch) {
            explanation = reasoningMatch[1].trim()
          }
        } else if (/^(.+?):\s*-+/.test(line)) {
          if (currentSection === "additional" && currentSectionTitle && currentSectionContent) {
            additionalSections.push({ title: currentSectionTitle, content: currentSectionContent.trim() })
          }

          const match = line.match(/^(.+?):\s*-+/)
          if (match) {
            currentSection = "additional"
            currentSectionTitle = match[1].trim()
            currentSectionContent = ""
          }
        } else {
          if (currentSection === "question" && !question) {
            question = line.replace(/\*\*/g, "").trim()
          } else if (currentSection === "options") {
            if (line.startsWith("-")) {
              let optionText = line.replace(/^-\s*/, "").trim()
              const isCorrect = line.includes("✅")
              optionText = optionText.replace(/\*\*/g, "").replace(/✅/g, "").trim()
              options.push(optionText)

              if (isCorrect) {
                correctAnswer = options.length - 1
              }
            }
          } else if (currentSection === "answer") {
            const answerText = line.replace(/\*\*/g, "").trim()
            const matchingIndex = options.findIndex(
              (opt) =>
                opt.toLowerCase().includes(answerText.toLowerCase()) ||
                answerText.toLowerCase().includes(opt.toLowerCase()),
            )
            if (matchingIndex !== -1) {
              correctAnswer = matchingIndex
            }
          } else if (currentSection === "reasoning") {
            explanation += (explanation ? "\n" : "") + line
          } else if (currentSection === "additional") {
            currentSectionContent += (currentSectionContent ? "\n" : "") + line
          }
        }
      }

      if (currentSection === "additional" && currentSectionTitle && currentSectionContent) {
        additionalSections.push({ title: currentSectionTitle, content: currentSectionContent.trim() })
      }

      if (question && options.length > 0) {
        questions.push({
          id: `q-${index}`,
          question: question,
          options: options,
          correctAnswer: correctAnswer,
          explanation: explanation || undefined,
          additionalSections: additionalSections.length > 0 ? additionalSections : undefined,
        })
      }
    })

    return questions
  }

  const updateQuestion = (questionId: string, updates: Partial<MCQQuestion>) => {
    setParsedQuestions((prev) => prev.map((q) => (q.id === questionId ? { ...q, ...updates } : q)))
  }

  const deleteQuestion = (questionId: string) => {
    setParsedQuestions((prev) => prev.filter((q) => q.id !== questionId))
  }

  const addNewQuestion = () => {
    const newQuestion: MCQQuestion = {
      id: `q-${Date.now()}`,
      question: "New question",
      options: ["Option A", "Option B", "Option C", "Option D"],
      correctAnswer: 0,
    }
    setParsedQuestions((prev) => [...prev, newQuestion])
    setEditingQuestion(newQuestion.id)
  }

  const createTest = () => {
    if (parsedQuestions.length > 0 && testName.trim()) {
      onTestCreated(parsedQuestions, testName)
    }
  }

  const addOption = (questionId: string) => {
    setParsedQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? { ...q, options: [...q.options, `Option ${String.fromCharCode(65 + q.options.length)}`] }
          : q,
      ),
    )
  }

  const deleteOption = (questionId: string, optionIndex: number) => {
    setParsedQuestions((prev) =>
      prev.map((q) => {
        if (q.id === questionId && q.options.length > 2) {
          const newOptions = q.options.filter((_, index) => index !== optionIndex)
          const newCorrectAnswer =
            q.correctAnswer > optionIndex ? q.correctAnswer - 1 : q.correctAnswer === optionIndex ? 0 : q.correctAnswer
          return { ...q, options: newOptions, correctAnswer: newCorrectAnswer }
        }
        return q
      }),
    )
  }

  if (isPreviewMode) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">{existingTest ? "Edit Test" : "Preview & Edit"}</h3>
            <p className="text-sm text-muted-foreground">
              {existingTest
                ? "Add new questions or modify existing ones"
                : "Review and edit your questions before creating the test"}
            </p>
          </div>
          <div className="flex gap-2">
            {!existingTest && (
              <Button variant="outline" onClick={() => setIsPreviewMode(false)}>
                Back to Parser
              </Button>
            )}
            <Button onClick={() => setShowAddQuestions(true)} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Questions
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <Label htmlFor="test-name">Test Name</Label>
            <Input
              id="test-name"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="Enter test name..."
              className="mt-2"
            />
          </CardHeader>
        </Card>

        {showAddQuestions && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Add New Questions</CardTitle>
                  <CardDescription>Choose how you want to add questions to this test</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddQuestions(false)
                    clearUploadProgress()
                    setAddQuestionsText("")
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="manual" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                  <TabsTrigger value="text">Text Input</TabsTrigger>
                  <TabsTrigger value="file">File Upload</TabsTrigger>
                </TabsList>

                <TabsContent value="manual" className="space-y-4">
                  <div className="text-center py-6">
                    <h4 className="font-medium mb-2">Create Question Manually</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add a new blank question that you can edit directly
                    </p>
                    <Button
                      onClick={() => {
                        addNewQuestion()
                        setShowAddQuestions(false)
                      }}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Create Blank Question
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="text" className="space-y-4">
                  <div>
                    <Label htmlFor="add-mcq-text">MCQ Text</Label>
                    <Textarea
                      id="add-mcq-text"
                      value={addQuestionsText}
                      onChange={(e) => setAddQuestionsText(e.target.value)}
                      placeholder="Paste your MCQ questions here..."
                      className="min-h-[200px] font-mono text-sm"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={parseText} disabled={!addQuestionsText.trim()} className="gap-2">
                      Add Questions
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="file" className="space-y-4">
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <div className="space-y-1">
                      <h4 className="font-medium">Upload JSON Files</h4>
                      <p className="text-xs text-muted-foreground">
                        Select one or multiple JSON files containing questions
                      </p>
                    </div>
                    <Input
                      type="file"
                      accept=".json"
                      multiple
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="mt-3 max-w-xs mx-auto"
                    />
                    {isUploading && <p className="text-sm text-muted-foreground mt-2">Processing files...</p>}
                  </div>

                  {uploadProgress.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Upload Progress</h4>
                        <Button variant="ghost" size="sm" onClick={clearUploadProgress}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      {uploadProgress.map((progress, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <div className="flex-shrink-0">
                            {progress.status === "processing" && (
                              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            )}
                            {progress.status === "success" && <CheckCircle className="h-4 w-4 text-green-600" />}
                            {progress.status === "error" && <AlertCircle className="h-4 w-4 text-red-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium text-sm truncate">{progress.fileName}</span>
                              {progress.questionsCount && (
                                <Badge variant="secondary" className="text-xs">
                                  {progress.questionsCount} questions
                                </Badge>
                              )}
                            </div>
                            <p
                              className={`text-xs mt-1 ${
                                progress.status === "error"
                                  ? "text-red-600"
                                  : progress.status === "success"
                                    ? "text-green-600"
                                    : "text-muted-foreground"
                              }`}
                            >
                              {progress.message}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {uploadError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{uploadError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {parsedQuestions.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>No questions were parsed. Please go back and check your text format.</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {parsedQuestions.map((question, index) => (
              <QuestionEditor
                key={question.id}
                question={question}
                questionNumber={index + 1}
                isEditing={editingQuestion === question.id}
                onEdit={() => setEditingQuestion(question.id)}
                onSave={(updates) => {
                  updateQuestion(question.id, updates)
                  setEditingQuestion(null)
                }}
                onCancel={() => setEditingQuestion(null)}
                onDelete={() => deleteQuestion(question.id)}
                onAddOption={() => addOption(question.id)}
                onDeleteOption={(optionIndex) => deleteOption(question.id, optionIndex)}
              />
            ))}
          </div>
        )}

        {parsedQuestions.length > 0 && (
          <div className="flex justify-end gap-2">
            <Badge variant="secondary">
              {parsedQuestions.length} question{parsedQuestions.length !== 1 ? "s" : ""}
            </Badge>
            <Button onClick={createTest} disabled={!testName.trim()} className="gap-2">
              <CheckCircle className="h-4 w-4" />
              {existingTest ? "Save Changes" : "Create Test"}
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Import MCQ Questions</CardTitle>
          <CardDescription>Import your multiple choice questions via text input or JSON file upload.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="text" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text">Text Input</TabsTrigger>
              <TabsTrigger value="file">File Upload</TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-4">
              <div>
                <Label htmlFor="mcq-text">MCQ Text</Label>
                <Textarea
                  id="mcq-text"
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`Supports multiple formats:

JSON Format:
{
  "title": "Sample Question",
  "question": "What is the capital of France?",
  "message_board_post": "Additional context here...",
  "options": [
    "London",
    "Paris ✅",
    "Berlin",
    "Madrid"
  ],
  "correct_answer": "Paris",
  "reasoning": "Paris is the capital and largest city of France."
}

Traditional Format:
1. What is the capital of France?
A. London
B. Paris *
C. Berlin
D. Madrid

Structured Headers Format:
Question:---------
What section of the penetration test report details results?

Options:--------
- Findings
- Methodology  
- Executive Summary
- Conclusion

Correct Answer:---------------
Findings

Reasoning:----------
The Findings section documents discovered vulnerabilities...`}
                  className="min-h-[300px] font-mono text-sm"
                />
              </div>

              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">Supports JSON, traditional, and structured formats</div>
                <Button onClick={parseText} disabled={!rawText.trim()} className="gap-2">
                  Parse Questions
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="file" className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Upload JSON Files</h3>
                  <p className="text-sm text-muted-foreground">
                    Select one or multiple JSON files containing your MCQ questions
                  </p>
                </div>
                <Input
                  type="file"
                  accept=".json"
                  multiple
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="mt-4 max-w-xs mx-auto"
                />
                {isUploading && <p className="text-sm text-muted-foreground mt-2">Processing files...</p>}
              </div>

              {uploadProgress.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Upload Progress</h4>
                    <Button variant="ghost" size="sm" onClick={clearUploadProgress}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {uploadProgress.map((progress, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="flex-shrink-0">
                        {progress.status === "processing" && (
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        )}
                        {progress.status === "success" && <CheckCircle className="h-4 w-4 text-green-600" />}
                        {progress.status === "error" && <AlertCircle className="h-4 w-4 text-red-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium text-sm truncate">{progress.fileName}</span>
                          {progress.questionsCount && (
                            <Badge variant="secondary" className="text-xs">
                              {progress.questionsCount} questions
                            </Badge>
                          )}
                        </div>
                        <p
                          className={`text-xs mt-1 ${
                            progress.status === "error"
                              ? "text-red-600"
                              : progress.status === "success"
                                ? "text-green-600"
                                : "text-muted-foreground"
                          }`}
                        >
                          {progress.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {uploadError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{uploadError}</AlertDescription>
                </Alert>
              )}

              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-2">Expected JSON format:</p>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                  {`{
  "title": "Question Title",
  "question": "Your question here?",
  "message_board_post": "Additional context...",
  "options": [
    "Option A",
    "Option B ✅",
    "Option C",
    "Option D"
  ],
  "correct_answer": "Option B",
  "reasoning": "Explanation here..."
}`}
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

interface QuestionEditorProps {
  question: MCQQuestion
  questionNumber: number
  isEditing: boolean
  onEdit: () => void
  onSave: (updates: Partial<MCQQuestion>) => void
  onCancel: () => void
  onDelete: () => void
  onAddOption: () => void
  onDeleteOption: (index: number) => void
}

function QuestionEditor({
  question,
  questionNumber,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onAddOption,
  onDeleteOption,
}: QuestionEditorProps) {
  const [editedQuestion, setEditedQuestion] = useState(question.question)
  const [editedOptions, setEditedOptions] = useState([...question.options])
  const [editedCorrectAnswer, setEditedCorrectAnswer] = useState(question.correctAnswer)
  const [editedExplanation, setEditedExplanation] = useState(question.explanation || "")
  const [editedAdditionalSections, setEditedAdditionalSections] = useState(question.additionalSections || [])

  const handleSave = () => {
    onSave({
      question: editedQuestion,
      options: editedOptions,
      correctAnswer: editedCorrectAnswer,
      explanation: editedExplanation || undefined,
      additionalSections: editedAdditionalSections.length > 0 ? editedAdditionalSections : undefined,
    })
  }

  const handleAddOption = () => {
    setEditedOptions([...editedOptions, `Option ${String.fromCharCode(65 + editedOptions.length)}`])
  }

  const handleDeleteOption = (index: number) => {
    if (editedOptions.length > 2) {
      const newOptions = editedOptions.filter((_, i) => i !== index)
      setEditedOptions(newOptions)
      if (editedCorrectAnswer > index) {
        setEditedCorrectAnswer(editedCorrectAnswer - 1)
      } else if (editedCorrectAnswer === index) {
        setEditedCorrectAnswer(0)
      }
    }
  }

  if (isEditing) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Edit Question {questionNumber}</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Question</Label>
            <Textarea value={editedQuestion} onChange={(e) => setEditedQuestion(e.target.value)} className="mt-2" />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Options</Label>
              <Button size="sm" variant="outline" onClick={handleAddOption}>
                <Plus className="h-4 w-4 mr-1" />
                Add Option
              </Button>
            </div>
            <div className="space-y-2 mt-2">
              {editedOptions.map((option, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Badge variant={editedCorrectAnswer === index ? "default" : "outline"}>
                    {String.fromCharCode(65 + index)}
                  </Badge>
                  <Input
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...editedOptions]
                      newOptions[index] = e.target.value
                      setEditedOptions(newOptions)
                    }}
                  />
                  <Button
                    size="sm"
                    variant={editedCorrectAnswer === index ? "default" : "outline"}
                    onClick={() => setEditedCorrectAnswer(index)}
                  >
                    {editedCorrectAnswer === index ? "Correct" : "Set Correct"}
                  </Button>
                  {editedOptions.length > 2 && (
                    <Button size="sm" variant="outline" onClick={() => handleDeleteOption(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>Explanation (Optional)</Label>
            <Textarea
              value={editedExplanation}
              onChange={(e) => setEditedExplanation(e.target.value)}
              placeholder="Add an explanation for the correct answer..."
              className="mt-2"
            />
          </div>

          {editedAdditionalSections.map((section, index) => (
            <div key={index} className="mt-4 p-4 bg-muted/50 rounded-lg border-l-4 border-primary/20">
              <h4 className="font-semibold text-sm text-primary mb-2">{section.title}:</h4>
              <div className="text-sm whitespace-pre-line font-mono bg-background p-3 rounded border">
                {section.content}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Question {questionNumber}</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="font-medium">{question.question}</p>

          {question.additionalSections &&
            question.additionalSections.map((section, index) => (
              <div key={index} className="mt-4 p-4 bg-muted/50 rounded-lg border-l-4 border-primary/20">
                <h4 className="font-semibold text-sm text-primary mb-2">{section.title}:</h4>
                <div className="text-sm whitespace-pre-line font-mono bg-background p-3 rounded border">
                  {section.content}
                </div>
              </div>
            ))}

          <div className="space-y-1">
            {question.options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Badge
                  variant={question.correctAnswer === index ? "default" : "outline"}
                  className="w-6 h-6 rounded-full flex items-center justify-center p-0"
                >
                  {String.fromCharCode(65 + index)}
                </Badge>
                <span className={question.correctAnswer === index ? "font-medium text-primary" : ""}>{option}</span>
                {question.correctAnswer === index && <CheckCircle className="h-4 w-4 text-primary" />}
              </div>
            ))}
          </div>
          {question.explanation && (
            <div className="mt-3 p-3 bg-muted rounded-lg">
              <div className="text-sm">
                <strong>Explanation:</strong>
                <div className="mt-1 whitespace-pre-line">{question.explanation}</div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

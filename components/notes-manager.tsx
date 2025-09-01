"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Search, Plus, Edit, Trash2, BookOpen, Calendar, Tag } from "lucide-react"

export interface StudyNote {
  id: string
  title: string
  content: string
  testName: string
  questionText: string
  tags: string[]
  isBookmarked: boolean
  createdAt: Date
  updatedAt: Date
}

interface NotesManagerProps {
  savedNotes: StudyNote[]
  onUpdateNotes: (notes: StudyNote[]) => void
}

export function NotesManager({ savedNotes, onUpdateNotes }: NotesManagerProps) {
  const [notes, setNotes] = useState<StudyNote[]>(savedNotes)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTag, setSelectedTag] = useState<string>("all")
  const [showCreateNote, setShowCreateNote] = useState(false)
  const [editingNote, setEditingNote] = useState<StudyNote | null>(null)

  useEffect(() => {
    setNotes(savedNotes)
  }, [savedNotes])

  const allTags = Array.from(new Set(notes.flatMap((note) => note.tags)))

  const filteredNotes = notes.filter((note) => {
    const matchesSearch =
      searchQuery === "" ||
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.testName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.questionText.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesTag = selectedTag === "all" || note.tags.includes(selectedTag)

    return matchesSearch && matchesTag
  })

  const createNote = (noteData: Omit<StudyNote, "id" | "createdAt" | "updatedAt">) => {
    const newNote: StudyNote = {
      ...noteData,
      id: `note-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const updatedNotes = [...notes, newNote]
    setNotes(updatedNotes)
    onUpdateNotes(updatedNotes)
    setShowCreateNote(false)
  }

  const updateNote = (noteId: string, updates: Partial<StudyNote>) => {
    const updatedNotes = notes.map((note) =>
      note.id === noteId ? { ...note, ...updates, updatedAt: new Date() } : note,
    )
    setNotes(updatedNotes)
    onUpdateNotes(updatedNotes)
    setEditingNote(null)
  }

  const deleteNote = (noteId: string) => {
    const updatedNotes = notes.filter((note) => note.id !== noteId)
    setNotes(updatedNotes)
    onUpdateNotes(updatedNotes)
  }

  if (showCreateNote) {
    return <NoteEditor onSave={createNote} onCancel={() => setShowCreateNote(false)} title="Create New Note" />
  }

  if (editingNote) {
    return (
      <NoteEditor
        note={editingNote}
        onSave={(noteData) => updateNote(editingNote.id, noteData)}
        onCancel={() => setEditingNote(null)}
        title="Edit Note"
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Study Notes</h2>
          <p className="text-muted-foreground">
            {notes.length} note{notes.length !== 1 ? "s" : ""} saved
          </p>
        </div>
        <Button onClick={() => setShowCreateNote(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Note
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notes, tests, or questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {allTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes List */}
      {filteredNotes.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              {notes.length === 0 ? (
                <>
                  <p className="text-muted-foreground mb-4">No notes saved yet</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Notes will appear here as you take tests and add personal insights
                  </p>
                  <Button onClick={() => setShowCreateNote(true)}>Create Your First Note</Button>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground mb-2">No notes match your search</p>
                  <p className="text-sm text-muted-foreground">Try adjusting your search terms or filters</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={() => setEditingNote(note)}
              onDelete={() => deleteNote(note.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface NoteCardProps {
  note: StudyNote
  onEdit: () => void
  onDelete: () => void
}

function NoteCard({ note, onEdit, onDelete }: NoteCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{note.title}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <BookOpen className="h-4 w-4" />
              {note.testName}
              <span className="text-muted-foreground">•</span>
              <Calendar className="h-4 w-4" />
              {note.createdAt.toLocaleDateString()}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Question Context */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium text-muted-foreground mb-1">Question:</p>
          <p className="text-sm">{note.questionText}</p>
        </div>

        {/* Note Content */}
        <div>
          <p className="text-sm whitespace-pre-wrap">{note.content}</p>
        </div>

        {/* Tags */}
        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {note.tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface NoteEditorProps {
  note?: StudyNote
  onSave: (noteData: Omit<StudyNote, "id" | "createdAt" | "updatedAt">) => void
  onCancel: () => void
  title: string
}

function NoteEditor({ note, onSave, onCancel, title }: NoteEditorProps) {
  const [noteTitle, setNoteTitle] = useState(note?.title || "")
  const [content, setContent] = useState(note?.content || "")
  const [testName, setTestName] = useState(note?.testName || "")
  const [questionText, setQuestionText] = useState(note?.questionText || "")
  const [tags, setTags] = useState(note?.tags.join(", ") || "")
  const [isBookmarked, setIsBookmarked] = useState(note?.isBookmarked || false)

  const handleSave = () => {
    if (!noteTitle.trim() || !content.trim()) return

    const tagArray = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)

    onSave({
      title: noteTitle.trim(),
      content: content.trim(),
      testName: testName.trim() || "General Notes",
      questionText: questionText.trim() || "No specific question",
      tags: tagArray,
      isBookmarked,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          <p className="text-muted-foreground">Add your study insights and observations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!noteTitle.trim() || !content.trim()}>
            Save Note
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label htmlFor="note-title">Note Title</Label>
            <Input
              id="note-title"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Enter a descriptive title for your note..."
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="test-name">Test/Subject</Label>
            <Input
              id="test-name"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="Which test or subject is this related to?"
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="question-text">Related Question (Optional)</Label>
            <Textarea
              id="question-text"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Copy the question this note relates to..."
              className="mt-2 min-h-[80px]"
            />
          </div>

          <div>
            <Label htmlFor="note-content">Your Notes</Label>
            <Textarea
              id="note-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your insights, explanations, memory aids, or any other study notes..."
              className="mt-2 min-h-[120px]"
            />
          </div>

          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="biology, difficult, review, important..."
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

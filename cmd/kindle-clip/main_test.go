package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestParseClippingsEnglishSample(t *testing.T) {
	content, err := os.ReadFile(filepath.Join("..", "..", "resources", "sample-english.txt"))
	if err != nil {
		t.Fatal(err)
	}
	books := parseClippings(string(content))
	if len(books) != 3 {
		t.Fatalf("expected 3 books, got %d", len(books))
	}
	if books[0].Author != "Daniel Kahneman" {
		t.Fatalf("expected author extraction, got %q", books[0].Author)
	}
}

func TestFilterByTitleAuthorAndDate(t *testing.T) {
	content, err := os.ReadFile(filepath.Join("..", "..", "resources", "sample-english.txt"))
	if err != nil {
		t.Fatal(err)
	}
	books := filterBooks(parseClippings(string(content)), filters{Title: "Sapiens", Author: "Harari", From: "2025-02-01", To: "2025-02-28"})
	if len(books) != 1 {
		t.Fatalf("expected 1 book, got %d", len(books))
	}
	if books[0].NoteCount != 2 {
		t.Fatalf("expected 2 notes, got %d", books[0].NoteCount)
	}
}

func TestRenderMarkdown(t *testing.T) {
	books := []Book{{Title: "Book", Author: "Author", NoteCount: 1, Highlights: []Highlight{{Text: "hello", Metadata: "meta"}}}}
	output := renderNotesMarkdown(books)
	if !strings.Contains(output, "# Notes") || !strings.Contains(output, "> hello") {
		t.Fatalf("unexpected markdown output: %s", output)
	}
}

func TestResolveConfiguredPath(t *testing.T) {
	temp := t.TempDir()
	t.Setenv("XDG_CONFIG_HOME", temp)
	clippingsPath := filepath.Join(temp, "My Clippings.txt")
	if err := os.WriteFile(clippingsPath, []byte(""), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := saveConfig(config{ClippingsPath: clippingsPath}); err != nil {
		t.Fatal(err)
	}
	resolved, err := resolveClippingsPath("", true)
	if err != nil {
		t.Fatal(err)
	}
	if resolved != clippingsPath {
		t.Fatalf("expected %s, got %s", clippingsPath, resolved)
	}
}

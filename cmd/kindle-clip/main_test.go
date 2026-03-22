package main

import (
	"bytes"
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
	if len(books) != 4 {
		t.Fatalf("expected 4 books, got %d", len(books))
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
	books := filterBooks(parseClippings(string(content)), filters{Book: "Sapiens", Author: "Harari", From: "2025-02-01", To: "2025-02-28"})
	if len(books) != 1 {
		t.Fatalf("expected 1 book, got %d", len(books))
	}
	if books[0].NoteCount != 5 {
		t.Fatalf("expected 5 notes, got %d", books[0].NoteCount)
	}
}

func TestRenderMarkdown(t *testing.T) {
	books := []Book{{Title: "Book (Author)", Author: "Author", NoteCount: 2, Highlights: []Highlight{{Text: "hello", Metadata: "meta", Kind: "highlight"}, {Text: "comment", Metadata: "meta2", Kind: "note"}}}}
	output := renderNotesMarkdown(books, false)
	if !strings.Contains(output, "# Book (Author)") || !strings.Contains(output, "> hello") || !strings.Contains(output, "> **Note**: comment") {
		t.Fatalf("unexpected markdown output: %s", output)
	}
	if strings.Contains(output, "metadata:") || strings.Contains(output, "### ") || strings.Contains(output, "## ") {
		t.Fatalf("expected grouped markdown without subtitles or metadata by default: %s", output)
	}
}

func TestRenderMarkdownVerboseShowsMetadata(t *testing.T) {
	books := []Book{{Title: "Book (Author)", Author: "Author", NoteCount: 1, Highlights: []Highlight{{Text: "hello", Metadata: "meta", Kind: "note"}}}}
	output := renderNotesMarkdown(books, true)
	if !strings.Contains(output, "> **Note**: hello") || !strings.Contains(output, "> *meta*") {
		t.Fatalf("unexpected markdown output: %s", output)
	}
}

func TestParseClippingsClassifiesHighlightAndNoteKinds(t *testing.T) {
	content := strings.Join([]string{
		"The Pragmatic Programmer (David Thomas; Andrew Hunt)",
		"- Your Highlight on page 14 | location 198-200 | Added on Wednesday, 15 January 2025 22:17:44",
		"",
		"Don't leave broken windows unrepaired.",
		"",
		"==========",
		"The Pragmatic Programmer (David Thomas; Andrew Hunt)",
		"- Your Note on page 14 | location 199 | Added on Wednesday, 15 January 2025 22:18:02",
		"",
		"Comment about the broken windows theory.",
		"",
		"==========",
	}, "\n")

	books := parseClippings(content)
	if len(books) != 1 {
		t.Fatalf("expected 1 book, got %d", len(books))
	}
	if len(books[0].Highlights) != 2 {
		t.Fatalf("expected 2 clips, got %d", len(books[0].Highlights))
	}
	if books[0].Highlights[0].Kind != "highlight" {
		t.Fatalf("expected first clip kind highlight, got %q", books[0].Highlights[0].Kind)
	}
	if books[0].Highlights[1].Kind != "note" {
		t.Fatalf("expected second clip kind note, got %q", books[0].Highlights[1].Kind)
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

func TestSplitPathAndFlagsAcceptsStdinMarker(t *testing.T) {
	path, rest := splitPathAndFlags([]string{"-", "--verbose"})
	if path != "-" {
		t.Fatalf("expected stdin marker path, got %q", path)
	}
	if len(rest) != 1 || rest[0] != "--verbose" {
		t.Fatalf("expected remaining flags, got %#v", rest)
	}
}

func TestResolveClippingsPathHandlesMountedKindleRoot(t *testing.T) {
	tempDir := t.TempDir()
	documentsDir := filepath.Join(tempDir, "documents")
	if err := os.MkdirAll(documentsDir, 0o755); err != nil {
		t.Fatal(err)
	}
	expected := filepath.Join(documentsDir, "My Clippings.txt")
	if err := os.WriteFile(expected, []byte(""), 0o644); err != nil {
		t.Fatal(err)
	}

	resolved, err := resolveClippingsPath(tempDir, true)
	if err != nil {
		t.Fatal(err)
	}
	if resolved != expected {
		t.Fatalf("expected %s, got %s", expected, resolved)
	}
}

func TestRunPrintCommandUsesBookFlag(t *testing.T) {
	tempDir := t.TempDir()
	clippingsPath := filepath.Join(tempDir, "My Clippings.txt")
	content, err := os.ReadFile(filepath.Join("..", "..", "resources", "sample-english.txt"))
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(clippingsPath, content, 0o644); err != nil {
		t.Fatal(err)
	}

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	if err := run([]string{"print", clippingsPath, "--book", "Sapiens"}, &stdout, &stderr); err != nil {
		t.Fatal(err)
	}

	out := stdout.String()
	if !strings.Contains(out, "# Sapiens: A Brief History of Humankind (Yuval Noah Harari)") {
		t.Fatalf("expected Sapiens heading, got %s", out)
	}
	if !strings.Contains(out, "> **Note**: The framing is provocative but memorable.") {
		t.Fatalf("expected note clips to be labeled in print output, got %s", out)
	}
	if strings.Contains(out, "# Atomic Habits (James Clear)") {
		t.Fatalf("expected --book filter to exclude other books, got %s", out)
	}
	if strings.Contains(out, "Added on ") || strings.Contains(out, "location ") {
		t.Fatalf("expected non-verbose print output to omit metadata, got %s", out)
	}
}

func TestRunSearchSupportsVerboseAndExportMD(t *testing.T) {
	tempDir := t.TempDir()
	clippingsPath := filepath.Join(tempDir, "My Clippings.txt")
	outputPath := filepath.Join(tempDir, "search.md")
	content, err := os.ReadFile(filepath.Join("..", "..", "resources", "sample-english.txt"))
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(clippingsPath, content, 0o644); err != nil {
		t.Fatal(err)
	}

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	if err := run([]string{"search", clippingsPath, "confidence", "--verbose", "--export-md", outputPath}, &stdout, &stderr); err != nil {
		t.Fatal(err)
	}

	saved, err := os.ReadFile(outputPath)
	if err != nil {
		t.Fatal(err)
	}
	out := string(saved)
	if !strings.Contains(out, "# Thinking, Fast and Slow (Daniel Kahneman)") {
		t.Fatalf("expected saved search output to include book heading, got %s", out)
	}
	if !strings.Contains(out, "> The confidence people have in their beliefs is not a measure of the quality of evidence.") {
		t.Fatalf("expected highlight output to stay plain blockquote, got %s", out)
	}
	if !strings.Contains(out, "> *- Your Highlight on page 20 | location 291-293 | Added on Sunday, 5 January 2025 09:14:22*") {
		t.Fatalf("expected verbose search output to include metadata, got %s", out)
	}
}

func TestRunSearchOmitsMetadataWithoutVerbose(t *testing.T) {
	tempDir := t.TempDir()
	clippingsPath := filepath.Join(tempDir, "My Clippings.txt")
	content, err := os.ReadFile(filepath.Join("..", "..", "resources", "sample-english.txt"))
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(clippingsPath, content, 0o644); err != nil {
		t.Fatal(err)
	}

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	if err := run([]string{"search", clippingsPath, "confidence"}, &stdout, &stderr); err != nil {
		t.Fatal(err)
	}

	out := stdout.String()
	if !strings.Contains(out, "# Thinking, Fast and Slow (Daniel Kahneman)") {
		t.Fatalf("expected search output to include book heading, got %s", out)
	}
	if strings.Contains(out, "Added on ") || strings.Contains(out, "location ") {
		t.Fatalf("expected non-verbose search output to omit metadata, got %s", out)
	}
}

func TestRunListSupportsAuthorDateAndExportMD(t *testing.T) {
	tempDir := t.TempDir()
	clippingsPath := filepath.Join(tempDir, "My Clippings.txt")
	outputPath := filepath.Join(tempDir, "list.md")
	content, err := os.ReadFile(filepath.Join("..", "..", "resources", "sample-english.txt"))
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(clippingsPath, content, 0o644); err != nil {
		t.Fatal(err)
	}

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	if err := run([]string{"list", clippingsPath, "--author", "Harari", "--from", "2025-02-01", "--to", "2025-02-28", "--export-md", outputPath}, &stdout, &stderr); err != nil {
		t.Fatal(err)
	}

	saved, err := os.ReadFile(outputPath)
	if err != nil {
		t.Fatal(err)
	}
	out := string(saved)
	if !strings.Contains(out, "Sapiens: A Brief History of Humankind (Yuval Noah Harari)") {
		t.Fatalf("expected filtered list output to include Sapiens, got %s", out)
	}
	if strings.Contains(out, "Atomic Habits") || strings.Contains(out, "Daniel Kahneman") {
		t.Fatalf("expected author/date filters to limit list output, got %s", out)
	}
	if strings.Contains(out, "clips:") || strings.Contains(out, "first:") || strings.Contains(out, "last:") {
		t.Fatalf("expected non-verbose list output to omit metadata details, got %s", out)
	}
}

func TestRunListOmitsMetadataWithoutVerbose(t *testing.T) {
	tempDir := t.TempDir()
	clippingsPath := filepath.Join(tempDir, "My Clippings.txt")
	content, err := os.ReadFile(filepath.Join("..", "..", "resources", "sample-english.txt"))
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(clippingsPath, content, 0o644); err != nil {
		t.Fatal(err)
	}

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	if err := run([]string{"list", clippingsPath}, &stdout, &stderr); err != nil {
		t.Fatal(err)
	}

	out := stdout.String()
	if !strings.Contains(out, "Thinking, Fast and Slow (Daniel Kahneman)") {
		t.Fatalf("expected list output to include book title, got %s", out)
	}
	if strings.Contains(out, "clips:") || strings.Contains(out, "first:") || strings.Contains(out, "last:") {
		t.Fatalf("expected non-verbose list output to omit metadata details, got %s", out)
	}
}

func TestTopLevelHelpFlags(t *testing.T) {
	for _, args := range [][]string{{"--help"}, {"-h"}} {
		var stdout bytes.Buffer
		var stderr bytes.Buffer
		if err := run(args, &stdout, &stderr); err != nil {
			t.Fatalf("expected no error for %v, got %v", args, err)
		}
		out := stdout.String()
		if !strings.Contains(out, "Usage:\n  kindle-clip <command> [path-or-stdin] [options]") {
			t.Fatalf("expected top-level help for %v, got %s", args, out)
		}
		if stderr.Len() != 0 {
			t.Fatalf("expected empty stderr for %v, got %s", args, stderr.String())
		}
	}
}

func TestSubcommandHelpFlags(t *testing.T) {
	cases := []struct {
		name    string
		args    []string
		snippet string
	}{
		{name: "set long", args: []string{"set", "--help"}, snippet: "kindle-clip set <path>"},
		{name: "set short", args: []string{"set", "-h"}, snippet: "kindle-clip set <path>"},
		{name: "list long", args: []string{"list", "--help"}, snippet: "kindle-clip list [path] [options]"},
		{name: "list short", args: []string{"list", "-h"}, snippet: "kindle-clip list [path] [options]"},
		{name: "print long", args: []string{"print", "--help"}, snippet: "kindle-clip print [path] [options]"},
		{name: "print short", args: []string{"print", "-h"}, snippet: "kindle-clip print [path] [options]"},
		{name: "search long", args: []string{"search", "--help"}, snippet: "kindle-clip search [path] <keyword> [options]"},
		{name: "search short", args: []string{"search", "-h"}, snippet: "kindle-clip search [path] <keyword> [options]"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var stdout bytes.Buffer
			var stderr bytes.Buffer
			if err := run(tc.args, &stdout, &stderr); err != nil {
				t.Fatalf("expected no error for %v, got %v", tc.args, err)
			}
			out := stdout.String()
			if !strings.Contains(out, tc.snippet) {
				t.Fatalf("expected help output for %v, got %s", tc.args, out)
			}
			if stderr.Len() != 0 {
				t.Fatalf("expected empty stderr for %v, got %s", tc.args, stderr.String())
			}
		})
	}
}

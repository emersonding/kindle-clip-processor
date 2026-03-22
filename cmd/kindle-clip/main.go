package main

import (
	"bufio"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"time"
)

const (
	chunkDelimiter   = "=========="
	clippingLimit    = "<You have reached the clipping limit for this item>"
	defaultExportMD  = "kindle-highlights.md"
	envConfiguredDir = "KINDLE_CLIP_PATH"
)

var (
	emailRegex    = regexp.MustCompile(`\([^)]*@[^)]*\)`)
	zhDateRegex   = regexp.MustCompile(`(\d+)年(\d+)月(\d+)日.*?(\d+):(\d+):(\d+)`)
	enDateRegexEU = regexp.MustCompile(`Added on \w+,\s+(\d{1,2})\s+(\w+)\s+(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})`)
	enDateRegexUS = regexp.MustCompile(`(?i)Added on \w+,\s+(\w+)\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)`)
	authorRegex   = regexp.MustCompile(`^(.*)\(([^()]+)\)\s*$`)
	monthNames    = map[string]time.Month{"january": time.January, "february": time.February, "march": time.March, "april": time.April, "may": time.May, "june": time.June, "july": time.July, "august": time.August, "september": time.September, "october": time.October, "november": time.November, "december": time.December}
)

type Highlight struct {
	Title    string     `json:"title"`
	Metadata string     `json:"metadata"`
	Text     string     `json:"text"`
	Date     *time.Time `json:"date,omitempty"`
}

type Book struct {
	Title      string      `json:"title"`
	Author     string      `json:"author,omitempty"`
	NoteCount  int         `json:"noteCount"`
	FirstNote  *time.Time  `json:"firstNote,omitempty"`
	LastNote   *time.Time  `json:"lastNote,omitempty"`
	Highlights []Highlight `json:"highlights"`
}

type noteView struct {
	BookTitle  string `json:"bookTitle"`
	Author     string `json:"author,omitempty"`
	NoteNumber int    `json:"noteNumber"`
	Metadata   string `json:"metadata"`
	Text       string `json:"text"`
	CreatedAt  string `json:"createdAt,omitempty"`
}

type bookView struct {
	Title     string     `json:"title"`
	Author    string     `json:"author,omitempty"`
	NoteCount int        `json:"noteCount"`
	FirstNote string     `json:"firstNote,omitempty"`
	LastNote  string     `json:"lastNote,omitempty"`
	Notes     []noteView `json:"notes,omitempty"`
}

type filters struct {
	From   string
	To     string
	Title  string
	Author string
	Query  string
}

func main() {
	if err := run(os.Args[1:], os.Stdout, os.Stderr); err != nil {
		fmt.Fprintln(os.Stderr, "Error:", err)
		os.Exit(1)
	}
}

func run(args []string, stdout, stderr io.Writer) error {
	if len(args) == 0 {
		printHelp(stdout)
		return nil
	}

	switch args[0] {
	case "help", "--help", "-h":
		printHelp(stdout)
		return nil
	case "set":
		return runSet(args[1:], stdout)
	case "list":
		return runList(args[1:], stdout)
	case "all":
		return runAll(args[1:], stdout)
	case "search":
		return runSearch(args[1:], stdout)
	case "parse":
		return runParse(args[1:], stdout)
	case "export-md":
		return runExportMD(args[1:], stdout)
	default:
		fmt.Fprintf(stderr, "Unknown command: %s\n\n", args[0])
		printHelp(stderr)
		return errors.New("invalid command")
	}
}

func printHelp(w io.Writer) {
	fmt.Fprint(w, `kindle-clip

Usage:
  kindle-clip <command> [path-or-stdin] [options]

Commands:
  set <path>                 Save the default clippings file or directory.
  list [path]                List books in Markdown by default.
  all [path]                 Print matching notes in Markdown by default.
  search [path] <keyword>    Search notes by keyword.
  parse [path]               Print structured output (Markdown by default, JSON optional).
  export-md [path]           Save filtered notes as Markdown.
  help                       Show this message.

Path resolution order:
  1. explicit file or directory argument
  2. KINDLE_CLIP_PATH
  3. saved config in ~/.config/kindle-clip/config.json (or XDG_CONFIG_HOME)

Common options:
  --from YYYY-MM-DD    Include notes created on/after this date.
  --to YYYY-MM-DD      Include notes created on/before this date.
  --title TEXT         Include only notes whose book title matches TEXT.
  --author TEXT        Include only notes whose author matches TEXT.
  --json               Print JSON instead of Markdown.

Examples:
  kindle-clip set ~/Documents/Kindle
  kindle-clip list
  kindle-clip list ~/Documents/Kindle --author "Daniel Kahneman"
  kindle-clip all --title "Sapiens"
  kindle-clip search confidence
  kindle-clip export-md --output ./highlights.md
  cat "My Clippings.txt" | kindle-clip parse - --json
`)
}

func runSet(args []string, stdout io.Writer) error {
	if len(args) == 0 {
		return errors.New("set requires a file or directory path")
	}
	resolved, err := resolveClippingsPath(args[0], false)
	if err != nil {
		return err
	}
	cfg := config{ClippingsPath: resolved}
	if err := saveConfig(cfg); err != nil {
		return err
	}
	fmt.Fprintf(stdout, "# Saved default Kindle clippings path\n\n- path: `%s`\n", resolved)
	return nil
}

func runList(args []string, stdout io.Writer) error {
	pathArg, fs := splitPathAndFlags(args)
	books, asJSON, err := loadBooks(pathArg, fs)
	if err != nil {
		return err
	}
	if asJSON {
		return writeJSON(stdout, toBookViews(books, false))
	}
	_, err = fmt.Fprint(stdout, renderBookListMarkdown(books))
	return err
}

func runAll(args []string, stdout io.Writer) error {
	pathArg, fs := splitPathAndFlags(args)
	books, asJSON, err := loadBooks(pathArg, fs)
	if err != nil {
		return err
	}
	if asJSON {
		return writeJSON(stdout, flattenNotes(books))
	}
	_, err = fmt.Fprint(stdout, renderNotesMarkdown(books))
	return err
}

func runSearch(args []string, stdout io.Writer) error {
	pathArg, keyword, rest := splitSearchArgs(args)
	fs := flag.NewFlagSet("search", flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	common := bindCommonFlags(fs)
	if err := fs.Parse(rest); err != nil {
		return err
	}
	if keyword == "" {
		if common.filters.Query == "" {
			return errors.New("search requires a keyword positional argument or --query")
		}
		keyword = common.filters.Query
	}
	common.filters.Query = keyword
	books, err := loadBooksWithFilters(pathArg, *common.filters)
	if err != nil {
		return err
	}
	if *common.jsonOut {
		return writeJSON(stdout, flattenNotes(books))
	}
	_, err = fmt.Fprint(stdout, renderNotesMarkdown(books))
	return err
}

func runParse(args []string, stdout io.Writer) error {
	pathArg, fs := splitPathAndFlags(args)
	books, asJSON, err := loadBooks(pathArg, fs)
	if err != nil {
		return err
	}
	if asJSON {
		return writeJSON(stdout, toBookViews(books, true))
	}
	_, err = fmt.Fprint(stdout, renderStructuredMarkdown(books))
	return err
}

func runExportMD(args []string, stdout io.Writer) error {
	pathArg, rest := splitPathAndFlags(args)
	fs := flag.NewFlagSet("export-md", flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	common := bindCommonFlags(fs)
	output := fs.String("output", defaultExportMD, "output file path")
	if err := fs.Parse(rest); err != nil {
		return err
	}
	books, err := loadBooksWithFilters(pathArg, *common.filters)
	if err != nil {
		return err
	}
	content := renderNotesMarkdown(books)
	if err := os.MkdirAll(filepath.Dir(*output), 0o755); err != nil && filepath.Dir(*output) != "." {
		return err
	}
	if err := os.WriteFile(*output, []byte(content), 0o644); err != nil {
		return err
	}
	fmt.Fprintf(stdout, "# Markdown export saved\n\n- file: `%s`\n", *output)
	return nil
}

func splitPathAndFlags(args []string) (string, []string) {
	if len(args) == 0 {
		return "", args
	}
	if strings.HasPrefix(args[0], "-") {
		return "", args
	}
	return args[0], args[1:]
}

func splitSearchArgs(args []string) (string, string, []string) {
	if len(args) == 0 {
		return "", "", args
	}
	if strings.HasPrefix(args[0], "-") {
		return "", "", args
	}
	first := args[0]
	if first == "-" {
		if len(args) > 1 && !strings.HasPrefix(args[1], "-") {
			return first, args[1], args[2:]
		}
		return first, "", args[1:]
	}
	if _, err := os.Stat(first); err == nil {
		if len(args) > 1 && !strings.HasPrefix(args[1], "-") {
			return first, args[1], args[2:]
		}
		return first, "", args[1:]
	}
	return "", first, args[1:]
}

type commonFlags struct {
	filters *filters
	jsonOut *bool
}

func bindCommonFlags(fs *flag.FlagSet) commonFlags {
	f := &filters{}
	jsonOut := fs.Bool("json", false, "print JSON")
	fs.StringVar(&f.From, "from", "", "include notes on/after date")
	fs.StringVar(&f.To, "to", "", "include notes on/before date")
	fs.StringVar(&f.Title, "title", "", "include matching titles")
	fs.StringVar(&f.Author, "author", "", "include matching authors")
	fs.StringVar(&f.Query, "query", "", "include matching note text")
	return commonFlags{filters: f, jsonOut: jsonOut}
}

func loadBooks(pathArg string, args []string) ([]Book, bool, error) {
	parsed := flag.NewFlagSet("common", flag.ContinueOnError)
	parsed.SetOutput(io.Discard)
	common := bindCommonFlags(parsed)
	if err := parsed.Parse(args); err != nil {
		return nil, false, err
	}
	books, err := loadBooksWithFilters(pathArg, *common.filters)
	return books, *common.jsonOut, err
}

func loadBooksWithFilters(pathArg string, f filters) ([]Book, error) {
	if err := validateFilters(f); err != nil {
		return nil, err
	}
	content, err := readInput(pathArg)
	if err != nil {
		return nil, err
	}
	books := parseClippings(content)
	return filterBooks(books, f), nil
}

func validateFilters(f filters) error {
	for _, value := range []string{f.From, f.To} {
		if value == "" {
			continue
		}
		if _, err := time.Parse("2006-01-02", value); err != nil {
			return fmt.Errorf("invalid date %q, expected YYYY-MM-DD", value)
		}
	}
	return nil
}

func parseClippings(content string) []Book {
	chunks := strings.Split(content, chunkDelimiter)
	bookOrder := []string{}
	booksMap := map[string]*Book{}

	for _, rawChunk := range chunks {
		lines := stripEmptyStrings(strings.Split(rawChunk, "\n"))
		if len(lines) < 2 {
			continue
		}
		title := strings.TrimSpace(emailRegex.ReplaceAllString(lines[0], ""))
		metadata := lines[1]
		text := ""
		if len(lines) >= 3 {
			text = strings.Join(lines[2:], "\n")
		}
		if text == "" || text == clippingLimit {
			continue
		}
		highlight := Highlight{Title: title, Metadata: metadata, Text: text, Date: extractDate(metadata)}
		book := booksMap[title]
		if book == nil {
			book = &Book{Title: title, Author: parseAuthor(title)}
			booksMap[title] = book
			bookOrder = append(bookOrder, title)
		}
		book.Highlights = append(book.Highlights, highlight)
	}

	books := make([]Book, 0, len(bookOrder))
	for _, title := range bookOrder {
		book := booksMap[title]
		book.NoteCount = len(book.Highlights)
		for i := range book.Highlights {
			if book.Highlights[i].Date == nil {
				continue
			}
			if book.FirstNote == nil || book.Highlights[i].Date.Before(*book.FirstNote) {
				book.FirstNote = book.Highlights[i].Date
			}
			if book.LastNote == nil || book.Highlights[i].Date.After(*book.LastNote) {
				book.LastNote = book.Highlights[i].Date
			}
		}
		books = append(books, *book)
	}
	return books
}

func stripEmptyStrings(lines []string) []string {
	result := make([]string, 0, len(lines))
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

func extractDate(metadata string) *time.Time {
	if m := zhDateRegex.FindStringSubmatch(metadata); m != nil {
		values := mustInts(m[1:7])
		year, month, day, hour, minute, second := values[0], values[1], values[2], values[3], values[4], values[5]
		if strings.Contains(metadata, "下午") && hour != 12 {
			hour += 12
		}
		if strings.Contains(metadata, "上午") && hour == 12 {
			hour = 0
		}
		t := time.Date(year, time.Month(month), day, hour, minute, second, 0, time.Local)
		return &t
	}
	if m := enDateRegexEU.FindStringSubmatch(metadata); m != nil {
		values := mustInts([]string{m[1], m[3], m[4], m[5], m[6]})
		day, year, hour, minute, second := values[0], values[1], values[2], values[3], values[4]
		month := monthNames[strings.ToLower(m[2])]
		if month == 0 {
			return nil
		}
		t := time.Date(year, month, day, hour, minute, second, 0, time.Local)
		return &t
	}
	if m := enDateRegexUS.FindStringSubmatch(metadata); m != nil {
		values := mustInts([]string{m[2], m[3], m[4], m[5], m[6]})
		day, year, hour, minute, second := values[0], values[1], values[2], values[3], values[4]
		month := monthNames[strings.ToLower(m[1])]
		if month == 0 {
			return nil
		}
		if m[7] == "PM" && hour != 12 {
			hour += 12
		}
		if m[7] == "AM" && hour == 12 {
			hour = 0
		}
		t := time.Date(year, month, day, hour, minute, second, 0, time.Local)
		return &t
	}
	return nil
}

func mustInts(values []string) []int {
	result := make([]int, 0, len(values))
	for _, value := range values {
		var parsed int
		fmt.Sscanf(value, "%d", &parsed)
		result = append(result, parsed)
	}
	return result
}

func parseAuthor(title string) string {
	match := authorRegex.FindStringSubmatch(title)
	if match == nil || strings.Contains(match[2], "@") {
		return ""
	}
	return strings.TrimSpace(match[2])
}

func filterBooks(books []Book, f filters) []Book {
	filtered := make([]Book, 0, len(books))
	for _, book := range books {
		if f.Title != "" && !strings.Contains(strings.ToLower(book.Title), strings.ToLower(f.Title)) {
			continue
		}
		if f.Author != "" && !strings.Contains(strings.ToLower(book.Author), strings.ToLower(f.Author)) {
			continue
		}
		next := Book{Title: book.Title, Author: book.Author}
		for _, highlight := range book.Highlights {
			if !matchesFilters(book, highlight, f) {
				continue
			}
			next.Highlights = append(next.Highlights, highlight)
		}
		if len(next.Highlights) == 0 {
			continue
		}
		next.NoteCount = len(next.Highlights)
		for i := range next.Highlights {
			if next.Highlights[i].Date == nil {
				continue
			}
			if next.FirstNote == nil || next.Highlights[i].Date.Before(*next.FirstNote) {
				next.FirstNote = next.Highlights[i].Date
			}
			if next.LastNote == nil || next.Highlights[i].Date.After(*next.LastNote) {
				next.LastNote = next.Highlights[i].Date
			}
		}
		filtered = append(filtered, next)
	}
	return filtered
}

func matchesFilters(book Book, highlight Highlight, f filters) bool {
	if f.Query != "" {
		needle := strings.ToLower(f.Query)
		haystacks := []string{highlight.Text, highlight.Metadata, book.Title, book.Author}
		matched := false
		for _, haystack := range haystacks {
			if strings.Contains(strings.ToLower(haystack), needle) {
				matched = true
				break
			}
		}
		if !matched {
			return false
		}
	}
	if f.From != "" && highlight.Date != nil {
		from, _ := time.ParseInLocation("2006-01-02", f.From, time.Local)
		if highlight.Date.Before(from) {
			return false
		}
	}
	if f.To != "" && highlight.Date != nil {
		to, _ := time.ParseInLocation("2006-01-02", f.To, time.Local)
		to = to.Add(24*time.Hour - time.Nanosecond)
		if highlight.Date.After(to) {
			return false
		}
	}
	return true
}

func flattenNotes(books []Book) []noteView {
	notes := []noteView{}
	for _, book := range books {
		for index, highlight := range book.Highlights {
			notes = append(notes, noteView{BookTitle: book.Title, Author: book.Author, NoteNumber: index + 1, Metadata: highlight.Metadata, Text: highlight.Text, CreatedAt: formatDateTime(highlight.Date)})
		}
	}
	return notes
}

func toBookViews(books []Book, includeNotes bool) []bookView {
	views := make([]bookView, 0, len(books))
	for _, book := range books {
		view := bookView{Title: book.Title, Author: book.Author, NoteCount: book.NoteCount, FirstNote: formatDateTime(book.FirstNote), LastNote: formatDateTime(book.LastNote)}
		if includeNotes {
			view.Notes = flattenNotes([]Book{book})
		}
		views = append(views, view)
	}
	return views
}

func renderBookListMarkdown(books []Book) string {
	if len(books) == 0 {
		return "# Books\n\n_No books matched your filters._\n"
	}
	var b strings.Builder
	b.WriteString("# Books\n\n")
	for _, book := range books {
		fmt.Fprintf(&b, "- **%s**", book.Title)
		if book.Author != "" {
			fmt.Fprintf(&b, " — %s", book.Author)
		}
		fmt.Fprintf(&b, "\n  - notes: %d\n  - first: %s\n  - last: %s\n", book.NoteCount, formatDateTime(book.FirstNote), formatDateTime(book.LastNote))
	}
	return b.String()
}

func renderNotesMarkdown(books []Book) string {
	if len(books) == 0 {
		return "# Notes\n\n_No notes matched your filters._\n"
	}
	var b strings.Builder
	b.WriteString("# Notes\n\n")
	for _, note := range flattenNotes(books) {
		fmt.Fprintf(&b, "## %s\n\n", note.BookTitle)
		if note.Author != "" {
			fmt.Fprintf(&b, "- author: %s\n", note.Author)
		}
		fmt.Fprintf(&b, "- note: %d\n- created: %s\n- metadata: %s\n\n", note.NoteNumber, valueOrUnknown(note.CreatedAt), note.Metadata)
		for _, line := range strings.Split(note.Text, "\n") {
			fmt.Fprintf(&b, "> %s\n", line)
		}
		b.WriteString("\n")
	}
	return b.String()
}

func renderStructuredMarkdown(books []Book) string {
	if len(books) == 0 {
		return "# Parsed Clippings\n\n_No notes matched your filters._\n"
	}
	var b strings.Builder
	b.WriteString("# Parsed Clippings\n\n")
	for _, book := range books {
		fmt.Fprintf(&b, "## %s\n\n", book.Title)
		if book.Author != "" {
			fmt.Fprintf(&b, "- author: %s\n", book.Author)
		}
		fmt.Fprintf(&b, "- notes: %d\n- first: %s\n- last: %s\n\n", book.NoteCount, formatDateTime(book.FirstNote), formatDateTime(book.LastNote))
		for _, note := range flattenNotes([]Book{book}) {
			fmt.Fprintf(&b, "### Note %d\n\n- created: %s\n- metadata: %s\n\n", note.NoteNumber, valueOrUnknown(note.CreatedAt), note.Metadata)
			for _, line := range strings.Split(note.Text, "\n") {
				fmt.Fprintf(&b, "> %s\n", line)
			}
			b.WriteString("\n")
		}
	}
	return b.String()
}

func valueOrUnknown(value string) string {
	if value == "" {
		return "unknown"
	}
	return value
}

func formatDateTime(value *time.Time) string {
	if value == nil {
		return ""
	}
	return value.Format(time.RFC3339)
}

func writeJSON(w io.Writer, value any) error {
	encoder := json.NewEncoder(w)
	encoder.SetIndent("", "  ")
	return encoder.Encode(value)
}

func readInput(pathArg string) (string, error) {
	path, err := resolveClippingsPath(pathArg, true)
	if err != nil {
		return "", err
	}
	if path == "-" {
		data, err := io.ReadAll(bufio.NewReader(os.Stdin))
		return string(data), err
	}
	data, err := os.ReadFile(path)
	return string(data), err
}

func resolveClippingsPath(pathArg string, requireFile bool) (string, error) {
	candidate := strings.TrimSpace(pathArg)
	if candidate == "" {
		candidate = strings.TrimSpace(os.Getenv(envConfiguredDir))
	}
	if candidate == "" {
		cfg, err := loadConfig()
		if err == nil {
			candidate = cfg.ClippingsPath
		}
	}
	if candidate == "" {
		return "", errors.New("no clippings path provided; use `kindle-clip set <path>` or KINDLE_CLIP_PATH")
	}
	if candidate == "-" {
		return candidate, nil
	}
	info, err := os.Stat(candidate)
	if err != nil {
		return "", err
	}
	if info.IsDir() {
		candidate = filepath.Join(candidate, "My Clippings.txt")
	}
	absoluteCandidate, err := filepath.Abs(candidate)
	if err == nil {
		candidate = absoluteCandidate
	}
	if requireFile {
		if _, err := os.Stat(candidate); err != nil {
			return "", err
		}
	}
	return candidate, nil
}

type config struct {
	ClippingsPath string `json:"clippingsPath"`
}

func configFilePath() (string, error) {
	base := os.Getenv("XDG_CONFIG_HOME")
	if base == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		if runtime.GOOS == "windows" {
			base = filepath.Join(home, "AppData", "Roaming")
		} else {
			base = filepath.Join(home, ".config")
		}
	}
	return filepath.Join(base, "kindle-clip", "config.json"), nil
}

func loadConfig() (config, error) {
	path, err := configFilePath()
	if err != nil {
		return config{}, err
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return config{}, err
	}
	var cfg config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return config{}, err
	}
	return cfg, nil
}

func saveConfig(cfg config) error {
	path, err := configFilePath()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o644)
}

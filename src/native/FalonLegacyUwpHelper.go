package main

import (
	"archive/zip"
	"bytes"
	"context"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"encoding/xml"
	"errors"
	"fmt"
	"html"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	helperUserAgent       = "Falon-Legacy-UWP-Helper/2.0"
	linkCheckUserAgent    = "Mozilla/5.0 FalonLegacyUwp-LinkCheck"
	deliveryUserAgent     = "Microsoft-Delivery-Optimization/10.0"
	strictPackageMinBytes = int64(20 * 1024 * 1024)
	maxPackageBytes       = int64(8 * 1024 * 1024 * 1024)
)

type envelope struct {
	Event string      `json:"event,omitempty"`
	OK    bool        `json:"ok"`
	Data  interface{} `json:"data,omitempty"`
	Error string      `json:"error,omitempty"`
}

type legacyRequest struct {
	Short       string   `json:"short"`
	ReleaseType string   `json:"releaseType"`
	MetadataURL string   `json:"metadataUrl"`
	URLs        []string `json:"urls"`
	FileName    string   `json:"fileName"`
	MD5         string   `json:"md5"`
	DestDir     string   `json:"destDir"`
	Label       string   `json:"label"`
	PackagePath string   `json:"packagePath"`
	OutDir      string   `json:"outDir"`
}

type legacyResolveResult struct {
	URLs     []string `json:"urls"`
	FileName string   `json:"fileName"`
	MD5      string   `json:"md5"`
	Error    string   `json:"error,omitempty"`
}

type legacyVersion struct {
	Version      string   `json:"version"`
	Short        string   `json:"short"`
	UpdateID     string   `json:"updateId,omitempty"`
	Revision     string   `json:"revision,omitempty"`
	FileName     string   `json:"fileName,omitempty"`
	URLs         []string `json:"urls"`
	Downloadable bool     `json:"downloadable"`
	Package      string   `json:"package"`
	Type         string   `json:"type"`
	ReleaseType  string   `json:"releaseType"`
	Source       string   `json:"source,omitempty"`
	MetadataURL  string   `json:"metadataUrl,omitempty"`
}

type legacyCatalog struct {
	LegacyUwpVersions []legacyVersion `json:"legacyUwpVersions"`
	Sources           []string        `json:"sources,omitempty"`
	Errors            []string        `json:"errors,omitempty"`
}

type legacyUWPRef struct {
	UpdateID string
	Revision string
	FileName string
	Source   string
}

type linkCheckResult struct {
	Input          string `json:"input"`
	Resolved       string `json:"resolved,omitempty"`
	FinalURL       string `json:"finalUrl,omitempty"`
	Valid          bool   `json:"valid"`
	Reason         string `json:"reason"`
	StatusCode     int    `json:"statusCode,omitempty"`
	Status         string `json:"status,omitempty"`
	ContentType    string `json:"contentType,omitempty"`
	ContentLength  int64  `json:"contentLength,omitempty"`
	PackageHint    bool   `json:"packageHint,omitempty"`
	ContentPreview string `json:"contentPreview,omitempty"`
}

type downloadResult struct {
	InstallerPath string   `json:"installerPath"`
	ResolvedURL   string   `json:"resolvedUrl"`
	ChosenURL     string   `json:"chosenUrl"`
	FileName      string   `json:"fileName"`
	MD5           string   `json:"md5,omitempty"`
	Attempts      []string `json:"attempts,omitempty"`
}

type extractResult struct {
	OutDir         string `json:"outDir"`
	ManifestPath   string `json:"manifestPath,omitempty"`
	ExePath        string `json:"exePath,omitempty"`
	ExtractedFiles int    `json:"extractedFiles,omitempty"`
	Method         string `json:"method,omitempty"`
}

func emit(v interface{}) {
	enc := json.NewEncoder(os.Stdout)
	enc.SetEscapeHTML(false)
	_ = enc.Encode(v)
}

func resultOK(data interface{}) {
	emit(envelope{Event: "result", OK: true, Data: data})
}

func resultErr(err error) {
	if err == nil {
		err = errors.New("unknown helper error")
	}
	emit(envelope{Event: "result", OK: false, Error: strings.TrimSpace(err.Error())})
}

func emitProgress(downloaded int64, total int64, dest string, label string) {
	emit(map[string]interface{}{
		"event":      "progress",
		"downloaded": downloaded,
		"total":      total,
		"dest":       dest,
		"label":      label,
	})
}

func emitStatus(stage string, message string, extra map[string]interface{}) {
	payload := map[string]interface{}{"event": "status", "stage": stage, "message": message}
	for k, v := range extra {
		payload[k] = v
	}
	emit(payload)
}

func readRequest() (legacyRequest, error) {
	var req legacyRequest
	dec := json.NewDecoder(os.Stdin)
	err := dec.Decode(&req)
	if err == io.EOF {
		return req, nil
	}
	return req, err
}

func legacyUwpSourceURLs() []string {
	return []string{
		// Primary maintained mirror used when the historical MrARM endpoint lags/offlines.
		"https://raw.githubusercontent.com/ddf8196/mc-w10-versiondb-auto-update/refs/heads/master/versions.json.min",
		// Historical MCLauncher endpoint. Keep it as a source, not as a single point of failure.
		"https://mrarm.io/r/w10-vdb",
		"https://raw.githubusercontent.com/Kuro7s/mc-w10-versiondb-auto-update/refs/heads/master/versions.json.min",
		"https://raw.githubusercontent.com/MCMrARM/mc-w10-versiondb/refs/heads/master/versions.txt",
		"https://raw.githubusercontent.com/MCMrARM/mc-w10-versiondb/refs/heads/master/versions.json.min",
		"https://raw.githubusercontent.com/reversedcodes/minecraft-bedrock-meta-database/main/bedrock/client/versions.json",
		"https://raw.githubusercontent.com/reversedcodes/minecraft-bedrock-meta-database/main/bedrock/client/versions.min.json",
		"https://raw.githubusercontent.com/reversedcodes/minecraft-bedrock-meta-database/main/bedrock/client/release/versions.json",
		"https://raw.githubusercontent.com/reversedcodes/minecraft-bedrock-meta-database/main/bedrock/client/release/versions.min.json",
		"https://raw.githubusercontent.com/reversedcodes/minecraft-bedrock-meta-database/main/bedrock/client/preview/versions.json",
		"https://raw.githubusercontent.com/reversedcodes/minecraft-bedrock-meta-database/main/bedrock/client/preview/versions.min.json",
	}
}

func newHTTPClient(timeout time.Duration) *http.Client {
	return &http.Client{
		Timeout: timeout,
		Transport: &http.Transport{
			Proxy:               http.ProxyFromEnvironment,
			ForceAttemptHTTP2:    false,
			MaxIdleConns:        8,
			IdleConnTimeout:     30 * time.Second,
			TLSHandshakeTimeout:  15 * time.Second,
			ExpectContinueTimeout: 2 * time.Second,
		},
	}
}

func newRequest(method string, target string, body io.Reader) (*http.Request, error) {
	req, err := http.NewRequest(method, target, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", helperUserAgent)
	req.Header.Set("Accept", "application/json,text/plain,application/octet-stream,*/*;q=0.8")
	req.Header.Set("Cache-Control", "no-cache")
	return req, nil
}

func fetchText(target string, timeout time.Duration) (string, error) {
	req, err := newRequest(http.MethodGet, target, nil)
	if err != nil {
		return "", err
	}
	resp, err := newHTTPClient(timeout).Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("HTTP %s", resp.Status)
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, 35*1024*1024))
	if err != nil {
		return "", err
	}
	return string(body), nil
}

func legacyPackageVersionToDisplay(raw string) string {
	parts := strings.Split(strings.TrimSpace(raw), ".")
	if len(parts) != 4 {
		return strings.TrimSpace(raw)
	}
	trimZero := func(v string) string {
		v = strings.TrimLeft(strings.TrimSpace(v), "0")
		if v == "" {
			return "0"
		}
		return v
	}
	major := trimZero(parts[0])
	minor := trimZero(parts[1])
	thirdRaw := trimZero(parts[2])
	buildRaw := trimZero(parts[3])
	if len(thirdRaw) >= 4 {
		patch := trimZero(thirdRaw[:len(thirdRaw)-2])
		build := trimZero(thirdRaw[len(thirdRaw)-2:])
		return fmt.Sprintf("%s.%s.%s.%s", major, minor, patch, build)
	}
	if len(thirdRaw) == 3 {
		patch := trimZero(thirdRaw[:len(thirdRaw)-1])
		build := trimZero(thirdRaw[len(thirdRaw)-1:])
		return fmt.Sprintf("%s.%s.%s.%s", major, minor, patch, build)
	}
	return fmt.Sprintf("%s.%s.%s.%s", major, minor, thirdRaw, buildRaw)
}

func extractUWPShortVersion(filename string) string {
	base := strings.TrimSpace(filename)
	idx := strings.Index(base, "_")
	if idx < 0 || idx+1 >= len(base) {
		return ""
	}
	rest := base[idx+1:]
	idx2 := strings.Index(rest, "_")
	if idx2 < 0 {
		return ""
	}
	return legacyPackageVersionToDisplay(rest[:idx2])
}

func normalizeLegacyFileName(raw string) string {
	return strings.ToLower(strings.Trim(strings.TrimSpace(raw), `"'`))
}

func hasPackageExt(name string) bool {
	lower := strings.ToLower(strings.TrimSpace(name))
	for _, ext := range []string{".appx", ".eappx", ".appxbundle", ".msixbundle", ".msixvc", ".msix"} {
		if strings.Contains(lower, ext) {
			return true
		}
	}
	return false
}

func scanLegacyUWPRefs(text string, source string) []legacyUWPRef {
	out := []legacyUWPRef{}
	seen := map[string]bool{}
	packageExtRe := regexp.MustCompile(`(?i)\.(?:appx|eappx|appxbundle|msixbundle)$`)
	add := func(updateID, revision, filename string) {
		updateID = strings.Trim(strings.TrimSpace(updateID), `"'`)
		revision = strings.Trim(strings.TrimSpace(revision), `"'`)
		filename = strings.Trim(strings.TrimSpace(filename), `"'`)
		if updateID == "" || filename == "" {
			return
		}
		lower := strings.ToLower(filename)
		if !(strings.Contains(lower, "minecraftuwp_") || strings.Contains(lower, "minecraftwindowsbeta_") || strings.Contains(lower, "minecraftwindows_")) || !strings.Contains(lower, "_x64__") {
			return
		}
		if !packageExtRe.MatchString(filename) {
			filename += ".Appx"
		}
		// versions.txt / legacy metadata carry an internal id here, not the WU revision.
		// For GetExtendedUpdateInfo2 these historical refs need revision 1.
		revision = "1"
		key := strings.ToLower(updateID + "|" + revision + "|" + filename)
		if seen[key] {
			return
		}
		seen[key] = true
		out = append(out, legacyUWPRef{UpdateID: updateID, Revision: revision, FileName: filename, Source: source})
	}

	uuidRe := `[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}`
	fileRe := `Microsoft\.Minecraft(?:UWP|WindowsBeta|Windows)_[^\"'<>\s]+(?:\.(?:Appx|EAppx|AppxBundle|MsixBundle))?`
	lineUUIDFileRev := regexp.MustCompile(`(?i)^\s*(` + uuidRe + `)\s+(` + fileRe + `)(?:\s+(\d{1,12}))?\s*$`)
	lineUUIDRevFile := regexp.MustCompile(`(?i)^\s*(` + uuidRe + `)\s+(\d{1,12})\s+(` + fileRe + `)\s*$`)
	lineFileUUIDRev := regexp.MustCompile(`(?i)^\s*(` + fileRe + `)\s+(` + uuidRe + `)(?:\s+(\d{1,12}))?\s*$`)
	lineFileRevUUID := regexp.MustCompile(`(?i)^\s*(` + fileRe + `)\s+(\d{1,12})\s+(` + uuidRe + `)\s*$`)

	for _, rawLine := range strings.Split(strings.ReplaceAll(text, "\r\n", "\n"), "\n") {
		line := strings.TrimSpace(rawLine)
		if line == "" {
			continue
		}
		if m := lineUUIDFileRev.FindStringSubmatch(line); len(m) > 0 {
			add(m[1], m[3], m[2])
			continue
		}
		if m := lineUUIDRevFile.FindStringSubmatch(line); len(m) > 0 {
			add(m[1], m[2], m[3])
			continue
		}
		if m := lineFileUUIDRev.FindStringSubmatch(line); len(m) > 0 {
			add(m[2], m[3], m[1])
			continue
		}
		if m := lineFileRevUUID.FindStringSubmatch(line); len(m) > 0 {
			add(m[3], m[2], m[1])
		}
	}

	// Minified JSON may live on one physical line. Keep this fallback line-local
	// so one record never steals a UUID/revision from the neighbouring record.
	sameLineUUIDFirst := regexp.MustCompile(`(?i)(` + uuidRe + `)[^\r\n]{0,320}?(` + fileRe + `)(?:[^\r\n]{0,80}?(\d{1,12}))?`)
	for _, m := range sameLineUUIDFirst.FindAllStringSubmatch(text, -1) {
		add(m[1], m[3], m[2])
	}
	sameLineFileFirst := regexp.MustCompile(`(?i)(` + fileRe + `)[^\r\n]{0,320}?(` + uuidRe + `)(?:[^\r\n]{0,80}?(\d{1,12}))?`)
	for _, m := range sameLineFileFirst.FindAllStringSubmatch(text, -1) {
		add(m[2], m[3], m[1])
	}

	return out
}

func legacyMetadataURL(short string, releaseType string) string {
	rt := strings.ToLower(strings.TrimSpace(releaseType))
	if rt == "" || rt == "legacy" {
		rt = "release"
	}
	return fmt.Sprintf("https://raw.githubusercontent.com/reversedcodes/minecraft-bedrock-meta-database/main/bedrock/client/%s/uwp/%s.json", rt, url.PathEscape(strings.TrimSpace(short)))
}

func buildWUURL(ref legacyUWPRef) string {
	rev := strings.TrimSpace(ref.Revision)
	if rev == "" {
		rev = "1"
	}
	return fmt.Sprintf("wu://%s/%s?filename=%s", strings.TrimSpace(ref.UpdateID), rev, url.QueryEscape(strings.TrimSpace(ref.FileName)))
}

func parseVersionParts(raw string) []int {
	cleaned := strings.TrimSpace(raw)
	cleaned = strings.TrimPrefix(cleaned, "Legacy ")
	parts := strings.Split(cleaned, ".")
	out := make([]int, 0, len(parts))
	for _, part := range parts {
		n, _ := strconv.Atoi(strings.TrimSpace(part))
		out = append(out, n)
	}
	return out
}

func compareVersionDesc(a string, b string) bool {
	pa := parseVersionParts(a)
	pb := parseVersionParts(b)
	max := len(pa)
	if len(pb) > max {
		max = len(pb)
	}
	for i := 0; i < max; i++ {
		va, vb := 0, 0
		if i < len(pa) {
			va = pa[i]
		}
		if i < len(pb) {
			vb = pb[i]
		}
		if va != vb {
			return va > vb
		}
	}
	return a > b
}

func legacyReleaseTypeFromFileName(fileName string) string {
	lower := strings.ToLower(strings.TrimSpace(fileName))
	if strings.Contains(lower, "minecraftwindowsbeta_") || strings.Contains(lower, "minecraftpreview") {
		return "preview"
	}
	return "release"
}

func legacyDisplayLabel(short string, releaseType string) string {
	cleanShort := strings.TrimSpace(short)
	if strings.EqualFold(strings.TrimSpace(releaseType), "preview") {
		return "Legacy Preview " + cleanShort
	}
	return "Legacy " + cleanShort
}

func collectLegacyCatalog() (legacyCatalog, error) {
	versions := map[string]*legacyVersion{}
	sources := []string{}
	errorsOut := []string{}
	addVersionRef := func(short string, releaseType string, fileName string, rawURL string, updateID string, revision string, source string) {
		short = strings.TrimSpace(short)
		releaseType = strings.TrimSpace(releaseType)
		if releaseType == "" {
			releaseType = "release"
		}
		fileName = strings.TrimSpace(fileName)
		rawURL = strings.TrimSpace(rawURL)
		if short == "" || rawURL == "" {
			return
		}
		key := strings.ToLower(releaseType + "|" + short)
		item := versions[key]
		if item == nil {
			item = &legacyVersion{
				Version:      legacyDisplayLabel(short, releaseType),
				Short:        short,
				UpdateID:     updateID,
				Revision:     revision,
				FileName:     fileName,
				URLs:         []string{},
				Downloadable: true,
				Package:      "uwp",
				Type:         "Legacy",
				ReleaseType:  releaseType,
				Source:       source,
				MetadataURL:  legacyMetadataURL(short, releaseType),
			}
			versions[key] = item
		}
		if item.FileName == "" && fileName != "" {
			item.FileName = fileName
		}
		if item.UpdateID == "" && updateID != "" {
			item.UpdateID = updateID
		}
		if item.Revision == "" && revision != "" {
			item.Revision = revision
		}
		if !containsString(item.URLs, rawURL) {
			item.URLs = append(item.URLs, rawURL)
		}
	}

	for _, src := range legacyUwpSourceURLs() {
		body, err := fetchText(src, 18*time.Second)
		if err != nil {
			errorsOut = append(errorsOut, src+": "+err.Error())
			continue
		}
		sources = append(sources, src)
		refs := scanLegacyUWPRefs(body, src)
		for _, ref := range refs {
			short := strings.TrimSpace(extractUWPShortVersion(ref.FileName))
			if short == "" {
				continue
			}
			if loadBrokenLegacyVersions()[short] {
				continue
			}
			releaseType := legacyReleaseTypeFromFileName(ref.FileName)
			addVersionRef(short, releaseType, ref.FileName, buildWUURL(ref), ref.UpdateID, ref.Revision, src)
		}
	}

	for _, releaseType := range []string{"release", "preview"} {
		storeSource := "https://store.rg-adguard.net/api/GetFiles"
		links, err := fetchRGAdguardStoreLinks(releaseType)
		if err != nil {
			errorsOut = append(errorsOut, storeSource+" ("+releaseType+"): "+err.Error())
			continue
		}
		if !containsString(sources, storeSource) {
			sources = append(sources, storeSource)
		}
		for _, link := range links {
			short := strings.TrimSpace(extractUWPShortVersion(link.FileName))
			if short == "" {
				continue
			}
			if loadBrokenLegacyVersions()[short] {
				continue
			}
			addVersionRef(short, releaseType, link.FileName, link.URL, "", "", storeSource)
		}
	}

	if len(versions) == 0 {
		return legacyCatalog{Errors: errorsOut, Sources: sources}, fmt.Errorf("Legacy UWP каталог пуст: %s", strings.Join(errorsOut, " | "))
	}

	out := make([]legacyVersion, 0, len(versions))
	for _, item := range versions {
		out = append(out, *item)
	}
	sort.Slice(out, func(i, j int) bool { return compareVersionDesc(out[i].Version, out[j].Version) })
	return legacyCatalog{LegacyUwpVersions: out, Sources: sources, Errors: errorsOut}, nil
}

func containsString(items []string, wanted string) bool {
	for _, item := range items {
		if item == wanted {
			return true
		}
	}
	return false
}

func uniqueStrings(items []string) []string {
	out := []string{}
	seen := map[string]bool{}
	for _, item := range items {
		clean := strings.TrimSpace(item)
		if clean == "" || seen[clean] {
			continue
		}
		seen[clean] = true
		out = append(out, clean)
	}
	return out
}

var cachedBrokenLegacyVersions map[string]bool

func loadBrokenLegacyVersions() map[string]bool {
	if cachedBrokenLegacyVersions != nil {
		return cachedBrokenLegacyVersions
	}
	blocked := map[string]bool{}
	candidates := []string{"LEGACY_UWP_BROKEN.md"}
	if exePath, err := os.Executable(); err == nil {
		dir := filepath.Dir(exePath)
		candidates = append(candidates,
			filepath.Clean(filepath.Join(dir, "LEGACY_UWP_BROKEN.md")),
			filepath.Clean(filepath.Join(dir, "..", "LEGACY_UWP_BROKEN.md")),
			filepath.Clean(filepath.Join(dir, "..", "..", "LEGACY_UWP_BROKEN.md")),
		)
	}
	for _, brokenPath := range uniqueStrings(candidates) {
		data, readErr := os.ReadFile(brokenPath)
		if readErr != nil {
			continue
		}
		for _, line := range strings.Split(strings.ReplaceAll(string(data), "\r\n", "\n"), "\n") {
			line = strings.TrimSpace(line)
			if !strings.HasPrefix(line, "- `") {
				continue
			}
			line = strings.TrimPrefix(line, "- `")
			idx := strings.Index(line, "`")
			if idx < 0 {
				continue
			}
			short := strings.TrimSpace(line[:idx])
			if short != "" {
				blocked[short] = true
			}
		}
		if len(blocked) > 0 {
			break
		}
	}
	cachedBrokenLegacyVersions = blocked
	return cachedBrokenLegacyVersions
}

func normalizeLegacyWUInputURL(raw string) string {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || !strings.EqualFold(parsed.Scheme, "wu") {
		return strings.TrimSpace(raw)
	}
	wantedFile := strings.TrimSpace(parsed.Query().Get("filename"))
	if wantedFile == "" {
		wantedFile = strings.TrimSpace(parsed.Path)
	}
	if wantedFile == "" {
		return strings.TrimSpace(raw)
	}
	return fmt.Sprintf("wu://%s/1?filename=%s", strings.TrimSpace(parsed.Host), url.QueryEscape(wantedFile))
}

func normalizeLegacyWUInputURLs(items []string) []string {
	out := make([]string, 0, len(items))
	for _, item := range items {
		out = append(out, normalizeLegacyWUInputURL(item))
	}
	return out
}

func extractLegacyDownloadURLsFromMetadata(body []byte) []string {
	var root interface{}
	if err := json.Unmarshal(body, &root); err != nil {
		return nil
	}
	seen := map[string]bool{}
	out := []string{}
	var walk func(interface{})
	walk = func(v interface{}) {
		switch x := v.(type) {
		case map[string]interface{}:
			for key, value := range x {
				lk := strings.ToLower(strings.TrimSpace(key))
				if lk == "url" || lk == "downloadurl" || lk == "download_url" || lk == "fileurl" || lk == "file_url" {
					if s, ok := value.(string); ok {
						u := strings.TrimSpace(s)
						if strings.HasPrefix(strings.ToLower(u), "http") && !seen[u] {
							seen[u] = true
							out = append(out, u)
						}
					}
				}
				walk(value)
			}
		case []interface{}:
			for _, item := range x {
				walk(item)
			}
		}
	}
	walk(root)
	return out
}

type storeLinkCandidate struct {
	URL      string
	FileName string
	SizeText string
}

func fetchRGAdguardStoreLinks(releaseType string) ([]storeLinkCandidate, error) {
	productID := "9NBLGGH2JHXJ" // Minecraft for Windows / Microsoft.MinecraftUWP
	if strings.EqualFold(strings.TrimSpace(releaseType), "preview") {
		productID = "9P5X4QVLC2XR" // Minecraft Preview / Microsoft.MinecraftWindowsBeta
	}
	jar, _ := cookiejar.New(nil)
	client := &http.Client{Timeout: 45 * time.Second, Jar: jar}
	if _, err := client.Get("https://store.rg-adguard.net/"); err != nil {
		// Ignore priming failure and still try the POST; some environments block the
		// GET but allow the form submission.
	}
	form := url.Values{}
	form.Set("type", "ProductId")
	form.Set("url", productID)
	form.Set("ring", "Retail")
	form.Set("lang", "")
	req, err := http.NewRequest(http.MethodPost, "https://store.rg-adguard.net/api/GetFiles", strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 FalonLegacyUwp-LinkResolver")
	req.Header.Set("Accept", "text/html,*/*;q=0.8")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Origin", "https://store.rg-adguard.net")
	req.Header.Set("Referer", "https://store.rg-adguard.net/")
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	payload, err := io.ReadAll(io.LimitReader(resp.Body, 12*1024*1024))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("ERR_RGADGUARD_HTTP_%d", resp.StatusCode)
	}
	rowRe := regexp.MustCompile(`(?is)<tr[^>]*>\s*<td>\s*<a\s+href="([^"]+)"[^>]*>([^<]+)</a>.*?<td[^>]*>([^<]*)</td>\s*</tr>`)
	out := []storeLinkCandidate{}
	seen := map[string]bool{}
	for _, m := range rowRe.FindAllSubmatch(payload, -1) {
		if len(m) < 3 {
			continue
		}
		rawURL := strings.TrimSpace(html.UnescapeString(string(m[1])))
		fileName := strings.TrimSpace(html.UnescapeString(string(m[2])))
		if rawURL == "" || fileName == "" || !strings.HasPrefix(strings.ToLower(rawURL), "http") {
			continue
		}
		lowerName := strings.ToLower(fileName)
		if !hasPackageExtInName(lowerName) || strings.Contains(lowerName, "blockmap") || strings.Contains(lowerName, "signature") || strings.Contains(lowerName, ".p7x") {
			continue
		}
		if !(strings.Contains(lowerName, "minecraftuwp_") || strings.Contains(lowerName, "minecraftwindowsbeta_") || strings.Contains(lowerName, "minecraftwindows_")) || !strings.Contains(lowerName, "_x64__") {
			continue
		}
		key := strings.ToLower(fileName + "|" + rawURL)
		if seen[key] {
			continue
		}
		seen[key] = true
		sizeText := ""
		if len(m) > 3 {
			sizeText = strings.TrimSpace(html.UnescapeString(string(m[3])))
		}
		out = append(out, storeLinkCandidate{URL: rawURL, FileName: fileName, SizeText: sizeText})
	}
	return out, nil
}

func resolveRGAdguardStoreURL(wantedFile string, short string, releaseType string) string {
	wantedNorm := normalizeLegacyFileName(wantedFile)
	wantedShort := strings.TrimSpace(short)
	if wantedShort == "" {
		wantedShort = strings.TrimSpace(extractUWPShortVersion(wantedFile))
	}
	candidates, err := fetchRGAdguardStoreLinks(releaseType)
	if err != nil || len(candidates) == 0 {
		return ""
	}
	bestURL := ""
	bestScore := -100000
	for _, candidate := range candidates {
		nameNorm := normalizeLegacyFileName(candidate.FileName)
		candidateShort := strings.TrimSpace(extractUWPShortVersion(candidate.FileName))
		score := 0
		if wantedNorm != "" && nameNorm == wantedNorm {
			score += 2000
		}
		if wantedShort != "" && strings.EqualFold(candidateShort, wantedShort) {
			score += 1500
		}
		if wantedNorm != "" && strings.Contains(nameNorm, wantedNorm) {
			score += 400
		}
		lowerName := strings.ToLower(candidate.FileName)
		if strings.Contains(lowerName, "_x64__") {
			score += 250
		}
		if strings.Contains(lowerName, ".appx") || strings.Contains(lowerName, ".appxbundle") {
			score += 90
		}
		if strings.Contains(strings.ToLower(candidate.URL), "tlu.dl.delivery.mp.microsoft.com/") {
			score += 120
		}
		if score > bestScore {
			bestScore = score
			bestURL = candidate.URL
		}
	}
	if bestScore >= 1400 {
		return bestURL
	}
	return ""
}

func extractPreferredUWPFileFromMetadata(body []byte) (string, string) {
	var root map[string]interface{}
	if err := json.Unmarshal(body, &root); err != nil {
		return "", ""
	}
	binaries, _ := root["binaries"].(map[string]interface{})
	archRoot, _ := binaries["arch"].(map[string]interface{})
	pick := func(arch string, kind string) (string, string) {
		a, _ := archRoot[arch].(map[string]interface{})
		k, _ := a[kind].(map[string]interface{})
		fn := strings.TrimSpace(fmt.Sprint(k["file_name"]))
		if fn == "" || fn == "<nil>" {
			return "", ""
		}
		hash := strings.TrimSpace(fmt.Sprint(k["md5"]))
		if hash == "" || hash == "<nil>" {
			hash = strings.TrimSpace(fmt.Sprint(k["file_md5"]))
		}
		if hash == "<nil>" {
			hash = ""
		}
		return fn, hash
	}
	for _, arch := range []string{"x64", "x86", "arm"} {
		for _, kind := range []string{"appx", "eappx", "appxbundle", "msixbundle"} {
			if fn, hash := pick(arch, kind); fn != "" {
				return fn, hash
			}
		}
	}
	return "", ""
}

func legacyUWPFileCandidatesFromDisplay(short string, releaseType string) []string {
	parts := strings.Split(strings.TrimSpace(short), ".")
	if len(parts) < 4 {
		return nil
	}
	major, minor, patch, build := parts[0], parts[1], parts[2], parts[3]
	packageName := "Microsoft.MinecraftUWP"
	if strings.EqualFold(strings.TrimSpace(releaseType), "preview") {
		packageName = "Microsoft.MinecraftWindowsBeta"
	}
	mk := func(third string) string {
		return fmt.Sprintf("%s_%s.%s.%s.0_x64__8wekyb3d8bbwe.Appx", packageName, major, minor, third)
	}
	seen := map[string]bool{}
	out := []string{}
	add := func(third string) {
		third = strings.TrimLeft(strings.TrimSpace(third), "0")
		if third == "" {
			third = "0"
		}
		name := mk(third)
		key := normalizeLegacyFileName(name)
		if !seen[key] {
			seen[key] = true
			out = append(out, name)
		}
	}
	b := strings.TrimLeft(build, "0")
	if b == "" {
		b = "0"
	}
	if len(b) == 1 {
		add(patch + "0" + b)
	}
	add(patch + b)
	add(patch + build)
	add(patch)
	return out
}

func resolveLegacyUWPDownloadInfo(req legacyRequest) (legacyResolveResult, error) {
	short := strings.TrimSpace(req.Short)
	if short == "" {
		label := strings.TrimSpace(req.Label)
		label = strings.TrimPrefix(label, "Legacy Preview ")
		label = strings.TrimPrefix(label, "Legacy Beta ")
		label = strings.TrimPrefix(label, "Legacy ")
		short = strings.TrimSpace(label)
	}
	if short == "" {
		return legacyResolveResult{}, errors.New("Legacy UWP: не указана короткая версия")
	}
	releaseType := strings.ToLower(strings.TrimSpace(req.ReleaseType))
	if releaseType == "" || releaseType == "legacy" {
		releaseType = "release"
	}
	metadataURL := strings.TrimSpace(req.MetadataURL)
	if metadataURL == "" {
		metadataURL = legacyMetadataURL(short, releaseType)
	}

	result := legacyResolveResult{URLs: []string{}, FileName: strings.TrimSpace(req.FileName), MD5: strings.TrimSpace(req.MD5)}
	if metadataURL != "" {
		if body, err := fetchText(metadataURL, 12*time.Second); err == nil {
			targetFile, md5sum := extractPreferredUWPFileFromMetadata([]byte(body))
			if result.FileName == "" && targetFile != "" {
				result.FileName = targetFile
			}
			if result.MD5 == "" && md5sum != "" {
				result.MD5 = md5sum
			}
			directURLs := extractLegacyDownloadURLsFromMetadata([]byte(body))
			if len(directURLs) > 0 {
				result.URLs = uniqueStrings(append(result.URLs, directURLs...))
			}
		}
	}
	if storeURL := resolveRGAdguardStoreURL(result.FileName, short, releaseType); storeURL != "" {
		result.URLs = uniqueStrings(append(result.URLs, storeURL))
	}

	candidates := legacyUWPFileCandidatesFromDisplay(short, releaseType)
	if result.FileName == "" && len(candidates) > 0 {
		result.FileName = candidates[0]
	}
	if len(result.URLs) == 0 {
		if storeURL := resolveRGAdguardStoreURL(result.FileName, short, releaseType); storeURL != "" {
			result.URLs = uniqueStrings(append(result.URLs, storeURL))
		}
	}
	wantedSet := map[string]bool{}
	if result.FileName != "" {
		wantedSet[normalizeLegacyFileName(result.FileName)] = true
	}
	for _, candidate := range candidates {
		wantedSet[normalizeLegacyFileName(candidate)] = true
	}

	urls := append([]string{}, result.URLs...)
	for _, src := range legacyUwpSourceURLs() {
		body, err := fetchText(src, 18*time.Second)
		if err != nil {
			continue
		}
		for _, ref := range scanLegacyUWPRefs(body, src) {
			refName := normalizeLegacyFileName(ref.FileName)
			refShort := strings.TrimSpace(extractUWPShortVersion(ref.FileName))
			refReleaseType := legacyReleaseTypeFromFileName(ref.FileName)
			if !strings.EqualFold(refReleaseType, releaseType) {
				continue
			}
			if !wantedSet[refName] && !strings.EqualFold(refShort, short) {
				continue
			}
			if result.FileName == "" {
				result.FileName = ref.FileName
			}
			urls = append(urls, buildWUURL(ref))
		}
	}
	result.URLs = uniqueStrings(urls)
	if len(result.URLs) == 0 {
		result.Error = "ERR_UWP_STORE_LINK_NOT_FOUND"
		return result, errors.New("ERR_UWP_STORE_LINK_NOT_FOUND")
	}
	return result, nil
}

func xmlEscape(s string) string {
	var b bytes.Buffer
	_ = xml.EscapeText(&b, []byte(s))
	return b.String()
}

var cachedWUCookie string

func buildWUCookieRequest() string {
	now := time.Now().UTC().Format(time.RFC3339Nano)
	exp := time.Now().UTC().Add(30 * time.Minute).Format(time.RFC3339Nano)
	return fmt.Sprintf(`<Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns="http://www.w3.org/2003/05/soap-envelope">
    <Header>
        <Action d3p1:mustUnderstand="1" xmlns:d3p1="http://www.w3.org/2003/05/soap-envelope" xmlns="http://www.w3.org/2005/08/addressing">http://www.microsoft.com/SoftwareDistribution/Server/ClientWebService/GetCookie</Action>
        <MessageID xmlns="http://www.w3.org/2005/08/addressing">urn:uuid:b9b43757-2247-4d7b-ae8f-a71ba8a22386</MessageID>
        <To d3p1:mustUnderstand="1" xmlns:d3p1="http://www.w3.org/2003/05/soap-envelope" xmlns="http://www.w3.org/2005/08/addressing">https://fe3.delivery.mp.microsoft.com/ClientWebService/client.asmx</To>
        <Security d3p1:mustUnderstand="1" xmlns:d3p1="http://www.w3.org/2003/05/soap-envelope" xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
            <Timestamp xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
                <Created>%s</Created>
                <Expires>%s</Expires>
            </Timestamp>
            <WindowsUpdateTicketsToken d4p1:id="ClientMSA" xmlns:d4p1="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" xmlns="http://schemas.microsoft.com/msus/2014/10/WindowsUpdateAuthorization">
                <TicketType Name="MSA" Version="1.0" Policy="MBI_SSL">
                    <User/>
                </TicketType>
            </WindowsUpdateTicketsToken>
        </Security>
    </Header>
    <Body>
        <GetCookie xmlns="http://www.microsoft.com/SoftwareDistribution/Server/ClientWebService">
            <oldCookie></oldCookie>
            <lastChange>2015-10-21T17:01:07.1472913Z</lastChange>
            <currentTime>%s</currentTime>
            <protocolVersion>1.40</protocolVersion>
        </GetCookie>
    </Body>
</Envelope>`, now, exp, now)
}

func extractWUCookie(body []byte) string {
	re := regexp.MustCompile(`(?is)<(?:[a-z0-9]+:)?EncryptedData>(.*?)</(?:[a-z0-9]+:)?EncryptedData>`)
	match := re.FindSubmatch(body)
	if len(match) < 2 {
		return ""
	}
	return strings.TrimSpace(html.UnescapeString(string(match[1])))
}

func requestWUCookie() (string, error) {
	if cachedWUCookie != "" {
		return cachedWUCookie, nil
	}
	body := buildWUCookieRequest()
	req, err := http.NewRequest(http.MethodPost, "https://fe3.delivery.mp.microsoft.com/ClientWebService/client.asmx", bytes.NewReader([]byte(body)))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/soap+xml; charset=utf-8")
	req.Header.Set("User-Agent", deliveryUserAgent)
	req.Header.Set("SOAPAction", "http://www.microsoft.com/SoftwareDistribution/Server/ClientWebService/GetCookie")
	client := newHTTPClient(45 * time.Second)
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	payload, err := io.ReadAll(io.LimitReader(resp.Body, 20*1024*1024))
	if err != nil {
		return "", err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("ERR_WU_COOKIE_HTTP_%d", resp.StatusCode)
	}
	cookie := extractWUCookie(payload)
	if cookie == "" {
		return "", errors.New("ERR_WU_COOKIE_EMPTY")
	}
	cachedWUCookie = cookie
	return cookie, nil
}

func buildWUDownloadRequest(updateID string, revision string, cookie string) string {
	now := time.Now().UTC().Format(time.RFC3339Nano)
	exp := time.Now().UTC().Add(5 * time.Minute).Format(time.RFC3339Nano)
	ticket := `<TicketType Name="AAD" Version="1.0" Policy="MBI_SSL"></TicketType>`
	if strings.TrimSpace(cookie) != "" {
		ticket = fmt.Sprintf(`<TicketType Name="MSA" Version="1.0" Policy="MBI_SSL"><User>%s</User></TicketType><TicketType Name="AAD" Version="1.0" Policy="MBI_SSL"></TicketType>`, xmlEscape(cookie))
	}
	return fmt.Sprintf(`<s:Envelope xmlns:a="http://www.w3.org/2005/08/addressing" xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Header>
    <a:Action s:mustUnderstand="1">http://www.microsoft.com/SoftwareDistribution/Server/ClientWebService/GetExtendedUpdateInfo2</a:Action>
    <a:MessageID>urn:uuid:5754a03d-d8d5-489f-b24d-efc31b3fd32d</a:MessageID>
    <a:To s:mustUnderstand="1">https://fe3.delivery.mp.microsoft.com/ClientWebService/client.asmx/secured</a:To>
    <o:Security s:mustUnderstand="1" xmlns:o="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
      <u:Timestamp xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
        <u:Created>%s</u:Created><u:Expires>%s</u:Expires>
      </u:Timestamp>
      <wuws:WindowsUpdateTicketsToken wsu:id="ClientMSA" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" xmlns:wuws="http://schemas.microsoft.com/msus/2014/10/WindowsUpdateAuthorization">
        %s
      </wuws:WindowsUpdateTicketsToken>
    </o:Security>
  </s:Header>
  <s:Body>
    <GetExtendedUpdateInfo2 xmlns="http://www.microsoft.com/SoftwareDistribution/Server/ClientWebService">
      <updateIDs><UpdateIdentity><UpdateID>%s</UpdateID><RevisionNumber>%s</RevisionNumber></UpdateIdentity></updateIDs>
      <infoTypes><XmlUpdateFragmentType>FileUrl</XmlUpdateFragmentType></infoTypes>
      <deviceAttributes>E:BranchReadinessLevel=CBB&amp;DchuNvidiaGrfxExists=1&amp;ProcessorIdentifier=Intel64%%20Family%%206%%20Model%%2063%%20Stepping%%202&amp;CurrentBranch=rs4_release&amp;DataVer_RS5=1942&amp;FlightRing=Retail&amp;AttrDataVer=57&amp;InstallLanguage=en-US&amp;DchuAmdGrfxExists=1&amp;OSUILocale=en-US&amp;InstallationType=Client&amp;FlightingBranchName=&amp;Version_RS5=10&amp;UpgEx_RS5=Green&amp;GStatus_RS5=2&amp;OSSkuId=48&amp;App=WU&amp;InstallDate=1529700913&amp;ProcessorManufacturer=GenuineIntel&amp;AppVer=10.0.17134.471&amp;OSArchitecture=AMD64&amp;UpdateManagementGroup=2&amp;IsDeviceRetailDemo=0&amp;HidOverGattReg=C%%3A%%5CWINDOWS%%5CSystem32%%5CDriverStore%%5CFileRepository%%5Chidbthle.inf_amd64_467f181075371c89%%5CMicrosoft.Bluetooth.Profiles.HidOverGatt.dll&amp;IsFlightingEnabled=0&amp;DchuIntelGrfxExists=1&amp;TelemetryLevel=1&amp;DefaultUserRegion=244&amp;DeferFeatureUpdatePeriodInDays=365&amp;Bios=Unknown&amp;WuClientVer=10.0.17134.471&amp;PausedFeatureStatus=1&amp;Steam=URL%%3Asteam%%20protocol&amp;Free=8to16&amp;OSVersion=10.0.17134.472&amp;DeviceFamily=Windows.Desktop</deviceAttributes>
    </GetExtendedUpdateInfo2>
  </s:Body>
</s:Envelope>`, now, exp, ticket, xmlEscape(updateID), xmlEscape(revision))
}

func requestWUInfo(updateID string, revision string) ([]byte, error) {
	cookie, err := requestWUCookie()
	if err != nil {
		return nil, err
	}
	client := newHTTPClient(45 * time.Second)
	body := buildWUDownloadRequest(updateID, revision, cookie)
	var lastErr error
	for attempt := 1; attempt <= 3; attempt++ {
		req, err := http.NewRequest(http.MethodPost, "https://fe3.delivery.mp.microsoft.com/ClientWebService/client.asmx/secured", bytes.NewReader([]byte(body)))
		if err != nil {
			return nil, err
		}
		req.Header.Set("Content-Type", "application/soap+xml; charset=utf-8")
		req.Header.Set("User-Agent", deliveryUserAgent)
		resp, err := client.Do(req)
		if err != nil {
			lastErr = err
			time.Sleep(time.Duration(attempt) * 750 * time.Millisecond)
			continue
		}
		payload, readErr := io.ReadAll(io.LimitReader(resp.Body, 35*1024*1024))
		_ = resp.Body.Close()
		if readErr != nil {
			lastErr = readErr
			time.Sleep(time.Duration(attempt) * 750 * time.Millisecond)
			continue
		}
		if resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode == http.StatusServiceUnavailable || resp.StatusCode == http.StatusBadGateway || resp.StatusCode == http.StatusGatewayTimeout {
			lastErr = fmt.Errorf("ERR_WU_HTTP_%d", resp.StatusCode)
			time.Sleep(time.Duration(attempt) * 750 * time.Millisecond)
			continue
		}
		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			return payload, fmt.Errorf("ERR_WU_HTTP_%d", resp.StatusCode)
		}
		return payload, nil
	}
	if lastErr == nil {
		lastErr = errors.New("ERR_WU_REQUEST_FAILED")
	}
	return nil, lastErr
}

func hasPackageExtInName(name string) bool {
	return hasPackageExt(name)
}

func extractWUFileURL(body []byte, wantedFile string) string {
	urls := make([]string, 0, 8)
	add := func(raw string) {
		u := strings.TrimSpace(html.UnescapeString(strings.ReplaceAll(raw, "&amp;", "&")))
		if u == "" || !strings.HasPrefix(strings.ToLower(u), "http") {
			return
		}
		if !containsString(urls, u) {
			urls = append(urls, u)
		}
	}
	urlNodeRe := regexp.MustCompile(`(?is)<(?:[a-z0-9]+:)?(?:FileUrl|Url)\b[^>]*>\s*([^<]+?)\s*</(?:[a-z0-9]+:)?(?:FileUrl|Url)>`)
	for _, m := range urlNodeRe.FindAllSubmatch(body, -1) {
		if len(m) > 1 {
			add(string(m[1]))
		}
	}
	if len(urls) == 0 {
		deliveryRe := regexp.MustCompile(`(?i)https?://(?:tlu\.)?dl\.delivery\.mp\.microsoft\.com/filestreamingservice/files/[^<>'"\s]+`)
		for _, m := range deliveryRe.FindAll(body, -1) {
			add(string(m))
		}
	}
	wanted := strings.ToLower(strings.TrimSpace(wantedFile))
	wanted = strings.Trim(strings.ReplaceAll(wanted, "\\", "/"), "/")
	wantedBase := wanted
	if idx := strings.LastIndex(wantedBase, "/"); idx >= 0 {
		wantedBase = wantedBase[idx+1:]
	}
	wantedLooksLikePackage := hasPackageExtInName(wantedBase)
	isDeliveryFileURL := func(lower string) bool {
		return strings.Contains(lower, "delivery.mp.microsoft.com/filestreamingservice/files/")
	}
	isPackageURL := func(raw string) bool {
		lower := strings.ToLower(raw)
		for _, bad := range []string{"blockmap", "signature", ".p7x", ".xml", ".json", ".eappxblockmap", ".appxblockmap", ".msixblockmap"} {
			if strings.Contains(lower, bad) {
				return false
			}
		}
		if hasPackageExtInName(lower) {
			return true
		}
		return wantedLooksLikePackage && isDeliveryFileURL(lower)
	}
	score := func(raw string) int {
		lower := strings.ToLower(raw)
		if !isPackageURL(lower) {
			return -100000
		}
		score := 0
		if strings.HasPrefix(lower, "http://tlu.dl.delivery.mp.microsoft.com/") || strings.HasPrefix(lower, "https://tlu.dl.delivery.mp.microsoft.com/") {
			score += 1000
		}
		if isDeliveryFileURL(lower) {
			score += 650
		}
		if wantedBase != "" && strings.Contains(lower, wantedBase) {
			score += 900
		}
		if wanted != "" && strings.Contains(lower, wanted) {
			score += 700
		}
		if strings.Contains(lower, "microsoft.minecraftuwp") || strings.Contains(lower, "microsoft.minecraftwindowsbeta") || strings.Contains(lower, "microsoft.minecraftwindows") {
			score += 350
		}
		if strings.Contains(lower, "_x64") || strings.Contains(lower, "-x64") || strings.Contains(lower, "x64__") {
			score += 240
		}
		if strings.Contains(lower, "_neutral_") || strings.Contains(lower, "language") || strings.Contains(lower, "resources") || strings.Contains(lower, "scale-") {
			score -= 500
		}
		if strings.Contains(lower, ".eappx") || strings.Contains(lower, ".appx") || strings.Contains(lower, ".appxbundle") {
			score += 80
		}
		if strings.Contains(lower, ".msixvc") || strings.Contains(lower, ".msixbundle") {
			score += 70
		}
		return score
	}
	best := ""
	bestScore := -100000
	for _, candidate := range urls {
		if sc := score(candidate); sc > bestScore {
			bestScore = sc
			best = candidate
		}
	}
	if bestScore < 0 {
		if loose := extractAnyWUFileURL(body); loose != "" {
			return loose
		}
		if wantedLooksLikePackage {
			for _, candidate := range urls {
				lower := strings.ToLower(candidate)
				if isDeliveryFileURL(lower) || strings.Contains(lower, "microsoft.com/") || strings.Contains(lower, "delivery.mp.microsoft.com/") {
					return candidate
				}
			}
		}
		return ""
	}
	return best
}

func extractAnyWUFileURL(body []byte) string {
	urls := []string{}
	isLikelyDownloadURL := func(candidate string) bool {
		lower := strings.ToLower(strings.TrimSpace(candidate))
		if lower == "" {
			return false
		}
		for _, blocked := range []string{"getextendedupdateinfo2response", "softwaredistribution/server/clientwebservice", "schemas.xmlsoap.org", "/clientwebservice/"} {
			if strings.Contains(lower, blocked) {
				return false
			}
		}
		if strings.Contains(lower, "filestreamingservice/files/") {
			return true
		}
		return hasPackageExtInName(lower) || strings.Contains(lower, "filename=")
	}
	add := func(raw string) {
		candidate := strings.TrimSpace(html.UnescapeString(strings.ReplaceAll(raw, "&amp;", "&")))
		if candidate == "" || !strings.HasPrefix(strings.ToLower(candidate), "http") || !isLikelyDownloadURL(candidate) {
			return
		}
		if !containsString(urls, candidate) {
			urls = append(urls, candidate)
		}
	}
	urlNodeRe := regexp.MustCompile(`(?is)<(?:[a-z0-9]+:)?(?:FileUrl|Url)\b[^>]*>\s*([^<]+?)\s*</(?:[a-z0-9]+:)?(?:FileUrl|Url)>`)
	for _, m := range urlNodeRe.FindAllSubmatch(body, -1) {
		if len(m) > 1 {
			add(string(m[1]))
		}
	}
	if len(urls) == 0 {
		anyURLRe := regexp.MustCompile(`(?i)https?://[^\s<>'"\)\]]+`)
		for _, m := range anyURLRe.FindAll(body, -1) {
			add(string(m))
		}
	}
	if len(urls) == 0 {
		deliveryRe := regexp.MustCompile(`(?i)https?://(?:tlu\.)?dl\.delivery\.mp\.microsoft\.com/filestreamingservice/files/[^<>'"\s]+`)
		for _, m := range deliveryRe.FindAll(body, -1) {
			add(string(m))
		}
	}
	for _, candidate := range urls {
		lower := strings.ToLower(candidate)
		if strings.Contains(lower, "delivery.mp.microsoft.com") || strings.Contains(lower, "microsoft.com/") {
			return candidate
		}
	}
	if len(urls) > 0 {
		return urls[0]
	}
	return ""
}

func resolveWUFromLegacyDB(wantedFile string, badUpdateID string) (string, string, string) {
	wantedNorm := normalizeLegacyFileName(wantedFile)
	wantedShort := strings.TrimSpace(extractUWPShortVersion(wantedFile))
	wantedReleaseType := legacyReleaseTypeFromFileName(wantedFile)
	if wantedNorm == "" {
		return "", "", ""
	}
	seenIDs := map[string]bool{strings.ToLower(strings.TrimSpace(badUpdateID)): true}
	wantedCandidates := legacyUWPFileCandidatesFromDisplay(wantedShort, wantedReleaseType)
	wantedCandidateSet := map[string]bool{}
	for _, candidate := range wantedCandidates {
		wantedCandidateSet[normalizeLegacyFileName(candidate)] = true
	}
	for _, src := range legacyUwpSourceURLs() {
		body, err := fetchText(src, 18*time.Second)
		if err != nil {
			continue
		}
		refs := scanLegacyUWPRefs(body, src)
		for _, ref := range refs {
			refNorm := normalizeLegacyFileName(ref.FileName)
			refShort := strings.TrimSpace(extractUWPShortVersion(ref.FileName))
			if !strings.EqualFold(legacyReleaseTypeFromFileName(ref.FileName), wantedReleaseType) {
				continue
			}
			if refNorm != wantedNorm && !wantedCandidateSet[refNorm] && (!strings.EqualFold(refShort, wantedShort) || wantedShort == "") {
				continue
			}
			idKey := strings.ToLower(strings.TrimSpace(ref.UpdateID))
			if idKey == "" || seenIDs[idKey] {
				continue
			}
			seenIDs[idKey] = true
			rev := strings.TrimSpace(ref.Revision)
			if rev == "" {
				rev = "1"
			}
			body2, err := requestWUInfo(ref.UpdateID, rev)
			if err != nil {
				continue
			}
			if resolved := extractWUFileURL(body2, wantedFile); resolved != "" {
				return resolved, ref.UpdateID, rev
			}
			if resolved := extractWUFileURL(body2, ref.FileName); resolved != "" {
				return resolved, ref.UpdateID, rev
			}
			if resolved := extractAnyWUFileURL(body2); resolved != "" {
				return resolved, ref.UpdateID, rev
			}
		}
	}
	return "", "", ""
}

func resolveWindowsUpdateURL(rawURL string) (string, error) {
	parsed, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil {
		return "", err
	}
	if !strings.EqualFold(parsed.Scheme, "wu") {
		return rawURL, nil
	}
	wantedFile := strings.TrimSpace(parsed.Query().Get("filename"))
	updateID := strings.TrimSpace(parsed.Host)
	revision := strings.Trim(strings.TrimSpace(parsed.Path), "/")
	if revision == "" {
		revision = strings.TrimSpace(parsed.Query().Get("revision"))
	}
	if revision == "" {
		revision = "1"
	}
	if updateID == "" {
		return "", errors.New("ERR_WU_IDENTITY_MISSING")
	}
	body, err := requestWUInfo(updateID, revision)
	if err != nil {
		return "", err
	}
	if resolved := extractWUFileURL(body, wantedFile); resolved != "" {
		return resolved, nil
	}
	if wantedFile != "" {
		for _, tryRev := range []string{"2", "3", "4", "5", "6", "7", "8", "9", "10"} {
			if tryRev == revision {
				continue
			}
			body2, err := requestWUInfo(updateID, tryRev)
			if err != nil {
				continue
			}
			if resolved := extractWUFileURL(body2, wantedFile); resolved != "" {
				return resolved, nil
			}
		}
		if alt, _, _ := resolveWUFromLegacyDB(wantedFile, updateID); alt != "" {
			return alt, nil
		}
		if alt := resolveRGAdguardStoreURL(wantedFile, "", legacyReleaseTypeFromFileName(wantedFile)); alt != "" {
			return alt, nil
		}
	}
	return "", errors.New("ERR_WU_PACKAGE_URL")
}

func looksLikePackageURL(raw string) bool {
	lower := strings.ToLower(strings.TrimSpace(raw))
	if lower == "" {
		return false
	}
	if hasPackageExt(lower) {
		return true
	}
	if strings.Contains(lower, "filename=") {
		return hasPackageExt(lower)
	}
	return false
}

func checkLink(ctx context.Context, raw string) linkCheckResult {
	res := linkCheckResult{Input: strings.TrimSpace(raw)}
	if res.Input == "" {
		res.Reason = "empty input"
		return res
	}
	resolved, err := resolveWindowsUpdateURL(res.Input)
	if err != nil {
		res.Reason = err.Error()
		return res
	}
	res.Resolved = resolved
	parsed, err := url.Parse(strings.TrimSpace(resolved))
	if err != nil || !(strings.EqualFold(parsed.Scheme, "http") || strings.EqualFold(parsed.Scheme, "https")) {
		res.Reason = "not an http/https url after resolution"
		return res
	}
	res.PackageHint = looksLikePackageURL(res.Input) || looksLikePackageURL(resolved)

	client := newHTTPClient(25 * time.Second)
	headReq, err := http.NewRequestWithContext(ctx, http.MethodHead, resolved, nil)
	if err == nil {
		headReq.Header.Set("User-Agent", linkCheckUserAgent)
		headReq.Header.Set("Accept", "application/octet-stream,*/*;q=0.8")
		if head, headErr := client.Do(headReq); headErr == nil {
			res.StatusCode = head.StatusCode
			res.Status = head.Status
			res.ContentType = strings.TrimSpace(head.Header.Get("Content-Type"))
			res.ContentLength = head.ContentLength
			if head.Request != nil && head.Request.URL != nil {
				res.FinalURL = head.Request.URL.String()
			}
			_ = head.Body.Close()
			if head.StatusCode >= 400 && head.StatusCode != http.StatusMethodNotAllowed && head.StatusCode != http.StatusNotImplemented {
				res.Reason = fmt.Sprintf("http %s", head.Status)
				return res
			}
		}
	}

	getReq, err := http.NewRequestWithContext(ctx, http.MethodGet, resolved, nil)
	if err != nil {
		res.Reason = err.Error()
		return res
	}
	getReq.Header.Set("User-Agent", linkCheckUserAgent)
	getReq.Header.Set("Accept", "application/octet-stream,*/*;q=0.8")
	getReq.Header.Set("Range", "bytes=0-1023")
	getResp, err := client.Do(getReq)
	if err != nil {
		if res.StatusCode != 0 {
			return finalizeCheck(res, nil)
		}
		res.Reason = err.Error()
		return res
	}
	defer getResp.Body.Close()
	body, readErr := io.ReadAll(io.LimitReader(getResp.Body, 1024))
	if readErr != nil {
		res.Reason = readErr.Error()
		return res
	}
	res.StatusCode = getResp.StatusCode
	res.Status = getResp.Status
	res.ContentType = strings.TrimSpace(getResp.Header.Get("Content-Type"))
	if getResp.Request != nil && getResp.Request.URL != nil {
		res.FinalURL = getResp.Request.URL.String()
	}
	if getResp.ContentLength > 0 {
		res.ContentLength = getResp.ContentLength
	}
	preview := strings.TrimSpace(string(body))
	if len(preview) > 160 {
		preview = preview[:160]
	}
	res.ContentPreview = preview
	if getResp.StatusCode < 200 || getResp.StatusCode >= 400 {
		res.Reason = fmt.Sprintf("http %s", getResp.Status)
		return res
	}
	return finalizeCheck(res, body)
}

func finalizeCheck(res linkCheckResult, body []byte) linkCheckResult {
	contentType := strings.ToLower(strings.TrimSpace(res.ContentType))
	preview := strings.ToLower(strings.TrimSpace(string(body)))
	isBadType := strings.Contains(contentType, "text/") || strings.Contains(contentType, "html") || strings.Contains(contentType, "xml") || strings.Contains(contentType, "json")
	isBadPreview := strings.HasPrefix(preview, "<") || strings.HasPrefix(preview, "{") || strings.Contains(preview, "<html") || strings.Contains(preview, "<?xml") || strings.Contains(preview, "json")
	if isBadType || isBadPreview {
		res.Valid = false
		res.Reason = "response is not a downloadable package"
		return res
	}
	res.Valid = true
	if res.Reason == "" {
		if res.PackageHint {
			res.Reason = "valid package link"
		} else {
			res.Reason = "valid download link"
		}
	}
	return res
}

func safeFileName(raw string, fallback string) string {
	base := filepath.Base(strings.TrimSpace(raw))
	if base == "." || base == string(filepath.Separator) || base == "" {
		base = fallback
	}
	replacer := strings.NewReplacer("<", "_", ">", "_", ":", "_", "\"", "_", "/", "_", "\\", "_", "|", "_", "?", "_", "*", "_")
	base = replacer.Replace(base)
	base = strings.TrimSpace(base)
	if base == "" {
		return fallback
	}
	return base
}

func fileNameFromURL(raw string, fallback string) string {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return safeFileName(fallback, "minecraft-legacy.appx")
	}
	if fromQuery := strings.TrimSpace(parsed.Query().Get("filename")); fromQuery != "" && hasPackageExt(fromQuery) {
		return safeFileName(fromQuery, fallback)
	}
	fromPath := filepath.Base(parsed.Path)
	if fromPath != "" && hasPackageExt(fromPath) {
		return safeFileName(fromPath, fallback)
	}
	return safeFileName(fallback, "minecraft-legacy.appx")
}

func validateStrictPackageFile(file string, dest string) error {
	stat, err := os.Stat(file)
	if err != nil {
		return err
	}
	if stat.Size() < strictPackageMinBytes {
		return errors.New("ERR_PACKAGE_TOO_SMALL")
	}
	f, err := os.Open(file)
	if err != nil {
		return err
	}
	defer f.Close()
	head, _ := io.ReadAll(io.LimitReader(f, 4096))
	trim := strings.TrimSpace(strings.ToLower(string(head)))
	if strings.HasPrefix(trim, "<") || strings.HasPrefix(trim, "{") || strings.Contains(trim, "<html") || strings.Contains(trim, "<?xml") {
		return errors.New("ERR_NOT_MINECRAFT_PACKAGE")
	}
	_ = dest
	return nil
}

func calculateMD5(file string) (string, error) {
	f, err := os.Open(file)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := md5.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

func parseContentRangeTotal(header string, current int64, fallback int64) int64 {
	raw := strings.TrimSpace(header)
	idx := strings.LastIndex(raw, "/")
	if idx >= 0 && idx+1 < len(raw) {
		value := raw[idx+1:]
		if value != "*" {
			if parsed, err := strconv.ParseInt(value, 10, 64); err == nil {
				return parsed
			}
		}
	}
	if current > 0 {
		return current + fallback
	}
	return fallback
}

func downloadOnce(ctx context.Context, rawURL string, dest string, md5sum string, label string) error {
	if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
		return err
	}
	temp := dest + ".download"
	current := int64(0)
	if stat, err := os.Stat(temp); err == nil {
		current = stat.Size()
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", helperUserAgent)
	req.Header.Set("Accept", "application/octet-stream,*/*;q=0.8")
	req.Header.Set("Cache-Control", "no-cache")
	if current > 0 {
		req.Header.Set("Range", fmt.Sprintf("bytes=%d-", current))
	}
	client := newHTTPClient(90 * time.Minute)
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusPartialContent {
		return fmt.Errorf("HTTP %s", resp.Status)
	}
	if current > 0 && resp.StatusCode == http.StatusOK {
		_ = os.Remove(temp)
		current = 0
	}
	contentType := strings.ToLower(strings.TrimSpace(resp.Header.Get("Content-Type")))
	if strings.Contains(contentType, "text/") || strings.Contains(contentType, "html") || strings.Contains(contentType, "xml") || strings.Contains(contentType, "json") {
		return errors.New("ERR_NOT_MINECRAFT_PACKAGE")
	}
	total := resp.ContentLength
	if total < 0 {
		total = 0
	}
	total = parseContentRangeTotal(resp.Header.Get("Content-Range"), current, total)
	if total > maxPackageBytes {
		return errors.New("ERR_PACKAGE_TOO_BIG")
	}
	if total > 0 && total < strictPackageMinBytes {
		return errors.New("ERR_PACKAGE_TOO_SMALL")
	}
	flags := os.O_CREATE | os.O_WRONLY
	if current == 0 {
		flags |= os.O_TRUNC
	}
	file, err := os.OpenFile(temp, flags, 0o644)
	if err != nil {
		return err
	}
	defer file.Close()
	if current > 0 {
		if _, err := file.Seek(current, io.SeekStart); err != nil {
			return err
		}
	}
	downloaded := current
	emitProgress(downloaded, total, dest, label)
	buf := make([]byte, 128*1024)
	lastEmit := time.Now()
	for {
		n, readErr := resp.Body.Read(buf)
		if n > 0 {
			if _, err := file.Write(buf[:n]); err != nil {
				return err
			}
			downloaded += int64(n)
			if time.Since(lastEmit) >= 250*time.Millisecond {
				emitProgress(downloaded, total, dest, label)
				lastEmit = time.Now()
			}
		}
		if readErr != nil {
			if readErr == io.EOF {
				break
			}
			return readErr
		}
	}
	if err := file.Close(); err != nil {
		return err
	}
	if err := validateStrictPackageFile(temp, dest); err != nil {
		_ = os.Remove(temp)
		return err
	}
	if strings.TrimSpace(md5sum) != "" {
		actual, err := calculateMD5(temp)
		if err != nil {
			return err
		}
		if !strings.EqualFold(actual, strings.TrimSpace(md5sum)) {
			_ = os.Remove(temp)
			return errors.New("ERR_MD5_MISMATCH")
		}
	}
	_ = os.Remove(dest)
	if err := os.Rename(temp, dest); err != nil {
		return err
	}
	emitProgress(downloaded, total, dest, label)
	return nil
}

func downloadWithRetries(ctx context.Context, rawURL string, dest string, md5sum string, label string) error {
	var lastErr error
	for attempt := 1; attempt <= 3; attempt++ {
		err := downloadOnce(ctx, rawURL, dest, md5sum, label)
		if err == nil {
			return nil
		}
		lastErr = err
		if strings.TrimSpace(err.Error()) != "ERR_MD5_MISMATCH" {
			return err
		}
		emitStatus("md5-retry", fmt.Sprintf("MD5 не совпал, повтор %d/3", attempt), map[string]interface{}{"dest": dest})
		time.Sleep(1 * time.Second)
	}
	if lastErr == nil {
		lastErr = errors.New("ERR_DOWNLOAD_FAILED")
	}
	return lastErr
}

func compactError(err error) string {
	if err == nil {
		return "unknown error"
	}
	msg := strings.TrimSpace(err.Error())
	if len(msg) > 280 {
		return msg[:277] + "..."
	}
	return msg
}

func handleDownload(req legacyRequest) (downloadResult, error) {
	if strings.TrimSpace(req.DestDir) == "" {
		return downloadResult{}, errors.New("Legacy UWP: не указана папка для установщика")
	}
	// Always refresh the Store/WU metadata once at install time and merge it with
	// the candidates already embedded in the catalog. UWP download URLs are volatile;
	// relying only on the cached catalog candidates makes perfectly valid versions
	// fail with "working links not found" after Microsoft rotates the backing URL.
	info, resolveErr := resolveLegacyUWPDownloadInfo(req)
	urls := uniqueStrings(append(append([]string{}, info.URLs...), normalizeLegacyWUInputURLs(req.URLs)...))
	if len(urls) == 0 {
		if resolveErr != nil {
			return downloadResult{}, resolveErr
		}
		return downloadResult{}, errors.New("Legacy UWP: рабочие ссылки не найдены")
	}
	fileName := strings.TrimSpace(info.FileName)
	if fileName == "" {
		fileName = strings.TrimSpace(req.FileName)
	}
	if fileName == "" {
		fileName = "minecraft-legacy.appx"
	}
	md5sum := strings.TrimSpace(info.MD5)
	if md5sum == "" {
		md5sum = strings.TrimSpace(req.MD5)
	}
	label := strings.TrimSpace(req.Label)
	if label == "" {
		label = "Legacy UWP"
	}
	attempts := []string{}
	ctx := context.Background()
	for index, candidate := range urls {
		emitStatus("resolve", fmt.Sprintf("Legacy UWP: проверяю ссылку %d/%d", index+1, len(urls)), map[string]interface{}{"candidate": candidate})
		resolved, err := resolveWindowsUpdateURL(candidate)
		if err != nil {
			attempts = append(attempts, fmt.Sprintf("%d/%d resolve %s", index+1, len(urls), compactError(err)))
			continue
		}
		check := checkLink(ctx, resolved)
		if !check.Valid {
			attempts = append(attempts, fmt.Sprintf("%d/%d check %s", index+1, len(urls), check.Reason))
			continue
		}
		chosenFile := fileNameFromURL(candidate, fileName)
		installerPath := filepath.Join(req.DestDir, chosenFile)
		emitStatus("download", fmt.Sprintf("Legacy UWP: скачиваю %s", chosenFile), map[string]interface{}{"dest": installerPath})
		if err := downloadWithRetries(ctx, resolved, installerPath, md5sum, label); err != nil {
			attempts = append(attempts, fmt.Sprintf("%d/%d download %s", index+1, len(urls), compactError(err)))
			_ = os.Remove(installerPath + ".download")
			continue
		}
		return downloadResult{
			InstallerPath: installerPath,
			ResolvedURL:   resolved,
			ChosenURL:     candidate,
			FileName:      chosenFile,
			MD5:           md5sum,
			Attempts:      attempts,
		}, nil
	}
	if len(attempts) == 0 {
		attempts = append(attempts, "working link was not found")
	}
	return downloadResult{Attempts: attempts}, fmt.Errorf("Legacy UWP: не удалось скачать пакет. %s", strings.Join(attempts, " | "))
}

func safeExtractTarget(root string, rawName string) (string, bool) {
	base := filepath.Clean(strings.TrimSpace(root))
	if base == "" {
		return "", false
	}
	name := strings.ReplaceAll(strings.TrimSpace(rawName), "\\", "/")
	name = strings.TrimLeft(name, "/")
	if name == "" {
		return "", false
	}
	target := filepath.Join(base, filepath.FromSlash(name))
	cleanTarget := filepath.Clean(target)
	if cleanTarget != base && !strings.HasPrefix(cleanTarget, base+string(os.PathSeparator)) {
		return "", false
	}
	return cleanTarget, true
}

func findFileRecursive(root string, wanted string) string {
	wanted = strings.ToLower(strings.TrimSpace(wanted))
	if wanted == "" {
		return ""
	}
	found := ""
	_ = filepath.Walk(root, func(item string, info os.FileInfo, err error) error {
		if err != nil || found != "" || info == nil || info.IsDir() {
			return nil
		}
		if strings.EqualFold(filepath.Base(item), wanted) {
			found = item
		}
		return nil
	})
	return found
}

func isZipArchivePackage(pkg string) bool {
	f, err := os.Open(pkg)
	if err != nil {
		return false
	}
	defer f.Close()
	head := make([]byte, 4)
	if _, err := io.ReadFull(f, head); err != nil {
		return false
	}
	return head[0] == 'P' && head[1] == 'K'
}

func extractZipReader(reader *zip.Reader, outDir string) (int, error) {
	if reader == nil {
		return 0, errors.New("zip reader is nil")
	}
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		return 0, err
	}
	extracted := 0
	for _, file := range reader.File {
		if file == nil {
			continue
		}
		name := strings.ReplaceAll(file.Name, "\\", "/")
		base := filepath.Base(name)
		if strings.EqualFold(base, "AppxSignature.p7x") {
			continue
		}
		target, ok := safeExtractTarget(outDir, name)
		if !ok {
			continue
		}
		if file.FileInfo().IsDir() {
			if err := os.MkdirAll(target, 0o755); err != nil {
				return extracted, err
			}
			continue
		}
		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			return extracted, err
		}
		rc, err := file.Open()
		if err != nil {
			return extracted, err
		}
		out, err := os.OpenFile(target, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, file.Mode())
		if err != nil {
			_ = rc.Close()
			return extracted, err
		}
		_, copyErr := io.Copy(out, rc)
		closeErr := out.Close()
		_ = rc.Close()
		if copyErr != nil {
			return extracted, copyErr
		}
		if closeErr != nil {
			return extracted, closeErr
		}
		extracted++
	}
	return extracted, nil
}

func extractUWPFromBundle(reader *zip.Reader, outDir string) (int, error) {
	if reader == nil {
		return 0, errors.New("bundle zip reader is nil")
	}

	var chosen *zip.File
	bestScore := -1 << 30
	scoreEntry := func(file *zip.File) int {
		if file == nil {
			return -1 << 30
		}
		name := strings.ToLower(strings.ReplaceAll(file.Name, "\\", "/"))
		if strings.Contains(name, "blockmap") || strings.Contains(name, "signature") || strings.HasSuffix(name, ".p7x") {
			return -1 << 30
		}
		if !(strings.HasSuffix(name, ".appx") || strings.HasSuffix(name, ".eappx") || strings.HasSuffix(name, ".msix")) {
			return -1 << 30
		}
		score := 0
		if strings.Contains(name, "microsoft.minecraft") {
			score += 1200
		}
		if strings.Contains(name, "_x64") || strings.Contains(name, "-x64") {
			score += 700
		}
		if strings.Contains(name, "_neutral_") || strings.Contains(name, "resources") || strings.Contains(name, "language") || strings.Contains(name, "scale-") {
			score -= 1600
		}
		if strings.HasSuffix(name, ".eappx") || strings.HasSuffix(name, ".appx") {
			score += 100
		}
		return score
	}

	for _, file := range reader.File {
		score := scoreEntry(file)
		if score > bestScore {
			bestScore = score
			chosen = file
		}
	}
	if chosen == nil || bestScore <= -1<<29 {
		return 0, errors.New("bundle does not contain a compatible APPX payload")
	}

	in, err := chosen.Open()
	if err != nil {
		return 0, err
	}
	defer in.Close()
	tmp, err := os.CreateTemp("", "falon-legacy-bundle-*.appx")
	if err != nil {
		return 0, err
	}
	tmpPath := tmp.Name()
	_, copyErr := io.Copy(tmp, in)
	closeErr := tmp.Close()
	defer os.Remove(tmpPath)
	if copyErr != nil {
		return 0, copyErr
	}
	if closeErr != nil {
		return 0, closeErr
	}
	return extractLegacyPackagePath(tmpPath, outDir)
}

func extractLegacyPackagePath(packagePath string, outDir string) (int, error) {
	if !isZipArchivePackage(packagePath) {
		return 0, errors.New("legacy package is not a ZIP-compatible APPX archive")
	}
	reader, err := zip.OpenReader(packagePath)
	if err != nil {
		return 0, err
	}
	defer reader.Close()
	lower := strings.ToLower(packagePath)
	if strings.HasSuffix(lower, ".appxbundle") || strings.HasSuffix(lower, ".msixbundle") {
		return extractUWPFromBundle(&reader.Reader, outDir)
	}
	return extractZipReader(&reader.Reader, outDir)
}

func handleExtract(req legacyRequest) (extractResult, error) {
	packagePath := strings.TrimSpace(req.PackagePath)
	outDir := strings.TrimSpace(req.OutDir)
	if packagePath == "" {
		return extractResult{}, errors.New("Legacy UWP: не указан скачанный APPX-пакет")
	}
	if outDir == "" {
		return extractResult{}, errors.New("Legacy UWP: не указана папка распаковки")
	}
	if _, err := os.Stat(packagePath); err != nil {
		return extractResult{}, fmt.Errorf("Legacy UWP: пакет не найден: %w", err)
	}
	_ = os.RemoveAll(outDir)
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		return extractResult{}, err
	}
	label := strings.TrimSpace(req.Label)
	if label == "" {
		label = "Legacy UWP"
	}
	emitStatus("extract", fmt.Sprintf("Legacy UWP: распаковываю %s", label), map[string]interface{}{"folder": outDir})
	extracted, err := extractLegacyPackagePath(packagePath, outDir)
	if err != nil {
		_ = os.RemoveAll(outDir)
		return extractResult{}, err
	}
	manifest := findFileRecursive(outDir, "AppxManifest.xml")
	if manifest == "" {
		manifest = findFileRecursive(outDir, "AppXManifest.xml")
	}
	if manifest == "" {
		_ = os.RemoveAll(outDir)
		return extractResult{}, errors.New("Legacy UWP: AppxManifest.xml не найден после распаковки")
	}
	exe := findFileRecursive(outDir, "Minecraft.Windows.exe")
	if exe == "" {
		_ = os.RemoveAll(outDir)
		return extractResult{}, errors.New("Legacy UWP: Minecraft.Windows.exe не найден после распаковки")
	}
	return extractResult{OutDir: outDir, ManifestPath: manifest, ExePath: exe, ExtractedFiles: extracted, Method: "go-appx-extract"}, nil
}

func handleCheck(req legacyRequest) ([]linkCheckResult, error) {
	urls := uniqueStrings(normalizeLegacyWUInputURLs(req.URLs))
	if len(urls) == 0 {
		if info, err := resolveLegacyUWPDownloadInfo(req); err == nil {
			urls = uniqueStrings(info.URLs)
		}
	}
	if len(urls) == 0 {
		return nil, errors.New("Legacy UWP: список ссылок пуст")
	}

	// Проверка ссылок вызывается на старте каталога. Раньше все URL шли строго
	// последовательно, из-за чего сотни Legacy-кандидатов могли висеть минутами.
	// Сохраняем порядок результатов, но проверяем URL параллельно.
	ctx, cancel := context.WithTimeout(context.Background(), 4*time.Minute)
	defer cancel()

	out := make([]linkCheckResult, len(urls))
	const workers = 24
	sem := make(chan struct{}, workers)
	var wg sync.WaitGroup

	for index, item := range urls {
		wg.Add(1)
		go func(i int, raw string) {
			defer wg.Done()
			select {
			case sem <- struct{}{}:
				defer func() { <-sem }()
			case <-ctx.Done():
				out[i] = linkCheckResult{Input: strings.TrimSpace(raw), Reason: ctx.Err().Error()}
				return
			}
			out[i] = checkLink(ctx, raw)
		}(index, item)
	}
	wg.Wait()
	return out, nil
}
func main() {
	if len(os.Args) < 2 {
		resultErr(errors.New("usage: FalonLegacyUwpHelper.exe <catalog|resolve|check|download|extract>"))
		return
	}
	command := strings.ToLower(strings.TrimSpace(os.Args[1]))
	req, err := readRequest()
	if err != nil {
		resultErr(fmt.Errorf("invalid JSON input: %w", err))
		return
	}
	switch command {
	case "catalog":
		data, err := collectLegacyCatalog()
		if err != nil {
			resultErr(err)
			return
		}
		resultOK(data)
	case "resolve":
		data, err := resolveLegacyUWPDownloadInfo(req)
		if err != nil && len(data.URLs) == 0 {
			resultErr(err)
			return
		}
		resultOK(data)
	case "check":
		data, err := handleCheck(req)
		if err != nil {
			resultErr(err)
			return
		}
		resultOK(data)
	case "download":
		data, err := handleDownload(req)
		if err != nil {
			resultErr(err)
			return
		}
		resultOK(data)
	case "extract":
		data, err := handleExtract(req)
		if err != nil {
			resultErr(err)
			return
		}
		resultOK(data)
	default:
		resultErr(fmt.Errorf("unknown command: %s", command))
	}
}

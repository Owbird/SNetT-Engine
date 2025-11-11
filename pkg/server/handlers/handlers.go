// Package handlers provides the functionalities for
// file web server hosting
package handlers

import (
	"archive/zip"
	"fmt"
	"html/template"
	"io"
	"log"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/Owbird/SNetT-Engine/internal/utils"
	"github.com/Owbird/SNetT-Engine/pkg/config"
	"github.com/Owbird/SNetT-Engine/pkg/models"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type Visitor struct {
	uid string
}

type Handlers struct {
	logCh        chan models.ServerLog
	dir          string
	vistors      []Visitor
	serverConfig *config.ServerConfig
	notifConfig  *config.NotifConfig
}

type File struct {
	// The name of the file
	Name string `json:"name"`

	// Whether it's a file or directory
	IsDir bool `json:"is_dir"`

	// Size of the file in bytes
	Size string `json:"size"`
}

type IndexHTMLConfig struct {
	Name         string
	AllowUploads bool
}

// IndexHTML defines the data passed to the index.html
// template file
type IndexHTML struct {
	Files        []File
	CurrentPath  string
	Uid          string
	ServerConfig IndexHTMLConfig
}

// ViewHTML defines the data passed to the view.html
// template file
type ViewHTML struct {
	File         string
	MimeType     string
	ServerConfig IndexHTMLConfig
}

var tmpl *template.Template

func getCwd() string {
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		log.Fatalln("Failed to get templates dir")
	}

	cwd := filepath.Dir(filename)

	return cwd
}

func NewHandlers(
	logCh chan models.ServerLog,
	dir string,
	serverConfig *config.ServerConfig,
	notifConfig *config.NotifConfig,
) *Handlers {
	cwd := getCwd()

	tpl, err := template.ParseGlob(filepath.Join(cwd, "templates/*.html"))
	if err != nil {
		log.Fatal(err)
	}

	tmpl = tpl

	return &Handlers{
		logCh:        logCh,
		dir:          dir,
		serverConfig: serverConfig,
		notifConfig:  notifConfig,
	}
}

func (h *Handlers) GetFileUpload(w http.ResponseWriter, r *http.Request) {
	h.logCh <- models.ServerLog{
		Value: "Receiving files",
		Type:  models.API_LOG,
	}
	reader, err := r.MultipartReader()
	if err != nil {
		log.Println(err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var uploadDir string
	type filePart struct {
		fileName string
		data     []byte
	}
	var files []filePart

	for {
		part, err := reader.NextPart()
		if err == io.EOF {
			break
		}
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		if part.FileName() == "" {
			buf, err := io.ReadAll(part)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			if part.FormName() == "uploadDir" {
				uploadDir = string(buf)
			}
		} else {
			buf, err := io.ReadAll(part)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			files = append(files, filePart{
				fileName: part.FileName(),
				data:     buf,
			})
		}
	}

	for _, file := range files {
		filePath := filepath.Join(h.dir, uploadDir, file.fileName)

		// Create directory if it doesn't exist
		if err := os.MkdirAll(filepath.Dir(filePath), 0755); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		if err := os.WriteFile(filePath, file.data, 0644); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		h.logCh <- models.ServerLog{
			Value: fmt.Sprintf("File received at %v", filePath),
			Type:  models.API_LOG,
		}
	}
}

func (h *Handlers) ViewFileHandler(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()

	file := query["file"][0]

	if len(file) == 0 {
		http.Error(w, "Failed to download file", http.StatusBadRequest)
		return
	}

	if filepath.Dir(file) == ".." || filepath.Base(file) == ".." {
		http.Error(w, "Failed to download file", http.StatusInternalServerError)
		return

	}

	h.logCh <- models.ServerLog{
		Value: fmt.Sprintf("Viewing %v", file),
		Type:  models.API_LOG,
	}

	fileType := filepath.Ext(file)

	mimeType := mime.TypeByExtension(fileType)

	tmpl.ExecuteTemplate(w, "view.html", ViewHTML{
		File:     file,
		MimeType: utils.StandardizeMimeType(mimeType),
		ServerConfig: IndexHTMLConfig{
			Name:         h.serverConfig.Name,
			AllowUploads: h.serverConfig.AllowUploads,
		},
	})
}

func (h *Handlers) DownloadFileHandler(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()

	if len(query["file"]) == 0 {
		http.Error(w, "Failed to download file", http.StatusBadRequest)
		return
	}

	if filepath.Dir(query["file"][0]) == ".." || filepath.Base(query["file"][0]) == ".." {
		http.Error(w, "Failed to download file", http.StatusInternalServerError)
		return

	}

	files := strings.Split(query["file"][0], ",")

	if len(files) > 1 {

		tmpDir, err := os.MkdirTemp("", "snett-*")
		if err != nil {
			log.Println(err, "this")
			http.Error(w, "Failed to download file", http.StatusInternalServerError)
			return
		}

		archivePath := filepath.Join(tmpDir, fmt.Sprintf("snett-%v.zip", time.Now().UnixNano()), "")
		archive, err := os.Create(archivePath)
		if err != nil {
			log.Println(err)
			http.Error(w, "Failed to download file", http.StatusInternalServerError)
			return
		}
		defer archive.Close()

		zipWriter := zip.NewWriter(archive)

		for _, f := range files {

			filePath := filepath.Join(h.dir, f)

			file, err := os.Open(filePath)
			if err != nil {
				log.Println(err)
				http.Error(w, "Failed to download file", http.StatusInternalServerError)
				return
			}

			defer file.Close()

			zip, err := zipWriter.Create(f)
			if err != nil {
				log.Println(err)
				http.Error(w, "Failed to download file", http.StatusInternalServerError)
				return
			}
			if _, err := io.Copy(zip, file); err != nil {
				log.Println(err)
				http.Error(w, "Failed to download file", http.StatusInternalServerError)
				return
			}

		}

		zipWriter.Close()

		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%v", filepath.Base(archivePath)))
		w.Header().Set("Content-Type", "application/octet-stream")

		h.logCh <- models.ServerLog{
			Value: fmt.Sprintf("Downloading %v", archivePath),
			Type:  models.API_LOG,
		}

		http.ServeFile(w, r, archivePath)

	} else {
		file := filepath.Join(h.dir, query["file"][0])

		h.logCh <- models.ServerLog{
			Value: fmt.Sprintf("Downloading %v", file),
			Type:  models.API_LOG,
		}

		if !query.Has("view") || query["view"][0] != "1" {
			w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%v", filepath.Base(file)))
		}

		http.ServeFile(w, r, file)

		return
	}
}

func (h *Handlers) GetFilesHandler(w http.ResponseWriter, r *http.Request) {
	files := []File{}

	query := r.URL.Query()

	var fullPath string
	var currentPath string

	if len(query["dir"]) > 0 {
		currentPath = query["dir"][0]

		if filepath.Base(currentPath) == ".." {
			http.Error(w, "Failed to list files", http.StatusInternalServerError)
			return

		}

		fullPath = filepath.Join(h.dir, currentPath)

	} else {
		currentPath = "/"
		fullPath = h.dir
	}

	h.logCh <- models.ServerLog{
		Value: fmt.Sprintf("Getting files for %v", fullPath),
		Type:  models.API_LOG,
	}

	dirFiles, err := os.ReadDir(fullPath)
	if err != nil {
		http.Error(w, "Failed to list files", http.StatusInternalServerError)
		return
	}

	for _, file := range dirFiles {

		info, err := file.Info()
		if err != nil {
			http.Error(w, "Failed to list files", http.StatusInternalServerError)
			return
		}

		fmtedFile := File{
			Name:  file.Name(),
			IsDir: file.IsDir(),
		}

		if !fmtedFile.IsDir {
			fmtedFile.Size = utils.FmtBytes(info.Size())
		}

		files = append(files, fmtedFile)
	}

	uid := uuid.NewString()

	log.Println(uid)

	tmpl.ExecuteTemplate(w, "index.html", IndexHTML{
		Files:       files,
		CurrentPath: currentPath,
		Uid:         uid,
		ServerConfig: IndexHTMLConfig{
			Name:         h.serverConfig.Name,
			AllowUploads: h.serverConfig.AllowUploads,
		},
	})
}

func (h *Handlers) GetAssets(w http.ResponseWriter, r *http.Request) {
	cwd := getCwd()

	path := r.URL.Path
	data, err := os.ReadFile(filepath.Join(cwd, "templates", path))
	if err != nil {
		fmt.Print(err)
		http.NotFound(w, r)
		return
	}
	if strings.HasSuffix(path, ".js") {
		w.Header().Set("Content-Type", "text/javascript")
	} else if strings.HasSuffix(path, ".css") {
		w.Header().Set("Content-Type", "text/css")
	}
	_, err = w.Write(data)
	if err != nil {
		fmt.Print(err)
	}
}

func (h *Handlers) HandleConnect(u *websocket.Upgrader, w http.ResponseWriter, r *http.Request) {
	c, err := u.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "Failed to connect to server", http.StatusInternalServerError)
		return
	}
	defer c.Close()
	for {
		mt, message, err := c.ReadMessage()
		if err != nil {
			log.Println("read:", err)
		}
		log.Printf("recv: %s", message)

		if strings.Contains(string(message), "CONNECT:") {
			uid := strings.Split(string(message), ": ")[1]
			h.vistors = append(h.vistors, Visitor{
				uid: uid,
			})

			h.logCh <- models.ServerLog{
				Value: uid,
				Type:  models.WS_NEW_VISITOR,
			}
			err = c.WriteMessage(mt, []byte("CONNECTION SUCCESFUL"))
			if err != nil {
				log.Println("write:", err)
			}
		}
	}
}

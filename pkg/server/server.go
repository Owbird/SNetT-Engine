// Package server handles the file hosting server
package server

import (
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/Owbird/SNetT-Engine/internal/utils"
	"github.com/Owbird/SNetT-Engine/pkg/config"
	"github.com/Owbird/SNetT-Engine/pkg/models"
	"github.com/Owbird/SNetT-Engine/pkg/server/handlers"
	"github.com/localtunnel/go-localtunnel"
	"github.com/rs/cors"
)

type Server struct {
	// The current directory being hosted
	Dir string

	// The channel to send the logs through
	logCh chan models.ServerLog
}

const (
	PORT = 8080
)

func NewServer(dir string, logCh chan models.ServerLog) *Server {
	return &Server{
		Dir:   dir,
		logCh: logCh,
	}
}

// Starts starts and serves the specified dir
func (s *Server) Start(tempConfig config.AppConfig) {
	s.logCh <- models.ServerLog{
		Message: "Starting server",
		Type:    models.API_LOG,
	}

	hosts, err := utils.GetLocalIp()
	if err != nil {
		s.logCh <- models.ServerLog{
			Error: err,
			Type:  models.SERVE_WEB_UI_NETWORK,
		}
		return
	}

	if len(hosts) == 0 {
		hosts = append(hosts, "localhost")
	}

	for _, host := range hosts {
		s.logCh <- models.ServerLog{
			Message: fmt.Sprintf("http://%s:%s", host, strconv.Itoa(PORT)),
			Type:    models.SERVE_WEB_UI_NETWORK,
		}
	}

	go (func() {
		tunnel, err := localtunnel.New(PORT, "localhost", localtunnel.Options{})
		if err != nil {
			s.logCh <- models.ServerLog{
				Error: err,
				Type:  models.SERVE_WEB_UI_REMOTE,
			}
			return
		}

		tempConfig.GetNotifConfig().SendNotification(models.Notification{
			Title:         "Web Server Ready",
			Body:          "URL copied to clipboard",
			ClipboardText: tunnel.URL(),
		})

		s.logCh <- models.ServerLog{
			Message: tunnel.URL(),
			Type:    models.SERVE_WEB_UI_REMOTE,
		}
	})()

	mux := http.NewServeMux()

	handlerFuncs := handlers.NewHandlers(s.logCh, s.Dir, tempConfig.GetSeverConfig(), tempConfig.GetNotifConfig())

	mux.HandleFunc("/", handlerFuncs.GetFilesHandler)
	mux.HandleFunc("/download", handlerFuncs.DownloadFileHandler)
	mux.HandleFunc("/upload", handlerFuncs.GetFileUpload)
	mux.HandleFunc("GET /assets/{file}", handlerFuncs.GetAssets)

	corsOpts := cors.New(cors.Options{
		AllowedOrigins: []string{"https://*.loca.lt"},
		AllowedMethods: []string{
			http.MethodGet,
			http.MethodOptions,
			http.MethodHead,
		},

		AllowedHeaders: []string{
			"*",
		},
	})

	s.logCh <- models.ServerLog{
		Message: fmt.Sprintf("Starting API on port %v from %v", PORT, s.Dir),
		Type:    models.API_LOG,
	}

	err = http.ListenAndServe(fmt.Sprintf(":%v", PORT), corsOpts.Handler(mux))
	if err != nil {
		s.logCh <- models.ServerLog{
			Error: err,
			Type:  models.API_LOG,
		}
		log.Fatalln(err)
	}
}

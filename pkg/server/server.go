// Package server handles the file hosting server
package server

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/Owbird/SNetT-Engine/internal/utils"
	"github.com/Owbird/SNetT-Engine/pkg/config"
	"github.com/Owbird/SNetT-Engine/pkg/models"
	"github.com/Owbird/SNetT-Engine/pkg/server/handlers"
	"github.com/gorilla/websocket"
	"github.com/grandcat/zeroconf"
	"github.com/localtunnel/go-localtunnel"
	"github.com/rs/cors"
)

type Server struct {
	// The current directory being hosted
	Dir string

	// The channel to send the logs through
	logCh chan models.ServerLog
}

func NewServer(dir string, logCh chan models.ServerLog) *Server {
	return &Server{
		Dir:   dir,
		logCh: logCh,
	}
}

const MdnsServiceName = "_snett._tcp"

// Starts starts and serves the specified dir
func (s *Server) Start(tempConfig config.AppConfig) {
	serverConfig := tempConfig.GetSeverConfig()
	notifConfig := tempConfig.GetNotifConfig()

	port := serverConfig.Port

	s.logCh <- models.ServerLog{
		Value: "Starting server",
		Type:  models.API_LOG,
	}

	hosts, err := utils.GetLocalIp()
	if err != nil {
		s.logCh <- models.ServerLog{
			Value: err.Error(),
			Type:  models.SERVER_ERROR,
		}
		return
	}

	if len(hosts) == 0 {
		s.logCh <- models.ServerLog{
			Value: "No network detected",
			Type:  models.SERVER_ERROR,
		}
		return

	}

	server, err := zeroconf.Register(serverConfig.Name, MdnsServiceName, "local.", port, []string{}, nil)
	if err != nil {
		s.logCh <- models.ServerLog{
			Value: err.Error(),
			Type:  models.SERVER_ERROR,
		}
		return
	}

	for _, host := range hosts {
		s.logCh <- models.ServerLog{
			Value: fmt.Sprintf("http://%s:%s", host, strconv.Itoa(port)),
			Type:  models.SERVE_UI_LOCAL,
		}
	}

	if serverConfig.AllowOnline {
		go (func() {
			tunnel, err := localtunnel.New(port, "localhost", localtunnel.Options{})
			if err != nil {
				s.logCh <- models.ServerLog{
					Value: err.Error(),
					Type:  models.SERVE_UI_REMOTE,
				}
				return
			}

			notifConfig.SendNotification(models.Notification{
				Title:         "Web Server Ready",
				Body:          "URL copied to clipboard",
				ClipboardText: tunnel.URL(),
			})

			s.logCh <- models.ServerLog{
				Value: tunnel.URL(),
				Type:  models.SERVE_UI_REMOTE,
			}
		})()
	}

	go func() {
		upgrader := websocket.Upgrader{}

		mux := http.NewServeMux()

		handlerFuncs := handlers.NewHandlers(s.logCh, s.Dir, tempConfig.GetSeverConfig(), tempConfig.GetNotifConfig())

		mux.HandleFunc("/", handlerFuncs.GetFilesHandler)
		mux.HandleFunc("/connect", func(w http.ResponseWriter, r *http.Request) {
			handlerFuncs.HandleConnect(&upgrader, w, r)
		})
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
			Value: fmt.Sprintf("Starting API from %v", s.Dir),
			Type:  models.API_LOG,
		}

		err = http.ListenAndServe(fmt.Sprintf(":%v", port), corsOpts.Handler(mux))
		if err != nil {
			s.logCh <- models.ServerLog{
				Value: err.Error(),
				Type:  models.SERVER_ERROR,
			}
			log.Fatalln(err)
		}
	}()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt, syscall.SIGTERM)
	<-sig

	server.Shutdown()

	s.logCh <- models.ServerLog{
		Value: "Shutting down",
		Type:  models.API_LOG,
	}

	os.Exit(0)
}

// List shows the broadcasted servers on the network
func (s *Server) List(servers chan<- models.SNetTServer) {
	log.Println("Scanning...")
	resolver, err := zeroconf.NewResolver(nil)
	if err != nil {
		log.Fatalln("Failed to initialize resolver:", err.Error())
	}
	defer close(servers)

	entries := make(chan *zeroconf.ServiceEntry)
	go func(results <-chan *zeroconf.ServiceEntry) {
		for entry := range results {
			server := models.SNetTServer{
				Name: entry.Instance,
				Port: entry.Port,
				IP:   entry.AddrIPv4[0].String(),
			}
			servers <- server
		}
	}(entries)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second*15)
	defer cancel()

	err = resolver.Browse(ctx, MdnsServiceName, "local.", entries)
	if err != nil {
		log.Fatalln("Failed to browse:", err.Error())
	}

	<-ctx.Done()
}

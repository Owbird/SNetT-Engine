package cmd

import (
	"log"
	"sync"

	"github.com/Owbird/SNetT-Engine/pkg/config"
	"github.com/Owbird/SNetT-Engine/pkg/models"
	"github.com/Owbird/SNetT-Engine/pkg/server"
	"github.com/spf13/cobra"
)

var (
	appConfig    = config.NewAppConfig()
	serverConfig = appConfig.GetSeverConfig()
	notifConfig  = appConfig.GetNotifConfig()
)

// serverCmd represents the server command
var serverCmd = &cobra.Command{
	Use:   "server",
	Short: "Manage file server",
	Long:  `Manage file server`,
}

var startCmd = &cobra.Command{
	Use:   "start",
	Short: "Start the server",
	Long:  `Start the server`,
	Run: func(cmd *cobra.Command, args []string) {
		dir, err := cmd.Flags().GetString("dir")
		if err != nil {
			log.Fatalf("Failed to get 'dir' flag: %v", err)
		}

		logCh := make(chan models.ServerLog)

		defer close(logCh)

		wg := sync.WaitGroup{}

		wg.Add(1)
		go func() {
			for l := range logCh {
				switch l.Type {
				case models.API_LOG:
					if l.Error != nil {
						log.Printf("[!] API Error: %v", l.Error)
					} else {
						log.Printf("[+] API Log: %v", l.Message)
					}
				case models.SERVE_WEB_UI_NETWORK:
					if l.Error != nil {
						log.Printf("[!] Network Web Run Error: %v", l.Error)
					} else {
						log.Printf("[+] Network Web Running: %v", l.Message)
					}
				case models.SERVE_WEB_UI_REMOTE:
					if l.Error != nil {
						log.Printf("[!] Remote Web Run Error: %v", l.Error)
					} else {
						log.Printf("[+] Remote Web Running: %v", l.Message)
					}

				default:
					if l.Error != nil {
						log.Printf("[!] Server Error: %v", l.Error)
					} else {
						log.Printf("[+] Server Log: %v", l.Message)
					}
				}
			}
		}()

		server := server.NewServer(dir, logCh)

		allowUploads, err := cmd.Flags().GetBool("uploads")
		if err != nil {
			log.Fatalf("Failed to get 'uploads' flag: %v", err)
		}

		serverName, err := cmd.Flags().GetString("name")
		if err != nil {
			log.Fatalf("Failed to get 'name' flag: %v", err)
		}

		allowNotif, err := cmd.Flags().GetBool("notify")
		if err != nil {
			log.Fatalf("Failed to get 'notify' flag: %v", err)
		}

		serverConfig.SetAllowUploads(allowUploads)

		serverConfig.SetName(serverName)

		notifConfig.SetAllowNotif(allowNotif)

		wg.Add(1)
		go server.Start(*appConfig)

		wg.Wait()
	},
}

func init() {
	rootCmd.AddCommand(serverCmd)

	serverCmd.AddCommand(startCmd)

	startCmd.Flags().StringP("dir", "d", "", "Directory to serve")
	startCmd.Flags().StringP("name", "n", serverConfig.GetName(), "Directory to serve")
	startCmd.Flags().Bool("uploads", serverConfig.GetAllowUploads(), "Allow uploads to directory")
	startCmd.Flags().Bool("notify", notifConfig.GetAllowNotif(), "Allow notifications")

	startCmd.MarkFlagRequired("dir")
}

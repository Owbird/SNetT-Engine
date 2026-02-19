package cmd

import (
	"os"
	"sync"

	"github.com/Owbird/SNetT-Engine/internal/logger"
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

var serverCmd = &cobra.Command{
	Use:   "server",
	Short: "Manage file server",
	Long:  `Run the File server with options such as allowing uploads, making it available via the internet, etc.`,
}

var startCmd = &cobra.Command{
	Use:   "start",
	Short: "Start the server",
	Long:  `Start the file server with the given options.`,
	Run: func(cmd *cobra.Command, args []string) {
		dir, err := cmd.Flags().GetString("dir")
		if err != nil {
			logger.Logger.Error("Failed to get 'dir' flag", "err", err)
			os.Exit(1)
		}

		logCh := make(chan models.ServerLog)
		defer close(logCh)

		go func() {
			for l := range logCh {
				switch l.Type {
				case models.API_LOG:
					logger.Logger.Info("API Log", "value", l.Value)
				case models.SERVE_UI_LOCAL:
					logger.Logger.Info("Network Web Running", "value", l.Value)
				case models.SERVE_UI_REMOTE:
					logger.Logger.Info("Remote Web Running", "value", l.Value)
				case models.WS_NEW_VISITOR:
					logger.Logger.Info("New visitor", "value", l.Value)
				case models.SERVER_ERROR:
					logger.Logger.Error("Server Error", "value", l.Value)
				default:
					logger.Logger.Info("Server Log", "value", l.Value)
				}
			}
		}()

		server := server.NewServer(dir, logCh)

		port, _ := cmd.Flags().GetInt("port")
		serverName, _ := cmd.Flags().GetString("name")

		if cmd.Flags().Changed("uploads") {
			serverConfig.AllowUploads = true
		} else if cmd.Flags().Changed("no-uploads") {
			serverConfig.AllowUploads = false
		}

		if cmd.Flags().Changed("online") {
			serverConfig.AllowOnline = true
		} else if cmd.Flags().Changed("no-online") {
			serverConfig.AllowOnline = false
		}

		if cmd.Flags().Changed("notify") {
			notifConfig.AllowNotif = true
		} else if cmd.Flags().Changed("no-notify") {
			notifConfig.AllowNotif = false
		}

		serverConfig.Port = port
		serverConfig.Name = serverName

		wg := sync.WaitGroup{}

		wg.Add(1)
		go server.Start(*appConfig)

		wg.Wait()
	},
}

var listCmd = &cobra.Command{
	Use:   "list",
	Short: "List available servers on the network",
	Long:  `List reveals the broadcasted servers on the network for easy access.`,
	Run: func(cmd *cobra.Command, args []string) {
		server := server.NewServer("", nil)
		servers := make(chan models.SNetTServer)

		go server.List(servers)

		idx := 1
		for s := range servers {
			logger.Logger.Info("Server found", "index", idx, "name", s.Name, "ip", s.IP, "port", s.Port)
			idx++
		}
	},
}

func init() {
	rootCmd.AddCommand(serverCmd)
	serverCmd.AddCommand(startCmd)
	serverCmd.AddCommand(listCmd)

	startCmd.Flags().StringP("dir", "d", "", "Directory to serve")
	startCmd.Flags().StringP("name", "n", serverConfig.Name, "Server name")
	startCmd.Flags().IntP("port", "p", serverConfig.Port, "Port to host on")

	startCmd.Flags().Bool("uploads", serverConfig.AllowUploads, "Allow uploads to directory")
	startCmd.Flags().Bool("no-uploads", !serverConfig.AllowUploads, "Do not allow uploads to directory")
	startCmd.Flags().Bool("online", serverConfig.AllowOnline, "Allow online access to server")
	startCmd.Flags().Bool("no-online", !serverConfig.AllowOnline, "Do not allow online access to server")
	startCmd.Flags().Bool("notify", notifConfig.AllowNotif, "Allow notifications")
	startCmd.Flags().Bool("no-notify", !notifConfig.AllowNotif, "Do not allow notifications")

	startCmd.MarkFlagsMutuallyExclusive("uploads", "no-uploads")
	startCmd.MarkFlagsMutuallyExclusive("online", "no-online")
	startCmd.MarkFlagsMutuallyExclusive("notify", "no-notify")

	startCmd.MarkFlagRequired("dir")
}

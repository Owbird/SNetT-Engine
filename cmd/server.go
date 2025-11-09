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
			log.Fatalf("Failed to get 'dir' flag: %v", err)
		}

		logCh := make(chan models.ServerLog)
		defer close(logCh)

		go func() {
			for l := range logCh {
				switch l.Type {
				case models.API_LOG:
					log.Printf("[+] API Log: %v", l.Value)
				case models.SERVE_UI_LOCAL:
					log.Printf("[+] Network Web Running: %v", l.Value)
				case models.SERVE_UI_REMOTE:
					log.Printf("[+] Remote Web Running: %v", l.Value)
				case models.WS_NEW_VISITOR:
					log.Printf("[+] New visitor: %v", l.Value)
				case models.SERVER_ERROR:
					log.Printf("[!] Server Error: %v", l.Value)
				default:
					log.Printf("[+] Server Log: %v", l.Value)
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
			log.Printf("[%v] (%v)  http://%v:%v", idx, s.Name, s.IP, s.Port)
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

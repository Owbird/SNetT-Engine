package cmd

import (
	"log"

	"github.com/Owbird/SNetT-Engine/pkg/models"
	"github.com/Owbird/SNetT-Engine/pkg/server"
	"github.com/spf13/cobra"
)

var wormholeSendCmd = &cobra.Command{
	Use:   "share",
	Short: "Share file to device via the wormhole",
	Long:  `Share file to device via the wormhole`,
	Run: func(cmd *cobra.Command, args []string) {
		svr := server.NewServer("", nil)
		file, err := cmd.Flags().GetString("file")
		if err != nil {
			log.Fatalf("Failed to get 'file' flag: %v", err)
		}

		svr.Share(file, server.ShareCallBacks{
			OnSendErr: func(err error) {
				log.Fatalf("Send error: %s", err)
			},
			OnFileSent: func() {
				log.Println("File sent!")
			},
			OnCodeReceive: func(code string) {
				log.Println("Code: ", code)
			},
			OnProgressChange: func(progress models.FileShareProgress) {
				log.Printf("Sent: %v/%v (%v%%)", progress.Bytes, progress.Total, progress.Percentage)
			},
		})
	},
}

var wormholeRecvCommand = &cobra.Command{
	Use:   "receive",
	Short: "Receive file from device via the wormhole",
	Long:  `Receive file from device via the wormhole`,
	Run: func(cmd *cobra.Command, args []string) {
		server := server.NewServer("", nil)
		code, err := cmd.Flags().GetString("code")
		if err != nil {
			log.Fatalf("Failed to get 'code' flag: %v", err)
		}
		if err := server.Receive(code); err != nil {
			log.Fatalf("Failed to receive file: %v", err)
		}
	},
}

func init() {
	rootCmd.AddCommand(wormholeSendCmd)
	rootCmd.AddCommand(wormholeRecvCommand)

	wormholeSendCmd.Flags().StringP("file", "f", "", "File to share")

	wormholeRecvCommand.Flags().StringP("code", "c", "", "Code from other device")

	wormholeSendCmd.MarkFlagRequired("file")
	wormholeRecvCommand.MarkFlagRequired("code")
}

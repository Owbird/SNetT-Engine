package cmd

import (
	"log"

	"github.com/Owbird/SNetT-Engine/pkg/models"
	"github.com/Owbird/SNetT-Engine/pkg/wormhole"
	"github.com/spf13/cobra"
)

var wormholeCmd = &cobra.Command{
	Use:   "wormhole",
	Short: "Manage files via a wormhole",
	Long:  `Share and receive files via a wormhole.`,
}

var sendCmd = &cobra.Command{
	Use:   "share",
	Short: "Share file to device via the wormhole",
	Long:  `Send a file through the wormhole to another device using the magic key.`,
	Run: func(cmd *cobra.Command, args []string) {
		svr := wormhole.NewWormhole(nil)
		file, err := cmd.Flags().GetString("file")
		if err != nil {
			log.Fatalf("Failed to get 'file' flag: %v", err)
		}

		svr.Share(file, wormhole.ShareCallBacks{
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

var RecvCommand = &cobra.Command{
	Use:   "receive",
	Short: "Receive file from device via the wormhole",
	Long:  `Receive a file using the magic key from another device through the wormhole.`,
	Run: func(cmd *cobra.Command, args []string) {
		server := wormhole.NewWormhole(nil)
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
	rootCmd.AddCommand(wormholeCmd)

	wormholeCmd.AddCommand(sendCmd)
	wormholeCmd.AddCommand(RecvCommand)

	sendCmd.Flags().StringP("file", "f", "", "File to share")

	RecvCommand.Flags().StringP("code", "c", "", "Code from other device")

	sendCmd.MarkFlagRequired("file")
	RecvCommand.MarkFlagRequired("code")
}

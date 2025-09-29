package wormhole

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sync"

	"github.com/Owbird/SNetT-Engine/pkg/config"
	"github.com/Owbird/SNetT-Engine/pkg/models"
	"github.com/psanford/wormhole-william/wormhole"
)

// ShareCallBacks defines a set of callback functions for handling file sharing events.
type ShareCallBacks struct {
	// OnFileSent is called when a file has been successfully sent.
	OnFileSent func()

	// OnSendErr is called when an error occurs during the file sending process.
	OnSendErr func(err error)

	// OnProgressChange is called to provide updates on the progress of the file sharing operation.
	OnProgressChange func(progress models.FileShareProgress)

	// OnCodeReceive is called when the code to initiate the file sharing process has been received.
	OnCodeReceive func(code string)
}

type Wormhole struct {
	// The channel to send the logs through
	logCh chan models.ServerLog
}


var appConfig = config.NewAppConfig()

func sendNotification(notif models.Notification) {
	appConfig.GetNotifConfig().SendNotification(models.Notification{
		Title:         notif.Title,
		Body:          notif.Body,
		ClipboardText: notif.ClipboardText,
	})
}

func NewWormhole(logCh chan models.ServerLog) *Wormhole {
	return &Wormhole{
		logCh: logCh,
	}
}

// Send a file through a wormhole from a device
// TODO: Support directories
func (s *Wormhole) Share(file string, callbacks ShareCallBacks) {
	f, err := os.Open(file)
	if err != nil {
		callbacks.OnSendErr(err)

		return
	}

	var c wormhole.Client
	ctx := context.Background()

	progressCh := make(chan models.FileShareProgress, 1)

	handleProgress := func(sentBytes int64, totalBytes int64) {
		progressCh <- models.FileShareProgress{
			Bytes:      sentBytes,
			Total:      totalBytes,
			Percentage: int((float64(sentBytes) / float64(totalBytes)) * 100),
		}
	}

	code, st, err := c.SendFile(ctx, file, f, wormhole.WithProgress(handleProgress))

	if err != nil && callbacks.OnSendErr != nil {
		callbacks.OnSendErr(err)

		return
	}

	if callbacks.OnCodeReceive != nil {
		callbacks.OnCodeReceive(code)

		sendNotification(models.Notification{
			Title:         "Share code received",
			Body:          "Code copied to clipboard.",
			ClipboardText: code,
		})
	}

	wg := sync.WaitGroup{}

	wg.Add(1)
	go func() {
		for {
			select {
			case status := <-st:
				if status.Error != nil && callbacks.OnSendErr != nil {
					callbacks.OnSendErr(status.Error)

					return
				}

				if !status.OK && status.Error != nil && callbacks.OnSendErr != nil {
					callbacks.OnSendErr(fmt.Errorf("unknown error occurred"))
					return

				} else {
					if callbacks.OnFileSent != nil {
						callbacks.OnFileSent()
					}

					wg.Done()
					return
				}

			case progress := <-progressCh:
				if callbacks.OnProgressChange != nil {
					callbacks.OnProgressChange(progress)
				}
			}
		}
	}()

	wg.Wait()
}

// Receive file from device through wormhole
// Saves file to the snett dir in the Downloads directory
func (s *Wormhole) Receive(code string) error {
	var c wormhole.Client

	ctx := context.Background()
	fileInfo, err := c.Receive(ctx, code)
	if err != nil {
		return err
	}

	homeDir, err := os.UserHomeDir()
	if err != nil {
		return fmt.Errorf("failed to determine home directory: %w", err)
	}
	downloadsDir := filepath.Join(homeDir, "Downloads", "snett")

	if err := os.MkdirAll(downloadsDir, 0755); err != nil {
		return fmt.Errorf("failed to create snett directory: %w", err)
	}

	destFilePath := filepath.Join(downloadsDir, filepath.Base(fileInfo.Name))
	destFile, err := os.Create(destFilePath)
	if err != nil {
		return fmt.Errorf("failed to create file: %w", err)
	}
	defer destFile.Close()

	_, err = io.Copy(destFile, fileInfo)
	if err != nil {
		return fmt.Errorf("failed to save file: %w", err)
	}

	sendNotification(models.Notification{
		Title: "File received",
		Body:  fmt.Sprintf("File %v received and saved to %v", filepath.Base(fileInfo.Name), destFilePath),
	})

	return nil
}

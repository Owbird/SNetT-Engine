package logger

import (
	"io"
	"log/slog"
	"os"
	"path/filepath"

	"github.com/Owbird/SNetT-Engine/internal/utils"
)

var Logger *slog.Logger

func Init() {
	snettDir, err := utils.GetSNetTDir()
	if err != nil {
		slog.Error("failed to get snett dir", "err", err)
		os.Exit(1)
	}

	logsDir := filepath.Join(snettDir, "logs")
	if err := os.MkdirAll(logsDir, 0755); err != nil {
		slog.Error("failed to create logs directory", "err", err)
		os.Exit(1)
	}

	logFile, err := os.OpenFile(filepath.Join(logsDir, "snett.log"), os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		slog.Error("failed to open log file", "err", err)
		os.Exit(1)
	}

	handler := slog.NewTextHandler(io.MultiWriter(os.Stdout, logFile), nil)
	Logger = slog.New(handler)
}

package models

type LogType string

const (
	// File Server Log Types
	API_LOG         LogType = "api_log"
	SERVE_UI_LOCAL  LogType = "serve_web_ui_network"
	SERVE_UI_REMOTE LogType = "serve_web_ui_remote"
	SERVER_ERROR    LogType = "server_error"
)

type Notification struct {
	// The title of the notification
	Title string

	// The message of the notification
	Body string

	// The text to be copied to the clipboard
	ClipboardText string
}

type ServerLog struct {
	// Type of log from the file server.
	Type LogType

	// Value of the log
	Value string
}

type FileShareProgress struct {
	Bytes      int64
	Total      int64
	Percentage int
}

type SNetTServer struct {
	Name string
	Port int
	IP   string
}

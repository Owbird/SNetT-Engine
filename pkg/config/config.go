package config

import (
	"fmt"
	"log"
	"os"

	"github.com/Owbird/SNetT-Engine/internal/utils"
	"github.com/Owbird/SNetT-Engine/pkg/models"
	"github.com/atotto/clipboard"
	"github.com/martinlindhe/notify"
	"github.com/spf13/viper"
)

type ServerConfig struct {
	Name         string `mapstructure:"name"`
	AllowUploads bool   `mapstructure:"allowUploads"`
	AllowOnline  bool   `mapstructure:"allowOnline"`
	Port         int    `mapstructure:"port"`
}

type NotifConfig struct {
	AllowNotif bool `mapstructure:"allowNotif"`
}

func (nc *NotifConfig) SendNotification(notification models.Notification) {
	if nc.AllowNotif {
		notify.Notify("SNetT", notification.Title, notification.Body, "")
	}

	if notification.ClipboardText != "" {
		clipboard.WriteAll(notification.ClipboardText)
	}
}

// AppConfig holds the server configuration
type AppConfig struct {
	// The server configuration
	Server *ServerConfig `mapstructure:"server"`

	// The notification configuration
	Notification *NotifConfig `mapstructure:"notification"`
}

// Gets the app configuration from
// snet.toml with default values
// if absent
func NewAppConfig() *AppConfig {
	userDir, err := utils.GetSNetTDir()
	if err != nil {
		log.Fatalln("Failed to get user dir")
	}

	viper.SetConfigName("snett")
	viper.SetConfigType("toml")

	viper.AddConfigPath(userDir)

	hostname, err := os.Hostname()
	if err != nil {
		log.Fatalln(err)
	}

	viper.SetDefault("server.name", fmt.Sprintf("%v's Server", hostname))
	viper.SetDefault("server.allowUploads", false)
	viper.SetDefault("server.allowOnline", false)
	viper.SetDefault("server.port", 9091)
	viper.SetDefault("notification.allowNotif", false)

	err = viper.ReadInConfig()
	if err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			viper.SafeWriteConfig()
		} else {
			log.Fatalf("Error reading config file: %s", err)
		}
	}

	var config AppConfig

	err = viper.Unmarshal(&config)
	if err != nil {
		log.Fatalf("unable to decode into struct, %v", err)
	}

	return &config
}

// GetSeverConfig returns the server configuration
func (ac *AppConfig) GetSeverConfig() *ServerConfig {
	return ac.Server
}

// GetNotifConfig returns the notification configuration
func (ac *AppConfig) GetNotifConfig() *NotifConfig {
	return ac.Notification
}

// Save saves the server configuration to snet.toml
func (ac *AppConfig) Save() error {
	viper.Set("server", ac.Server)
	viper.Set("notification", ac.Notification)

	return viper.WriteConfig()
}

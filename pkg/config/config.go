package config

import (
	"fmt"
	"log"
	"os"

	"github.com/Owbird/SNetT-Engine/internal/config"
	"github.com/Owbird/SNetT-Engine/internal/utils"
	"github.com/spf13/viper"
)

// AppConfig holds the server configuration
type AppConfig struct {
	// The server configuration
	server *config.ServerConfig

	// The notification configuration
	notification *config.NotifConfig
}

// Gets the app configuration from
// snett.toml with default values
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
	viper.SetDefault("server.port", 8080)
	viper.SetDefault("notification.allowNotif", false)

	err = viper.ReadInConfig()
	if err != nil {
		viper.SafeWriteConfig()
	}

	config := &AppConfig{
		server:       config.NewServerConfig(),
		notification: config.NewNotifConfig(),
	}

	config.server.SetName(viper.GetString("server.name"))
	config.server.SetAllowUploads(viper.GetBool("server.allowUploads"))
	config.server.SetAllowOnline(viper.GetBool("server.allowOnline"))
	config.server.SetPort(viper.GetInt("server.port"))
	config.notification.SetAllowNotif(viper.GetBool("notification.allowNotif"))

	return config
}

// GetSeverConfig returns the server configuration
func (ac *AppConfig) GetSeverConfig() *config.ServerConfig {
	return ac.server
}

// GetNotifConfig returns the notification configuration
func (ac *AppConfig) GetNotifConfig() *config.NotifConfig {
	return ac.notification
}

// Save saves the server configuration to snett.toml
func (ac *AppConfig) Save() error {
	viper.Set("server.name", ac.server.GetName())
	viper.Set("server.allowUploads", ac.server.GetAllowUploads())
	viper.Set("server.allowOnline", ac.server.GetAllowOnline())
	viper.Set("server.port", ac.server.GetPort())
	viper.Set("notification.allowNotif", ac.notification.GetAllowNotif())

	return viper.WriteConfig()
}

// ToJson returns the server configuration as json
func (ac *AppConfig) ToJson() map[string]interface{} {
	return viper.AllSettings()
}

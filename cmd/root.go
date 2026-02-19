package cmd

import (
	"os"

	"github.com/Owbird/SNetT-Engine/internal/logger"
	"github.com/spf13/cobra"
)

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
	Use:   "SNetT-Engine",
	Short: "SNetT Cli",
	Long:  `SNetT is a collection of network tools for easy file sharing and management.`,
}

// Execute adds all child commands to the root command and sets flags appropriately.
// This is called by main.main(). It only needs to happen once to the rootCmd.
func Execute() {
	err := rootCmd.Execute()
	if err != nil {
		os.Exit(1)
	}
}

func init() {
	logger.Init()
}

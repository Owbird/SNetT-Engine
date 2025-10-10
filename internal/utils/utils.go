package utils

import (
	"fmt"
	"net"
	"os"
	"path/filepath"
)

func GetSNetTDir() (string, error) {
	userDir, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	path := filepath.Join(userDir, ".snett")

	os.MkdirAll(path, 0777)

	return path, nil
}

func GetLocalIp() ([]string, error) {
	localIps := []string{}

	ifs, err := net.Interfaces()
	if err != nil {
		return localIps, err
	}

	for _, iface := range ifs {
		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}

		for _, addr := range addrs {
			ip, ok := addr.(*net.IPNet)
			if ok && !ip.IP.IsLoopback() {
				v4 := ip.IP.To4()
				if v4 != nil {
					localIps = append(localIps, v4.String())
				}
			}
		}
	}
	return localIps, nil
}

func FmtBytes(bytes int64) string {
	const (
		KB = 1024
		MB = KB * 1024
		GB = MB * 1024
	)

	switch {
	case bytes >= GB:
		return fmt.Sprintf("%.2f GB", float64(bytes)/float64(GB))
	case bytes >= MB:
		return fmt.Sprintf("%.2f MB", float64(bytes)/float64(MB))
	case bytes >= KB:
		return fmt.Sprintf("%.2f KB", float64(bytes)/float64(KB))
	default:
		return fmt.Sprintf("%d bytes", bytes)
	}
}

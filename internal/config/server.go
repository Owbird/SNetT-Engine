package config

type ServerConfig struct {
	// The server label to be displayed
	name string

	// Should uploads be allowed
	allowUploads bool

	// Should server be accessible online
	allowOnline bool

	// Port to host the server
	port int
}

func NewServerConfig() *ServerConfig {
	return &ServerConfig{}
}

// SetName sets the server name
// Defaults to machine hostname
func (sc *ServerConfig) SetName(name string) *ServerConfig {
	sc.name = name
	return sc
}

// SetAllowUploads sets if uploads are allowed
// Defaults to false
func (sc *ServerConfig) SetAllowUploads(allowUploads bool) *ServerConfig {
	sc.allowUploads = allowUploads
	return sc
}

// SetAllowOnline sets if the server is online
// Defaults to false
func (sc *ServerConfig) SetAllowOnline(allowOnline bool) *ServerConfig {
	sc.allowOnline = allowOnline
	return sc
}

// SetPort sets the server port
// Defaults to 8080
func (sc *ServerConfig) SetPort(port int) *ServerConfig {
	sc.port = port
	return sc
}

// GetName returns the server name
func (sc *ServerConfig) GetName() string {
	return sc.name
}

// GetAllowUploads returns if uploads are allowed
func (sc *ServerConfig) GetAllowUploads() bool {
	return sc.allowUploads
}

// GetAllowOnline returns if the server is online
func (sc *ServerConfig) GetAllowOnline() bool {
	return sc.allowOnline
}

// GetPort returns the server port
func (sc *ServerConfig) GetPort() int {
	return sc.port
}

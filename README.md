# SNetT-Engine

SNetT-Engine is the core engine for [SNetT](https://github.com/Owbird/SNetT). It is a Go package and CLI that provides a set of tools to manage your files over a network.

## Features

- **File Sharing**: Securely share files between devices using a simple code. Based on [Magic Wormhole](https://www.lothar.com/~warner/MagicWormhole-PyCon2016.pdf)
- **File Server**: Host a directory of files with a web-based UI for browsing, downloading, and uploading.

## Installation

To install SNetT-Engine, use the `go install` command or download the latest [release](https://github.com/Owbird/SNetT-Engine/releases):

```bash
go install github.com/Owbird/SNetT-Engine@latest
```

## Usage

### Command Line Interface (CLI)

Run the main program:

```bash
SNetT-Engine [command]
```

#### Share a file

```bash
SNetT-Engine server share -f <file_path>
```

#### Receive a file

```bash
SNetT-Engine server receive -c <CODE>
```

#### Start the file server

```bash
SNetT-Engine server start -d <directory_path>
```

### Go Package

To use SNetT-Engine as a package in your Go application, import it and utilize its features:

```go
import "github.com/Owbird/SNetT-Engine/pkg/server"

func main() {
    server := server.NewServer("./", nil)
    server.Start()
}
```

For detailed documentation, visit the [Go package documentation](https://pkg.go.dev/github.com/Owbird/SNetT-Engine).

## Contributing

We welcome contributions!

## License

This project is licensed under the [MIT License](LICENSE).

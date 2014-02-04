todoapp
==========

A browser-based [Todo.txt](http://todotxt.com/) application,       
written in [Golang](http://golang.org/) and [AngularJS](http://angularjs.org/).

[![Build Status](https://travis-ci.org/JamesClonk/todoapp.png?branch=master)](https://travis-ci.org/JamesClonk/todoapp)

[Demo Application](http://jamesclonk.github.io/todoapp/)

![todoapp Screenshot](https://github.com/JamesClonk/todoapp/raw/master/todoapp.jpg "todoapp Screenshot")

## Installation

	$ go get github.com/JamesClonk/todoapp

This will compile and install the *todoapp* binary into your $GOPATH/bin directory.

## Requirements

todoapp requires [Go 1.2](http://golang.org/doc/install) or higher.

## Usage

Go to the directory where you store or wish to store your Todo.txt file and simply start *todoapp*, then open your browser and point it to http://localhost:4004/

	$ todoapp

*todoapp* also has some commandline options:

	$ todoapp -h

```
NAME:
   todoapp - A browser-based Todo.txt application

USAGE:
   todoapp [global options] command [command options] [arguments...]

VERSION:
   1.0.0

COMMANDS:
   help, h      Shows a list of commands or help for one command

GLOBAL OPTIONS:
   --port, -p '4004'                    port for the todoapp web server
   --file, -f 'todo.txt'                filename/path of todo.txt file to use
   --config, -c 'todoapp.config'        filename/path of configuration file to use
   --version, -v                        print the version
   --help, -h                           show help
```

## Documentation

See under "Tools" section on the [demo application](http://jamesclonk.github.io/todoapp/) for ruther information.

## License

The source files are distributed under the [Mozilla Public License, version 2.0](http://mozilla.org/MPL/2.0/), unless otherwise noted.  
Please read the [FAQ](http://www.mozilla.org/MPL/2.0/FAQ.html) if you have further questions regarding the license. 

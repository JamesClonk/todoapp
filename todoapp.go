/* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package main

import (
	todo "github.com/JamesClonk/go-todotxt"
	"github.com/codegangsta/cli"
	"github.com/codegangsta/martini"
	"github.com/codegangsta/martini-contrib/auth"
	"github.com/codegangsta/martini-contrib/binding"
	"github.com/codegangsta/martini-contrib/render"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"
)

var (
	logFlags   = log.Ldate | log.Ltime
	logPrefix  = "[todoapp] "
	configFile = "todoapp.config"
	port       = "4004"
)

type View struct {
	Title string
}

func main() {
	app := cli.NewApp()
	app.Name = "todoapp"
	app.Usage = "A browser-based Todo.txt application"
	app.Version = "0.1.0"
	app.Author = "JamesClonk"
	app.Email = "jamesclonk@jamesclonk.ch"
	app.Action = mainAction
	app.Flags = []cli.Flag{
		cli.IntFlag{"port,p", 4004, "port for the todoapp web server"},
		cli.StringFlag{"file,f", "todo.txt", "filename/path of todo.txt file to use"},
		cli.StringFlag{"config,c", "todoapp.config", "filename/path of configuration file to use"},
	}
	app.Run(os.Args)
}

func mainAction(c *cli.Context) {
	parseOptions(c)
	m := setupMartini()

	log.SetFlags(0)
	log.SetPrefix(logPrefix)

	log.Println("")
	log.Println("------------------------------------------------------------------")
	log.Println("")
	log.Println("    Welcome to 'todoapp', a browser-based Todo.txt application")
	log.Printf("    Start your browser and point it to http://localhost:%v/\n", port)
	log.Println("")
	log.Println("------------------------------------------------------------------")
	log.Println("")

	log.SetFlags(logFlags)
	log.SetPrefix(logPrefix)

	log.Printf("todoapp started and listening on port %v\n", port)

	http.ListenAndServe(":"+port, m)
}

func parseOptions(c *cli.Context) {
	port = strconv.Itoa(c.Int("port"))

	if c.IsSet("config") {
		configFile = c.String("config")
	}
	config, err := readConfigurationFile(configFile)
	if err != nil {
		log.Fatalf("Could not read configuration file: %v", err)
		return
	}

	if c.IsSet("file") {
		// overwrite configuration file setting for todo.txt file, if given as commandline parameter
		config.TodoTxtFilename = c.String("file")
		if err := config.writeConfigurationFile(configFile); err != nil {
			log.Fatalf("Could not update configuration file: %v", err)
		}
	}

	// check if file actually exists, otherwise create new file
	if _, err := os.Stat(config.TodoTxtFilename); os.IsNotExist(err) {
		file, err := os.Create(config.TodoTxtFilename)
		if err != nil {
			log.Fatalf("Todo.txt file could not be created: %v", err)
		}
		file.Close()
	}
}

func setupMartini() *martini.Martini {
	r := martini.NewRouter()
	m := martini.New()
	m.Use(martini.Recovery())
	m.Use(martini.Static("assets", martini.StaticOptions{SkipLogging: true})) // skip logging on static content
	m.Use(martini.Logger())
	m.Use(render.Renderer(render.Options{
		Directory:  "templates",
		Layout:     "layout",
		Extensions: []string{".html"},
		IndentJSON: true,
	}))
	m.Use(ConfigOptions(configFile))
	m.Use(TaskList())
	m.Map(log.New(os.Stdout, logPrefix, logFlags))
	m.Action(r.Handle)

	setupRoutes(r)

	return m
}

func setupRoutes(r martini.Router) {
	// static
	r.Get("/", func(r render.Render) {
		r.HTML(http.StatusOK, "index", View{Title: "A browser-based Todo.txt application"})
	})
	r.NotFound(func(r render.Render) {
		r.HTML(http.StatusNotFound, "404", View{Title: "404 - Not Found"})
	})

	// api - for tasks
	r.Get("/api/tasks", func(tasks todo.TaskList, r render.Render) {
		r.JSON(http.StatusOK, tasks)
	})

	r.Get("/api/task/:id", func(tasks todo.TaskList, params martini.Params, r render.Render) {
		id, err := strconv.Atoi(params["id"])
		if err != nil {
			r.Error(http.StatusInternalServerError)
			return
		}

		task, err := tasks.GetTask(id)
		if err != nil {
			r.Error(http.StatusNotFound)
			return
		}
		r.JSON(http.StatusOK, task)
	})

	r.Post("/api/task", binding.Bind(todo.Task{}), func(newTask todo.Task, tasks todo.TaskList, config *Config, params martini.Params, r render.Render) {
		newTask.CreatedDate = time.Now()
		tasks.AddTask(&newTask)

		if err := tasks.WriteToFilename(config.TodoTxtFilename); err != nil {
			r.Error(http.StatusInternalServerError)
			return
		}
		r.JSON(http.StatusCreated, newTask)
	})

	r.Put("/api/task/:id", binding.Bind(todo.Task{}), func(updatedTask todo.Task, tasks todo.TaskList, config *Config, params martini.Params, r render.Render) {
		id, err := strconv.Atoi(params["id"])
		if err != nil {
			r.Error(http.StatusInternalServerError)
			return
		}

		currentTask, err := tasks.GetTask(id)
		if err != nil {
			r.Error(http.StatusNotFound)
			return
		}

		*currentTask = updatedTask
		if err := tasks.WriteToFilename(config.TodoTxtFilename); err != nil {
			r.Error(http.StatusInternalServerError)
			return
		}
		r.JSON(http.StatusOK, updatedTask)
	})

	r.Delete("/api/task/:id", func(tasks todo.TaskList, config *Config, params martini.Params, r render.Render) {
		id, err := strconv.Atoi(params["id"])
		if err != nil {
			r.Error(http.StatusInternalServerError)
			return
		}

		if err := tasks.RemoveTaskById(id); err != nil {
			r.Error(http.StatusNotFound)
			return
		}

		if err := tasks.WriteToFilename(config.TodoTxtFilename); err != nil {
			r.Error(http.StatusInternalServerError)
			return
		}
		r.JSON(http.StatusNoContent, `{}`)
	})

	// api - for config file
	r.Get("/api/config", func(config *Config, r render.Render) {
		r.JSON(http.StatusOK, config)
	})

	r.Put("/api/config", binding.Bind(Config{}), func(bindConfig Config, r render.Render) {
		if err := bindConfig.writeConfigurationFile(configFile); err != nil {
			r.Error(http.StatusInternalServerError)
			return
		}
		r.JSON(http.StatusOK, bindConfig)
	})
}

func TodoAuth() http.HandlerFunc {
	return auth.Basic("admin", "admin")
}

// Add todotxt.TaskList to martini context
func TaskList() martini.Handler {
	return func(c martini.Context, r render.Render, config *Config) {
		tasks, err := todo.LoadFromFilename(config.TodoTxtFilename)
		if err != nil {
			r.HTML(http.StatusInternalServerError, "500", err)
			return
		}

		c.Map(tasks)
		c.Next()
	}
}

// Add configuration options to martini context
func ConfigOptions(filename string) martini.Handler {
	return func(c martini.Context, r render.Render) {
		config, err := readConfigurationFile(filename)
		if err != nil {
			r.HTML(http.StatusInternalServerError, "500", err)
			return
		}

		c.Map(config)
		c.Next()
	}
}

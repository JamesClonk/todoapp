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
	logFlags    = log.Ldate | log.Ltime
	logPrefix   = "[todoapp] "
	todotxtFile = "todo.txt"
)

type View struct {
	Title string
}

func init() {
	log.SetFlags(logFlags)
	log.SetPrefix(logPrefix)
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
	}
	app.Run(os.Args)
}

func mainAction(c *cli.Context) {
	port := strconv.Itoa(c.Int("port"))
	if c.IsSet("file") {
		todotxtFile = c.String("file")
	}

	// check if file actually exists, otherwise abort!
	if _, err := os.Stat(todotxtFile); os.IsNotExist(err) {
		log.Fatalf("Todo.txt not found, no such file: [%s]", todotxtFile)
	}

	m := setupMartini()
	log.Printf("todoapp started and listening on port %v", port)
	http.ListenAndServe(":"+port, m)
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

	// api
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
			r.Error(http.StatusInternalServerError)
			return
		}
		r.JSON(http.StatusOK, task)
	})

	r.Post("/api/task", binding.Bind(todo.Task{}), func(newTask todo.Task, tasks todo.TaskList, params martini.Params, r render.Render) {
		newTask.CreatedDate = time.Now()
		tasks.AddTask(&newTask)

		if err := tasks.WriteToFilename(todotxtFile); err != nil {
			r.Error(http.StatusInternalServerError)
			return
		}
		r.JSON(http.StatusCreated, newTask)
	})

	r.Put("/api/task/:id", binding.Bind(todo.Task{}), func(updatedTask todo.Task, tasks todo.TaskList, params martini.Params, r render.Render) {
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
		if err := tasks.WriteToFilename(todotxtFile); err != nil {
			r.Error(http.StatusInternalServerError)
			return
		}
		r.JSON(http.StatusOK, currentTask)
	})

	r.Delete("/api/task/:id", func(tasks todo.TaskList, params martini.Params, r render.Render) {
		id, err := strconv.Atoi(params["id"])
		if err != nil {
			r.Error(http.StatusInternalServerError)
			return
		}

		if err := tasks.RemoveTaskById(id); err != nil {
			r.Error(http.StatusNotFound)
			return
		}

		if err := tasks.WriteToFilename(todotxtFile); err != nil {
			r.Error(http.StatusInternalServerError)
			return
		}
		r.JSON(http.StatusNoContent, `{}`)
	})
}

func TodoAuth() http.HandlerFunc {
	return auth.Basic("admin", "admin")
}

// Add todotxt.TaskList to martini context
func TaskList() martini.Handler {
	return func(c martini.Context, r render.Render) {
		tasks, err := todo.LoadFromFilename(todotxtFile)
		if err != nil {
			r.HTML(http.StatusInternalServerError, "500", err)
			return
		}

		c.Map(tasks)
		c.Next()
	}
}

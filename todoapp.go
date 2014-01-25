/* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package main

import (
	todo "github.com/JamesClonk/go-todotxt"
	"github.com/codegangsta/martini"
	"github.com/codegangsta/martini-contrib/auth"
	"github.com/codegangsta/martini-contrib/render"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
)

var (
	logFlags    = log.Ldate | log.Ltime
	logPrefix   = "[todoapp] "
	todotxtPath = "data"
	todotxtFile = filepath.Join("data", "todo.txt")
)

func init() {
	log.SetFlags(logFlags)
	log.SetPrefix(logPrefix)
}

func main() {
	// Setup and start martini
	m := setupMartini()
	m.Run()
}

func setupMartini() *martini.ClassicMartini {
	m := martini.Classic()
	m.Map(log.New(os.Stdout, logPrefix, logFlags))

	m.Use(TaskList())
	m.Use(render.Renderer(render.Options{
		Directory:  "templates",
		Layout:     "layout",
		Extensions: []string{".html"},
		IndentJSON: true,
	}))

	setupRoutes(m)

	return m
}

type View struct {
	Title string
}

func setupRoutes(m *martini.ClassicMartini) {
	m.Get("/", func(r render.Render) {
		r.HTML(http.StatusOK, "index", View{Title: "A browser-based Todo.txt application"})
	})

	m.Get("/tasks", func(tasks todo.TaskList, r render.Render) {
		r.JSON(http.StatusOK, tasks)
	})

	m.Get("/task/:id", func(tasks todo.TaskList, params martini.Params, r render.Render) {
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

	m.Delete("/task/:id", func(tasks todo.TaskList, params martini.Params, r render.Render) {
		id, err := strconv.Atoi(params["id"])
		if err != nil {
			r.Error(http.StatusInternalServerError)
			return
		}

		if err := tasks.RemoveTaskById(id); err != nil {
			r.Error(http.StatusInternalServerError)
			return
		}

		if err := tasks.WriteToFilename(todotxtFile); err != nil {
			r.Error(http.StatusInternalServerError)
			return
		}
		r.Redirect("/")
	})

	m.NotFound(func(r render.Render) {
		r.HTML(http.StatusNotFound, "404", View{Title: "404 - Not Found"})
	})
}

func TodoAuth() http.HandlerFunc {
	return auth.Basic("admin", "admin")
}

func TaskList() martini.Handler {
	return func(c martini.Context) {
		tasks, err := todo.LoadFromFilename(todotxtFile)
		if err != nil {
			panic(err)
		}

		c.Map(tasks)
		c.Next()
	}
}

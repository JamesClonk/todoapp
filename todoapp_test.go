/* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package main

import (
	"bytes"
	"encoding/json"
	"flag"
	todo "github.com/JamesClonk/go-todotxt"
	"github.com/codegangsta/cli"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"runtime"
	"testing"
	"time"
)

func init() {
	// Port during tests
	port = "4005"
	os.Setenv("PORT", port)

	// Test file setup
	configTest := "testdata/test.config"
	configFile = "testdata/todo.config"
	todotxtTest := "testdata/test.txt"
	todotxtFile := "testdata/todo.txt"
	os.Remove(configFile)
	os.Remove(todotxtFile)

	input, err := os.Open(configTest)
	if err != nil {
		panic(err)
	}
	defer input.Close()

	output, err := os.Create(configFile)
	if err != nil {
		panic(err)
	}
	defer output.Close()

	_, err = io.Copy(output, input)
	if err != nil {
		panic(err)
	}

	input, err = os.Open(todotxtTest)
	if err != nil {
		panic(err)
	}
	defer input.Close()

	output, err = os.Create(todotxtFile)
	if err != nil {
		panic(err)
	}
	defer output.Close()

	_, err = io.Copy(output, input)
	if err != nil {
		panic(err)
	}
}

func Test_todoapp_parseOptions(t *testing.T) {
	os.Remove("testdata/todo.test")
	os.Remove("testdata/config.test")
	defer os.Remove("testdata/todo.test")
	defer os.Remove("testdata/config.test")

	portBefore := port
	configBefore := configFile
	defer func() {
		port = portBefore
		configFile = configBefore
	}()

	set := flag.NewFlagSet("test", 0)
	set.Int("port", 0, "test")
	set.String("file", "", "test")
	set.String("config", "", "test")
	c := cli.NewContext(nil, set, set)

	set.Parse([]string{"--port", "5555"})
	set.Parse([]string{"--file", "testdata/todo.test"})
	set.Parse([]string{"--config", "testdata/config.test"})

	Expect(t, c.IsSet("port"), true)
	Expect(t, c.IsSet("file"), true)
	Expect(t, c.IsSet("config"), true)

	// before
	Expect(t, port, "4005")
	Expect(t, configFile, "testdata/todo.config")
	config, err := readConfigurationFile(configFile)
	if err != nil {
		t.Fatal(err)
	}
	Expect(t, config.TodoTxtFilename, "testdata/todo.txt")

	parseOptions(c)

	// after
	Expect(t, port, "5555")
	Expect(t, configFile, "testdata/config.test")
	config, err = readConfigurationFile(configFile)
	if err != nil {
		t.Fatal(err)
	}
	Expect(t, config.TodoTxtFilename, "testdata/todo.test")

}

func Test_todoapp_index(t *testing.T) {
	m := setupMartini()

	response := httptest.NewRecorder()
	req, err := http.NewRequest("GET", "http://localhost:4005/", nil)
	if err != nil {
		t.Fatal(err)
	}

	m.ServeHTTP(response, req)
	Expect(t, response.Code, http.StatusOK)

	body := response.Body.String()
	Contain(t, body, `<html lang="en" ng-app="todoapp" ng-controller="todoappCtrl">`)
	Contain(t, body, `<title>todoapp</title>`)
	Contain(t, body, `<div ng-view></div>`)
}

func Test_todoapp_assets(t *testing.T) {
	m := setupMartini()

	response := httptest.NewRecorder()
	req, err := http.NewRequest("GET", "http://localhost:4005/js/todoapp.js", nil)
	if err != nil {
		t.Fatal(err)
	}

	m.ServeHTTP(response, req)
	Expect(t, response.Code, http.StatusOK)

	body := response.Body.String()
	Contain(t, body, `var todoapp = angular.module('todoapp', [`)
	Contain(t, body, `todoapp.config(['$routeProvider',`)

	response = httptest.NewRecorder()
	req, err = http.NewRequest("GET", "http://localhost:4005/css/todoapp.css", nil)
	if err != nil {
		t.Fatal(err)
	}

	m.ServeHTTP(response, req)
	Expect(t, response.Code, http.StatusOK)

	body = response.Body.String()
	Contain(t, body, `.completed, .completed a {`)
	Contain(t, body, `color: #333333;`)
	Contain(t, body, `background-color: #999999;`)
	Contain(t, body, `text-decoration: line-through;`)
}

func Test_todoapp_404(t *testing.T) {
	m := setupMartini()

	response := httptest.NewRecorder()
	req, err := http.NewRequest("GET", "http://localhost:4005/unknown", nil)
	if err != nil {
		t.Fatal(err)
	}

	m.ServeHTTP(response, req)
	Expect(t, response.Code, http.StatusNotFound)

	body := response.Body.String()
	Contain(t, body, `<h1>404 - Not Found</h1>`)
	Contain(t, body, `<h5>This is not the page you are looking for..</h5>`)
}

func Test_todoapp_500(t *testing.T) {
	os.Remove("testdata/test_not_exists.config")
	defer os.Remove("testdata/test_not_exists.config")

	m := setupMartini()

	// set todo.txt file to 'testdata/does_not_exist.txt'
	config, err := readConfigurationFile("testdata/test_not_exists.config")
	if err != nil {
		t.Fatal(err)
	}
	config.TodoTxtFilename = "testdata/does_not_exist.txt"
	if err := config.writeConfigurationFile("testdata/test_not_exists.config"); err != nil {
		t.Fatal(err)
	}

	m.Use(ConfigOptions("testdata/test_not_exists.config"))
	m.Use(TaskList())

	response := httptest.NewRecorder()
	req, err := http.NewRequest("GET", "http://localhost:4005/", nil)
	if err != nil {
		t.Fatal(err)
	}

	m.ServeHTTP(response, req)
	Expect(t, response.Code, http.StatusInternalServerError)

	body := response.Body.String()
	Contain(t, body, `<h1>500 - Internal Server Error</h1>`)
	if runtime.GOOS == "windows" {
		Contain(t, body, `<h5>open testdata/does_not_exist.txt: The system cannot find the file specified.</h5>`)
	} else {
		Contain(t, body, `<h5>open testdata/does_not_exist.txt: no such file or directory</h5>`)
	}

	// change todo.txt file to 'testdata/does_really_not_exist.txt'
	config.TodoTxtFilename = "testdata/does_really_not_exist.txt"
	if err := config.writeConfigurationFile("testdata/test_not_exists.config"); err != nil {
		t.Fatal(err)
	}

	response = httptest.NewRecorder()
	req, err = http.NewRequest("GET", "http://localhost:4005/", nil)
	if err != nil {
		t.Fatal(err)
	}

	m.ServeHTTP(response, req)
	Expect(t, response.Code, http.StatusInternalServerError)

	body = response.Body.String()
	Contain(t, body, `<h1>500 - Internal Server Error</h1>`)
	if runtime.GOOS == "windows" {
		Contain(t, body, `<h5>open testdata/does_really_not_exist.txt: The system cannot find the file specified.</h5>`)
	} else {
		Contain(t, body, `<h5>open testdata/does_really_not_exist.txt: no such file or directory</h5>`)
	}
}

func Test_todoapp_api_GetTasks(t *testing.T) {
	m := setupMartini()

	response := httptest.NewRecorder()
	req, err := http.NewRequest("GET", "http://localhost:4005/api/tasks", nil)
	if err != nil {
		t.Fatal(err)
	}

	m.ServeHTTP(response, req)
	Expect(t, response.Code, http.StatusOK)

	body := response.Body.String()
	Contain(t, body, `"Original": "(B) 2013-12-01 private:false Outline chapter 5 +Novel @Computer Level:5 due:2014-02-17"`)
	Contain(t, body, `"Original": "(A) 2012-01-30 @Phone Call Mom @Call +Family"`)
	Contain(t, body, `"Todo": "Turn off TV"`)
	Contain(t, body, `"Id": 4`)

	var tasksFromApi todo.TaskList
	if err := json.Unmarshal([]byte(body), &tasksFromApi); err != nil {
		t.Fatal(err)
	}

	config, err := readConfigurationFile(configFile)
	if err != nil {
		t.Fatal(err)
	}
	tasksFromFile, err := todo.LoadFromFilename(config.TodoTxtFilename)
	if err != nil {
		t.Fatal(err)
	}

	Expect(t, tasksFromApi.String(), tasksFromFile.String())
}

func Test_todoapp_api_GetTask(t *testing.T) {
	m := setupMartini()

	// ---------------------------------------------------------------------------
	// get task
	response := httptest.NewRecorder()
	req, err := http.NewRequest("GET", "http://localhost:4005/api/task/4", nil)
	if err != nil {
		t.Fatal(err)
	}

	m.ServeHTTP(response, req)
	Expect(t, response.Code, http.StatusOK)

	body := response.Body.String()
	Contain(t, body, `"Original": "x 2014-01-02 (B) 2013-12-30 Create golang library test cases @Go +go-todotxt"`)

	var taskFromApi todo.Task
	if err := json.Unmarshal([]byte(body), &taskFromApi); err != nil {
		t.Fatal(err)
	}

	config, err := readConfigurationFile(configFile)
	if err != nil {
		t.Fatal(err)
	}
	tasksFromFile, err := todo.LoadFromFilename(config.TodoTxtFilename)
	if err != nil {
		t.Fatal(err)
	}
	taskFromFile, err := tasksFromFile.GetTask(4)
	if err != nil {
		t.Fatal(err)
	}

	Expect(t, taskFromApi.String(), taskFromFile.String())

	// ---------------------------------------------------------------------------
	// try to get non-existing task
	response = httptest.NewRecorder()
	req, err = http.NewRequest("GET", "http://localhost:4005/api/task/11", nil)
	if err != nil {
		t.Fatal(err)
	}

	m.ServeHTTP(response, req)
	Expect(t, response.Code, http.StatusNotFound)
}

func Test_todoapp_api_PostTask(t *testing.T) {
	m := setupMartini()

	config, err := readConfigurationFile(configFile)
	if err != nil {
		t.Fatal(err)
	}
	tasksFromFile, err := todo.LoadFromFilename(config.TodoTxtFilename)
	if err != nil {
		t.Fatal(err)
	}
	Expect(t, len(tasksFromFile), 9)

	task, err := todo.ParseTask("(F) Call dry cleaner @Home due:2014-02-19")
	if err != nil {
		t.Fatal(err)
	}

	data, err := json.MarshalIndent(task, "", "  ")
	if err != nil {
		t.Fatal(err)
	}
	var formBuffer bytes.Buffer
	formBuffer.Write(data)

	// ---------------------------------------------------------------------------
	// create new task
	response := httptest.NewRecorder()
	req, err := http.NewRequest("POST", "http://localhost:4005/api/task", &formBuffer)
	if err != nil {
		t.Fatal(err)
	}

	m.ServeHTTP(response, req)
	Expect(t, response.Code, http.StatusCreated)

	body := response.Body.String()
	Contain(t, body, task.Todo)
	Contain(t, body, task.Priority)
	Contain(t, body, task.Contexts[0])
	Contain(t, body, task.DueDate.Format(todo.DateLayout))

	if err := tasksFromFile.LoadFromFilename(config.TodoTxtFilename); err != nil {
		t.Fatal(err)
	}
	Expect(t, len(tasksFromFile), 10)

	taskFromFile, err := tasksFromFile.GetTask(10)
	if err != nil {
		t.Fatal(err)
	}
	Expect(t, taskFromFile.Priority, "F")
	Expect(t, taskFromFile.Todo, "Call dry cleaner")
	Expect(t, taskFromFile.Contexts, []string{"Home"})
	expectedTime, err := time.Parse(todo.DateLayout, "2014-02-19")
	if err != nil {
		t.Fatal(err)
	}
	Expect(t, taskFromFile.DueDate, expectedTime)

	// ---------------------------------------------------------------------------
	// try to create invalid task
	formBuffer.Reset()
	response = httptest.NewRecorder()
	req, err = http.NewRequest("POST", "http://localhost:4005/api/task", &formBuffer)
	if err != nil {
		t.Fatal(err)
	}

	m.ServeHTTP(response, req)
	Expect(t, response.Code, http.StatusBadRequest)
}

func Test_todoapp_api_PutTask(t *testing.T) {
	m := setupMartini()

	config, err := readConfigurationFile(configFile)
	if err != nil {
		t.Fatal(err)
	}
	tasksFromFile, err := todo.LoadFromFilename(config.TodoTxtFilename)
	if err != nil {
		t.Fatal(err)
	}
	Expect(t, len(tasksFromFile), 10)

	task, err := tasksFromFile.GetTask(6)
	if err != nil {
		t.Fatal(err)
	}

	Expect(t, task.Completed, false)
	task.Complete()
	Expect(t, task.Completed, true)

	data, err := json.MarshalIndent(task, "", "  ")
	if err != nil {
		t.Fatal(err)
	}
	var formBuffer bytes.Buffer
	formBuffer.Write(data)

	// ---------------------------------------------------------------------------
	// update existing task
	response := httptest.NewRecorder()
	req, err := http.NewRequest("PUT", "http://localhost:4005/api/task/6", &formBuffer)
	if err != nil {
		t.Fatal(err)
	}

	m.ServeHTTP(response, req)
	Expect(t, response.Code, http.StatusOK)
	Expect(t, response.Body.String(), string(data))

	if err := tasksFromFile.LoadFromFilename(config.TodoTxtFilename); err != nil {
		t.Fatal(err)
	}
	Expect(t, len(tasksFromFile), 10)

	taskFromFile, err := tasksFromFile.GetTask(6)
	if err != nil {
		t.Fatal(err)
	}
	Expect(t, taskFromFile.String(), task.String())
	Expect(t, taskFromFile.Completed, true)

	// ---------------------------------------------------------------------------
	// try to update non-existing task
	formBuffer.Reset()
	formBuffer.Write(data)
	response = httptest.NewRecorder()
	req, err = http.NewRequest("PUT", "http://localhost:4005/api/task/17", &formBuffer)
	if err != nil {
		t.Fatal(err)
	}

	m.ServeHTTP(response, req)
	Expect(t, response.Code, http.StatusNotFound)
}

func Test_todoapp_api_DeleteTask(t *testing.T) {
	m := setupMartini()

	config, err := readConfigurationFile(configFile)
	if err != nil {
		t.Fatal(err)
	}
	tasksFromFile, err := todo.LoadFromFilename(config.TodoTxtFilename)
	if err != nil {
		t.Fatal(err)
	}
	Expect(t, len(tasksFromFile), 10)

	if _, err := tasksFromFile.GetTask(5); err != nil {
		t.Fatal(err)
	}

	// ---------------------------------------------------------------------------
	// delete existing task
	response := httptest.NewRecorder()
	req, err := http.NewRequest("DELETE", "http://localhost:4005/api/task/5", nil)
	if err != nil {
		t.Fatal(err)
	}

	m.ServeHTTP(response, req)
	Expect(t, response.Code, http.StatusNoContent)

	body := response.Body.String()
	Expect(t, body, `"{}"`)

	if err := tasksFromFile.LoadFromFilename(config.TodoTxtFilename); err != nil {
		t.Fatal(err)
	}
	Expect(t, len(tasksFromFile), 9)

	// ---------------------------------------------------------------------------
	// try to delete non-existing task
	response = httptest.NewRecorder()
	req, err = http.NewRequest("DELETE", "http://localhost:4005/api/task/15", nil)
	if err != nil {
		t.Fatal(err)
	}

	m.ServeHTTP(response, req)
	Expect(t, response.Code, http.StatusNotFound)
}

func Test_todoapp_api_DeleteTasks(t *testing.T) {
	m := setupMartini()

	config, err := readConfigurationFile(configFile)
	if err != nil {
		t.Fatal(err)
	}
	tasksFromFile, err := todo.LoadFromFilename(config.TodoTxtFilename)
	if err != nil {
		t.Fatal(err)
	}
	Expect(t, len(tasksFromFile), 9)

	if _, err := tasksFromFile.GetTask(5); err != nil {
		t.Fatal(err)
	}

	// ---------------------------------------------------------------------------
	// delete completed task / clear tasklist
	response := httptest.NewRecorder()
	req, err := http.NewRequest("DELETE", "http://localhost:4005/api/tasks", nil)
	if err != nil {
		t.Fatal(err)
	}

	m.ServeHTTP(response, req)
	Expect(t, response.Code, http.StatusOK)

	body := response.Body.String()
	Contain(t, body, `"Original": "2013-02-22 Pick up milk @GroceryStore",`)

	if err := tasksFromFile.LoadFromFilename(config.TodoTxtFilename); err != nil {
		t.Fatal(err)
	}
	Expect(t, len(tasksFromFile), 6)

	// ---------------------------------------------------------------------------
	// try to delete completed task / clear tasklist, where there are only open tasks left
	response = httptest.NewRecorder()
	req, err = http.NewRequest("DELETE", "http://localhost:4005/api/tasks", nil)
	if err != nil {
		t.Fatal(err)
	}

	m.ServeHTTP(response, req)
	Expect(t, response.Code, http.StatusOK)

	body = response.Body.String()
	Contain(t, body, `(F) 2014-02-01 Call dry cleaner @Home due:2014-02-19`)

	if err := tasksFromFile.LoadFromFilename(config.TodoTxtFilename); err != nil {
		t.Fatal(err)
	}
	Expect(t, len(tasksFromFile), 6)
}

func Test_todoapp_api_GetConfig(t *testing.T) {
	m := setupMartini()

	// ---------------------------------------------------------------------------
	// get config
	response := httptest.NewRecorder()
	req, err := http.NewRequest("GET", "http://localhost:4005/api/config", nil)
	if err != nil {
		t.Fatal(err)
	}

	m.ServeHTTP(response, req)
	Expect(t, response.Code, http.StatusOK)

	body := response.Body.String()
	Contain(t, body, `"TodoTxtFilename": "testdata/todo.txt",`)

	var config Config
	if err := json.Unmarshal([]byte(body), &config); err != nil {
		t.Fatal(err)
	}
	Expect(t, config.TodoTxtFilename, "testdata/todo.txt")
	Expect(t, config.SortOrder, []string{"-DueDate", "Priority", "Todo"})
	Expect(t, config.DeleteWarning, false)
	Expect(t, config.ClearWarning, false)
}

func Test_todoapp_api_PutConfig(t *testing.T) {
	m := setupMartini()

	config, err := readConfigurationFile(configFile)
	if err != nil {
		t.Fatal(err)
	}
	Expect(t, config.TodoTxtFilename, "testdata/todo.txt")
	Expect(t, config.SortOrder, []string{"-DueDate", "Priority", "Todo"})
	Expect(t, config.DeleteWarning, false)
	Expect(t, config.ClearWarning, false)

	config.TodoTxtFilename = "junk!"
	config.DeleteWarning = true
	config.SortOrder = []string{"Something", "Else", "Entirely"}
	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		t.Fatal(err)
	}
	var formBuffer bytes.Buffer
	formBuffer.Write(data)

	// ---------------------------------------------------------------------------
	// update config
	response := httptest.NewRecorder()
	req, err := http.NewRequest("PUT", "http://localhost:4005/api/config", &formBuffer)
	if err != nil {
		t.Fatal(err)
	}

	m.ServeHTTP(response, req)
	Expect(t, response.Code, http.StatusOK)

	body := response.Body.String()
	Expect(t, body, string(data))

	var config1 Config
	if err := json.Unmarshal([]byte(body), &config1); err != nil {
		t.Fatal(err)
	}
	Expect(t, config1.TodoTxtFilename, "junk!")
	Expect(t, config1.SortOrder, []string{"Something", "Else", "Entirely"})
	Expect(t, config1.DeleteWarning, true)
	Expect(t, config1.ClearWarning, false)

	config2, err := readConfigurationFile(configFile)
	if err != nil {
		t.Fatal(err)
	}
	Expect(t, config2.TodoTxtFilename, "junk!")
	Expect(t, config2.SortOrder, []string{"Something", "Else", "Entirely"})
	Expect(t, config2.DeleteWarning, true)
	Expect(t, config2.ClearWarning, false)
}

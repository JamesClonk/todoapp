package main

import (
	"bytes"
	"encoding/json"
	todo "github.com/JamesClonk/go-todotxt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"
)

func init() {
	// Port during tests
	os.Setenv("PORT", "3003")

	// Test file setup
	todotxtTest := "testdata/test.txt"
	todotxtFile = "testdata/todo.txt"
	os.Remove(todotxtFile)

	input, err := os.Open(todotxtTest)
	if err != nil {
		panic(err)
	}
	defer input.Close()

	output, err := os.Create(todotxtFile)
	if err != nil {
		panic(err)
	}
	defer output.Close()

	_, err = io.Copy(output, input)
	if err != nil {
		panic(err)
	}
}

func Test_todoapp_404(t *testing.T) {
	m := setupMartini()

	response := httptest.NewRecorder()
	req, err := http.NewRequest("GET", "http://localhost:3003/unknown", nil)
	if err != nil {
		t.Fatal(err)
	}

	m.ServeHTTP(response, req)
	Expect(t, response.Code, http.StatusNotFound)

	body := response.Body.String()
	Contain(t, body, `<h1>404 - Not Found</h1>`)
	Contain(t, body, `<h5>This is not the page you are looking for..</h5>`)
}

func Test_todoapp_api_GetTasks(t *testing.T) {
	m := setupMartini()

	response := httptest.NewRecorder()
	req, err := http.NewRequest("GET", "http://localhost:3003/api/tasks", nil)
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

	tasksFromFile, err := todo.LoadFromFilename(todotxtFile)
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
	req, err := http.NewRequest("GET", "http://localhost:3003/api/task/4", nil)
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

	tasksFromFile, err := todo.LoadFromFilename(todotxtFile)
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
	req, err = http.NewRequest("GET", "http://localhost:3003/api/task/11", nil)
	if err != nil {
		t.Fatal(err)
	}

	m.ServeHTTP(response, req)
	Expect(t, response.Code, http.StatusInternalServerError)
}

func Test_todoapp_api_PostTask(t *testing.T) {
	m := setupMartini()

	tasksFromFile, err := todo.LoadFromFilename(todotxtFile)
	if err != nil {
		t.Fatal(err)
	}
	Expect(t, len(tasksFromFile), 9)

	task, err := todo.ParseTask("(F) Call dry cleaner @Home due:2014-02-19")
	if err != nil {
		t.Fatal(err)
	}

	data, err := json.Marshal(task)
	if err != nil {
		t.Fatal(err)
	}
	var formBuffer bytes.Buffer
	formBuffer.Write(data)

	// ---------------------------------------------------------------------------
	// create new task
	response := httptest.NewRecorder()
	req, err := http.NewRequest("POST", "http://localhost:3003/api/task", &formBuffer)
	if err != nil {
		t.Fatal(err)
	}

	m.ServeHTTP(response, req)
	Expect(t, response.Code, http.StatusOK)

	body := response.Body.String()
	Contain(t, body, `"Response": "Task created"`)

	if err := tasksFromFile.LoadFromFilename(todotxtFile); err != nil {
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
	req, err = http.NewRequest("POST", "http://localhost:3003/api/task", &formBuffer)
	if err != nil {
		t.Fatal(err)
	}

	m.ServeHTTP(response, req)
	Expect(t, response.Code, http.StatusBadRequest)
}

func Test_todoapp_api_PutTask(t *testing.T) {
	m := setupMartini()

	tasksFromFile, err := todo.LoadFromFilename(todotxtFile)
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

	data, err := json.Marshal(task)
	if err != nil {
		t.Fatal(err)
	}
	var formBuffer bytes.Buffer
	formBuffer.Write(data)

	// ---------------------------------------------------------------------------
	// update existing task
	response := httptest.NewRecorder()
	req, err := http.NewRequest("PUT", "http://localhost:3003/api/task/6", &formBuffer)
	if err != nil {
		t.Fatal(err)
	}

	m.ServeHTTP(response, req)
	Expect(t, response.Code, http.StatusOK)

	body := response.Body.String()
	Contain(t, body, `"Response": "Task updated"`)

	if err := tasksFromFile.LoadFromFilename(todotxtFile); err != nil {
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
	req, err = http.NewRequest("PUT", "http://localhost:3003/api/task/17", &formBuffer)
	if err != nil {
		t.Fatal(err)
	}

	m.ServeHTTP(response, req)
	Expect(t, response.Code, http.StatusInternalServerError)
}

func Test_todoapp_api_DeleteTask(t *testing.T) {
	m := setupMartini()

	tasksFromFile, err := todo.LoadFromFilename(todotxtFile)
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
	req, err := http.NewRequest("DELETE", "http://localhost:3003/api/task/5", nil)
	if err != nil {
		t.Fatal(err)
	}

	m.ServeHTTP(response, req)
	Expect(t, response.Code, http.StatusOK)

	body := response.Body.String()
	Contain(t, body, `"Response": "Task deleted"`)

	if err := tasksFromFile.LoadFromFilename(todotxtFile); err != nil {
		t.Fatal(err)
	}
	Expect(t, len(tasksFromFile), 9)

	// ---------------------------------------------------------------------------
	// try to delete non-existing task
	response = httptest.NewRecorder()
	req, err = http.NewRequest("DELETE", "http://localhost:3003/api/task/15", nil)
	if err != nil {
		t.Fatal(err)
	}

	m.ServeHTTP(response, req)
	Expect(t, response.Code, http.StatusInternalServerError)
}
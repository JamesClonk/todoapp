package main

import (
	"reflect"
	"strings"
	"testing"
)

func Fail(t *testing.T, expected interface{}) {
	t.Errorf("Expected [%v] (type %v)", expected, reflect.TypeOf(expected))
}

func Expect(t *testing.T, got interface{}, expected interface{}) {
	if !reflect.DeepEqual(expected, got) {
		t.Errorf("Expected [%v] (type %v), but got [%v] (type %v)", expected, reflect.TypeOf(expected), got, reflect.TypeOf(got))
	}
}

func Contain(t *testing.T, body string, expected string) {
	if !strings.Contains(body, expected) {
		t.Errorf("Expected body to contain [%v]", expected)
	}
}

func Refute(t *testing.T, got interface{}, expected interface{}) {
	if expected != got {
		t.Errorf("Did not expect %v (type %v) - Got %v (type %v)", expected, reflect.TypeOf(expected), got, reflect.TypeOf(got))
	}
}

func Contains(t *testing.T, got []interface{}, expected interface{}) {
	for i := range got {
		if reflect.DeepEqual(got[i], expected) {
			return
		}
	}
	t.Errorf("Expected slice to contain [%v]", expected)
}

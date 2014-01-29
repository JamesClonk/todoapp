/* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package main

import (
	"os"
	"testing"
)

func init() {
	// Test file setup
	configFile = "testdata/test.config"
}

func Test_config_readConfigurationFile(t *testing.T) {
	defer os.Remove("testdata/config.test")

	config, err := readConfigurationFile("testdata/config.test")
	if err != nil {
		t.Fatal(err)
	}
	// should be defaults, since file didn't exist
	Expect(t, config.TodoTxtFilename, "todo.txt")
	Expect(t, config.SortOrder, []string{"Priority", "-DueDate", "Todo"})
	Expect(t, config.DeleteWarning, true)
	Expect(t, config.ClearWarning, true)

	// now read an existing config file with different settings
	config, err = readConfigurationFile("testdata/test.config")
	if err != nil {
		t.Fatal(err)
	}
	Expect(t, config.TodoTxtFilename, "testdata/todo.txt")
	Expect(t, config.SortOrder, []string{"-DueDate", "Priority", "Todo"})
	Expect(t, config.DeleteWarning, false)
	Expect(t, config.ClearWarning, false)
}

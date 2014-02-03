/* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package main

import (
	"encoding/json"
	"io/ioutil"
	"os"
)

type Config struct {
	TodoTxtFilename string
	SortOrder       []string
	DeleteWarning   bool
	ClearWarning    bool
	Colors          map[string]string
}

func newConfig() *Config {
	config := &Config{}
	// defaults
	config.TodoTxtFilename = "todo.txt"
	config.SortOrder = []string{"Priority", "-DueDate", "Todo"}
	config.DeleteWarning = true
	config.ClearWarning = true
	config.Colors = map[string]string{
		"PriorityA": "#cc0000",
		"PriorityB": "#ee9900",
		"PriorityC": "#eeee00",
		"PriorityD": "#3366ff",
		"PriorityE": "#33cc33",
		"PriorityF": "#cccccc",
	}
	return config
}

func readConfigurationFile(filename string) (*Config, error) {
	config := newConfig()

	// create new default config file if not exists
	if _, err := os.Stat(filename); os.IsNotExist(err) {
		bytes, err := json.MarshalIndent(config, "", "  ")
		if err != nil {
			return nil, err
		}
		if err := ioutil.WriteFile(filename, bytes, 0640); err != nil {
			return nil, err
		}
	}

	bytes, err := ioutil.ReadFile(filename)
	if err != nil {
		return nil, err
	}

	if err := json.Unmarshal(bytes, &config); err != nil {
		return nil, err
	}

	return config, err
}

func (config *Config) writeConfigurationFile(filename string) error {
	bytes, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return err
	}
	if err := ioutil.WriteFile(filename, bytes, 0640); err != nil {
		return err
	}
	return nil
}

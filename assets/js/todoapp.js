/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var todoapp = angular.module('todoapp', [
	'ngRoute',
	'ui.bootstrap',
	'todoappControllers'
]);

// routing
todoapp.config(['$routeProvider',
	function($routeProvider) {
		$routeProvider.
		when('/tasks', {
			templateUrl: '/html/tasks.html',
			controller: 'tasklistCtrl'
		}).
		when('/task/:taskId', {
			templateUrl: '/html/task.html',
			controller: 'taskCtrl'
		}).
		when('/settings', {
			templateUrl: '/html/settings.html',
			controller: 'settingsCtrl'
		}).
		otherwise({
			redirectTo: '/tasks'
		});
	}
]);

// alert service
todoapp.factory('Alerts', function() {
	var service = {};

	service.alerts = [];

	service.addAlert = function(type, message) {
		service.alerts.push({
			Type: type,
			Message: message
		});
	};

	service.CloseAlert = function(index) {
		service.alerts.splice(index, 1);
	};

	return service;
});

// data sharing service
todoapp.factory('DataStore', ['$location',
	function($location) {
		var service = {};

		service.contexts = {};
		service.projects = {};
		service.filtergroup = null;
		service.query = {
			"Query": ""
		};
		service.tab = {
			"Active": "Tasks"
		}

		service.Goto = function(path) {
			service.UpdateTab(path);
			$location.path(path);
		};

		service.UpdateQuery = function(query) {
			service.query.Query = query;
		};

		service.UpdateTab = function(path) {
			service.tab.Active = "Tasks";
			if (path == "/settings" || path.substr(0, 4) == "/doc") {
				service.tab.Active = "Tools";
			}
		};

		service.LoadBadges = function(tasklist) {
			var contexts = {};
			var projects = {};
			for (var i = 0; i < tasklist.length; i++) {
				if (tasklist[i].Contexts != null) {
					for (var c = 0; c < tasklist[i].Contexts.length; c++) {
						if (contexts[tasklist[i].Contexts[c]] == null) {
							contexts[tasklist[i].Contexts[c]] = 0;
						}
						contexts[tasklist[i].Contexts[c]] += 1;
					}
				}
				if (tasklist[i].Projects != null) {
					for (var p = 0; p < tasklist[i].Projects.length; p++) {
						if (projects[tasklist[i].Projects[p]] == null) {
							projects[tasklist[i].Projects[p]] = 0;
						}
						projects[tasklist[i].Projects[p]] += 1;
					}
				}
			}
			service.contexts = contexts;
			service.projects = projects;
		};

		service.SetFilterGroup = function(type, group) {
			service.filtergroup = {};
			if (type != null && type == "Context") {
				service.filtergroup["Context"] = group;
			} else if (type != null && type == "Project") {
				service.filtergroup["Project"] = group;
			} else {
				service.filtergroup = null;
			}
		};

		return service;
	}
]);

// tasklist / API service
todoapp.factory('API', ['$http', 'Alerts',
	function($http, Alerts) {
		var service = {};

		service.tasklist = [];
		service.task = null;

		service.LoadTasklist = function(callback) {
			$http.get('/api/tasks').success(function(data) {
				service.tasklist = data;
				callback();
			}).error(function(data, status, headers, config) {
				Alerts.addAlert("danger", 'Tasklist could not be loaded. [HTTP Status Code: ' + status + ']');
			});
		};

		service.GetTask = function(id) {
			service.task = null;
			for (var i = 0; i < service.tasklist.length; i++) {
				if (service.tasklist[i].Id == id) {
					service.task = service.tasklist[i];
					return service.task;
				}
			}
		};

		service.LoadTask = function(id) {
			$http.get('/api/task/' + id).success(function(task) {
				service.task = task;
			}).error(function(data, status, headers, config) {
				service.task = null;
				Alerts.addAlert("danger", 'Task could not be loaded. [HTTP Status Code: ' + status + ']');
			});
		};

		service.AddTask = function(task) {
			$http.post('/api/task', service.dateValidation(task)).success(function(newTask) {
				if (newTask.Id != 0) {
					service.tasklist.push(newTask);
				} else {
					Alerts.addAlert("danger", 'Task could not be added, since API did not return a correct Task.ID');
				}
			}).error(function(data, status, headers, config) {
				Alerts.addAlert("danger", 'Task could not be added. [HTTP Status Code: ' + status + ']');
			});
		};

		service.ToggleTaskCompletion = function(task) {
			task.Completed = !task.Completed
			if (task.Completed) {
				task.CompletedDate = new Date();
			} else {
				task.CompletedDate = new Date("0001-01-01T00:00:00Z"); // golang zero time
			}

			$http.put('/api/task/' + task.Id, service.dateValidation(task)).success(function() {
				service.modifyTask(task);
			}).error(function(data, status, headers, config) {
				Alerts.addAlert("danger", 'Task completion status could not be switched: ' + status + ']');
			});
		};

		service.modifyTask = function(task) {
			for (var i = 0; i < service.tasklist.length; i++) {
				if (service.tasklist[i].Id == task.Id) {
					service.tasklist[i] = task;
					break;
				}
			}
		};

		service.dateValidation = function(task) {
			if (task.CreatedDate == null) {
				task.CreatedDate = new Date("0001-01-01T00:00:00Z"); // golang zero time
			}
			if (task.CompletedDate == null) {
				task.CompletedDate = new Date("0001-01-01T00:00:00Z"); // golang zero time
			}
			if (task.DueDate == null) {
				task.DueDate = new Date("0001-01-01T00:00:00Z"); // golang zero time
			}
			return task;
		};

		service.UpdateTask = function(task, callback) {
			$http.put('/api/task/' + task.Id, service.dateValidation(task)).success(function() {
				service.modifyTask(task);
				callback();
			}).error(function(data, status, headers, config) {
				Alerts.addAlert("danger", 'Task could not be updated. [HTTP Status Code: ' + status + ']');
			});
		};

		service.removeTaskById = function(taskId) {
			for (var i = 0; i < service.tasklist.length; i++) {
				if (service.tasklist[i].Id == taskId) {
					service.tasklist.splice(i, 1);
					break;
				}
			}
		}

		service.DeleteTask = function(task) {
			$http.delete('/api/task/' + task.Id).success(function() {
				service.removeTaskById(task.Id);
			}).error(function(data, status, headers, config) {
				Alerts.addAlert("danger", 'Task could not be deleted. [HTTP Status Code: ' + status + ']');
			});
		};

		service.nextTaskId = function() {
			var maxId = 0;
			angular.forEach(service.tasklist, function(task) {
				if (task.Id > maxId) {
					maxId = task.Id;
				}
			});
			return maxId + 1;
		};

		return service;
	}
]);
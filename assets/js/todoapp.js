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
		when('/doc/user', {
			templateUrl: '/html/manual.html'
		}).
		when('/doc/api', {
			templateUrl: '/html/api.html'
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
todoapp.factory('API', ['$http', '$location', 'Alerts',
	function($http, $location, Alerts) {
		var service = {};

		service.tasklist = [];
		service.task = null;

		service.mapPriority = function(priority) {
			if (priority != "") {
				return priority;
			}
			return "XYZ";
		}

		service.mapDueDate = function(dueDate) {
			if (moment(dueDate).year() > 1) {
				return moment(dueDate);
			}
			// seems far enough into the future to be on the safe side..
			return moment("9999-01-01");
		}

		service.DefaultSortTasklist = function(data) {
			data.sort(function(a, b) {
				return service.mapPriority(a.Priority) > service.mapPriority(b.Priority) ||
					(service.mapPriority(a.Priority) == service.mapPriority(b.Priority) && service.mapDueDate(a.DueDate) > service.mapDueDate(b.DueDate));
			});
		};

		service.LoadTasklist = function(callback) {
			$http.get('/api/tasks').success(function(data) {
				service.DefaultSortTasklist(data);
				service.tasklist = data;
				if (callback) {
					callback();
				}
			}).error(function(data, status, headers, config) {
				Alerts.addAlert("danger", 'Tasklist could not be loaded. [HTTP Status Code: ' + status + ']');
			});
		};

		service.ClearTasklist = function(callback) {
			$http.delete('/api/tasks').success(function(data) {
				service.DefaultSortTasklist(data);
				service.tasklist = data;
				if (callback) {
					callback();
				}
			}).error(function(data, status, headers, config) {
				Alerts.addAlert("danger", 'Tasklist could not be cleared. [HTTP Status Code: ' + status + ']');
			});
		};

		service.GetTask = function(id) {
			service.task = null;

			// check if new task should be created and returned
			if (id == "new") {
				service.task = {
					"CreatedDate": new Date()
				};
				return service.task;
			}

			for (var i = 0; i < service.tasklist.length; i++) {
				if (service.tasklist[i].Id == id) {
					service.task = service.tasklist[i];
					return service.task;
				}
			}

			Alerts.addAlert("danger", 'Could not get Task. [Id: ' + id + ']');
		};

		service.LoadTask = function(id) {
			$http.get('/api/task/' + id).success(function(task) {
				service.task = task;
			}).error(function(data, status, headers, config) {
				service.task = null;
				Alerts.addAlert("danger", 'Task could not be loaded. [HTTP Status Code: ' + status + ']');
			});
		};

		service.AddTask = function(task, callback) {
			$http.post('/api/task', service.dateValidation(task)).success(function(newTask) {
				if (newTask.Id != 0) {
					service.tasklist.push(newTask);
					if (callback) {
						callback();
					}
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
				if (callback) {
					callback();
				}
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
				//service.removeTaskById(task.Id);
				// have to refresh tasklist from API after delete, because of possible Task.Id changes / ordering
				service.LoadTasklist(function() {
					$location.path("/");
				});
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
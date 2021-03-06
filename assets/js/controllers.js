/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var todoappControllers = angular.module('todoappControllers', []);


// main controller
todoappControllers.controller('todoappCtrl', ['$scope', '$location', 'DataStore',
	function($scope, $location, DataStore) {
		$scope.Goto = function(path) {
			DataStore.Goto(path);
		};
	}
]);


// alert controller
todoappControllers.controller('alertCtrl', ['$scope', 'Alerts',
	function($scope, Alerts) {
		$scope.alerts = Alerts.alerts;

		$scope.CloseAlert = function(index) {
			Alerts.CloseAlert(index);
		};
	}
]);

// controller for navbar
todoappControllers.controller('navbarCtrl', ['$scope', '$modal', 'API', 'DataStore',
	function($scope, $modal, API, DataStore) {
		$scope.count = API.tasklist.length;
		$scope.contexts = DataStore.contexts;
		$scope.projects = DataStore.projects;
		$scope.query = "";
		$scope.ActiveTab = DataStore.tab;

		$scope.UpdateQuery = function() {
			DataStore.UpdateQuery($scope.query);
		}

		$scope.LoadBadges = function() {
			DataStore.LoadBadges(API.tasklist);
			$scope.count = API.tasklist.length;
			$scope.contexts = DataStore.contexts;
			$scope.projects = DataStore.projects;
		};

		$scope.ResetFilterGroup = function(group) {
			DataStore.filtergroup = null;
			DataStore.Goto("/tasks");
		};

		$scope.ReloadTasklist = function() {
			API.LoadTasklist(function() {
				DataStore.Goto("/"); // causes a redirect and forces view to update
			});
		};

		$scope.DefaultSortTasklist = function() {
			API.DefaultSortTasklist(API.tasklist);
			DataStore.Goto("/"); // causes a redirect and forces view to update
		};

		$scope.ClearTasklist = function() {
			if (API.config.ClearWarning == false) {
				API.ClearTasklist(function() {
					DataStore.Goto("/"); // causes a redirect and forces view to update
				});
			} else {
				var modalInstance = $modal.open({
					templateUrl: 'modalClear.html',
					controller: modalInstanceCtrl
				});
				modalInstance.result.then(function() {
					API.ClearTasklist(function() {
						DataStore.Goto("/"); // causes a redirect and forces view to update
					});
				}, function() {});
			}
		};
	}
]);


// controller for settings
todoappControllers.controller('settingsCtrl', ['$scope', '$http', '$location', 'Alerts', 'API',
	function($scope, $http, $location, Alerts, API) {
		$scope.config = API.config;

		$scope.CancelSettings = function() {
			API.LoadConfig(function() {
				$scope.config = API.config;
				$location.path("/");
			});
		}

		$scope.ReloadSettings = function() {
			API.LoadConfig(function() {
				$scope.config = API.config;
				$location.path("/settings");
			});
		}

		$scope.ResetSettings = function() {
			$scope.config.TodoTxtFilename = "todo.txt";
			$scope.config.DeleteWarning = true;
			$scope.config.ClearWarning = true;
			$scope.config.Colors = {
				"PriorityA": "#cc0000",
				"PriorityB": "#ee9900",
				"PriorityC": "#eeee00",
				"PriorityD": "#3366ff",
				"PriorityE": "#33cc33",
				"PriorityF": "#cccccc",
			};
			$scope.UpdateConfig();
		}

		$scope.UpdateConfig = function() {
			API.UpdateConfig($scope.config);
			API.LoadTasklist(function() {
				$location.path("/settings");
			});
		}
	}
]);


// controller for list of tasks
todoappControllers.controller('tasklistCtrl', ['$scope', '$http', '$modal', '$location', 'Alerts', 'API', 'DataStore',
	function($scope, $http, $modal, $location, Alerts, API, DataStore) {
		$scope.predicate = 'Priority';
		$scope.tasklist = API.tasklist;
		$scope.query = DataStore.query;

		$scope.GetTaskColor = function(priority) {
			if (priority != "A" && priority != "B" && priority != "C" && priority != "D" && priority != "E") {
				priority = "F";
			}
			if (API.config.Colors) {
				var key = "Priority" + priority;
				if (key in API.config.Colors) {
					return API.config.Colors[key];
				}
			}
			return "#cccccc";
		}

		$scope.ToggleTaskCompletion = function(task) {
			API.ToggleTaskCompletion(task);
		};

		$scope.LoadTasklist = function() {
			API.LoadTasklist();
		};

		$scope.AddTask = function() {
			API.AddTask($scope.task);
			$scope.task = {};
		};

		$scope.DeleteTask = function(task) {
			if (API.config.DeleteWarning == false) {
				API.DeleteTask(task);
			} else {
				var modalInstance = $modal.open({
					templateUrl: 'modalDelete.html',
					controller: modalInstanceCtrl
				});
				modalInstance.result.then(function() {
					API.DeleteTask(task);
				}, function() {});
			}
		};

		// custom sort predicate function needed to deal with "empty" priorities and due dates
		$scope.SortByPredicate = function(task) {
			if ($scope.predicate == "DueDate") {
				return API.mapDueDate(task.DueDate)
			} else if ($scope.predicate == "Priority") {
				return API.mapPriority(task.Priority)
			} else {
				return task[$scope.predicate];
			}
		}
	}
]);


// controller for single task
todoappControllers.controller('taskCtrl', ['$scope', '$http', '$routeParams', '$location', 'Alerts', 'API',
	function($scope, $http, $routeParams, $location, Alerts, API) {
		$scope.taskId = $routeParams.taskId;

		$scope.datepickerOpened = false;
		$scope.datepickerFormat = 'yyyy-MM-dd';

		$scope.dateOptions = {
			'starting-day': 1
		};

		$scope.priorities = [{
			"priority": 'A'
		}, {
			"priority": 'B'
		}, {
			"priority": 'C'
		}, {
			"priority": 'D'
		}, {
			"priority": 'E'
		}, {
			"priority": 'F'
		}];

		$scope.openDatepicker = function($event) {
			$event.preventDefault();
			$event.stopPropagation();
			$scope.datepickerOpened = true;
		};

		$scope.loadTask = function() {
			// need to create a copy of task, we don't want to modify the referenced original inside the tasklist
			$scope.task = JSON.parse(JSON.stringify(API.GetTask($scope.taskId)));

			// golang zero time
			if ((new Date($scope.task.DueDate)).getFullYear() <= 1901) {
				$scope.task.DueDate = null;
			}

			// stringify context and project arrays
			if ($scope.task.Contexts != null) {
				$scope.task.Contexts = $scope.task.Contexts.join(", ");
			}
			if ($scope.task.Projects != null) {
				$scope.task.Projects = $scope.task.Projects.join(", ");
			}

			for (var p in $scope.priorities) {
				if ($scope.task.Priority == $scope.priorities[p].priority) {
					$scope.task.Priority = $scope.priorities[p];
				}
			}
		};

		$scope.trimList = function(list) {
			for (var i = 0; i < list.length; i++) {
				list[i] = list[i].trim();
			}
			return list;
		}

		$scope.UpdateTask = function() {
			// create a copy of task again to avoid confusing the datepicker because of date validation code inside API.UpdateTask
			var task = JSON.parse(JSON.stringify($scope.task));

			if (task.Priority != null) {
				task.Priority = task.Priority.priority;
			} else {
				task.Priority = "";
			}

			// arrayify context and project strings
			if (task.Contexts != null) {
				task.Contexts = $scope.trimList(task.Contexts.split(","));
			}
			if (task.Projects != null) {
				task.Projects = $scope.trimList(task.Projects.split(","));
			}

			// insert or update, decide based on taskId routing parameter
			if ($scope.taskId == "new") {
				API.AddTask(task, function() {
					$location.path("/tasks");
				});
			} else {
				API.UpdateTask(task, function() {
					$location.path("/tasks");
				});
			}
		};

		$scope.loadTask();
	}
]);

var modalInstanceCtrl = function($scope, $modalInstance) {
	$scope.ok = function() {
		$modalInstance.close();
	};
	$scope.cancel = function() {
		$modalInstance.dismiss('cancel');
	};
};
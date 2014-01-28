/* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var todoappControllers = angular.module('todoappControllers', []);


// controller for list of tasks
todoappControllers.controller('tasklistCtrl', ['$scope', '$http', '$location', function ($scope, $http, $location) {
	$scope.predicate = 'Priority';

	$scope.toggleTaskCompletion = function(task) {
		task.Completed = !task.Completed
		if (task.Completed) {
			task.CompletedDate = new Date();
		} else {
			task.CompletedDate = new Date(0);
		}
		$http.put('/api/task/'+task.Id, task).success(function() {
			$location.path("/tasks");
		});
		$scope.loadTasklist();
	};

	$scope.loadTasklist = function() {
		$http.get('/api/tasks').success(function(data) {
			$scope.tasklist = data;
		});
	};

	$scope.nextTaskId = function() {
		var maxId = 0;
		angular.forEach($scope.tasklist, function(task) {
			if(task.Id > maxId) {
				maxId = task.Id;
			}
		});
		return maxId + 1;
	};

	$scope.addTask = function() {
		$http.post('/api/task', $scope.task).success(function() {
			$scope.task.Priority = '';
			$scope.task.Todo = '';

			$scope.loadTasklist();
			$location.path("/tasks");
		});
	};

	// custom sort predicate function needed to deal with "empty" priorities and due dates
	$scope.sortByPredicate = function(task) {
		if ($scope.predicate == "DueDate") {
			if (moment(task.DueDate).year() > 1) {
				return moment(task.DueDate);
			}
			// seems far enough into the future to be on the safe side..
			return moment("3333-01-01");
		}
		else if ($scope.predicate == "Priority") {
			if (task.Priority != "") {
				return task.Priority;
			}
			return "XYZ";
		}
		else {
			return task[$scope.predicate];
		}
	}

	$scope.loadTasklist();
}]);


// controller for single task
todoappControllers.controller('taskCtrl', ['$scope', '$http', '$routeParams', '$location',  function($scope, $http, $routeParams, $location) {
	$scope.taskId = $routeParams.taskId;

	$scope.loadTask = function() {
		$http.get('/api/task/'+$scope.taskId).success(function(data) {
			$scope.task = data;
		});
	};

	$scope.updateTask = function updateTask() {
		$http.put('/api/task/'+$scope.taskId, $scope.task).success(function() {
			$location.path("/tasks");
		});
	};

	$scope.loadTask();
}]);

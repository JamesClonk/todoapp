/* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var todoappControllers = angular.module('todoappControllers', []);


// controller for list of tasks
todoappControllers.controller('tasklistCtrl', ['$scope', '$http', '$location', function ($scope, $http, $location) {
	$scope.sortOrdering = '';
	$scope.sortField = 'Priority';

	$scope.toggleTaskCompletion = function(id) {
		angular.forEach($scope.tasklist, function(task, key){
			if(task.Id == id) {
				task.Completed = !task.Completed
			}
		});
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


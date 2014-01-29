/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var todoappControllers = angular.module('todoappControllers', []);


// main controller
todoappControllers.controller('todoappCtrl', ['$scope', '$http', '$location',
    function($scope, $http, $location) {
        $scope.reloadTasklist = function() {
            $location.path("/");
        };
    }
]);


// controller for list of tasks
todoappControllers.controller('tasklistCtrl', ['$scope', '$http', '$location',
    function($scope, $http, $location) {
        $scope.predicate = 'Priority';

        $scope.showError = function(message) {
            $scope.ErrorMessage = message;
            $scope.ErrorActive = true;
        };

        $scope.updateTask = function(task) {
            for (var i = 0; i < $scope.tasklist.length; i++) {
                if ($scope.tasklist[i].Id == task.Id) {
                    $scope.tasklist[i] = task;
                    break;
                }
            }
        }

        $scope.toggleTaskCompletion = function(task) {
            task.Completed = !task.Completed
            if (task.Completed) {
                task.CompletedDate = new Date();
            } else {
                task.CompletedDate = new Date("0001-01-01T00:00:00Z"); // golang zero time
            }

            $http.put('/api/task/' + task.Id, task).success(function() {
                //$scope.loadTasklist();
                // it's faster to just locally update the task in the list, rather than reloading the entire list again
                $scope.updateTask(task);
            }).error(function(data, status, headers, config) {
                console.log('Task completion status could not be switched: ', data, status, headers, config)
                $scope.showError('Task completion status could not be switched: ' + status + ']');
            });
        };

        $scope.loadTasklist = function() {
            $http.get('/api/tasks').success(function(data) {
                $scope.tasklist = data;
            }).error(function(data, status, headers, config) {
                console.log('Tasklist could not be loaded: ', data, status, headers, config)
                $scope.showError('Tasklist could not be loaded. [HTTP Status Code: ' + status + ']');
            });
        };

        $scope.nextTaskId = function() {
            var maxId = 0;
            angular.forEach($scope.tasklist, function(task) {
                if (task.Id > maxId) {
                    maxId = task.Id;
                }
            });
            return maxId + 1;
        };

        $scope.addTask = function() {
            $http.post('/api/task', $scope.task).success(function(newTask) {
                $scope.task.Priority = '';
                $scope.task.Todo = '';

                //$scope.loadTasklist();
                // it's faster to just locally add the new task (response from POST request) to the list, rather than reloading the entire list again
                if (newTask.Id != 0) {
                    $scope.tasklist.push(newTask);
                } else {
                    $scope.showError('Task could not be added, since API did not return a correct Task.ID');
                }
            }).error(function(data, status, headers, config) {
                console.log('Task could not be added: ', data, status, headers, config)
                $scope.showError('Task could not be added. [HTTP Status Code: ' + status + ']');
            });
        };

        $scope.removeTaskById = function(taskId) {
            for (var i = 0; i < $scope.tasklist.length; i++) {
                if ($scope.tasklist[i].Id == taskId) {
                    $scope.tasklist.splice(i, 1);
                    break;
                }
            }
        }

        $scope.deleteTask = function(task) {
            $http.delete('/api/task/' + task.Id).success(function() {
                //$scope.loadTasklist();
                // it's faster to just locally remove the task from the list, rather than reloading the entire list again
                $scope.removeTaskById(task.Id);
            }).error(function(data, status, headers, config) {
                console.log('Task could not be deleted: ', data, status, headers, config)
                $scope.showError('Task could not be deleted. [HTTP Status Code: ' + status + ']');
            });
        };

        // custom sort predicate function needed to deal with "empty" priorities and due dates
        $scope.sortByPredicate = function(task) {
            if ($scope.predicate == "DueDate") {
                if (moment(task.DueDate).year() > 1) {
                    return moment(task.DueDate);
                }
                // seems far enough into the future to be on the safe side..
                return moment("9999-01-01");
            } else if ($scope.predicate == "Priority") {
                if (task.Priority != "") {
                    return task.Priority;
                }
                return "XYZ";
            } else {
                return task[$scope.predicate];
            }
        }

        $scope.loadTasklist();
    }
]);


// controller for single task
todoappControllers.controller('taskCtrl', ['$scope', '$http', '$routeParams', '$location',
    function($scope, $http, $routeParams, $location) {
        $scope.taskId = $routeParams.taskId;

        $scope.loadTask = function() {
            $http.get('/api/task/' + $scope.taskId).success(function(data) {
                $scope.task = data;
            }).error(function(data, status, headers, config) {
                console.log('Task could not be loaded: ', data, status, headers, config)
                $scope.showError('Task could not be loaded. [HTTP Status Code: ' + status + ']');
            });
        };

        $scope.updateTask = function updateTask() {
            $http.put('/api/task/' + $scope.taskId, $scope.task).success(function() {
                $location.path("/tasks");
            }).error(function(data, status, headers, config) {
                console.log('Task could not be updated: ', data, status, headers, config)
                $scope.showError('Task could not be updated. [HTTP Status Code: ' + status + ']');
            });
        };

        $scope.loadTask();
    }
]);


// controller for settings
todoappControllers.controller('settingsCtrl', ['$scope', '$http', '$routeParams', '$location',
    function($scope, $http, $routeParams, $location) {}
]);
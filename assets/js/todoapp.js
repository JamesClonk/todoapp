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
todoapp.factory('alertService', function() {
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

// tasklist / API service
todoapp.factory('API', ['$http', 'alertService',
    function($http, alertService) {
        var service = {};

        service.tasklist = [];
        service.task = null;

        service.LoadTasklist = function() {
            $http.get('/api/tasks').success(function(data) {
                service.tasklist = data;
            }).error(function(data, status, headers, config) {
                alertService.addAlert("danger", 'Tasklist could not be loaded. [HTTP Status Code: ' + status + ']');
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
                alertService.addAlert("danger", 'Task could not be loaded. [HTTP Status Code: ' + status + ']');
            });
        };

        service.AddTask = function(task) {
            $http.post('/api/task', task).success(function(newTask) {
                if (newTask.Id != 0) {
                    service.tasklist.push(newTask);
                } else {
                    alertService.addAlert("danger", 'Task could not be added, since API did not return a correct Task.ID');
                }
            }).error(function(data, status, headers, config) {
                alertService.addAlert("danger", 'Task could not be added. [HTTP Status Code: ' + status + ']');
            });
        };

        service.ToggleTaskCompletion = function(task) {
            task.Completed = !task.Completed
            if (task.Completed) {
                task.CompletedDate = new Date();
            } else {
                task.CompletedDate = new Date("0001-01-01T00:00:00Z"); // golang zero time
            }

            $http.put('/api/task/' + task.Id, task).success(function() {
                service.modifyTask(task);
            }).error(function(data, status, headers, config) {
                alertService.addAlert("danger", 'Task completion status could not be switched: ' + status + ']');
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

        service.UpdateTask = function(task, cb) {
            $http.put('/api/task/' + task.Id, task).success(function() {
                service.modifyTask(task);
                cb;
            }).error(function(data, status, headers, config) {
                alertService.addAlert("danger", 'Task could not be updated. [HTTP Status Code: ' + status + ']');
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
                alertService.addAlert("danger", 'Task could not be deleted. [HTTP Status Code: ' + status + ']');
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
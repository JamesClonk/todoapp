/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var todoappControllers = angular.module('todoappControllers', []);


// main controller
todoappControllers.controller('todoappCtrl', ['$scope', '$location',
    function($scope, $location) {
        $scope.ActiveTab = "Tasks";

        $scope.goto = function(path) {
            $scope.ActiveTab = "Tasks";
            if (path == "/settings") {
                $scope.ActiveTab = "Settings";
            }
            $location.path(path);
        };
    }
]);


// alert controller
todoappControllers.controller('alertCtrl', ['$scope', 'alertService',
    function($scope, alertService) {
        $scope.alerts = alertService.alerts;

        $scope.CloseAlert = function(index) {
            alertService.CloseAlert(index);
        };
    }
]);

// contexts & projects controller for navbar
todoappControllers.controller('navbarCtrl', ['$scope', 'tasklistService',
    function($scope, tasklistService) {

    }
]);

// controller for list of tasks
todoappControllers.controller('tasklistCtrl', ['$scope', '$http', '$location', 'alertService', 'API',
    function($scope, $http, $location, alertService, API) {
        $scope.predicate = 'Priority';
        $scope.tasklist = API.tasklist;

        $scope.ToggleTaskCompletion = function(task) {
            API.ToggleTaskCompletion(task);
        };

        $scope.LoadTasklist = function() {
            API.LoadTasklist();
        };

        $scope.AddTask = function() {
            API.AddTask($scope.task);
        };

        $scope.DeleteTask = function(task) {
            API.DeleteTask(task);
        };

        // custom sort predicate function needed to deal with "empty" priorities and due dates
        $scope.SortByPredicate = function(task) {
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
    }
]);


// controller for single task
todoappControllers.controller('taskCtrl', ['$scope', '$http', '$routeParams', '$location', 'alertService', 'API',
    function($scope, $http, $routeParams, $location, alertService, API) {
        $scope.taskId = $routeParams.taskId;

        $scope.loadTask = function() {
            $scope.task = API.GetTask($scope.taskId);
        };

        $scope.UpdateTask = function() {
            API.UpdateTask($scope.task, $location.path("/tasks"));
        };

        $scope.loadTask();
    }
]);


// controller for settings
todoappControllers.controller('settingsCtrl', ['$scope', '$http', '$routeParams', '$location', 'alertService',
    function($scope, $http, $routeParams, $location, alertService) {}
]);
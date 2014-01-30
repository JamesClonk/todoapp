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
todoappControllers.controller('navbarCtrl', ['$scope', 'API', 'DataStore',
    function($scope, API, DataStore) {
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
    }
]);

// controller for list of tasks
todoappControllers.controller('tasklistCtrl', ['$scope', '$http', '$location', 'Alerts', 'API', 'DataStore',
    function($scope, $http, $location, Alerts, API, DataStore) {
        $scope.predicate = 'Priority';
        $scope.tasklist = API.tasklist;
        $scope.query = DataStore.query;

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
todoappControllers.controller('taskCtrl', ['$scope', '$http', '$routeParams', '$location', 'Alerts', 'API',
    function($scope, $http, $routeParams, $location, Alerts, API) {
        $scope.taskId = $routeParams.taskId;

        $scope.loadTask = function() {
            $scope.task = API.GetTask($scope.taskId);
        };

        $scope.UpdateTask = function() {
            API.UpdateTask($scope.task, function() {
                $location.path("/tasks");
            });
        };

        $scope.loadTask();
    }
]);


// controller for settings
todoappControllers.controller('settingsCtrl', ['$scope', '$http', '$routeParams', '$location', 'Alerts',
    function($scope, $http, $routeParams, $location, Alerts) {}
]);
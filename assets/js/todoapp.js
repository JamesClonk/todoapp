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
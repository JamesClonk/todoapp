/* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var todoapp = angular.module('todoapp', [
	'ngRoute',
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
			otherwise({
				redirectTo: '/tasks'
			});
	}
]);


// helpers
todoapp.filter('dueDateFormat', function() {
	return function(date) {
		var mdate = moment(date);
		// too long ago, golang zero time
		if (mdate.year() <= 1) {
			return "";
		}
		return mdate.fromNow();
	}
});

todoapp.filter('dueDateClass', function() {
	return function(date) {
		var mdate = moment(date);

		// red
		if (mdate.isBefore(moment().add('days', 2))) {
			return "red";
		}
		// green
		else if (mdate.isAfter(moment())) {
			return "green";
		}

		return "gray";
	}
});

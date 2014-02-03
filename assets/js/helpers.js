/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// helpers
var dueDateClassHelper = function(date) {
	var dt = new Date(date);
	dt = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
	var now = new Date();
	now = new Date(now.getFullYear(), now.getMonth(), now.getDate());

	// too long ago, probably golang zero time
	if (dt.getFullYear() <= 1901) {
		return "";
	}

	var diff = (dt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
	if (diff <= 1) {
		return "red";
	} else if (diff <= 3) {
		return "orange";
	} else if (diff <= 13) {
		return "green";
	}
	// default
	return "gray";
}

var dateToYYYYMMDD = function dateToYYYYMMDD(date) {
	var d = date.getDate();
	var m = date.getMonth() + 1;
	var y = date.getFullYear();
	return '' + y + '-' + (m <= 9 ? '0' + m : m) + '-' + (d <= 9 ? '0' + d : d);
}

todoapp.run(['$rootScope', '$location', 'API', 'DataStore',
	function($rootScope, $location, API, DataStore) {
		$rootScope.DueDateClass = function(date) {
			return dueDateClassHelper(date);
		}

		$rootScope.SetFilterGroup = function(type, group) {
			if (type == "Context") {
				DataStore.filtergroup = {
					"Context": group
				};
			} else if (type == "Project") {
				DataStore.filtergroup = {
					"Project": group
				};
			} else {
				$scope.ResetFilterGroup();
				return;
			}
			DataStore.Goto("/tasks");
		};

		// load tasklist upon todoapp initialization..
		API.LoadTasklist(function() {
			$location.path("/");
		});
	}
]);

// filters
todoapp.filter('DueDateFormatFilter', function() {
	return function(date) {
		var dt = new Date(date);
		dt = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
		var now = new Date();
		now = new Date(now.getFullYear(), now.getMonth(), now.getDate());

		// too long ago, probably golang zero time
		if (dt.getFullYear() <= 1901) {
			return "";
		}

		var diff = (dt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
		if (diff == 0) {
			return "today";
		} else if (diff == 1) {
			return "tomorrow";
		} else if (diff == -1) {
			return "yesterday";
		} else if (diff > 0 && diff <= 6) {
			return "in " + diff + " days";
		} else if (diff > 6 && diff <= 13) {
			return "in 1 week";
		} else if (diff < 0 && diff >= -6) {
			return Math.abs(diff) + " days ago";
		} else if (diff < -6 && diff >= -10) {
			return "1 week ago";
		}

		return dateToYYYYMMDD(new Date(date));
	}
});

todoapp.filter('DateFormatFilter', function() {
	return function(date) {
		var dt = new Date(date);
		dt = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());

		// too long ago, probably golang zero time
		if (dt.getFullYear() <= 1901) {
			return "";
		}

		return dateToYYYYMMDD(new Date(date));
	}
});

todoapp.filter('DueDateClassFilter', function() {
	return function(date) {
		return dueDateClassHelper(date);
	}
});

todoapp.filter('GroupFilter', ['DataStore',
	function(DataStore) {
		function isEmpty(map) {
			var empty = true;
			for (var key in map) {
				empty = false;
				break;
			}
			return empty;
		}

		return function(tasklist) {
			if (DataStore.filtergroup == null) {
				return tasklist;
			} else {
				var tasks = [];
				if (DataStore.filtergroup["Context"] != null) {
					for (var t = 0; t < tasklist.length; t++) {
						if (tasklist[t].Contexts != null) {
							for (var c = 0; c < tasklist[t].Contexts.length; c++) {
								if (tasklist[t].Contexts[c] == DataStore.filtergroup["Context"]) {
									tasks.push(tasklist[t]);
								}
							}
						}
					}
					return tasks;
				}
				if (DataStore.filtergroup["Project"] != null) {
					for (var t = 0; t < tasklist.length; t++) {
						if (tasklist[t].Projects != null) {
							for (var c = 0; c < tasklist[t].Projects.length; c++) {
								if (tasklist[t].Projects[c] == DataStore.filtergroup["Project"]) {
									tasks.push(tasklist[t]);
								}
							}
						}
					}
				}
				return tasks;
			}
		};
	}
]);
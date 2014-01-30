/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// helpers
var dueDateClassHelper = function(date) {
    var mdate = moment(date);
    // too long ago, golang zero time
    if (mdate.year() <= 1) {
        return "";
    }

    // red
    else if (mdate.isBefore(moment().add('days', 1))) {
        return "red";
    }
    // orange
    else if (mdate.isBefore(moment().add('days', 3))) {
        return "orange";
    }
    // green
    else if (mdate.isBefore(moment().add('days', 13))) {
        return "green";
    }
    // default
    return "gray";
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
            $location.path("/tasks");
        });
    }
]);

// filters
todoapp.filter('DueDateFormatFilter', function() {
    moment.lang('en', {
        relativeTime: {
            future: "in %s",
            past: "%s ago",
            s: "seconds",
            m: "a minute",
            mm: "%d minutes",
            h: "an hour",
            hh: "%d hours",
            d: "a day",
            //dd: "%d days",
            dd: function(number, withoutSuffix, key, isFuture) {
                if (number >= 7 && number <= 13) {
                    return "1 week";
                }
                return number + " days";
            },
            M: "a month",
            MM: "%d months",
            y: "a year",
            yy: "%d years"
        }
    });

    return function(date) {
        var mdate = moment(date).endOf('day');
        // too long ago, golang zero time
        if (mdate.year() <= 1) {
            return "";
        }

        var diff = mdate.diff(moment().endOf('day'), 'days')
        if (diff == 0) {
            return "today"
        } else if (diff == -1) {
            return "yesterday"
        } else if (diff == 1) {
            return "tomorrow"
        }
        return mdate.fromNow();
    }
});

todoapp.filter('DateFormatFilter', function() {
    return function(date) {
        var mdate = moment(date).endOf('day');
        // too long ago, golang zero time
        if (mdate.year() <= 1) {
            return "";
        }
        return mdate.format('YYYY-MM-DD');
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
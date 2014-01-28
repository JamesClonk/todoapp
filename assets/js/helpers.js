/* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// filters
todoapp.filter('dueDateFormat', function() {
	moment.lang('en', {
		relativeTime : {
			future: "in %s",
			past:   "%s ago",
			s:  "seconds",
			m:  "a minute",
			mm: "%d minutes",
			h:  "an hour",
			hh: "%d hours",
			d:  "a day",
			//dd: "%d days",
			dd: function (number, withoutSuffix, key, isFuture) {
					if (number >= 7 && number <= 13) {
						return "1 week";
					}
					return number + " days";
				},
			M:  "a month",
			MM: "%d months",
			y:  "a year",
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
		}
		else if (diff == -1) {
			return "yesterday"
		}
		else if (diff == 1) {
			return "tomorrow"
		}
		return mdate.fromNow();
	}
});

todoapp.filter('dueDateClass', function() {
	return function(date) {
		var mdate = moment(date);
		// red
		if (mdate.isBefore(moment().add('days', 1))) {
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
});
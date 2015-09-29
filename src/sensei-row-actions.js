(function() {
	var root = this;

	var RowAction = function(grid) {
		this.grid = grid;
	};
	RowAction.extend = function(props) {
		var parent = this;
		var child;

		child = function() {
			return parent.apply(this, arguments);
		};

		var Surrogate = function() {
			this.constructor = child;
		};
		Surrogate.prototype = parent.prototype;
		child.prototype = new Surrogate();

		if (props) {
			_.extend(child.prototype, props);
		}

		child.__super__ = parent.prototype;

		return child;
	};
	RowAction.prototype.initialize = function() {
		_.bindAll(this, "trigger");
	};
	RowAction.prototype.triggerEvent = null;
	RowAction.prototype.trigger = function( /** $activeCell */ ) {};
	RowAction.prototype.rowElement = function() {
		throw new Error("Not yet implemented");
	};

	root.DemoRowAction = RowAction.extend({
		name: "DemoRowAction",
		rowElement: function() {
			return "<button class='btn btn-default btn-xs'>Demo</button>";
		},
		triggerEvent: {
			event: "click",
			selector: ".btn"
		},
		trigger: function(e) {
			var $activeCell = e.data.$activeCell;
			console.log("DemoRowAction.trigger", $activeCell);

			// get button from active cell
			var $btn = $activeCell.find(".btn");

			// simulate some loading action on demo button
			if (!$btn.prop("disabled")) {
				$btn.prop("disabled", true)
					.removeClass("btn-success")
					.text("Loading...");

				setTimeout(function() {
					$btn.prop("disabled", false)
						.addClass("btn-success")
						.text("Success");
				}, 1000);
			}
		}
	});

	root.DeleteRowAction = RowAction.extend({
		name: "DeleteRowAction",
		rowElement: function() {
			return "<button class='btn btn-danger btn-xs'>Delete</button>";
		},
		triggerEvent: {
			event: "click",
			selector: ".btn"
		},
		trigger: function(e) {
			var $activeCell = e.data.$activeCell;
			console.log("DeleteRowAction.trigger", $activeCell);

			// get button from active cell
			var $btn = $activeCell.find(".btn");

			// simulate some loading action on demo button
			if (!$btn.prop("disabled")) {
				$btn.prop("disabled", true)
					.text("Deleting...");

				var grid = this.grid;
				var $row = this.grid.getCellRow($activeCell);

				setTimeout(function() {
					$btn.addClass("btn-danger")
						.text("Deleted");
					grid.removeRow($row);
				}, 500);
			}
		}
	});

	// export
	root.RowAction = RowAction;

})(jQuery);

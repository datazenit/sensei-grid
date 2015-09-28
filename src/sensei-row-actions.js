(function($) {
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
	// RowAction.prototype.initialize = function() {};
	// RowAction.prototype.show = function() {
	// 	throw new Error("Not yet implemented");
	// };
	// RowAction.prototype.hide = function() {
	// 	throw new Error("Not yet implemented");
	// };
	// RowAction.prototype.getElement = function() {
	// 	return this.$el;
	// };

	root.DemoRowActions = RowAction.extend({
		name: "DemoRowActions",
		initialize: function() {
			// _.bindAll(this, "show", "hide");
			// this.grid.events.on("row:select", this.show);
			// this.grid.events.on("cell:deactivate", this.hide);
		},
		// show: function($row) {
		// 	console.log("BasicRowActions.show");
		// 	this.getElement().show();
		// 	this.updatePosition($row);
		// },
		// updatePosition: function($row) {
		// 	// update position and dimensions
		// 	var $grid = $row.parents(".sensei-grid");
		// 	var top = $row.position().top;
		// 	var height = $row.height() + 1;
		// 	var left = $grid.width() + $grid.position().left;
		// 	this.getElement().css({
		// 		top: top,
		// 		height: height,
		// 		left: left
		// 	});
		// },
		// hide: function() {
		// 	console.log("BasicRowActions.hide");
		// 	this.getElement().hide();
		// },
    rowElement: function () {
      return "<button class='btn btn-default btn-xs'>Delete</button>";
    }
    //,
		// render: function() {
		// 	console.log("BasicRowActions.render");
		// 	if (!this.$el) {
    //
    //     var el = "<td><button class=btn btn-default>Delete</button></td>";
    //
		// 		// var className = "sensei-grid-row-action sensei-grid-basic-row-actions";
		// 		// var $el = $("<div>").addClass(className);
		// 		// $el.append($("<a>").addClass("btn btn-default btn-xs").text("Delete"));
		// 		// $el.append($("<a>").addClass("btn btn-default btn-xs").text("Duplicate"));
		// 		// this.$el = $el;
		// 		// this.grid.$el.append(this.$el);
		// 	}
		// }
	});

	// export
	root.RowAction = RowAction;

})(jQuery);

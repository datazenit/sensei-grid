(function ($) {
	var root = this;

	var RowAction = function (grid) {
		this.grid = grid;
	};
    RowAction.extend = function (props) {
        var parent = this;
        var child;

        child = function () {
            return parent.apply(this, arguments);
        };

        var Surrogate = function () {
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

    root.BasicRowActions = RowAction.extend({
        name: "BasicRowActions",
        render: function () {
            if (!this.el) {
            	var className = "sensei-grid-row-action sensei-grid-basic-row-actions";
                this.el = $("<div>").addClass(className);
                this.grid.$el.append(this.el);
            }
        }
    });

    // export 
    root.RowAction = RowAction;

})(jQuery);
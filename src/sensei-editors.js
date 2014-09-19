(function ($) {
    var root = this;

    var Editor = function (grid) {
        this.grid = grid;
    };
    Editor.extend = function (props) {
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
    Editor.prototype.getElement = function () {
        return $(this.editor);
    };
    Editor.prototype.initialize = function () {
    };
    Editor.prototype.render = function () {
    };
    Editor.prototype.show = function () {
        this.getElement().show();
    };
    Editor.prototype.hide = function () {
        this.getElement().hide();
        this.grid.activeEditor.activeCell = null;
        this.grid.activeEditor = null;
    };
    Editor.prototype.getValue = function () {
        throw Error("Editor.getValue not implemented");
    };
    Editor.prototype.setValue = function () {
        throw Error("Editor.setValue not implemented");
    };

    // export editor
    root.Editor = Editor;

    root.BasicEditor = Editor.extend({
        types: [],
        name: "BasicEditor",
        render: function () {
            if (!this.editor) {
                this.editor = document.createElement("div");
                this.editor.className = "sensei-grid-editor sensei-grid-basic-editor";
                var input = document.createElement("input");
                this.editor.appendChild(input);
                this.grid.$el.append(this.editor);
            }
        },
        getValue: function () {
            return $("input", this.editor).val();
        },
        setValue: function (val) {
            $("input", this.editor).val(val).focus();
        }
    });
})(jQuery);
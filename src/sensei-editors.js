(function ($) {
    var root = this;
    root.BasicEditor = Editor.extend({
        types: [],
        name: "BasicEditor",
        render: function () {
            console.log("BasicEditor.render");

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
var BasicEditor = Editor.extend({
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

var CustomEditor = Editor.extend({
    types: [],
    statuses: ["Backlog", "Accepted", "In progress", "Done", "Verified"],
    name: "CustomEditor",
    render: function () {
        console.log("CustomEditor.render");

        if (!this.editor) {
            this.editor = document.createElement("div");
            this.editor.className = "sensei-grid-editor sensei-grid-custom-editor";
            var select = document.createElement("select");
            _.each(this.statuses, function (status) {
                var option = document.createElement("option");
                option.value = status;
                option.innerHTML = status;
                select.appendChild(option);
            });
            this.editor.appendChild(select);
            this.grid.$el.append(this.editor);
        }
    },
    getValue: function () {
        return $("select", this.editor).val();
    },
    setValue: function (val) {
        $("select>option", this.editor).filter(function () {
            return $(this).val() === val;
        }).attr("selected", "selected");
        $("select").focus();
    }
});
$(function () {

    // generate data
	var data = [];
	for (var i = 0; i < 10; ++i) {
		data.push({
			"id": "#" + (i + 1),
			"created_at": new Date().toDateString(),
			"status": "In progress",
			"title": "Test " + i + Math.round(Math.random() * 1000),
			"count": Math.round(Math.random() * 100)
		});
	}

    // define columns
	var columns = [
		{name: "id", type: "string"},
		{name: "created_at", type: "string"},
		{name: "status", type: "string", editor: "CustomEditor"},
		{name: "title", type: "string"},
		{name: "count", type: "string"}
	];

    // example definition of a custom editor
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

    // initialize grid
    var options = {emptyRow: true, sortable: true};
	var grid = $(".sensei-grid").grid(data, columns, options);

    // register editors
	grid.registerEditor(BasicEditor); // BasicEditor is bundled with Sensei Grid
	grid.registerEditor(CustomEditor);

    // example listeners on grid events
    grid.events.on("editor:save", function (data, $cell) {
        console.info("save cell:", data, $cell);
    });
    grid.events.on("editor:load", function (data, $cell) {
        console.info("set value in editor:", data, $cell);
    });
    grid.events.on("cell:select", function ($cell) {
        console.info("active cell:", $cell);
    });
    grid.events.on("cell:clear", function (oldValue, $cell) {
        console.info("clear cell:", oldValue, $cell);
    });
    grid.events.on("cell:deactivate", function ($cell) {
        console.info("cell deactivate:", $cell);
    });
    grid.events.on("row:select", function ($row) {
        console.info("row select:", $row);
    });
    grid.events.on("row:save", function (data, $row, source) {
        console.info("row save:", source, data);
        // save row via ajax or any other way
        // simulate delay caused by ajax and set row as saved
        setTimeout(function () {
            grid.setRowSaved($row);
        }, 1000);
    });

    // render grid
	grid.render();

    // api examples
    var $row = grid.getRowByIndex(5);
    console.group("data api examples");
    console.log("grid.getRowDataByIndex(0):", grid.getRowDataByIndex(0));
    console.log("grid.getRowData($row):", grid.getRowData($row));
    console.log("grid.getCellDataByIndex(0, 1):", grid.getCellDataByIndex(0, 1));
    console.log("grid.getCellDataByKey(2, created_at):", grid.getCellDataByKey(2, "created_at"));
    console.log("grid.getGridData():", grid.getGridData());
    console.groupEnd();
});
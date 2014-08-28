(function ($) {
    $.fn.grid = function (data, columns, options) {

        var plugin = this,
            defaults = {
                sortable: true,
                tableClass: "table table-bordered table-condensed"
            },
            config = {},
            $el;

        plugin.focusingEditor = false;

        //var events = [
        //    //{"selector": "tr>td", "event": "click", "handler": }
        //    ["tr>td", "click", plugin.clickCell],
        //    ["tr>td", "dblclick", plugin.dblClickCell],
        //    ["tr>td", "dblclick", plugin.dblClickCell],
        //    ["tr>td", "dblclick", plugin.dblClickCell]
        //];

        $.fn.setActiveCell = function () {
            $("tr", plugin.$el).removeClass("activeRow");
            $("tr>.activeCell", plugin.$el).removeClass("activeCell");
            $(this).addClass("activeCell");
            $(this).parent("tr").addClass("activeRow");
        };

        // fixes inconsistent position in firefox/chrome
        // for this to work a div is needed inside table cell
        $.fn.cellPosition = function () {
            var pos = $("div", this).position();
            console.log("cell pos", pos);
            pos.left = Math.round(pos.left);
            pos.top = Math.round(pos.top);
            var paddingH = $(this).outerWidth() - $(this).width();
            var paddingV = $(this).outerHeight() - $(this).height();
            pos.top -= Math.round(paddingV / 2);
            pos.left -= Math.round(paddingH / 2);
            return pos;
        };

        plugin.render = function () {
            console.log("render");

            plugin.renderBaseTable();
            plugin.renderColumns();
            plugin.renderData();
            plugin.renderEditor();
            plugin.bindEvents();
        };
        plugin.bindEvents = function () {
            plugin.$el.on("click", "tr>td", plugin.clickCell);
            plugin.$el.on("dblclick", "tr>td", plugin.dblClickCell);
            plugin.$el.on("blur", plugin.blur);
            plugin.$el.on("blur", ".sensei-grid-editor input", plugin.editorBlur);
            plugin.$el.on("focusin", ".sensei-grid-editor input", function (e) {
                console.log("focus on editor", e);
            });
            plugin.$el.on("keydown", plugin.keydown);
        };

        plugin.unbindEvents = function () {

        };

        plugin.editorBlur = function (e) {
            console.log("editor lost focus", e.relatedTarget, e);

            // close editor if it is open
            if (plugin.getEditor().is(":visible")) {
                plugin.exitEditor();
            }

            // remove active cell if focus has went away from grid
            if (plugin.$el.is(e.relatedTarget)) {
                console.log("editor lost focus to sensei-grid");
            } else {
                plugin.deactivateCell();
            }
        };

        plugin.blur = function (e) {
            console.log("grid focus out", $(e.relatedTarget), plugin.$el.find(":focus").length, $("input", plugin.getEditor()));

            // check if focus has moved to editor
            // e.relatedTarget && plugin.$el.has($(e.relatedTarget))
            if (plugin.focusingEditor) {
                console.log("focus moved to editor");
            } else {
                plugin.exitEditor();
                plugin.deactivateCell();
            }
        };

        plugin.getActiveCell = function () {
            return $("td.activeCell", plugin.$el);
        };

        plugin.deactivateCell = function () {
            var $td = plugin.getActiveCell();
            $td.removeClass("activeCell");
            $td.parent("tr").removeClass("activeRow");
        };

        plugin.clearActiveCell = function () {
            var $td = plugin.getActiveCell();
            $(">div", $td).empty();
        };

        plugin.moveRight = function () {

            var $td = plugin.getActiveCell();

            if ($td.next().length > 0) {
                console.log("there is next el");
                $td.next().setActiveCell();
            } else {
                // try next row
                var $nextRow = $td.parent("tr").next();
                if ($nextRow.length > 0) {
                    console.log("nextRow", $nextRow);
                    $("td:first", $nextRow).setActiveCell();
                } else {
                    console.log("end of table");
                }
            }
        };

        plugin.moveUp = function () {

            var $td = plugin.getActiveCell();

            var $prevRow = $td.parent("tr").prev();
            if ($prevRow.length > 0) {
                console.log("there is prev row");
                var index = $td.index();
                var $upCell = $("td", $prevRow).eq(index);
                if ($upCell.length > 0) {
                    console.log("there is a cell precisely up");
                    $upCell.setActiveCell();
                } else {
                    console.log("strange, no cell up, select last one", $upCell);
                    $("td:last", $prevRow).setActiveCell();
                }
            } else {
                console.log("this is top row");
            }
        };

        plugin.moveLeft = function () {

            var $td = plugin.getActiveCell();

            console.log("left");
            if ($td.prev().length > 0) {
                console.log("there is prev el");
                $td.prev().setActiveCell();
            } else {
                // try next row
                var $prevRow = $td.parent("tr").prev();
                if ($prevRow.length > 0) {
                    console.log("prevRow", $prevRow);
                    $("td:last", $prevRow).setActiveCell();
                } else {
                    console.log("beginning of table");
                }
            }
        };

        plugin.moveDown = function () {

            var $td = plugin.getActiveCell();

            var $nextRow = $td.parent("tr").next();
            if ($nextRow.length > 0) {
                console.log("there is next row");
                var index = $td.index();
                var $downCell = $("td", $nextRow).eq(index);
                if ($downCell.length > 0) {
                    console.log("there is a cell precisely down");
                    $downCell.setActiveCell();
                } else {
                    console.log("strange, no cell down, select last one", $downCell);
                    $("td:first", $nextRow).setActiveCell();
                }
            } else {
                console.log("this is top row");
            }
        };

        plugin.move = function (direction) {
            direction = "move" + direction.charAt(0).toUpperCase() + direction.substr(1);
            if (_.has(plugin, direction)) {
                plugin.saveEditor();
                plugin[direction]();
                plugin.moveEditor();
            } else {
                console.log("move method not found", direction);
            }
        };

        plugin.editCell = function () {
            var $td = plugin.getActiveCell();
            var pos = $td.cellPosition();
            // var pos = $td.position();
            console.log("edit cell");
            var $editor = plugin.showEditor();
            $editor.css(pos);
            $editor.css({width: $td.outerWidth() + 1, height: $td.outerHeight() + 1});
        };

        plugin.getEditor = function () {
            return $(".sensei-grid-editor", plugin.$el);
        };

        plugin.saveEditor = function () {
            var $editor = plugin.getEditor();

            if ($editor.is(":visible")) {
                var val = $("input", $editor).val();
                console.log("save editor", val);
                plugin.getActiveCell().html($("<div>").text(val));
            }
        };

        plugin.exitEditor = function (skipSave) {
            console.log("exit editor");
            var $td = plugin.getActiveCell();
            if (plugin.getEditor().is(":visible")) {
                if (!skipSave) {
                    plugin.saveEditor();
                }
                plugin.getEditor().hide();
                $("input", plugin.getEditor()).blur();
            }

            // need to regain focus
            console.log("need to regain focus on sensei-grid", $td);
            $td.setActiveCell();
            plugin.$el.focus();
        };

        plugin.moveEditor = function () {
            var $editor = plugin.getEditor();
            if ($editor.is(":visible")) {
                console.log("editor is visible, move along");
                plugin.editCell(plugin.getActiveCell());
            }
        };

        plugin.showEditor = function () {
            console.log("show editor");
            var $editor = plugin.getEditor();
            var $td = plugin.getActiveCell();

            if ($editor.is(":hidden")) {
                console.log("editor hidden, show it");
                $editor.show();
            }

            console.log("before input focus");
            plugin.focusingEditor = true;
            $("input", $editor).focus();
            console.log("after input focus");
            $td.setActiveCell(); // reset active cell
            $("input", $editor).val(plugin.getActiveCell().text());

            console.log("editor", $("input", $editor), plugin.getActiveCell().text());

            plugin.focusingEditor = false;

            return $editor;
        };

        plugin.renderEditor = function () {
            var $editor = plugin.getEditor();
            if ($editor.length === 0) {
                console.log("editor doesn't exist, create element");
                var editor = document.createElement("div");
                editor.className = "sensei-grid-editor";
                var input = document.createElement("input");
                editor.appendChild(input);
                plugin.$el.append(editor);
                $(editor).css("display", "none");
            } else {
                console.log("editor already exists");
            }
        };

        plugin.keydown = function (e) {

            console.log("keydown", e.keyCode);

            var preventDefault = true;

            // all keyCodes that will be used
            var codes = [8, 9, 13, 27, 37, 38, 39, 40];

             // specific keyCodes that won't be hijacked from the editor
            var editorCodes = [8, 37, 38, 39, 40];

            if (plugin.getActiveCell().length === 0 || !_.contains(codes, e.keyCode)) {
                return;
            }

            if (plugin.getEditor().is(":visible") && _.contains(editorCodes, e.keyCode)) {
                return;
            } else {
                e.preventDefault();
            }

            switch (e.keyCode) {
                case 37: // left
                    plugin.move("left");
                    break;
                case 38: // up
                    plugin.move("up");
                    break;
                case 39: // right
                    plugin.move("right");
                    break;
                case 40: // down
                    plugin.move("down");
                    break;
                case 13: // enter
                    console.log("enter", plugin.getEditor().is(":visible"));
                    if (plugin.getEditor().is(":visible")) {
                        if (e.ctrlKey && e.shiftKey) {
                            console.log("ctrl + shift + enter", "move editor up");
                            plugin.move("up");
                        } else if (e.ctrlKey && !e.shiftKey) {
                            console.log("ctrl + enter", "move editor down");
                            plugin.move("down");
                        } else {
                            console.log("enter", "exit editor");
                            plugin.exitEditor();
                        }
                    } else {
                        console.log("enter", "edit cell");
                        plugin.editCell();
                    }
                    break;
                case 27: // esc
                    if (plugin.getEditor().is(":visible")) {
                        plugin.exitEditor(true);
                    } else {
                        // remove focus from grid
                        plugin.$el.blur();
                    }
                    break;
                case 9: // tab
                    if (e.shiftKey) {
                        plugin.move("left");
                    } else {
                        plugin.move("right");
                    }
                    break;
                case 8: // backspace
                    plugin.clearActiveCell();
                    break;
            }

            if (preventDefault) {
                e.preventDefault();
            }
        };

        plugin.clickCell = function (e) {
            e.preventDefault();
            console.log("clicked cell");
            plugin.exitEditor();
            $(this).setActiveCell();
        };

        plugin.dblClickCell = function (e) {
            e.preventDefault();
            console.log("double clicked cell");
            $(this).setActiveCell();
            plugin.editCell();
        };

        plugin.renderColumns = function () {
            console.log("renderColumns", plugin.columns);
            var $thead = $("thead", plugin.$el);
            var tr = document.createElement("tr");
            _.each(plugin.columns, function (column, key) {
                var th = document.createElement("th");
                th.innerHTML = $("<div>").text(column).get(0).outerHTML;
                tr.appendChild(th);
            });
            console.log($thead);
            $thead.append(tr);
        };

        plugin.renderData = function () {
            console.log("renderData");
            var $tbody = $("tbody", plugin.$el);
            _.each(plugin.data, function (item, key) {
                var tr = document.createElement("tr");
                _.each(item, function (value, key) {
                    var td = document.createElement("td");
                    td.innerHTML = $("<div>").text(value).get(0).outerHTML;
                    tr.appendChild(td);
                });
                $tbody.append(tr);
            });
        };

        plugin.renderBaseTable = function () {
            console.log("renderBaseTable");

            var table = document.createElement("table");
            var thead = document.createElement("thead");
            var tbody = document.createElement("tbody");

            table.appendChild(thead);
            table.appendChild(tbody);
            table.className = plugin.config.tableClass;

            plugin.$el.html(table);
            plugin.$el.attr("tabindex", -1);
        };

        plugin.init = function (data, columns, options) {
            console.log("sensei grid init", data, columns);
            plugin.config = $.extend({}, defaults, options);
            plugin.data = data;
            plugin.columns = columns;
            plugin.$el = $(this);
            return plugin;
        };

        return plugin.init(data, columns, options);
    };
})(jQuery);

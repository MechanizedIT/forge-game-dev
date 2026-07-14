extends Node2D

const ARENA_RECT := Rect2(72.0, 116.0, 816.0, 360.0)


func _ready() -> void:
	$Title.text = str(ProjectSettings.get_setting("application/config/name", "Top-down Arena")).to_upper()
	queue_redraw()


func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, Vector2(960.0, 540.0)), Color("081024"))
	draw_rect(ARENA_RECT, Color("101e36"), true)
	for x in range(0, 9):
		var grid_x := ARENA_RECT.position.x + float(x) * 102.0
		draw_line(Vector2(grid_x, ARENA_RECT.position.y), Vector2(grid_x, ARENA_RECT.end.y), Color("18304b"), 1.0)
	for y in range(0, 5):
		var grid_y := ARENA_RECT.position.y + float(y) * 90.0
		draw_line(Vector2(ARENA_RECT.position.x, grid_y), Vector2(ARENA_RECT.end.x, grid_y), Color("18304b"), 1.0)
	draw_rect(ARENA_RECT, Color("4d7596"), false, 4.0)
	draw_line(Vector2(72.0, 500.0), Vector2(888.0, 500.0), Color("19314b"), 2.0)

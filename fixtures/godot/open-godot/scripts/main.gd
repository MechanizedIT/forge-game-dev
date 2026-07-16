extends Node2D

func _draw() -> void:
	draw_rect(Rect2(0, 0, 960, 540), Color("151827"))
	draw_circle(Vector2(480, 245), 42, Color("8d7cf7"))
	draw_string(ThemeDB.fallback_font, Vector2(365, 330), "Your Forge game starts here", HORIZONTAL_ALIGNMENT_LEFT, -1, 24, Color("f2f0ff"))

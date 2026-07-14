extends Area2D

var pulse := 0.0


func _ready() -> void:
	queue_redraw()


func _process(delta: float) -> void:
	pulse = fmod(pulse + delta, 2.0)
	queue_redraw()


func _draw() -> void:
	var radius := 25.0 + pulse * 6.0
	draw_circle(Vector2.ZERO, 20.0, Color("3a255f"))
	draw_circle(Vector2.ZERO, 12.0, Color("a78bfa"))
	draw_circle(Vector2.ZERO, 4.0, Color("f2eaff"))
	draw_arc(Vector2.ZERO, radius, 0.0, TAU, 40, Color(0.66, 0.54, 0.98, 1.0 - pulse * 0.3), 2.0)
	draw_line(Vector2(0.0, 30.0), Vector2(0.0, 52.0), Color("7863b7"), 2.0)
